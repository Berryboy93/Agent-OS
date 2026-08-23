import type { ParsedPolicy } from '../dsl/index.js';

export interface EvaluationContext {
  event_type: string;
  agent_id: string;
  data: Record<string, any>;
}

export interface PolicyDecision {
  allowed: boolean;
  reasons: string[];
}

export class MythosEvaluator {
  evaluate(context: EvaluationContext, policy: ParsedPolicy): PolicyDecision {
    // Stub evaluator — all policies pass by default
    // Full evaluation logic would be implemented here
    return {
      allowed: true,
      reasons: policy.rules.length > 0 ? [`Policy '${policy.name}' evaluated`] : []
    };
  }
}