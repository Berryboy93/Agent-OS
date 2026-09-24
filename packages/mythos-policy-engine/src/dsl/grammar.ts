// @ts-nocheck
// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
function id(x) { return x[0]; }
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "__$ebnf$1", "symbols": ["wschar"]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "wschar", "symbols": [/[ \t\n\v\f]/], "postprocess": id},
    {"name": "unsigned_int$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "unsigned_int$ebnf$1", "symbols": ["unsigned_int$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "unsigned_int", "symbols": ["unsigned_int$ebnf$1"], "postprocess":
        function(d) {
            return parseInt(d[0].join(""));
        }
        },
    {"name": "int$ebnf$1$subexpression$1", "symbols": [{"literal":"-"}]},
    {"name": "int$ebnf$1$subexpression$1", "symbols": [{"literal":"+"}]},
    {"name": "int$ebnf$1", "symbols": ["int$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "int$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "int$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "int$ebnf$2", "symbols": ["int$ebnf$2", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "int", "symbols": ["int$ebnf$1", "int$ebnf$2"], "postprocess":
        function(d) {
            if (d[0]) {
                return parseInt(d[0][0]+d[1].join(""));
            } else {
                return parseInt(d[1].join(""));
            }
        }
        },
    {"name": "unsigned_decimal$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "unsigned_decimal$ebnf$1", "symbols": ["unsigned_decimal$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "unsigned_decimal$ebnf$2$subexpression$1$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "unsigned_decimal$ebnf$2$subexpression$1$ebnf$1", "symbols": ["unsigned_decimal$ebnf$2$subexpression$1$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "unsigned_decimal$ebnf$2$subexpression$1", "symbols": [{"literal":"."}, "unsigned_decimal$ebnf$2$subexpression$1$ebnf$1"]},
    {"name": "unsigned_decimal$ebnf$2", "symbols": ["unsigned_decimal$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "unsigned_decimal$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "unsigned_decimal", "symbols": ["unsigned_decimal$ebnf$1", "unsigned_decimal$ebnf$2"], "postprocess":
        function(d) {
            return parseFloat(
                d[0].join("") +
                (d[1] ? "."+d[1][1].join("") : "")
            );
        }
        },
    {"name": "decimal$ebnf$1", "symbols": [{"literal":"-"}], "postprocess": id},
    {"name": "decimal$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "decimal$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "decimal$ebnf$2", "symbols": ["decimal$ebnf$2", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "decimal$ebnf$3$subexpression$1$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "decimal$ebnf$3$subexpression$1$ebnf$1", "symbols": ["decimal$ebnf$3$subexpression$1$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "decimal$ebnf$3$subexpression$1", "symbols": [{"literal":"."}, "decimal$ebnf$3$subexpression$1$ebnf$1"]},
    {"name": "decimal$ebnf$3", "symbols": ["decimal$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "decimal$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "decimal", "symbols": ["decimal$ebnf$1", "decimal$ebnf$2", "decimal$ebnf$3"], "postprocess":
        function(d) {
            return parseFloat(
                (d[0] || "") +
                d[1].join("") +
                (d[2] ? "."+d[2][1].join("") : "")
            );
        }
        },
    {"name": "percentage", "symbols": ["decimal", {"literal":"%"}], "postprocess":
        function(d) {
            return d[0]/100;
        }
        },
    {"name": "jsonfloat$ebnf$1", "symbols": [{"literal":"-"}], "postprocess": id},
    {"name": "jsonfloat$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "jsonfloat$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "jsonfloat$ebnf$2", "symbols": ["jsonfloat$ebnf$2", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "jsonfloat$ebnf$3$subexpression$1$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "jsonfloat$ebnf$3$subexpression$1$ebnf$1", "symbols": ["jsonfloat$ebnf$3$subexpression$1$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "jsonfloat$ebnf$3$subexpression$1", "symbols": [{"literal":"."}, "jsonfloat$ebnf$3$subexpression$1$ebnf$1"]},
    {"name": "jsonfloat$ebnf$3", "symbols": ["jsonfloat$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "jsonfloat$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "jsonfloat$ebnf$4$subexpression$1$ebnf$1", "symbols": [/[+-]/], "postprocess": id},
    {"name": "jsonfloat$ebnf$4$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "jsonfloat$ebnf$4$subexpression$1$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "jsonfloat$ebnf$4$subexpression$1$ebnf$2", "symbols": ["jsonfloat$ebnf$4$subexpression$1$ebnf$2", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "jsonfloat$ebnf$4$subexpression$1", "symbols": [/[eE]/, "jsonfloat$ebnf$4$subexpression$1$ebnf$1", "jsonfloat$ebnf$4$subexpression$1$ebnf$2"]},
    {"name": "jsonfloat$ebnf$4", "symbols": ["jsonfloat$ebnf$4$subexpression$1"], "postprocess": id},
    {"name": "jsonfloat$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "jsonfloat", "symbols": ["jsonfloat$ebnf$1", "jsonfloat$ebnf$2", "jsonfloat$ebnf$3", "jsonfloat$ebnf$4"], "postprocess":
        function(d) {
            return parseFloat(
                (d[0] || "") +
                d[1].join("") +
                (d[2] ? "."+d[2][1].join("") : "") +
                (d[3] ? "e" + (d[3][1] || "+") + d[3][2].join("") : "")
            );
        }
        },
    {"name": "dqstring$ebnf$1", "symbols": []},
    {"name": "dqstring$ebnf$1", "symbols": ["dqstring$ebnf$1", "dstrchar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "dqstring", "symbols": [{"literal":"\""}, "dqstring$ebnf$1", {"literal":"\""}], "postprocess": function(d) {return d[1].join(""); }},
    {"name": "sqstring$ebnf$1", "symbols": []},
    {"name": "sqstring$ebnf$1", "symbols": ["sqstring$ebnf$1", "sstrchar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "sqstring", "symbols": [{"literal":"'"}, "sqstring$ebnf$1", {"literal":"'"}], "postprocess": function(d) {return d[1].join(""); }},
    {"name": "btstring$ebnf$1", "symbols": []},
    {"name": "btstring$ebnf$1", "symbols": ["btstring$ebnf$1", /[^`]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "btstring", "symbols": [{"literal":"`"}, "btstring$ebnf$1", {"literal":"`"}], "postprocess": function(d) {return d[1].join(""); }},
    {"name": "dstrchar", "symbols": [/[^\\"\n]/], "postprocess": id},
    {"name": "dstrchar", "symbols": [{"literal":"\\"}, "strescape"], "postprocess":
        function(d) {
            return JSON.parse("\""+d.join("")+"\"");
        }
        },
    {"name": "sstrchar", "symbols": [/[^\\'\n]/], "postprocess": id},
    {"name": "sstrchar", "symbols": [{"literal":"\\"}, "strescape"], "postprocess": function(d) { return JSON.parse("\""+d.join("")+"\""); }},
    {"name": "sstrchar$string$1", "symbols": [{"literal":"\\"}, {"literal":"'"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "sstrchar", "symbols": ["sstrchar$string$1"], "postprocess": function(d) {return "'"; }},
    {"name": "strescape", "symbols": [/["\\/bfnrt]/], "postprocess": id},
    {"name": "strescape", "symbols": [{"literal":"u"}, /[a-fA-F0-9]/, /[a-fA-F0-9]/, /[a-fA-F0-9]/, /[a-fA-F0-9]/], "postprocess":
        function(d) {
            return d.join("");
        }
        },
    {"name": "main", "symbols": ["policy"], "postprocess": id},
    {"name": "policy$string$1", "symbols": [{"literal":"p"}, {"literal":"o"}, {"literal":"l"}, {"literal":"i"}, {"literal":"c"}, {"literal":"y"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "policy", "symbols": ["policy$string$1", "_", {"literal":"{"}, "_", "rules", "_", {"literal":"}"}], "postprocess":
        ([_, __, ___, ____, rules]) => ({ type: 'policy', rules })
        },
    {"name": "rules$ebnf$1", "symbols": []},
    {"name": "rules$ebnf$1$subexpression$1", "symbols": ["_", "rule"]},
    {"name": "rules$ebnf$1", "symbols": ["rules$ebnf$1", "rules$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "rules", "symbols": ["rule", "rules$ebnf$1"], "postprocess":
        ([first, rest]) => [first, ...rest.map(([_, rule]) => rule)]
        },
    {"name": "rule$string$1", "symbols": [{"literal":"r"}, {"literal":"u"}, {"literal":"l"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "rule", "symbols": ["rule$string$1", "_", "string", "_", {"literal":"{"}, "_", "when", "_", "if_clause", "_", "then_clause", "_", {"literal":"}"}], "postprocess":
        ([_, __, name, ___, ____, _____, when, ______, if_clause, _______, then_clause]) => ({
          type: 'rule',
          name,
          when,
          if: if_clause,
          then: then_clause
        })
        },
    {"name": "rule$string$2", "symbols": [{"literal":"r"}, {"literal":"u"}, {"literal":"l"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "rule", "symbols": ["rule$string$2", "_", "string", "_", {"literal":"{"}, "_", "when", "_", "then_clause", "_", {"literal":"}"}], "postprocess":
        ([_, __, name, ___, ____, _____, when, ______, then_clause]) => ({
          type: 'rule',
          name,
          when,
          if: { type: 'always_true' },
          then: then_clause
        })
        },
    {"name": "when$string$1", "symbols": [{"literal":"w"}, {"literal":"h"}, {"literal":"e"}, {"literal":"n"}, {"literal":":"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "when", "symbols": ["when$string$1", "_", "event_type"], "postprocess":
        ([_, __, eventType]) => eventType
        },
    {"name": "event_type$string$1", "symbols": [{"literal":"p"}, {"literal":"r"}, {"literal":"e"}, {"literal":"_"}, {"literal":"e"}, {"literal":"x"}, {"literal":"e"}, {"literal":"c"}, {"literal":"u"}, {"literal":"t"}, {"literal":"i"}, {"literal":"o"}, {"literal":"n"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "event_type", "symbols": ["event_type$string$1"], "postprocess": id},
    {"name": "event_type$string$2", "symbols": [{"literal":"p"}, {"literal":"o"}, {"literal":"s"}, {"literal":"t"}, {"literal":"_"}, {"literal":"e"}, {"literal":"x"}, {"literal":"e"}, {"literal":"c"}, {"literal":"u"}, {"literal":"t"}, {"literal":"i"}, {"literal":"o"}, {"literal":"n"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "event_type", "symbols": ["event_type$string$2"], "postprocess": id},
    {"name": "event_type$string$3", "symbols": [{"literal":"a"}, {"literal":"n"}, {"literal":"y"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "event_type", "symbols": ["event_type$string$3"], "postprocess": id},
    {"name": "event_type$string$4", "symbols": [{"literal":"m"}, {"literal":"e"}, {"literal":"m"}, {"literal":"o"}, {"literal":"r"}, {"literal":"y"}, {"literal":"_"}, {"literal":"a"}, {"literal":"c"}, {"literal":"c"}, {"literal":"e"}, {"literal":"s"}, {"literal":"s"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "event_type", "symbols": ["event_type$string$4"], "postprocess": id},
    {"name": "event_type$string$5", "symbols": [{"literal":"a"}, {"literal":"g"}, {"literal":"e"}, {"literal":"n"}, {"literal":"t"}, {"literal":"_"}, {"literal":"s"}, {"literal":"p"}, {"literal":"a"}, {"literal":"w"}, {"literal":"n"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "event_type", "symbols": ["event_type$string$5"], "postprocess": id},
    {"name": "if_clause$string$1", "symbols": [{"literal":"i"}, {"literal":"f"}, {"literal":":"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "if_clause", "symbols": ["if_clause$string$1", "_", "condition"], "postprocess":
        ([_, __, condition]) => condition
        },
    {"name": "condition", "symbols": ["comparison"], "postprocess": id},
    {"name": "condition$string$1", "symbols": [{"literal":"a"}, {"literal":"n"}, {"literal":"d"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "condition", "symbols": ["condition", "_", "condition$string$1", "_", "comparison"], "postprocess":
        ([left, _, __, ___, right]) => ({ type: 'and', left, right })
          },
    {"name": "condition$string$2", "symbols": [{"literal":"o"}, {"literal":"r"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "condition", "symbols": ["condition", "_", "condition$string$2", "_", "comparison"], "postprocess":
        ([left, _, __, ___, right]) => ({ type: 'or', left, right })
          },
    {"name": "comparison", "symbols": ["identifier", "_", {"literal":">"}, "_", "number"], "postprocess":
        ([left, _, __, ___, right]) => ({ type: 'gt', left, right })
        },
    {"name": "comparison", "symbols": ["identifier", "_", {"literal":"<"}, "_", "number"], "postprocess":
        ([left, _, __, ___, right]) => ({ type: 'lt', left, right })
          },
    {"name": "comparison$string$1", "symbols": [{"literal":">"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comparison", "symbols": ["identifier", "_", "comparison$string$1", "_", "number"], "postprocess":
        ([left, _, __, ___, right]) => ({ type: 'gte', left, right })
          },
    {"name": "comparison$string$2", "symbols": [{"literal":"<"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comparison", "symbols": ["identifier", "_", "comparison$string$2", "_", "number"], "postprocess":
        ([left, _, __, ___, right]) => ({ type: 'lte', left, right })
          },
    {"name": "comparison$string$3", "symbols": [{"literal":"="}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comparison", "symbols": ["identifier", "_", "comparison$string$3", "_", "value"], "postprocess":
        ([left, _, __, ___, right]) => ({ type: 'eq', left, right })
          },
    {"name": "comparison$string$4", "symbols": [{"literal":"!"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comparison", "symbols": ["identifier", "_", "comparison$string$4", "_", "value"], "postprocess":
        ([left, _, __, ___, right]) => ({ type: 'neq', left, right })
          },
    {"name": "comparison$string$5", "symbols": [{"literal":"r"}, {"literal":"i"}, {"literal":"s"}, {"literal":"k"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comparison$string$6", "symbols": [{"literal":"t"}, {"literal":"h"}, {"literal":"r"}, {"literal":"e"}, {"literal":"s"}, {"literal":"h"}, {"literal":"o"}, {"literal":"l"}, {"literal":"d"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comparison", "symbols": ["comparison$string$5", "_", {"literal":">"}, "_", "comparison$string$6"], "postprocess":
        () => ({ type: 'risk_gt_threshold' })
          },
    {"name": "comparison$string$7", "symbols": [{"literal":"c"}, {"literal":"o"}, {"literal":"n"}, {"literal":"t"}, {"literal":"a"}, {"literal":"i"}, {"literal":"n"}, {"literal":"s"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comparison", "symbols": ["comparison$string$7", "_", {"literal":"("}, "_", "identifier", "_", {"literal":","}, "_", "string", "_", {"literal":")"}], "postprocess":
        ([_, __, ___, list, ____, _____, item]) => ({ type: 'contains', list, item })
          },
    {"name": "then_clause$string$1", "symbols": [{"literal":"t"}, {"literal":"h"}, {"literal":"e"}, {"literal":"n"}, {"literal":":"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "then_clause", "symbols": ["then_clause$string$1", "_", "action"], "postprocess":
        ([_, __, action]) => action
        },
    {"name": "action$string$1", "symbols": [{"literal":"r"}, {"literal":"e"}, {"literal":"j"}, {"literal":"e"}, {"literal":"c"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "action", "symbols": ["action$string$1"], "postprocess": () => ({ type: 'reject' })},
    {"name": "action$string$2", "symbols": [{"literal":"a"}, {"literal":"p"}, {"literal":"p"}, {"literal":"r"}, {"literal":"o"}, {"literal":"v"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "action", "symbols": ["action$string$2"], "postprocess": () => ({ type: 'approve' })},
    {"name": "action$string$3", "symbols": [{"literal":"l"}, {"literal":"o"}, {"literal":"g"}, {"literal":"_"}, {"literal":"e"}, {"literal":"v"}, {"literal":"e"}, {"literal":"n"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "action", "symbols": ["action$string$3"], "postprocess": () => ({ type: 'log_event' })},
    {"name": "action$string$4", "symbols": [{"literal":"q"}, {"literal":"u"}, {"literal":"a"}, {"literal":"r"}, {"literal":"a"}, {"literal":"n"}, {"literal":"t"}, {"literal":"i"}, {"literal":"n"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "action", "symbols": ["action$string$4"], "postprocess": () => ({ type: 'quarantine' })},
    {"name": "action$string$5", "symbols": [{"literal":"e"}, {"literal":"s"}, {"literal":"c"}, {"literal":"a"}, {"literal":"l"}, {"literal":"a"}, {"literal":"t"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "action", "symbols": ["action$string$5", "_", {"literal":"("}, "_", "string", "_", {"literal":")"}], "postprocess":
        ([_, __, ___, ____, level]) => ({ type: 'escalate', level })
          },
    {"name": "action$string$6", "symbols": [{"literal":"r"}, {"literal":"a"}, {"literal":"t"}, {"literal":"e"}, {"literal":"_"}, {"literal":"l"}, {"literal":"i"}, {"literal":"m"}, {"literal":"i"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "action", "symbols": ["action$string$6", "_", {"literal":"("}, "_", "number", "_", {"literal":")"}], "postprocess":
        ([_, __, ___, ____, rate]) => ({ type: 'rate_limit', rate })
          },
    {"name": "action$string$7", "symbols": [{"literal":"r"}, {"literal":"e"}, {"literal":"q"}, {"literal":"u"}, {"literal":"i"}, {"literal":"r"}, {"literal":"e"}, {"literal":"_"}, {"literal":"a"}, {"literal":"p"}, {"literal":"p"}, {"literal":"r"}, {"literal":"o"}, {"literal":"v"}, {"literal":"a"}, {"literal":"l"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "action", "symbols": ["action$string$7", "_", {"literal":"("}, "_", "string", "_", {"literal":")"}], "postprocess":
        ([_, __, ___, ____, approver]) => ({ type: 'require_approval', approver })
          },
    {"name": "identifier$ebnf$1", "symbols": []},
    {"name": "identifier$ebnf$1", "symbols": ["identifier$ebnf$1", /[a-zA-Z0-9_.]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "identifier", "symbols": [/[a-zA-Z_]/, "identifier$ebnf$1"], "postprocess":
        ([first, rest]) => first + rest.join('')
        },
    {"name": "value", "symbols": ["number"], "postprocess": id},
    {"name": "value", "symbols": ["string"], "postprocess": id},
    {"name": "value$string$1", "symbols": [{"literal":"t"}, {"literal":"r"}, {"literal":"u"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "value", "symbols": ["value$string$1"], "postprocess": () => true},
    {"name": "value$string$2", "symbols": [{"literal":"f"}, {"literal":"a"}, {"literal":"l"}, {"literal":"s"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "value", "symbols": ["value$string$2"], "postprocess": () => false},
    {"name": "value$string$3", "symbols": [{"literal":"n"}, {"literal":"u"}, {"literal":"l"}, {"literal":"l"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "value", "symbols": ["value$string$3"], "postprocess": () => null},
    {"name": "number", "symbols": ["decimal"], "postprocess": id},
    {"name": "string", "symbols": ["dqstring"], "postprocess": id},
    {"name": "string", "symbols": ["sqstring"], "postprocess": id}
]
  , ParserStart: "main"
}

export default grammar as any;
