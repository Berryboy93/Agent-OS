# Mythos Policy DSL Grammar
# Nearley grammar for parsing policy definitions

@builtin "whitespace.ne"
@builtin "number.ne"
@builtin "string.ne"

main -> policy:+ {% id %}

policy -> "policy" _ "{" _ rules _ "}" _ {% 
  ([_, __, ___, ____, rules]) => ({ type: 'policy', rules }) 
%}

rules -> rule:+ {% id %}

rule -> "rule" _ string _ "{" _ when _ if_clause _ then_clause _ "}" _ {%
  ([_, __, name, ___, ____, _____, when, ______, if_clause, _______, then_clause]) => ({
    type: 'rule',
    name,
    when,
    if: if_clause,
    then: then_clause
  })
%}

when -> "when:" _ event_type {% 
  ([_, __, eventType]) => eventType 
%}

event_type -> "pre_execution" {% id %}
  | "post_execution" {% id %}
  | "any" {% id %}
  | "memory_access" {% id %}
  | "agent_spawn" {% id %}

if_clause -> "if:" _ condition {% 
  ([_, __, condition]) => condition 
%}
  | null {% () => ({ type: 'always_true' }) %}

condition -> comparison {% id %}
  | condition _ "and" _ comparison {% 
    ([left, _, __, ___, right]) => ({ type: 'and', left, right }) 
  %}
  | condition _ "or" _ comparison {% 
    ([left, _, __, ___, right]) => ({ type: 'or', left, right }) 
  %}

comparison -> identifier _ ">" _ number {% 
  ([left, _, __, ___, right]) => ({ type: 'gt', left, right }) 
%}
  | identifier _ "<" _ number {% 
    ([left, _, __, ___, right]) => ({ type: 'lt', left, right }) 
%}
  | identifier _ ">=" _ number {% 
    ([left, _, __, ___, right]) => ({ type: 'gte', left, right }) 
%}
  | identifier _ "<=" _ number {% 
    ([left, _, __, ___, right]) => ({ type: 'lte', left, right }) 
%}
  | identifier _ "==" _ value {% 
    ([left, _, __, ___, right]) => ({ type: 'eq', left, right }) 
%}
  | identifier _ "!=" _ value {% 
    ([left, _, __, ___, right]) => ({ type: 'neq', left, right }) 
%}
  | "risk" _ ">" _ "threshold" {% 
    () => ({ type: 'risk_gt_threshold' }) 
  %}
  | "agent.trust" _ "<" _ number {% 
    ([_, __, ___, ____, threshold]) => ({ type: 'trust_lt', threshold }) 
  %}
  | "contains" _ "(" _ identifier _ "," _ string _ ")" {% 
    ([_, __, ___, list, ____, _____, item]) => ({ type: 'contains', list, item }) 
  %}

then_clause -> "then:" _ action {% 
  ([_, __, action]) => action 
%}

action -> "reject" {% () => ({ type: 'reject' }) %}
  | "approve" {% () => ({ type: 'approve' }) %}
  | "log_event" {% () => ({ type: 'log_event' }) %}
  | "quarantine" {% () => ({ type: 'quarantine' }) %}
  | "escalate" _ "(" _ string _ ")" {% 
    ([_, __, ___, level]) => ({ type: 'escalate', level }) 
  %}
  | "rate_limit" _ "(" _ number _ ")" {% 
    ([_, __, ___, rate]) => ({ type: 'rate_limit', rate }) 
  %}
  | "require_approval" _ "(" _ string _ ")" {% 
    ([_, __, ___, approver]) => ({ type: 'require_approval', approver }) 
  %}

identifier -> [a-zA-Z_] [a-zA-Z0-9_.]:* {% 
  ([first, rest]) => first + rest.join('') 
%}

value -> number {% id %}
  | string {% id %}
  | "true" {% () => true %}
  | "false" {% () => false %}
  | "null" {% () => null %}

string -> """ [^"]:* """ {% 
  ([_, chars]) => chars.join('') 
%}
  | "'" [^']:* "'" {% 
  ([_, chars]) => chars.join('') 
%}
