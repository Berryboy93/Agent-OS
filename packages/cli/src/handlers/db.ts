// packages/cli/src/handlers/db.ts
import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';

const DB_PATH = process.env.AGENT_OS_DB || '/home/r3v/Agent-OS/agent-os.db';

// Lazy connection - only connect when needed
let db: Database | null = null;

function getDb(): Database {
  if (!db) {
    try {
      db = new Database(DB_PATH);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      logger.info('Connected to SQLite database', { path: DB_PATH });

      // Ensure tables exist
      initializeTables();
    } catch (err) {
      logger.error('Failed to connect to database', { path: DB_PATH, error: (err as Error).message });
      throw err;
    }
  }
  return db;
}

function initializeTables(): void {
  const database = db!;

  // Approvals table
  database.exec(`
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'ERROR')),
      resource TEXT NOT NULL,
      requester TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT -- JSON blob
    )
  `);

  // Approval history/audit log
  database.exec(`
    CREATE TABLE IF NOT EXISTS approval_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      approval_id TEXT NOT NULL REFERENCES approvals(id),
      action TEXT NOT NULL,
      performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      performed_by TEXT,
      note TEXT,
      metadata TEXT
    )
  `);

  // Indexes
  database.exec(`CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_approvals_resource ON approvals(resource)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_approval_history_approval_id ON approval_history(approval_id)`);
}

export interface ApprovalState {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ERROR';
  resource: string;
  requester: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateMetadata {
  approvalNote?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  idempotencyKey?: string;
  performedBy?: string;
  [key: string]: unknown;
}

function rowToApprovalState(row: Record<string, unknown>): ApprovalState {
  return {
    id: row.id as string,
    status: row.status as ApprovalState['status'],
    resource: row.resource as string,
    requester: row.requester as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
  };
}

export function getApprovalState(id: string): ApprovalState | null {
  try {
    const database = getDb();
    const row = database.prepare(
      'SELECT * FROM approvals WHERE id = ?'
    ).get(id) as Record<string, unknown> | undefined;

    if (!row) {
      logger.debug('Approval not found', { approvalId: id });
      return null;
    }

    logger.debug('Retrieved approval state', { approvalId: id, status: row.status });
    return rowToApprovalState(row);
  } catch (err) {
    logger.error('Failed to get approval state', { approvalId: id, error: (err as Error).message });
    throw err;
  }
}

export function updateApprovalStatus(
  id: string, 
  status: string, 
  metadata?: UpdateMetadata
): boolean {
  const database = getDb();

  try {
    // Begin transaction
    const transaction = database.transaction(() => {
      // Check if approval exists
      const existing = database.prepare('SELECT id FROM approvals WHERE id = ?').get(id);

      if (!existing) {
        // Create new approval record if it doesn't exist
        // This handles cases where the approval is created on first action
        const resource = metadata?.resource as string || 'unknown';
        const requester = metadata?.requester as string || 'system';

        database.prepare(`
          INSERT INTO approvals (id, status, resource, requester, metadata)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, status, resource, requester, metadata ? JSON.stringify(metadata) : null);
      } else {
        // Update existing approval
        database.prepare(`
          UPDATE approvals 
          SET status = ?, updated_at = CURRENT_TIMESTAMP, metadata = ?
          WHERE id = ?
        `).run(status, metadata ? JSON.stringify(metadata) : null, id);
      }

      // Add to history
      database.prepare(`
        INSERT INTO approval_history (approval_id, action, note, metadata)
        VALUES (?, ?, ?, ?)
      `).run(
        id, 
        status, 
        metadata?.approvalNote || metadata?.rejectionReason || null,
        metadata ? JSON.stringify(metadata) : null
      );
    });

    transaction();
    logger.info('Approval status updated', { approvalId: id, status, metadata });
    return true;
  } catch (err) {
    logger.error('Failed to update approval status', { approvalId: id, status, error: (err as Error).message });
    return false;
  }
}

// Cleanup function for graceful shutdown
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

// Handle graceful shutdown
process.on('exit', closeDb);
process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });

