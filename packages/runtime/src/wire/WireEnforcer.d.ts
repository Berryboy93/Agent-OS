import { Mutation } from "./WireTypes.js";
import { WirePolicy } from "./WirePolicy.js";
export interface WireEnforcerOptions {
    skewToleranceMsec?: number;
    maxAgeMsec?: number;
    maxPayloadBytes?: number;
    maxTargetLength?: number;
}
export interface ValidationDetails {
    timestamp: boolean;
    readBeforeWrite: boolean;
    ownership: boolean;
    sideEffects: boolean;
}
export interface SuccessResult {
    ok: true;
    validatedAt: string;
    details: ValidationDetails;
}
export interface FailureResult {
    ok: false;
    reason: string;
}
export type EnforcerCheckResult = SuccessResult | FailureResult;
export declare class WireEnforcer {
    private policy;
    private skewToleranceMsec;
    private maxAgeMsec;
    private maxPayloadBytes;
    private maxTargetLength;
    constructor(policy?: WirePolicy, options?: WireEnforcerOptions);
    validate(mutation: Mutation): Promise<EnforcerCheckResult>;
    private extractErrorMessage;
}
//# sourceMappingURL=WireEnforcer.d.ts.map