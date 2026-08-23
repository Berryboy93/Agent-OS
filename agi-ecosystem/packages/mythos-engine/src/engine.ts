import type { Policy, PolicyContext, PolicyDecision, Condition } from './types.js';

export class MythosEngine {
  private policy: Policy;

  constructor(policy: Policy) {
    this.policy = policy;
  }

  evaluate(context: PolicyContext): PolicyDecision {
    const violatedRules: string[] = [];
    const actions: PolicyDecision['actions'] = [];

    for (const rule of this.policy.rules) {
      if (!this.matchesTrigger(rule.when, context.eventType)) continue;

      const conditionMet =
        rule.condition === null || this.evaluateCondition(rule.condition, context);

      if (conditionMet) {
        violatedRules.push(rule.name);
        actions.push(...rule.actions);
      }
    }

    return {
      allowed: !actions.some(a => a.type === 'reject'),
      actions,
      violatedRules,
    };
  }

  private matchesTrigger(trigger: string, eventType: string): boolean {
    return trigger === 'any' || trigger === eventType;
  }

  private evaluateCondition(condition: Condition, context: PolicyContext): boolean {
    const left = this.resolveValue(condition.left, context);
    const right = this.resolveValue(condition.right, context);

    const compareLeft = typeof left === 'boolean' ? (left ? 'true' : 'false') : left;
    const compareRight = typeof right === 'boolean' ? (right ? 'true' : 'false') : right;

    switch (condition.operator) {
      case '>':  return compareLeft > compareRight;
      case '<':  return compareLeft < compareRight;
      case '>=': return compareLeft >= compareRight;
      case '<=': return compareLeft <= compareRight;
      case '==': return left === right;
      case '!=': return left !== right;
      default:   return false;
    }
  }

  private resolveValue(
    value: string | number | boolean,
    context: PolicyContext
  ): string | number | boolean {
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (value === 'risk') return context.risk;
    if (value === 'agent.trust') return context.agentTrust;
    if (value === 'agentId') return context.agentId;
    return value;
  }
}
