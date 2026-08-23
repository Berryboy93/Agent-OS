import nearley from 'nearley';
import grammar from './grammar.js'; // Compiled from .ne

export interface ParsedPolicy {
  type: 'policy';
  rules: ParsedRule[];
}

export interface ParsedRule {
  type: 'rule';
  name: string;
  when: string;
  if: Condition;
  then: Action;
}

export type Condition = 
  | { type: 'always_true' }
  | { type: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq'; left: string; right: any }
  | { type: 'and' | 'or'; left: Condition; right: Condition }
  | { type: 'risk_gt_threshold' }
  | { type: 'trust_lt'; threshold: number }
  | { type: 'contains'; list: string; item: string };

export type Action = 
  | { type: 'reject' }
  | { type: 'approve' }
  | { type: 'log_event' }
  | { type: 'quarantine' }
  | { type: 'escalate'; level: string }
  | { type: 'rate_limit'; rate: number }
  | { type: 'require_approval'; approver: string };

export class MythosParser {
  parse(source: string): ParsedPolicy {
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(source);

    if (parser.results.length === 0) {
      throw new Error('Parse failed: incomplete input');
    }
    if (parser.results.length > 1) {
      throw new Error('Parse failed: ambiguous grammar');
    }

    return parser.results[0];
  }
}
