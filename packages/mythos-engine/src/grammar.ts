export const MYTHOS_GRAMMAR = String.raw`
MythosPolicy {
  Policy = "policy" "{" Rule+ "}"

  Rule = "rule" String "{" WhenClause IfClause? ThenClause "}"

  WhenClause = "when" ":" Trigger
  Trigger = "pre_execution" | "post_execution" | "any" | "memory_access" | "agent_spawn"

  IfClause = "if" ":" Condition
  Condition = Expression

  Expression
    = ComparisonExpression
    | AndExpression
    | OrExpression

  ComparisonExpression
    = BasicComparison
    | MemberComparison

  BasicComparison
    = Identifier CompOp Value

  MemberComparison
    = MemberIdentifier CompOp Value

  MemberIdentifier
    = Identifier "." Identifier

  AndExpression
    = "(" Expression "and" Expression ")"

  OrExpression
    = "(" Expression "or" Expression ")"

  ThenClause = "then" ":" Action ("," Action)*
  Action
    = ParameterizedAction
    | SimpleAction

  SimpleAction
    = "reject"
    | "log_event"
    | "escalate"
    | "sandbox"
    | "audit"
    | "notify"

  ParameterizedAction
    = SimpleAction "(" String ")"

  CompOp = ">" | "<" | ">=" | "<=" | "==" | "!="

  String = "\"" (~"\"" any)* "\""
  Identifier = letter (alnum | "_" | ".")*
  Value = number | String | "true" | "false"

  number = digit+ ("." digit+)?
}
`;
