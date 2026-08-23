import { v4 as uuidv4 } from 'uuid';
function raw(db) {
    return db.session.client;
}
export class CheckpointManager {
    db;
    constructor(db) {
        this.db = db;
    }
    write(runId, agentId, turnIndex, messages, tokenUsage, agentState) {
        const id = uuidv4();
        const now = new Date();
        const sql = raw(this.db);
        sql.prepare(`
      INSERT INTO execution_checkpoints (id, run_id, agent_id, turn_index, messages_json,
        input_tokens, output_tokens, total_tokens, agent_state_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, runId, agentId, turnIndex, JSON.stringify(messages), tokenUsage.inputTokens, tokenUsage.outputTokens, tokenUsage.totalTokens, agentState ? JSON.stringify(agentState) : null, now.getTime());
        sql.prepare(`UPDATE agent_runs SET checkpoint_id = ? WHERE id = ?`).run(id, runId);
        return { id, runId, agentId, turnIndex, messages, tokenUsage, agentState, createdAt: now };
    }
    loadLatest(runId) {
        const row = raw(this.db).prepare(`
      SELECT * FROM execution_checkpoints
      WHERE run_id = ? ORDER BY turn_index DESC LIMIT 1
    `).get(runId);
        if (!row)
            return null;
        return {
            id: row['id'],
            runId: row['run_id'],
            agentId: row['agent_id'],
            turnIndex: row['turn_index'],
            messages: JSON.parse(row['messages_json']),
            tokenUsage: {
                inputTokens: row['input_tokens'],
                outputTokens: row['output_tokens'],
                totalTokens: row['total_tokens'],
            },
            agentState: row['agent_state_json']
                ? JSON.parse(row['agent_state_json'])
                : undefined,
            createdAt: new Date(row['created_at']),
        };
    }
    loadRecoverableRuns() {
        return raw(this.db).prepare(`
      SELECT id as runId, agent_id as agentId, input_json as inputJson, checkpoint_id as checkpointId
      FROM agent_runs WHERE status IN ('RUNNING', 'RESUMING')
    `).all();
    }
    markResuming(runId) {
        raw(this.db).prepare(`UPDATE agent_runs SET status = 'RESUMING' WHERE id = ?`).run(runId);
    }
}
//# sourceMappingURL=checkpoint-manager.js.map