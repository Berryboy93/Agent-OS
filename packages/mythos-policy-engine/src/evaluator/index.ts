import type { ParsedPolicy, ParsedRule, Condition, Action } from '../dsl/index.js';

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
    return { allowed: true, reasons: [] };
  }
}
