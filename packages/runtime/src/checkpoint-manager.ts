import type { ExecutionCheckpoint, Message, TokenUsage } from '@agent-os/core';
import type { AgentOSDb } from '@agent-os/db';
import { v4 as uuidv4 } from 'uuid';

type SqlClient = {
  prepare: (sql: string) => {
    run: (...args: unknown[]) => void;
    get: (...args: unknown[]) => unknown;
    all: (...args: unknown[]) => unknown[];
  };
};
type RawDb = { session: { client: SqlClient } };
function raw(db: AgentOSDb): SqlClient {
  return (db as unknown as RawDb).session.client;
}

export class CheckpointManager {
  constructor(private readonly db: AgentOSDb) {}

  write(
    runId: string,
    agentId: string,
    turnIndex: number,
    messages: Message[],
    tokenUsage: TokenUsage,
    agentState?: Record<string, unknown>
  ): ExecutionCheckpoint {
    const id = uuidv4();
    const now = new Date();
    const sql = raw(this.db);

    sql.prepare(`
      INSERT INTO execution_checkpoints (id, run_id, agent_id, turn_index, messages_json,
        input_tokens, output_tokens, total_tokens, agent_state_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, runId, agentId, turnIndex,
      JSON.stringify(messages),
      tokenUsage.inputTokens,
      tokenUsage.outputTokens,
      tokenUsage.totalTokens,
      agentState ? JSON.stringify(agentState) : null,
      now.getTime()
    );

    sql.prepare(`UPDATE agent_runs SET checkpoint_id = ? WHERE id = ?`).run(id, runId);

    return { id, runId, agentId, turnIndex, messages, tokenUsage, agentState, createdAt: now };
  }

  loadLatest(runId: string): ExecutionCheckpoint | null {
    const row = raw(this.db).prepare(`
      SELECT * FROM execution_checkpoints
      WHERE run_id = ? ORDER BY turn_index DESC LIMIT 1
    `).get(runId) as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      id: row['id'] as string,
      runId: row['run_id'] as string,
      agentId: row['agent_id'] as string,
      turnIndex: row['turn_index'] as number,
      messages: JSON.parse(row['messages_json'] as string) as Message[],
      tokenUsage: {
        inputTokens: row['input_tokens'] as number,
        outputTokens: row['output_tokens'] as number,
        totalTokens: row['total_tokens'] as number,
      },
      agentState: row['agent_state_json']
        ? (JSON.parse(row['agent_state_json'] as string) as Record<string, unknown>)
        : undefined,
      createdAt: new Date(row['created_at'] as number),
    };
  }

  loadRecoverableRuns(): Array<{
    runId: string;
    agentId: string;
    inputJson: string;
    checkpointId: string | null;
  }> {
    return raw(this.db).prepare(`
      SELECT id as runId, agent_id as agentId, input_json as inputJson, checkpoint_id as checkpointId
      FROM agent_runs WHERE status IN ('RUNNING', 'RESUMING')
    `).all() as Array<{ runId: string; agentId: string; inputJson: string; checkpointId: string | null }>;
  }

  markResuming(runId: string): void {
    raw(this.db).prepare(`UPDATE agent_runs SET status = 'RESUMING' WHERE id = ?`).run(runId);
  }
}
