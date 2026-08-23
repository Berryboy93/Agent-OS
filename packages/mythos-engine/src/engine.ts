import { Policy, PolicyContext, PolicyDecision, Condition, ActionType } from "./types.js";

export class MythosEngine {
  private policies: Policy[] = [];
  private auditLog: Array<{ timestamp: number; context: PolicyContext; decision: PolicyDecision }> = [];

  constructor(policies: Policy[] = []) {
    this.policies = policies;
  }

  addPolicy(policy: Policy): void {
    this.policies.push(policy);
  }

  evaluate(context: PolicyContext): PolicyDecision {
    const decision: PolicyDecision = {
      allowed: true,
      actions: [],
      violatedRules: []
    };

    for (const policy of this.policies) {
      for (const rule of policy.rules) {
        if (!this.matchesTrigger(rule.when, context.eventType)) {
          continue;
        }

        const conditionMet = rule.condition 
          ? this.evaluateCondition(rule.condition, context)
          : true;

        if (conditionMet) {
          for (const action of rule.actions) {
            if (action.type === "reject") {
              decision.allowed = false;
            }
            decision.actions.push(action);
          }
          decision.violatedRules.push(rule.name);
        }
      }
    }

    this.auditLog.push({
      timestamp: Date.now(),
      context,
      decision: { ...decision }
    });

    return decision;
  }

  private matchesTrigger(ruleTrigger: string, eventType: string): boolean {
    return ruleTrigger === "any" || ruleTrigger === eventType;
  }

  private evaluateCondition(condition: Condition, context: PolicyContext): boolean {
    const left = this.resolveValue(condition.left, context);
    const right = this.resolveValue(typeof condition.right === "boolean" ? String(condition.right) : condition.right, context);

    switch (condition.operator) {
      case ">": return left > right;
      case "<": return left < right;
      case ">=": return left >= right;
      case "<=": return left <= right;
      case "==": return left === right;
      case "!=": return left !== right;
      default: return false;
    }
  }

  private resolveValue(value: string | number, context: PolicyContext): number | string | boolean {
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value;
    if (value === "risk") return context.risk;
    if (value === "agent.trust") return context.agentTrust;
    if (value === "agentId") return context.agentId;
    return value;
  }

  getAuditLog(): typeof this.auditLog {
    return [...this.auditLog];
  }

  checkPrivilegeEscalation(agentId: string, requestedCapability: string): boolean {
    const context: PolicyContext = {
      eventType: "agent_spawn",
      risk: 100,
      agentId,
      agentTrust: 0,
      action: requestedCapability,
      payload: { escalation: true }
    };

    const decision = this.evaluate(context);
    return decision.allowed;
  }
}
