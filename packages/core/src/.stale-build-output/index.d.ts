export * from './types.js';
export * from './errors.js';
export declare const AGENT_OS_VERSION = "3.0.0";
export declare const CONCURRENCY_DEFAULTS: {
    readonly maxConcurrentRuns: 50;
    readonly maxConcurrentAgentsPerWorker: 32;
    readonly maxWorkerThreads: 16;
    readonly maxConcurrentToolCalls: 10;
    readonly workerMemoryLimitMb: 512;
    readonly workerYoungMemoryLimitMb: 128;
};
export declare const TOKEN_BUDGET_DEFAULTS: import('./types.js').TokenBudgetPolicy;
export declare const SUPPORTED_DEPLOYMENT_TARGETS: readonly ["local", "docker", "railway"];
export type DeploymentTarget = (typeof SUPPORTED_DEPLOYMENT_TARGETS)[number];
export declare const MAX_TURNS = 20;
export declare const CHECKPOINT_INTERVAL_TURNS = 1;
export declare const APPROVAL_TIMEOUT_DEFAULT_MS: number;
export declare const DEPLOYMENT_APPROVAL_TIMEOUT_MS: number;
export declare const SUSPENDED_EXECUTION_RETENTION_DAYS = 90;
export declare const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
export declare const DEFAULT_OPENAI_MODEL = "gpt-4o";
//# sourceMappingURL=index.d.ts.map