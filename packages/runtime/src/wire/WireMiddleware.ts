import { WireEnforcer } from "./WireEnforcer.js"
import { Mutation } from "./WireTypes.js"

export class WireMiddleware {
  private enforcer = new WireEnforcer()

  async intercept(mutation: Mutation) {
    const result = await this.enforcer.validate(mutation)

    if (!result.ok) {
      throw new Error(result.reason)
    }

    return mutation
  }
}
