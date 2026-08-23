import { WirePolicy } from "./WirePolicy.js";
export class WireEnforcer {
    policy;
    skewToleranceMsec;
    maxAgeMsec;
    maxPayloadBytes;
    maxTargetLength;
    constructor(policy, options) {
        this.policy = policy ?? new WirePolicy();
        this.skewToleranceMsec = options?.skewToleranceMsec ?? 5000;
        this.maxAgeMsec = options?.maxAgeMsec ?? 300000; // 5 minutes default
        this.maxPayloadBytes = options?.maxPayloadBytes ?? 10000; // 10KB default
        this.maxTargetLength = options?.maxTargetLength ?? 256;
    }
    async validate(mutation) {
        // Validate mutation object itself
        if (!mutation || typeof mutation !== "object" || Array.isArray(mutation)) {
            return {
                ok: false,
                reason: "Invalid mutation: must be a non-null object",
            };
        }
        // Validate required string fields (non-empty)
        if (typeof mutation.id !== "string" || mutation.id.length === 0) {
            return {
                ok: false,
                reason: "Invalid mutation: id must be a non-empty string",
            };
        }
        if (typeof mutation.actor !== "string" || mutation.actor.length === 0) {
            return {
                ok: false,
                reason: "Invalid mutation: actor must be a non-empty string",
            };
        }
        if (typeof mutation.action !== "string" ||
            mutation.action.length === 0) {
            return {
                ok: false,
                reason: "Invalid mutation: action must be a non-empty string",
            };
        }
        // Validate timestamp - CRITICAL: Check for NaN, Infinity, etc.
        if (typeof mutation.timestamp !== "number" ||
            !Number.isFinite(mutation.timestamp) ||
            mutation.timestamp <= 0) {
            return {
                ok: false,
                reason: "Invalid mutation: timestamp must be a positive finite number (milliseconds since epoch)",
            };
        }
        // Check timestamp is not too far in future (clock skew tolerance)
        const now = Date.now();
        if (mutation.timestamp > now + this.skewToleranceMsec) {
            return {
                ok: false,
                reason: `Invalid mutation: timestamp is too far in future (max skew: ${this.skewToleranceMsec}ms)`,
            };
        }
        // Check timestamp is not too old (prevent replay attacks)
        if (mutation.timestamp < now - this.maxAgeMsec) {
            return {
                ok: false,
                reason: `Invalid mutation: timestamp is too old (max age: ${this.maxAgeMsec}ms)`,
            };
        }
        // Validate optional target field if present
        if (mutation.target !== undefined && mutation.target !== null) {
            if (typeof mutation.target !== "string") {
                return {
                    ok: false,
                    reason: "Invalid mutation: target must be a string (if provided)",
                };
            }
            if (mutation.target.length === 0) {
                return {
                    ok: false,
                    reason: "Invalid mutation: target must be non-empty (if provided)",
                };
            }
            if (mutation.target.length > this.maxTargetLength) {
                return {
                    ok: false,
                    reason: `Invalid mutation: target exceeds length limit (${this.maxTargetLength} chars)`,
                };
            }
        }
        // Validate optional payload field if present
        if (mutation.payload !== undefined && mutation.payload !== null) {
            try {
                const payloadString = JSON.stringify(mutation.payload);
                const payloadBytes = Buffer.byteLength(payloadString, "utf8");
                if (payloadBytes > this.maxPayloadBytes) {
                    return {
                        ok: false,
                        reason: `Invalid mutation: payload exceeds size limit (${this.maxPayloadBytes} bytes)`,
                    };
                }
            }
            catch (error) {
                return {
                    ok: false,
                    reason: `Invalid mutation: payload is not JSON-serializable`,
                };
            }
        }
        // Now validate with policies
        const details = {
            timestamp: true,
            readBeforeWrite: false,
            ownership: false,
            sideEffects: false,
        };
        // Validate read-before-write constraint
        try {
            const readBeforeWriteValid = await this.policy.validateReadBeforeWrite(mutation);
            if (!readBeforeWriteValid) {
                return {
                    ok: false,
                    reason: "Read-before-write constraint violated: state must be read before mutation",
                };
            }
            details.readBeforeWrite = true;
        }
        catch (error) {
            return {
                ok: false,
                reason: `Read-before-write validation failed: ${this.extractErrorMessage(error)}`,
            };
        }
        // Validate ownership constraint
        try {
            const ownershipValid = await this.policy.validateOwnership(mutation);
            if (!ownershipValid) {
                return {
                    ok: false,
                    reason: `Ownership constraint violated: actor '${mutation.actor}' does not own action '${mutation.action}'`,
                };
            }
            details.ownership = true;
        }
        catch (error) {
            return {
                ok: false,
                reason: `Ownership validation failed: ${this.extractErrorMessage(error)}`,
            };
        }
        // Validate side effects constraint
        try {
            const sideEffectsValid = await this.policy.validateSideEffects(mutation);
            if (!sideEffectsValid) {
                return {
                    ok: false,
                    reason: "Side-effects constraint violated: unsafe cascading writes detected",
                };
            }
            details.sideEffects = true;
        }
        catch (error) {
            return {
                ok: false,
                reason: `Side-effects validation failed: ${this.extractErrorMessage(error)}`,
            };
        }
        // All validations passed
        return {
            ok: true,
            validatedAt: new Date().toISOString(),
            details,
        };
    }
    extractErrorMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === "string") {
            return error;
        }
        try {
            return JSON.stringify(error);
        }
        catch {
            return String(error);
        }
    }
}
//# sourceMappingURL=WireEnforcer.js.map