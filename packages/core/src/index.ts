export * from './types.js';
export * from './errors.js';

export const AGENT_OS_VERSION = '3.0.0';

export const CONCURRENCY_DEFAULTS = {
  maxConcurrentRuns: 50,
  maxConcurrentAgentsPerWorker: 32,
  maxWorkerThreads: 16,
  maxConcurrentToolCalls: 10,
  workerMemoryLimitMb: 512,
  workerYoungMemoryLimitMb: 128,
} as const;

export const TOKEN_BUDGET_DEFAULTS: import('./types.js').TokenBudgetPolicy = {
  maxTotalTokens: 100_000,
  onBudgetExceeded: 'hard_stop',
  warnAt: 80_000,
};

export const SUPPORTED_DEPLOYMENT_TARGETS = ['local', 'docker', 'railway'] as const;
export type DeploymentTarget = (typeof SUPPORTED_DEPLOYMENT_TARGETS)[number];

export const MAX_TURNS = 20;
export const CHECKPOINT_INTERVAL_TURNS = 1;

export const APPROVAL_TIMEOUT_DEFAULT_MS = 72 * 60 * 60 * 1000;
export const DEPLOYMENT_APPROVAL_TIMEOUT_MS = 24 * 60 * 60 * 1000;
export const SUSPENDED_EXECUTION_RETENTION_DAYS = 90;

export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o';
