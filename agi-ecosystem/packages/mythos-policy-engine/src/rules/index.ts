import { MythosParser } from '../dsl/index.js';
import { MythosEvaluator, EvaluationContext, PolicyDecision } from '../evaluator/index.js';

export interface PolicyRegistry {
  [name: string]: string; // policy name -> DSL source
}

export class MythosEngine {
  private parser = new MythosParser();
  private evaluator = new MythosEvaluator();
  private policies = new Map<string, ReturnType<MythosParser['parse']>>();
  private registry: PolicyRegistry = {};

  registerPolicy(name: string, dslSource: string): void {
    const parsed = this.parser.parse(dslSource);
    this.policies.set(name, parsed);
    this.registry[name] = dslSource;
  }

  evaluate(eventType: string, context: Omit<EvaluationContext, 'event_type'>): PolicyDecision {
    const fullContext: EvaluationContext = { ...context, event_type: eventType };

    // Mythos overrides all — evaluate all registered policies
    for (const [name, policy] of this.policies) {
      const decision = this.evaluator.evaluate(policy, fullContext);
      if (!decision.allowed) {
        // First deny wins (Mythos is strict)
        return { ...decision, reason: `[${name}] ${decision.reason}` };
      }
    }

    return {
      allowed: true,
      action: { type: 'approve' },
      rule: 'default',
      reason: 'All policies passed',
      audit_log: { policies_checked: this.policies.size }
    };
  }

  evaluateAll(eventType: string, context: Omit<EvaluationContext, 'event_type'>): PolicyDecision[] {
    const fullContext: EvaluationContext = { ...context, event_type: eventType };
    const allDecisions: PolicyDecision[] = [];

    for (const [name, policy] of this.policies) {
      const decisions = this.evaluator.evaluateAll(policy, fullContext);
      allDecisions.push(...decisions.map(d => ({ ...d, reason: `[${name}] ${d.reason}` })));
    }

    return allDecisions;
  }

  getRegistry(): PolicyRegistry {
    return { ...this.registry };
  }

  getPolicySource(name: string): string | undefined {
    return this.registry[name];
  }
}
