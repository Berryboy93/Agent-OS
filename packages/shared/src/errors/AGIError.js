"use strict";
/**
 * AGI Ecosystem Error Hierarchy
 * All errors are serializable and traceable
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfrastructureError = exports.SecurityError = exports.PolicyViolationError = exports.ExecutionError = exports.ValidationError = exports.AGIError = void 0;
class AGIError extends Error {
    code;
    traceId;
    timestamp;
    context;
    constructor(options) {
        super(options.message, { cause: options.cause });
        this.code = options.code;
        this.traceId = options.traceId ?? crypto.randomUUID();
        this.timestamp = Date.now();
        this.context = options.context;
        this.name = this.constructor.name;
    }
    toJSON() {
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
exports.AGIError = AGIError;
class ValidationError extends AGIError {
    constructor(message, context) {
        super({ code: 'VALIDATION_ERROR', message, context });
    }
}
exports.ValidationError = ValidationError;
class ExecutionError extends AGIError {
    constructor(message, context) {
        super({ code: 'EXECUTION_ERROR', message, context });
    }
}
exports.ExecutionError = ExecutionError;
class PolicyViolationError extends AGIError {
    ruleId;
    constructor(ruleId, message, context) {
        super({ code: 'POLICY_VIOLATION', message, context });
        this.ruleId = ruleId;
    }
}
exports.PolicyViolationError = PolicyViolationError;
class SecurityError extends AGIError {
    constructor(message, context) {
        super({ code: 'SECURITY_ERROR', message, context });
    }
}
exports.SecurityError = SecurityError;
class InfrastructureError extends AGIError {
    constructor(message, context) {
        super({ code: 'INFRASTRUCTURE_ERROR', message, context });
    }
}
exports.InfrastructureError = InfrastructureError;
//# sourceMappingURL=AGIError.js.map