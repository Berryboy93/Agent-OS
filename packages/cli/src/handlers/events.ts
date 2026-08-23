// packages/cli/src/handlers/events.ts
import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';

const DB_PATH = process.env.AGENT_OS_DB || '/home/r3v/Agent-OS/agent-os.db';
let db: Database | null = null;

function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeEventTables();
  }
  return db;
}

function initializeEventTables(): void {
  const database = db!;

  // Events table with idempotency support
  database.exec(`
    CREATE TABLE IF NOT EXISTS approval_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotency_key TEXT UNIQUE,
      event_type TEXT NOT NULL,
      approval_id TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      payload TEXT NOT NULL, -- JSON
      redaction_stage INTEGER DEFAULT 0,
      redacted_at DATETIME,
      redacted_by TEXT
    )
  `);

  // Event redaction log (5-stage pipeline)
  database.exec(`
    CREATE TABLE IF NOT EXISTS event_redactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES approval_events(id),
      stage INTEGER NOT NULL,
      action TEXT NOT NULL,
      performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT
    )
  `);

  // Indexes
  database.exec(`CREATE INDEX IF NOT EXISTS idx_events_idempotency ON approval_events(idempotency_key)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_events_approval_id ON approval_events(approval_id)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_events_type ON approval_events(event_type)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON approval_events(timestamp)`);
}

export interface ApprovalEvent {
  idempotencyKey: string;
  approvalId: string;
  status: string;
  timestamp: Date;
  createdAt: Date;
  eventType: string;
  payload?: Record<string, unknown>;
}

export interface EventPayload {
  approvalId: string;
  status: string;
  timestamp: number;
  note?: string;
  resource?: string;
  requester?: string;
  idempotencyKey?: string;
  reason?: string;
  [key: string]: unknown;
}

// Redaction stages for the 5-stage pipeline
const REDACTION_STAGES = [
  'raw',           // Stage 0: Original event
  'normalized',    // Stage 1: Schema validation
  'sanitized',     // Stage 2: PII removal
  'classified',    // Stage 3: Sensitivity classification
  'released',      // Stage 4: Final release
] as const;

function rowToApprovalEvent(row: Record<string, unknown>): ApprovalEvent {
  return {
    idempotencyKey: (row.idempotency_key as string) || '',
    approvalId: row.approval_id as string,
    status: row.status as string,
    timestamp: new Date(row.timestamp as string),
    createdAt: new Date(row.created_at as string),
    eventType: row.event_type as string,
    payload: row.payload ? JSON.parse(row.payload as string) : undefined,
  };
}

export function findEventByIdempotencyKey(key: string): ApprovalEvent | null {
  if (!key) return null;

  try {
    const database = getDb();
    const row = database.prepare(
      'SELECT * FROM approval_events WHERE idempotency_key = ?'
    ).get(key) as Record<string, unknown> | undefined;

    if (!row) return null;

    logger.debug('Found event by idempotency key', { idempotencyKey: key, eventId: row.id });
    return rowToApprovalEvent(row);
  } catch (err) {
    logger.error('Failed to find event by idempotency key', { idempotencyKey: key, error: (err as Error).message });
    return null;
  }
}

// SSE emitter - connects to dashboard SSE endpoint
async function emitSSE(eventType: string, payload: EventPayload): Promise<void> {
  const sseEndpoint = process.env.SSE_ENDPOINT || 'http://localhost:5000/events';

  try {
    const response = await fetch(sseEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: eventType,
        data: payload,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      logger.warn('SSE emission returned non-OK status', { 
        eventType, 
        status: response.status,
        endpoint: sseEndpoint 
      });
    }
  } catch (err) {
    // SSE is best-effort; don't fail the approval if SSE is down
    logger.debug('SSE emission failed (non-critical)', { 
      eventType, 
      error: (err as Error).message,
      endpoint: sseEndpoint 
    });
  }
}

// Apply redaction pipeline
function applyRedaction(payload: Record<string, unknown>, stage: number): Record<string, unknown> {
  if (stage >= REDACTION_STAGES.length) return payload;

  const redacted = { ...payload };

  switch (stage) {
    case 1: // normalized
      // Ensure consistent schema
      break;
    case 2: // sanitized - remove PII
      delete redacted.requester;
      delete redacted.note;
      break;
    case 3: // classified
      redacted._classification = payload.resource ? 'restricted' : 'internal';
      break;
    case 4: // released
      redacted._released = true;
      break;
  }

  return redacted;
}

export function emitApprovalEvent(
  eventType: string, 
  payload: EventPayload
): void {
  const database = getDb();

  try {
    const idempotencyKey = payload.idempotencyKey || `${eventType}-${payload.approvalId}-${Date.now()}`;
    const timestamp = new Date(payload.timestamp);

    // Insert event with redaction stage 0 (raw)
    const result = database.prepare(`
      INSERT INTO approval_events 
      (idempotency_key, event_type, approval_id, status, resource, timestamp, payload, redaction_stage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(idempotency_key) DO UPDATE SET
        timestamp = excluded.timestamp,
        payload = excluded.payload,
        redaction_stage = 0
    `).run(
      idempotencyKey,
      eventType,
      payload.approvalId,
      payload.status,
      payload.resource,
      timestamp.toISOString(),
      JSON.stringify(payload),
      0
    );

    // Run redaction pipeline
    for (let stage = 1; stage < REDACTION_STAGES.length; stage++) {
      const redactedPayload = applyRedaction(payload, stage);

      database.prepare(`
        INSERT INTO event_redactions (event_id, stage, action, metadata)
        VALUES (?, ?, ?, ?)
      `).run(
        result.lastInsertRowid,
        stage,
        REDACTION_STAGES[stage],
        JSON.stringify(redactedPayload)
      );
    }

    // Update final redaction stage
    database.prepare(`
      UPDATE approval_events 
      SET redaction_stage = ?, redacted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(REDACTION_STAGES.length - 1, result.lastInsertRowid);

    logger.info('Approval event emitted', { 
      eventType, 
      approvalId: payload.approvalId,
      idempotencyKey,
      redactionStage: REDACTION_STAGES[REDACTION_STAGES.length - 1]
    });

    // Emit to SSE (async, non-blocking)
    emitSSE(eventType, payload).catch(() => {});

  } catch (err) {
    logger.error('Failed to emit approval event', { 
      eventType, 
      approvalId: payload.approvalId,
      error: (err as Error).message 
    });
    throw err;
  }
}

// Query events for an approval
export function getApprovalEvents(approvalId: string): ApprovalEvent[] {
  try {
    const database = getDb();
    const rows = database.prepare(
      'SELECT * FROM approval_events WHERE approval_id = ? ORDER BY timestamp DESC'
    ).all(approvalId) as Record<string, unknown>[];

    return rows.map(rowToApprovalEvent);
  } catch (err) {
    logger.error('Failed to get approval events', { approvalId, error: (err as Error).message });
    return [];
  }
}

// Cleanup
export function closeEventDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

process.on('exit', closeEventDb);
process.on('SIGINT', () => { closeEventDb(); process.exit(0); });
process.on('SIGTERM', () => { closeEventDb(); process.exit(0); });

