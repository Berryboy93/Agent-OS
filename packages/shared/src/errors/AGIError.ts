/**
 * AGI Ecosystem Error Hierarchy
 * All errors are serializable and traceable
 */

export class AGIError extends Error {
  public readonly code: string;
  public readonly traceId: string;
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;

  constructor(options: {
    code: string;
    message: string;
    traceId?: string;
    context?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(options.message, { cause: options.cause });
    this.code = options.code;
    this.traceId = options.traceId ?? crypto.randomUUID();
    this.timestamp = Date.now();
    this.context = options.context;
    this.name = this.constructor.name;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      traceId: this.traceId,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
    };
  }
}

export class ValidationError extends AGIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({ code: 'VALIDATION_ERROR', message, context });
  }
}

export class ExecutionError extends AGIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({ code: 'EXECUTION_ERROR', message, context });
  }
}

export class PolicyViolationError extends AGIError {
  public readonly ruleId: string;

  constructor(ruleId: string, message: string, context?: Record<string, unknown>) {
    super({ code: 'POLICY_VIOLATION', message, context });
    this.ruleId = ruleId;
  }
}

export class SecurityError extends AGIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({ code: 'SECURITY_ERROR', message, context });
  }
}

export class InfrastructureError extends AGIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({ code: 'INFRASTRUCTURE_ERROR', message, context });
  }
}
