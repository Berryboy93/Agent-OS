import { WireEnforcer } from "./WireEnforcer.js";
export class WireMiddleware {
    enforcer = new WireEnforcer();
    async intercept(mutation) {
        const result = await this.enforcer.validate(mutation);
        if (!result.ok) {
            throw new Error(result.reason);
        }
        return mutation;
    }
}
//# sourceMappingURL=WireMiddleware.js.map