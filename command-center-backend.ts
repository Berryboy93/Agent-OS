/**
 * Agent-OS Command Center Backend Service Layer
 * Integrates with ControlPlaneServer for production-grade run management,
 * event streaming, and command orchestration.
 * 
 * Location: packages/control-plane/src/service/command-center.service.ts
 */

import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';

export interface AgentRun {
  id: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt: number | null;
  metadata: Record<string, any>;
  output: string | null;
  error: string | null;
}

export interface AgentEvent {
  id: string;
  runId: string;
  type: 'start' | 'step' | 'tool' | 'turn' | 'complete' | 'error';
  timestamp: number;
  data: Record<string, any>;
}

export interface CommandRequest {
  id: string;
  runId: string;
  command: string;
  args: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result: any;
  createdAt: number;
}

export class CommandCenterService extends EventEmitter {
  private db: Database.Database;
  private sseClients: Set<any> = new Set();

  constructor(dbPath: string) {
    super();
    this.db = new Database(dbPath);
    this.initSchema();
  }

  /**
   * Initialize database schema for command center
   */
  private initSchema(): void {
    this.db.exec(`
      -- Runs table: track all agent executions
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed')),
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        metadata TEXT,
        output TEXT,
        error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        INDEX idx_agent_id (agent_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      );

      -- Events table: immutable event log for each run
      CREATE TABLE IF NOT EXISTS run_events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('start', 'step', 'tool', 'turn', 'complete', 'error')),
        timestamp INTEGER NOT NULL,
        data TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (run_id) REFERENCES runs(id),
        INDEX idx_run_id (run_id),
        INDEX idx_type (type),
        INDEX idx_timestamp (timestamp)
      );

      -- Commands table: dispatch and execution history
      CREATE TABLE IF NOT EXISTS commands (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        command TEXT NOT NULL,
        args TEXT,
        status TEXT NOT NULL CHECK(status IN ('pending', 'executing', 'completed', 'failed')),
        result TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (run_id) REFERENCES runs(id),
        INDEX idx_run_id (run_id),
        INDEX idx_status (status)
      );

      -- Metrics snapshot: periodic aggregates for dashboard
      CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY,
        runs_total INTEGER NOT NULL,
        runs_active INTEGER NOT NULL,
        runs_completed INTEGER NOT NULL,
        runs_failed INTEGER NOT NULL,
        events_total INTEGER NOT NULL,
        agents_unique INTEGER NOT NULL,
        snapshot_at INTEGER NOT NULL,
        INDEX idx_snapshot_at (snapshot_at)
      );

      -- Audit log: RBAC-aware command execution audit
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        status TEXT NOT NULL,
        details TEXT,
        timestamp INTEGER NOT NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_timestamp (timestamp)
      );
    `);
  }

  /**
   * Create a new agent run
   */
  createRun(agentId: string, metadata?: Record<string, any>): AgentRun {
    const id = uuid();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO runs (id, agent_id, status, started_at, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      agentId,
      'pending',
      now,
      JSON.stringify(metadata || {}),
      now,
      now
    );

    this.emit('run:created', { id, agentId });
    this.broadcast({ type: 'run:created', runId: id, agentId });

    return {
      id,
      agentId,
      status: 'pending',
      startedAt: now,
      completedAt: null,
      metadata: metadata || {},
      output: null,
      error: null
    };
  }

  /**
   * Get run by ID
   */
  getRun(runId: string): AgentRun | null {
    const stmt = this.db.prepare(`
      SELECT id, agent_id, status, started_at, completed_at, metadata, output, error
      FROM runs WHERE id = ?
    `);

    const row = stmt.get(runId) as any;
    if (!row) return null;

    return {
      id: row.id,
      agentId: row.agent_id,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      metadata: JSON.parse(row.metadata || '{}'),
      output: row.output,
      error: row.error
    };
  }

