/**
 * AGI Ecosystem Error Hierarchy
 * All errors are serializable and traceable
 */
export declare class AGIError extends Error {
    readonly code: string;
    readonly traceId: string;
    readonly timestamp: number;
    readonly context?: Record<string, unknown>;
    constructor(options: {
        code: string;
        message: string;
        traceId?: string;
        context?: Record<string, unknown>;
        cause?: Error;
    });
    toJSON(): Record<string, unknown>;
}
export declare class ValidationError extends AGIError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class ExecutionError extends AGIError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class PolicyViolationError extends AGIError {
    readonly ruleId: string;
    constructor(ruleId: string, message: string, context?: Record<string, unknown>);
}
export declare class SecurityError extends AGIError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class InfrastructureError extends AGIError {
    constructor(message: string, context?: Record<string, unknown>);
}
//# sourceMappingURL=AGIError.d.ts.map