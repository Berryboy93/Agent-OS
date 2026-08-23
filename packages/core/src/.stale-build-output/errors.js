export class AgentOSError extends Error {
    agentError;
    constructor(agentError) {
        super(agentError.message);
        this.name = 'AgentOSError';
        this.agentError = agentError;
    }
    static toolError(toolName, message, cause) {
        return new AgentOSError({ code: 'TOOL_ERROR', message, toolName, cause });
    }
    static adapterError(provider, message, cause) {
        return new AgentOSError({ code: 'ADAPTER_ERROR', message, provider, cause });
    }
    static budgetExceeded(usage, budget, executionId) {
        return new AgentOSError({
            code: 'BUDGET_EXCEEDED',
            message: `Token budget exceeded: used ${usage.totalTokens.toLocaleString()}, limit ${budget.toLocaleString()}`,
            usage,
            budget,
            executionId,
            consumedTokens: { input: usage.inputTokens, output: usage.outputTokens, total: usage.totalTokens },
            maxAllowed: budget,
        });
    }
    static budgetWarning(usage, budget, pct) {
        return new AgentOSError({
            code: 'BUDGET_WARNING',
            message: `Token budget at ${Math.round(pct * 100)}%: used ${usage.totalTokens.toLocaleString()} of ${budget.toLocaleString()}`,
            usage,
            budget,
            pct,
        });
    }
    static maxIterationsExceeded(iterations) {
        return new AgentOSError({
            code: 'MAX_ITERATIONS_EXCEEDED',
            message: `Maximum iterations exceeded: ${iterations}`,
            iterations,
        });
    }
    static loopTimeBudgetExceeded(elapsedMs, budgetMs) {
        return new AgentOSError({
            code: 'LOOP_TIME_BUDGET_EXCEEDED',
            message: `Loop time budget exceeded: ${elapsedMs}ms elapsed, ${budgetMs}ms allowed`,
            elapsedMs,
            budgetMs,
        });
    }
    static timeout(timeoutMs, stepId) {
        return new AgentOSError({
            code: 'TIMEOUT',
            message: `Execution timed out after ${timeoutMs}ms${stepId ? ` at step ${stepId}` : ''}`,
            timeoutMs,
            ...(stepId !== undefined ? { stepId } : {}),
        });
    }
    static pipelineHandoffFailed(fromAgent, toAgent, cause) {
        return new AgentOSError({
            code: 'PIPELINE_HANDOFF_FAILED',
            message: `Pipeline handoff failed from ${fromAgent} to ${toAgent}`,
            fromAgent,
            toAgent,
            cause,
        });
    }
    static approvalExpired(approvalId, expiredAt) {
        return new AgentOSError({
            code: 'APPROVAL_EXPIRED',
            message: `Approval request ${approvalId} expired`,
            approvalId,
            expiredAt,
        });
    }
    static checkpointWriteFailed(runId, message, cause) {
        return new AgentOSError({
            code: 'CHECKPOINT_WRITE_FAILED',
            message,
            runId,
            cause,
        });
    }
    static undeclaredSideEffect(toolName, sideEffect) {
        return new AgentOSError({
            code: 'UNDECLARED_SIDE_EFFECT',
            message: `Tool '${toolName}' performed undeclared side effect: ${sideEffect}`,
            toolName,
            sideEffect,
        });
    }
    static cancellation(requestedBy) {
        return new AgentOSError({
            code: 'CANCELLATION',
            message: 'Execution was cancelled',
            cancelledAt: new Date(),
            ...(requestedBy !== undefined ? { requestedBy } : {}),
        });
    }
    static concurrencyLimit(limit, current) {
        return new AgentOSError({
            code: 'CONCURRENCY_LIMIT',
            message: `Concurrency limit reached: ${current}/${limit} active runs`,
            limit,
            current,
        });
    }
    static validationError(message, field) {
        const err = { code: 'VALIDATION_ERROR', message };
        if (field !== undefined)
            err.field = field;
        return new AgentOSError(err);
    }
    static pipelineError(message, stepId, cause) {
        const err = { code: 'PIPELINE_ERROR', message };
        if (stepId !== undefined)
            err.stepId = stepId;
        if (cause !== undefined)
            err.cause = cause;
        return new AgentOSError(err);
    }
    static runtimeError(message, cause) {
        return new AgentOSError({ code: 'RUNTIME_ERROR', message, cause });
    }
    static notFound(resource, id) {
        return new AgentOSError({
            code: 'NOT_FOUND',
            message: `${resource} with id '${id}' not found`,
            resource,
            id,
        });
    }
    static pluginError(pluginName, message, cause) {
        return new AgentOSError({ code: 'PLUGIN_ERROR', message, pluginName, cause });
    }
    static workerError(message, runId, cause) {
        const err = { code: 'WORKER_ERROR', message };
        if (runId !== undefined)
            err.runId = runId;
        if (cause !== undefined)
            err.cause = cause;
        return new AgentOSError(err);
    }
}
//# sourceMappingURL=errors.js.map