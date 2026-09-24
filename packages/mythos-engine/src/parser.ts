import * as ohm from "ohm-js";
import { MYTHOS_GRAMMAR } from "./grammar.js";
import { Policy } from "./types.js";

const grammar = ohm.grammar(MYTHOS_GRAMMAR);
const semantics = grammar.createSemantics();

semantics.addOperation("toAST", {
  Policy(_policy, _open, rules, _close) {
    return {
      rules: rules.asIteration().children.map((rule) => rule.toAST()),
    };
  },

  Rule(_rule, name, _open, when, ifClause, then, _close) {
    return {
      name: name.toAST(),
      when: when.toAST(),
      condition: ifClause.children[0]?.toAST() ?? null,
      actions: then.toAST(),
    };
  },

  WhenClause(_when, _colon, trigger) {
    return trigger.toAST();
  },

  Trigger(trigger) {
    return trigger.sourceString;
  },

  IfClause(_if, _colon, condition) {
    return condition.toAST();
  },

  Expression(expression) {
    return expression.toAST();
  },

  ComparisonExpression(expression) {
    return expression.toAST();
  },

  BasicComparison(left, op, right) {
    return {
      left: left.toAST(),
      operator: op.sourceString,
      right: right.toAST(),
    };
  },

  MemberComparison(left, op, right) {
    return {
      left: left.toAST(),
      operator: op.sourceString,
      right: right.toAST(),
    };
  },

  AndExpression(_open, left, _and, right, _close) {
    return {
      left: left.toAST(),
      operator: "and",
      right: right.toAST(),
    };
  },

  OrExpression(_open, left, _or, right, _close) {
    return {
      left: left.toAST(),
      operator: "or",
      right: right.toAST(),
    };
  },

  ThenClause(_then, _colon, first, _comma, rest) {
    return [
      first.toAST(),
      ...rest.asIteration().children.map((action) => action.toAST()),
    ];
  },

  Action(action) {
    return action.toAST();
  },

  SimpleAction(action) {
    return {
      type: action.sourceString,
    };
  },

  ParameterizedAction(action, _open, argument, _close) {
    return {
      type: action.sourceString,
      argument: argument.toAST(),
    };
  },

  CompOp(op) {
    return op.sourceString;
  },

  String(_open, chars, _close) {
    return chars.sourceString;
  },

  Identifier(_first, _rest) {
    return this.sourceString;
  },

  Value(value) {
    const str = value.sourceString;

    if (str === "true") return true;
    if (str === "false") return false;

    const num = Number(str);
    return Number.isNaN(num) ? str : num;
  },
});

export function parsePolicy(source: string): Policy {
  const match = grammar.match(source.trim());

  if (match.failed()) {
    throw new SyntaxError(`Policy parse error: ${match.message}`);
  }

  return semantics(match).toAST() as Policy;
}
