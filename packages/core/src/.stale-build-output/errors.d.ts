export type AgentError = {
    code: 'TOOL_ERROR';
    message: string;
    toolName: string;
    cause?: unknown;
} | {
    code: 'ADAPTER_ERROR';
    message: string;
    provider: string;
    statusCode?: number;
    cause?: unknown;
} | {
    code: 'MAX_ITERATIONS_EXCEEDED';
    message: string;
    iterations: number;
} | {
    code: 'LOOP_TIME_BUDGET_EXCEEDED';
    message: string;
    elapsedMs: number;
    budgetMs: number;
} | {
    code: 'VALIDATION_ERROR';
    message: string;
    field?: string;
    cause?: unknown;
} | {
    code: 'TIMEOUT';
    message: string;
    timeoutMs: number;
    stepId?: string;
} | {
    code: 'PIPELINE_HANDOFF_FAILED';
    message: string;
    fromAgent: string;
    toAgent: string;
    cause?: unknown;
} | {
    code: 'BUDGET_EXCEEDED';
    message: string;
    executionId?: string;
    consumedTokens?: {
        input: number;
        output: number;
        total: number;
    };
    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    budget?: number;
    maxAllowed?: number;
} | {
    code: 'BUDGET_WARNING';
    message: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    budget: number;
    pct: number;
} | {
    code: 'APPROVAL_EXPIRED';
    message: string;
    approvalId: string;
    expiredAt?: Date;
} | {
    code: 'CHECKPOINT_WRITE_FAILED';
    message: string;
    stepId?: string;
    runId?: string;
    cause?: unknown;
} | {
    code: 'UNDECLARED_SIDE_EFFECT';
    message: string;
    toolName: string;
    sideEffect: string;
} | {
    code: 'CANCELLATION';
    message: string;
    cancelledAt?: Date;
    requestedBy?: string;
} | {
    code: 'CONCURRENCY_LIMIT';
    message: string;
    limit: number;
    current: number;
} | {
    code: 'PIPELINE_ERROR';
    message: string;
    stepId?: string;
    cause?: unknown;
} | {
    code: 'RUNTIME_ERROR';
    message: string;
    cause?: unknown;
} | {
    code: 'NOT_FOUND';
    message: string;
    resource: string;
    id: string;
} | {
    code: 'UNAUTHORIZED';
    message: string;
} | {
    code: 'PLUGIN_ERROR';
    message: string;
    pluginName: string;
    cause?: unknown;
} | {
    code: 'WORKER_ERROR';
    message: string;
    runId?: string;
    cause?: unknown;
};
export declare class AgentOSError extends Error {
    readonly agentError: AgentError;
    constructor(agentError: AgentError);
    static toolError(toolName: string, message: string, cause?: unknown): AgentOSError;
    static adapterError(provider: string, message: string, cause?: unknown): AgentOSError;
    static budgetExceeded(usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    }, budget: number, executionId?: string): AgentOSError;
    static budgetWarning(usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    }, budget: number, pct: number): AgentOSError;
    static maxIterationsExceeded(iterations: number): AgentOSError;
    static loopTimeBudgetExceeded(elapsedMs: number, budgetMs: number): AgentOSError;
    static timeout(timeoutMs: number, stepId?: string): AgentOSError;
    static pipelineHandoffFailed(fromAgent: string, toAgent: string, cause?: unknown): AgentOSError;
    static approvalExpired(approvalId: string, expiredAt?: Date): AgentOSError;
    static checkpointWriteFailed(runId: string, message: string, cause?: unknown): AgentOSError;
    static undeclaredSideEffect(toolName: string, sideEffect: string): AgentOSError;
    static cancellation(requestedBy?: string): AgentOSError;
    static concurrencyLimit(limit: number, current: number): AgentOSError;
    static validationError(message: string, field?: string): AgentOSError;
    static pipelineError(message: string, stepId?: string, cause?: unknown): AgentOSError;
    static runtimeError(message: string, cause?: unknown): AgentOSError;
    static notFound(resource: string, id: string): AgentOSError;
    static pluginError(pluginName: string, message: string, cause?: unknown): AgentOSError;
    static workerError(message: string, runId?: string, cause?: unknown): AgentOSError;
}
//# sourceMappingURL=errors.d.ts.map