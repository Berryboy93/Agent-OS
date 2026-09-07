import type { ParsedPolicy, Condition, Action } from '../dsl/index.js';

export interface EvaluationContext {
  event_type: string;
  agent_id: string;
  risk_score?: number;
  trust_level?: number;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
  risk_threshold?: number;
  [key: string]: unknown;
}

export type PolicyEvaluationInput = Omit<EvaluationContext, 'event_type'>;

export interface PolicyDecision {
  allowed: boolean;
  reasons: string[];
  rule?: string;
  action?: Action;
}

function lookup(context: EvaluationContext, path: string): unknown {
  if (path === 'agent.trust') {
    return context.trust_level;
  }

  if (path === 'risk') {
    return context.risk_score;
  }

  const direct = context[path];
  if (direct !== undefined) {
    return direct;
  }

  const nestedSources: Array<[string, unknown]> = [
    ['payload', context.payload],
    ['data', context.data],
  ];

  for (const [prefix, source] of nestedSources) {
    if (path === prefix) {
      return source;
    }

    const prefixWithDot = `${prefix}.`;

    if (!path.startsWith(prefixWithDot)) {
      continue;
    }

    if (!source || typeof source !== 'object') {
      return undefined;
    }

    let current: unknown = source;
    const parts = path.slice(prefixWithDot.length).split('.');

    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  return undefined;
}

function evaluateCondition(
  condition: Condition,
  context: EvaluationContext,
): boolean {
  switch (condition.type) {
    case 'always_true':
      return true;

    case 'risk_gt_threshold': {
      const risk = Number(context.risk_score);
      const threshold = Number(context.risk_threshold ?? 0.7);
      return Number.isFinite(risk) && risk > threshold;
    }

    case 'trust_lt': {
      const trust = Number(context.trust_level);
      return Number.isFinite(trust) && trust < condition.threshold;
    }

    case 'gt': {
      const left = lookup(context, condition.left);
      return Number(left) > Number(condition.right);
    }

    case 'lt': {
      const left = lookup(context, condition.left);
      return Number(left) < Number(condition.right);
    }

    case 'gte': {
      const left = lookup(context, condition.left);
      return Number(left) >= Number(condition.right);
    }

    case 'lte': {
      const left = lookup(context, condition.left);
      return Number(left) <= Number(condition.right);
    }

    case 'eq':
      return lookup(context, condition.left) === condition.right;

    case 'neq':
      return lookup(context, condition.left) !== condition.right;

    case 'and':
      return (
        evaluateCondition(condition.left, context) &&
        evaluateCondition(condition.right, context)
      );

    case 'or':
      return (
        evaluateCondition(condition.left, context) ||
        evaluateCondition(condition.right, context)
      );

    case 'contains': {
      const value = lookup(context, condition.list);

      if (Array.isArray(value)) {
        return value.includes(condition.item);
      }

      if (typeof value === 'string') {
        return value.includes(condition.item);
      }

      return false;
    }
  }
}

function actionAllows(action: Action): boolean {
  switch (action.type) {
    case 'approve':
    case 'log_event':
      return true;

    case 'reject':
    case 'quarantine':
    case 'escalate':
    case 'rate_limit':
    case 'require_approval':
      return false;
  }
}

export class MythosEvaluator {
  evaluate(
    context: EvaluationContext,
    policy: ParsedPolicy,
  ): PolicyDecision {
    const reasons: string[] = [];

    for (const rule of policy.rules) {
      const eventMatches =
        rule.when === 'any' ||
        rule.when === context.event_type;

      if (!eventMatches) {
        continue;
      }

      if (!evaluateCondition(rule.if, context)) {
        continue;
      }

      reasons.push(
        `[${rule.name}] condition matched; action=${rule.then.type}`,
      );

      const allowed = actionAllows(rule.then);

      // Strict policy semantics: any applicable deny wins.
      if (!allowed) {
        return {
          allowed: false,
          reasons,
          rule: rule.name,
          action: rule.then,
        };
      }
    }

    return {
      allowed: true,
      reasons:
        reasons.length > 0
          ? reasons
          : ['No matching policy rule denied the operation.'],
    };
  }
}
