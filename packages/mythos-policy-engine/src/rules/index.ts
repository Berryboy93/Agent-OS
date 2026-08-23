import type { ParsedPolicy } from '../dsl/index.js';
import { MythosParser } from '../dsl/index.js';
import { MythosEvaluator, type EvaluationContext, type PolicyDecision } from '../evaluator/index.js';

export interface PolicyRegistry {
  [name: string]: string; // policy name -> DSL source
}

export class MythosEngine {
  private parser = new MythosParser();
  private evaluator = new MythosEvaluator();
  private policies = new Map<string, ParsedPolicy>();
  private registry: PolicyRegistry = {};

  registerPolicy(name: string, dslSource: string): void {
    const parsed = this.parser.parse(dslSource);
    this.policies.set(name, parsed);
    this.registry[name] = dslSource;
  }

  evaluate(eventType: string, context: Omit<EvaluationContext, 'event_type'>): PolicyDecision {
    const fullContext: EvaluationContext = { ...context, event_type: eventType };
    const allReasons: string[] = [];

    // Mythos overrides all — evaluate all registered policies
    for (const [name, policy] of this.policies) {
      const decision = this.evaluator.evaluate(fullContext, policy);
      if (!decision.allowed) {
        // First deny wins (Mythos is strict)
        return {
          allowed: false,
          reasons: [`[${name}] ${decision.reasons.join('; ')}`]
        };
      }
      // Track reasons from passing policies
      if (decision.reasons.length > 0) {
        allReasons.push(...decision.reasons.map(r => `[${name}] ${r}`));
      }
    }

    return {
      allowed: true,
      reasons: allReasons.length > 0 ? allReasons : [`All ${this.policies.size} policies passed`]
    };
  }

  getRegistry(): PolicyRegistry {
    return { ...this.registry };
  }

  getPolicySource(name: string): string | undefined {
    return this.registry[name];
  }
}