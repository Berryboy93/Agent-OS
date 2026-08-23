import type { ExecutionCheckpoint, Message, TokenUsage } from '@agent-os/core';
import type { AgentOSDb } from '@agent-os/db';
export declare class CheckpointManager {
    private readonly db;
    constructor(db: AgentOSDb);
    write(runId: string, agentId: string, turnIndex: number, messages: Message[], tokenUsage: TokenUsage, agentState?: Record<string, unknown>): ExecutionCheckpoint;
    loadLatest(runId: string): ExecutionCheckpoint | null;
    loadRecoverableRuns(): Array<{
        runId: string;
        agentId: string;
        inputJson: string;
        checkpointId: string | null;
    }>;
    markResuming(runId: string): void;
}
//# sourceMappingURL=checkpoint-manager.d.ts.map