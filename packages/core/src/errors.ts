export type AgentError =
  | { code: 'TOOL_ERROR'; message: string; toolName: string; cause?: unknown }
  | { code: 'ADAPTER_ERROR'; message: string; provider: string; statusCode?: number; cause?: unknown }
  | { code: 'MAX_ITERATIONS_EXCEEDED'; message: string; iterations: number }
  | { code: 'LOOP_TIME_BUDGET_EXCEEDED'; message: string; elapsedMs: number; budgetMs: number }
  | { code: 'VALIDATION_ERROR'; message: string; field?: string; cause?: unknown }
  | { code: 'TIMEOUT'; message: string; timeoutMs: number; stepId?: string }
  | { code: 'PIPELINE_HANDOFF_FAILED'; message: string; fromAgent: string; toAgent: string; cause?: unknown }
  | { code: 'BUDGET_EXCEEDED'; message: string; executionId?: string; consumedTokens?: { input: number; output: number; total: number }; usage?: { inputTokens: number; outputTokens: number; totalTokens: number }; budget?: number; maxAllowed?: number }
  | { code: 'BUDGET_WARNING'; message: string; usage: { inputTokens: number; outputTokens: number; totalTokens: number }; budget: number; pct: number }
  | { code: 'APPROVAL_EXPIRED'; message: string; approvalId: string; expiredAt?: Date }
  | { code: 'CHECKPOINT_WRITE_FAILED'; message: string; stepId?: string; runId?: string; cause?: unknown }
  | { code: 'UNDECLARED_SIDE_EFFECT'; message: string; toolName: string; sideEffect: string }
  | { code: 'CANCELLATION'; message: string; cancelledAt?: Date; requestedBy?: string }
  | { code: 'CONCURRENCY_LIMIT'; message: string; limit: number; current: number }
  | { code: 'PIPELINE_ERROR'; message: string; stepId?: string; cause?: unknown }
  | { code: 'RUNTIME_ERROR'; message: string; cause?: unknown }
  | { code: 'NOT_FOUND'; message: string; resource: string; id: string }
  | { code: 'UNAUTHORIZED'; message: string }
  | { code: 'PLUGIN_ERROR'; message: string; pluginName: string; cause?: unknown }
  | { code: 'WORKER_ERROR'; message: string; runId?: string; cause?: unknown };

export class AgentOSError extends Error {
  readonly agentError: AgentError;

  constructor(agentError: AgentError) {
    super(agentError.message);
    this.name = 'AgentOSError';
    this.agentError = agentError;
  }

  static toolError(toolName: string, message: string, cause?: unknown): AgentOSError {
    return new AgentOSError({ code: 'TOOL_ERROR', message, toolName, cause });
  }

  static adapterError(provider: string, message: string, cause?: unknown): AgentOSError {
    return new AgentOSError({ code: 'ADAPTER_ERROR', message, provider, cause });
  }

  static budgetExceeded(
    usage: { inputTokens: number; outputTokens: number; totalTokens: number },
    budget: number,
    executionId?: string
  ): AgentOSError {
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

  static budgetWarning(
    usage: { inputTokens: number; outputTokens: number; totalTokens: number },
    budget: number,
    pct: number
  ): AgentOSError {
    return new AgentOSError({
      code: 'BUDGET_WARNING',
      message: `Token budget at ${Math.round(pct * 100)}%: used ${usage.totalTokens.toLocaleString()} of ${budget.toLocaleString()}`,
      usage,
      budget,
      pct,
    });
  }

  static maxIterationsExceeded(iterations: number): AgentOSError {
    return new AgentOSError({
      code: 'MAX_ITERATIONS_EXCEEDED',
      message: `Maximum iterations exceeded: ${iterations}`,
      iterations,
    });
  }

  static loopTimeBudgetExceeded(elapsedMs: number, budgetMs: number): AgentOSError {
    return new AgentOSError({
      code: 'LOOP_TIME_BUDGET_EXCEEDED',
      message: `Loop time budget exceeded: ${elapsedMs}ms elapsed, ${budgetMs}ms allowed`,
      elapsedMs,
      budgetMs,
    });
  }

  static timeout(timeoutMs: number, stepId?: string): AgentOSError {
    return new AgentOSError({
      code: 'TIMEOUT',
      message: `Execution timed out after ${timeoutMs}ms${stepId ? ` at step ${stepId}` : ''}`,
      timeoutMs,
      ...(stepId !== undefined ? { stepId } : {}),
    });
  }

  static pipelineHandoffFailed(fromAgent: string, toAgent: string, cause?: unknown): AgentOSError {
    return new AgentOSError({
      code: 'PIPELINE_HANDOFF_FAILED',
      message: `Pipeline handoff failed from ${fromAgent} to ${toAgent}`,
      fromAgent,
      toAgent,
      cause,
    });
  }

  static approvalExpired(approvalId: string, expiredAt?: Date): AgentOSError {
    return new AgentOSError({
      code: 'APPROVAL_EXPIRED',
      message: `Approval request ${approvalId} expired`,
      approvalId,
      expiredAt,
    });
  }

  static checkpointWriteFailed(runId: string, message: string, cause?: unknown): AgentOSError {
    return new AgentOSError({
      code: 'CHECKPOINT_WRITE_FAILED',
      message,
      runId,
      cause,
    });
  }

  static undeclaredSideEffect(toolName: string, sideEffect: string): AgentOSError {
    return new AgentOSError({
      code: 'UNDECLARED_SIDE_EFFECT',
      message: `Tool '${toolName}' performed undeclared side effect: ${sideEffect}`,
      toolName,
      sideEffect,
    });
  }

  static cancellation(requestedBy?: string): AgentOSError {
    return new AgentOSError({
      code: 'CANCELLATION',
      message: 'Execution was cancelled',
      cancelledAt: new Date(),
      ...(requestedBy !== undefined ? { requestedBy } : {}),
    });
  }

  static concurrencyLimit(limit: number, current: number): AgentOSError {
    return new AgentOSError({
      code: 'CONCURRENCY_LIMIT',
      message: `Concurrency limit reached: ${current}/${limit} active runs`,
      limit,
      current,
    });
  }

  static validationError(message: string, field?: string): AgentOSError {
    const err: AgentError = { code: 'VALIDATION_ERROR', message };
    if (field !== undefined) (err as { field?: string }).field = field;
    return new AgentOSError(err);
  }

  static pipelineError(message: string, stepId?: string, cause?: unknown): AgentOSError {
    const err: AgentError = { code: 'PIPELINE_ERROR', message };
    if (stepId !== undefined) (err as { stepId?: string }).stepId = stepId;
    if (cause !== undefined) (err as { cause?: unknown }).cause = cause;
    return new AgentOSError(err);
  }

  static runtimeError(message: string, cause?: unknown): AgentOSError {
    return new AgentOSError({ code: 'RUNTIME_ERROR', message, cause });
  }

  static notFound(resource: string, id: string): AgentOSError {
    return new AgentOSError({
      code: 'NOT_FOUND',
      message: `${resource} with id '${id}' not found`,
      resource,
      id,
    });
  }

  static pluginError(pluginName: string, message: string, cause?: unknown): AgentOSError {
    return new AgentOSError({ code: 'PLUGIN_ERROR', message, pluginName, cause });
  }

  static workerError(message: string, runId?: string, cause?: unknown): AgentOSError {
    const err: AgentError = { code: 'WORKER_ERROR', message };
    if (runId !== undefined) (err as { runId?: string }).runId = runId;
    if (cause !== undefined) (err as { cause?: unknown }).cause = cause;
    return new AgentOSError(err);
  }
}
