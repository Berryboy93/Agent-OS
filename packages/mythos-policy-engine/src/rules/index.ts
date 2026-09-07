import type { ParsedPolicy } from '../dsl/index.js';
import { MythosParser } from '../dsl/index.js';
import {
  MythosEvaluator,
  type EvaluationContext,
  type PolicyDecision,
} from '../evaluator/index.js';

export interface PolicyRegistry {
  [name: string]: string;
}

export interface PolicyEvaluationInput {
  agent_id: string;
  risk_score?: number;
  trust_level?: number;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
  risk_threshold?: number;
  [key: string]: unknown;
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

  evaluate(
    eventType: string,
    context: PolicyEvaluationInput,
  ): PolicyDecision {
    const fullContext: EvaluationContext = {
      ...context,
      event_type: eventType,
    };

    const allReasons: string[] = [];

    for (const [name, policy] of this.policies) {
      const decision = this.evaluator.evaluate(fullContext, policy);

      if (!decision.allowed) {
        return {
          allowed: false,
          reasons: decision.reasons.map(
            reason => `[${name}] ${reason}`,
          ),
          rule: decision.rule,
          action: decision.action,
        };
      }

      allReasons.push(
        ...decision.reasons.map(
          reason => `[${name}] ${reason}`,
        ),
      );
    }

    return {
      allowed: true,
      reasons:
        allReasons.length > 0
          ? allReasons
          : [`All ${this.policies.size} policies passed`],
    };
  }

  getRegistry(): PolicyRegistry {
    return { ...this.registry };
  }

  getPolicySource(name: string): string | undefined {
    return this.registry[name];
  }
}
