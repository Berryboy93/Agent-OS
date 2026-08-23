import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import * as schema from './schema.js';

export type AgentOSDb = ReturnType<typeof createDb>;

export function createDb(dbPath = './agent-os.db'): ReturnType<typeof drizzle<typeof schema>> {
  const resolved = resolve(dbPath);
  mkdirSync(dirname(resolved), { recursive: true });
  const sqlite = new Database(resolved);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('synchronous = NORMAL');
  initSchema(sqlite);
  migrateSchema(sqlite);
  return drizzle(sqlite, { schema });
}

function initSchema(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      agent_version TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      input_json TEXT NOT NULL DEFAULT '{}',
      output_json TEXT,
      error_message TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      checkpoint_id TEXT,
      correlation_id TEXT,
      parent_run_id TEXT,
      pipeline_run_id TEXT,
      deployment_id TEXT,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      metadata_json TEXT
    );
    CREATE TABLE IF NOT EXISTS agent_events (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      data_json TEXT NOT NULL DEFAULT '{}',
      timestamp INTEGER NOT NULL,
      sequence_number INTEGER NOT NULL,
      redaction_incomplete INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS execution_checkpoints (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      turn_index INTEGER NOT NULL,
      messages_json TEXT NOT NULL DEFAULT '[]',
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      agent_state_json TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_state (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      state_json TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pipeline_state (
      id TEXT PRIMARY KEY,
      pipeline_run_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id TEXT PRIMARY KEY,
      pipeline_id TEXT NOT NULL,
      pipeline_version TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      current_step_index INTEGER NOT NULL DEFAULT 0,
      current_step_id TEXT,
      input_json TEXT NOT NULL DEFAULT '{}',
      output_json TEXT,
      step_results_json TEXT,
      error_message TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      correlation_id TEXT,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS approval_requests (
      id TEXT PRIMARY KEY,
      execution_id TEXT NOT NULL,
      pipeline_run_id TEXT,
      step_id TEXT NOT NULL,
      run_id TEXT,
      agent_id TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      reason TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL DEFAULT '{}',
      prompt_json TEXT NOT NULL DEFAULT '{}',
      response_json TEXT,
      resolved_by TEXT,
      resolution_note TEXT,
      expires_at INTEGER,
      resolved_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS registry_entries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      kind TEXT NOT NULL,
      config_json TEXT NOT NULL DEFAULT '{}',
      checksum_sha256 TEXT,
      trusted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_definitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      version TEXT NOT NULL DEFAULT '1.0.0',
      config_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      target TEXT NOT NULL DEFAULT 'local',
      name TEXT,
  rollback_of TEXT,
      deployed_by TEXT,
      image_digest TEXT,
      config_json TEXT NOT NULL DEFAULT '{}',
      deployed_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memory_entries (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      scope TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_agent_events_run_id ON agent_events(run_id);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_run_id ON execution_checkpoints(run_id);
    CREATE INDEX IF NOT EXISTS idx_agent_events_timestamp ON agent_events(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
    CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
    CREATE INDEX IF NOT EXISTS idx_deployments_agent_id ON deployments(agent_id);
    CREATE INDEX IF NOT EXISTS idx_pipeline_state_run ON pipeline_state(pipeline_run_id);
  `);
}

function migrateSchema(sqlite: Database.Database): void {
  const addColumnIfMissing = (table: string, column: string, definition: string): void => {
    try {
      sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch {
    }
  };

  addColumnIfMissing('agent_runs', 'agent_version', 'TEXT');
  addColumnIfMissing('agent_runs', 'correlation_id', 'TEXT');
  addColumnIfMissing('agent_runs', 'parent_run_id', 'TEXT');
  addColumnIfMissing('agent_runs', 'pipeline_run_id', 'TEXT');
  addColumnIfMissing('agent_runs', 'deployment_id', 'TEXT');

  addColumnIfMissing('pipeline_runs', 'pipeline_version', 'TEXT');
  addColumnIfMissing('pipeline_runs', 'current_step_id', 'TEXT');
  addColumnIfMissing('pipeline_runs', 'step_results_json', 'TEXT');
  addColumnIfMissing('pipeline_runs', 'input_tokens', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('pipeline_runs', 'output_tokens', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('pipeline_runs', 'total_tokens', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('pipeline_runs', 'correlation_id', 'TEXT');

  addColumnIfMissing('approval_requests', 'execution_id', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('approval_requests', 'pipeline_run_id', 'TEXT');
  addColumnIfMissing('approval_requests', 'step_id', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('approval_requests', 'reason', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('approval_requests', 'payload_json', "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissing('approval_requests', 'resolved_by', 'TEXT');
  addColumnIfMissing('approval_requests', 'resolution_note', 'TEXT');

  addColumnIfMissing('deployments', 'name', 'TEXT');
  addColumnIfMissing('deployments', 'agent_id', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('deployments', 'deployed_by', 'TEXT');
  addColumnIfMissing('deployments', 'image_digest', 'TEXT');
}

export { schema };