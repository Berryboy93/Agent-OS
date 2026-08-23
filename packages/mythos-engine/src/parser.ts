import * as ohm from "ohm-js";
import { MYTHOS_GRAMMAR } from "./grammar.js";
import { Policy } from "./types.js";

const grammar = ohm.grammar(MYTHOS_GRAMMAR);
const semantics = grammar.createSemantics();

semantics.addOperation("toAST", {
  Policy(_policy, _open, rules, _close) {
    return { rules: rules.asIteration().children.map(r => r.toAST()) };
  },

  Rule(_rule, name, _open, when, ifClause, then, _close) {
    return {
      name: name.toAST(),
      when: when.toAST(),
      condition: ifClause.children[0]?.toAST() || null,
      actions: then.toAST()
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

  Expression(left, op, right) {
    return {
      left: left.toAST(),
      operator: op.sourceString,
      right: right.toAST()
    };
  },

  ThenClause(_then, _colon, first, _comma, rest) {
    return [first.toAST(), ...rest.asIteration().children.map(r => r.toAST())];
  },

  Action(action, _open, arg, _close) {
    if (arg) {
      return { type: action.sourceString, argument: arg.toAST() };
    }
    return { type: action.sourceString };
  },

  String(_open, chars, _close) {
    return chars.sourceString;
  },

  Identifier(_first, _rest) {
    return this.sourceString;
  },

  Value(val) {
    const str = val.sourceString;
    if (str === "true") return true;
    if (str === "false") return false;
    const num = parseFloat(str);
    return isNaN(num) ? str : num;
  }
});

export function parsePolicy(source: string): Policy {
  const match = grammar.match(source);
  if (match.failed()) {
    throw new SyntaxError(`Policy parse error: ${match.message}`);
  }
  return semantics(match).toAST() as Policy;
}
