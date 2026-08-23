import { Mutation } from "./WireTypes.js";
export declare class WirePolicy {
    validateReadBeforeWrite(m: Mutation): Promise<boolean>;
    validateOwnership(m: Mutation): Promise<boolean>;
    validateSideEffects(m: Mutation): Promise<boolean>;
}
//# sourceMappingURL=WirePolicy.d.ts.map