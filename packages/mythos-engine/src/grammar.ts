export const MYTHOS_GRAMMAR = String.raw`
MythosPolicy {
  Policy = "policy" "{" Rule+ "}"

  Rule = "rule" String "{" WhenClause IfClause? ThenClause "}"

  WhenClause = "when" ":" Trigger
  Trigger = "pre_execution" | "post_execution" | "any" | "memory_access" | "agent_spawn"

  IfClause = "if" ":" Condition
  Condition = Expression

  Expression = Identifier CompOp Value
             | Identifier "." Identifier CompOp Value
             | "(" Expression "and" Expression ")"
             | "(" Expression "or" Expression ")"

  ThenClause = "then" ":" Action ("," Action)*
  Action = "reject" | "log_event" | "escalate" | "sandbox" | "audit" | "notify"
         | Action "(" String ")"

  CompOp = ">" | "<" | ">=" | "<=" | "==" | "!="

  String = "\"" any* "\""
  Identifier = letter (alnum | "_" | ".")*
  Value = number | String | "true" | "false"

  number = digit+ ("." digit+)?
  letter = "a".."z" | "A".."Z"
  alnum = letter | digit
  digit = "0".."9"
}
`;
