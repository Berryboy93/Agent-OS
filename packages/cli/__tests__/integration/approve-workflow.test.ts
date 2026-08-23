import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { approveApproval } from '../../src/commands/approve';
import { setupTestDb, TestDbContext } from '../fixtures/db.fixture';

// Mock handlers to use test database
vi.mock('../../src/handlers/db.js', () => ({
  getApprovalState: vi.fn(),
  updateApprovalStatus: vi.fn(),
  closeDb: vi.fn(),
}));

vi.mock('../../src/handlers/events.js', () => ({
  emitApprovalEvent: vi.fn(),
  closeEventDb: vi.fn(),
  findEventByIdempotencyKey: vi.fn(),
}));

vi.mock('../../src/handlers/signals.js', () => ({
  emitSignal: vi.fn(),
  getMetrics: vi.fn(),
}));

import { getApprovalState, updateApprovalStatus } from '../../src/handlers/db';
import { emitApprovalEvent, findEventByIdempotencyKey } from '../../src/handlers/events';
import { emitSignal } from '../../src/handlers/signals';

describe('Approval Workflow (Integration)', () => {
  let db: TestDbContext;

  beforeEach(async () => {
    db = await setupTestDb();
    vi.clearAllMocks();

    vi.mocked(getApprovalState).mockImplementation(async (id: string) => {
      const result = await db.query('SELECT * FROM approvals WHERE id = ?', [id]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id as string,
        status: row.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'ERROR',
        resource: row.resource as string,
        requester: row.requester as string,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
        metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      };
    });

    vi.mocked(updateApprovalStatus).mockImplementation(async (id: string, status: string, metadata?: unknown) => {
      try {
        const stmt = db.db.prepare(
          'UPDATE approvals SET status = ?, updated_at = CURRENT_TIMESTAMP, metadata = ? WHERE id = ?'
        );
        stmt.run(status, metadata ? JSON.stringify(metadata) : null, id);
        const histStmt = db.db.prepare(
          'INSERT INTO approval_history (approval_id, action, note, metadata) VALUES (?, ?, ?, ?)'
        );
        const meta = metadata as Record<string, unknown>;
        histStmt.run(id, status, meta?.approvalNote || meta?.rejectionReason || null, metadata ? JSON.stringify(metadata) : null);
        return true;
      } catch {
        return false;
      }
    });

    vi.mocked(emitApprovalEvent).mockImplementation(async (eventType: string, payload: unknown) => {
      const p = payload as Record<string, unknown>;
      const stmt = db.db.prepare(
        'INSERT INTO approval_events (event_type, approval_id, status, timestamp, idempotency_key, resource, payload) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      stmt.run(eventType, p.approvalId, p.status, p.timestamp || Date.now(), p.idempotencyKey || null, p.resource || null, JSON.stringify(payload));
    });

    vi.mocked(findEventByIdempotencyKey).mockImplementation(async (key: string) => {
      const result = await db.query('SELECT * FROM approval_events WHERE idempotency_key = ?', [key]);
      return result.rows.length > 0 ? { createdAt: new Date(result.rows[0].created_at as string) } : null;
    });

    vi.mocked(emitSignal).mockImplementation(async () => {});
  });

  afterEach(async () => {
    await db.cleanup();
  });

  it('should approve and persist to database', async () => {
    const approvalId = 'APR-001';
    const result = await approveApproval({ approvalId });
    expect(result.success).toBe(true);
    const state = await db.query('SELECT status FROM approvals WHERE id = ?', [approvalId]);
    expect(state.rows[0].status).toBe('APPROVED');
  });

  it('should emit event to metrics pipeline', async () => {
    const approvalId = 'APR-002';
    await approveApproval({ approvalId });
    const events = await db.query('SELECT * FROM approval_events WHERE approval_id = ?', [approvalId]);
    expect(events.rows.length).toBeGreaterThan(0);
  });
});