  /**
   * List runs with pagination and filtering
   */
  listRuns(
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      agentId?: string;
      sortBy?: 'created_at' | 'started_at';
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ) {
    const {
      limit = 50,
      offset = 0,
      status,
      agentId,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    let query = 'SELECT * FROM runs WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (agentId) {
      query += ' AND agent_id = ?';
      params.push(agentId);
    }

    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      metadata: JSON.parse(row.metadata || '{}'),
      output: row.output,
      error: row.error
    }));
  }

  /**
   * Update run status and execution details
   */
  updateRun(
    runId: string,
    update: {
      status?: 'running' | 'completed' | 'failed';
      output?: string;
      error?: string;
    }
  ): AgentRun | null {
    const run = this.getRun(runId);
    if (!run) return null;

    const now = Date.now();
    const completedAt = (update.status === 'completed' || update.status === 'failed') ? now : null;

    const stmt = this.db.prepare(`
      UPDATE runs
      SET status = ?, output = ?, error = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      update.status || run.status,
      update.output !== undefined ? update.output : run.output,
      update.error !== undefined ? update.error : run.error,
      completedAt,
      now,
      runId
    );

    this.emit('run:updated', { runId, status: update.status });
    this.broadcast({ type: 'run:updated', runId, status: update.status });

    return this.getRun(runId);
  }

  /**
   * Record an event in a run's event stream
   */
  addEvent(runId: string, type: AgentEvent['type'], data: Record<string, any>): AgentEvent {
    const id = uuid();
    const timestamp = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO run_events (id, run_id, type, timestamp, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      runId,
      type,
      timestamp,
      JSON.stringify(data),
      timestamp
    );

    this.emit('event:recorded', { id, runId, type });
    this.broadcast({ type: 'event:recorded', eventId: id, runId, eventType: type, data });

    return { id, runId, type, timestamp, data };
  }

  /**
   * Get all events for a run
   */
  getRunEvents(runId: string): AgentEvent[] {
    const stmt = this.db.prepare(`
      SELECT id, run_id, type, timestamp, data
      FROM run_events WHERE run_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(runId) as any[];

    return rows.map(row => ({
      id: row.id,
      runId: row.run_id,
      type: row.type,
      timestamp: row.timestamp,
      data: JSON.parse(row.data || '{}')
    }));
  }

  /**
   * Dispatch a command to a run
   */
  dispatchCommand(
    runId: string,
    command: string,
    args: Record<string, any> = {}
  ): CommandRequest {
    const id = uuid();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO commands (id, run_id, command, args, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, runId, command, JSON.stringify(args), 'pending', now, now);

    this.emit('command:dispatched', { id, runId, command });
    this.broadcast({ type: 'command:dispatched', commandId: id, runId, command });

    return {
      id,
      runId,
      command,
      args,
      status: 'pending',
      result: null,
      createdAt: now
    };
  }

  /**
   * Update command execution status and result
   */
  updateCommand(
    commandId: string,
    update: {
      status?: 'executing' | 'completed' | 'failed';
      result?: any;
    }
  ): CommandRequest | null {
    const stmt = this.db.prepare(`
      SELECT id, run_id, command, args, status, result, created_at
      FROM commands WHERE id = ?
    `);

    const row = stmt.get(commandId) as any;
    if (!row) return null;

    const now = Date.now();
    const updateStmt = this.db.prepare(`
      UPDATE commands
      SET status = ?, result = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      update.status || row.status,
      update.result !== undefined ? JSON.stringify(update.result) : row.result,
      now,
      commandId
    );

    this.emit('command:updated', { commandId, status: update.status });
    this.broadcast({ type: 'command:updated', commandId, status: update.status });

    return {
      id: row.id,
      runId: row.run_id,
      command: row.command,
      args: JSON.parse(row.args || '{}'),
      status: update.status || row.status,
      result: update.result !== undefined ? update.result : JSON.parse(row.result || 'null'),
      createdAt: row.created_at
    };
  }

  /**
   * Record audit log entry (RBAC-aware)
   */
  auditLog(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    status: 'success' | 'failure',
    details?: Record<string, any>
  ): void {
    const id = uuid();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, status, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userId,
      action,
      resourceType,
      resourceId,
      status,
      JSON.stringify(details || {}),
      now
    );

    this.emit('audit:logged', { userId, action, resourceType, resourceId, status });
  }

  /**
   * Get live metrics snapshot
   */
  getMetrics() {
    const runStats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM runs
    `).get() as any;

    const eventCount = this.db.prepare('SELECT COUNT(*) as count FROM run_events').get() as any;
    const agentCount = this.db.prepare('SELECT COUNT(DISTINCT agent_id) as count FROM runs').get() as any;

    return {
      runs: {
        total: runStats.total || 0,
        active: runStats.active || 0,
        completed: runStats.completed || 0,
        failed: runStats.failed || 0
      },
      events: {
        total: eventCount.count || 0
      },
      agents: {
        unique: agentCount.count || 0
      },
      timestamp: Date.now()
    };
  }

  /**
   * SSE client management
   */
  registerSSEClient(res: any): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    this.sseClients.add(res);

    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  /**
   * Broadcast message to all SSE clients
   */
  broadcast(message: Record<string, any>): void {
    const data = `data: ${JSON.stringify({ ...message, timestamp: Date.now() })}\n\n`;

    this.sseClients.forEach(res => {
      try {
        res.write(data);
      } catch (err) {
        this.sseClients.delete(res);
      }
    });
  }

  /**
   * Graceful shutdown
   */
  close(): void {
    this.sseClients.forEach(res => res.end());
    this.sseClients.clear();
    this.db.close();
  }
}
