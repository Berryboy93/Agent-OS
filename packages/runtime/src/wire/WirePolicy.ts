import { Mutation } from "./WireTypes.js"

export class WirePolicy {
  async validateReadBeforeWrite(m: Mutation): Promise<boolean> {
    // placeholder: enforce "state must be read before mutation"
    return true
  }

  async validateOwnership(m: Mutation): Promise<boolean> {
    // ensures correct skill/domain owns action
    return true
  }

  async validateSideEffects(m: Mutation): Promise<boolean> {
    // prevents unsafe cascading writes
    return true
  }
}
