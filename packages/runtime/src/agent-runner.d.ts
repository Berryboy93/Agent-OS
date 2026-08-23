import type { AgentRunnerConfig, AgentResult, TokenBudgetPolicy } from "@agent-os/core";
import type { AgentOSDb } from "@agent-os/db";
import type { EventStore } from "@agent-os/events";
export interface AgentRunnerOptions extends AgentRunnerConfig {
    db: AgentOSDb;
    eventStore: EventStore;
    concurrencyLimit?: number;
    defaultTokenBudget?: TokenBudgetPolicy;
}
export interface RunInput {
    agentId: string;
    input: Record<string, unknown>;
    runId?: string;
    systemPrompt?: string;
    tokenBudget?: TokenBudgetPolicy;
    metadata?: Record<string, unknown>;
}
export declare class AgentRunner {
    private readonly options;
    private readonly scheduler;
    private readonly checkpoints;
    private readonly db;
    private readonly eventStore;
    private readonly maxConcurrency;
    private readonly pending;
    private activeRuns;
    constructor(options: AgentRunnerOptions);
    run(input: RunInput): Promise<AgentResult>;
    private runWorker;
    recoverCrashedRuns(): Promise<number>;
    get stats(): {
        activeRuns: number;
        maxConcurrency: number;
        pendingCount: number;
        scheduler: {
            name: string;
            waiting: number;
            active: number;
            concurrency: number;
        };
    };
}
//# sourceMappingURL=agent-runner.d.ts.map