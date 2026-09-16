#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/.repair-backups/mythos-$STAMP"

abort() {
  echo
  echo "============================================================"
  echo " ABORTED SAFELY"
  echo "============================================================"
  echo "$*"
  echo "Backup: ${BACKUP:-NOT CREATED}"
  echo
  exit 20
}

echo "============================================================"
echo " AGENT-OS MYTHOS / POLICY ENGINE VERIFIED REPAIR"
echo "============================================================"
echo "ROOT:   $ROOT"
echo "BACKUP: $BACKUP"
echo

# -------------------------------------------------------------------
# 1. Require only files proven to exist in the LIVE repository.
# -------------------------------------------------------------------

FILES=(
  packages/mythos-engine/src/grammar.ts
  packages/mythos-engine/src/parser.ts
  packages/mythos-engine/src/engine.ts
  packages/mythos-engine/src/types.ts
  packages/mythos-engine/src/__tests__/engine.test.ts

  packages/mythos-policy-engine/src/dsl/grammar.ne
  packages/mythos-policy-engine/src/dsl/grammar.ts
  packages/mythos-policy-engine/src/dsl/index.ts
  packages/mythos-policy-engine/src/evaluator/index.ts
  packages/mythos-policy-engine/src/rules/index.ts
  packages/mythos-policy-engine/src/index.ts
  packages/mythos-policy-engine/tests/policy.test.ts
)

for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || abort "Required live file is missing: $f"
done

# -------------------------------------------------------------------
# 2. Toolchain verification.
# -------------------------------------------------------------------

echo "===== TOOLCHAIN ====="
node --version
pnpm --version
pnpm exec vitest --version
pnpm --filter @agi/mythos-engine exec node -e 'console.log("ohm-js:", require.resolve("ohm-js"))'
pnpm --filter @agi-ecosystem/mythos-policy-engine exec nearleyc --version

# -------------------------------------------------------------------
# 3. Backup exactly the files this repair is allowed to touch.
# -------------------------------------------------------------------

echo
echo "===== BACKUP ====="

mkdir -p "$BACKUP"

# Preserve the repository-relative path for every backed-up file.
# This prevents collisions between files sharing the same basename,
# such as packages/*/src/index.ts.
for f in "${FILES[@]}"; do
  target="$BACKUP/$f"
  mkdir -p "$(dirname "$target")"
  cp -a "$f" "$target"
done

echo "Backup created: $BACKUP"

# -------------------------------------------------------------------
# 4. Verify the Mythos grammar already contains the duplicate-builtin
#    removal and current structural repair.
# -------------------------------------------------------------------

echo
echo "===== MYTHOS GRAMMAR PRECHECK ====="

python3 - <<'PY'
from pathlib import Path

p = Path("packages/mythos-engine/src/grammar.ts")
s = p.read_text()

required = [
    'export const MYTHOS_GRAMMAR = String.raw`',
    'MythosPolicy {',
    'Expression',
    'ComparisonExpression',
    'BasicComparison',
    'MemberComparison',
    'MemberIdentifier',
    'Action',
    'SimpleAction',
    'ParameterizedAction',
]

for text in required:
    if text not in s:
        raise SystemExit(
            f"ABORT: expected current repaired Mythos grammar text missing: {text!r}"
        )

for forbidden in [
    'letter = "a".."z" | "A".."Z"',
    'alnum = letter | digit',
    'digit = "0".."9"',
]:
    if forbidden in s:
        raise SystemExit(
            f"ABORT: duplicate Ohm built-in declaration still present: {forbidden!r}"
        )

print("Mythos grammar state matches expected repaired tree.")
PY

# -------------------------------------------------------------------
# 5. Validate the CURRENT Mythos grammar in the CORRECT package
#    dependency context.
# -------------------------------------------------------------------

echo
echo "===== OHM CONSTRUCTION GATE ====="

pnpm --filter @agi/mythos-engine exec node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";
import * as ohm from "ohm-js";

const source = readFileSync("src/grammar.ts", "utf8");

const match = source.match(
  /export const MYTHOS_GRAMMAR = String\.raw`([\s\S]*?)`;\s*$/
);

if (!match) {
  throw new Error("Could not extract MYTHOS_GRAMMAR.");
}

const grammar = ohm.grammar(match[1]);

console.log(`OHM GRAMMAR OK: ${grammar.name}`);
NODE

# -------------------------------------------------------------------
# 6. Repair only the EXACT known Nearley defect.
#
#    Existing live grammar has:
#
#      if_clause -> "if:" _ condition
#      | null
#
#    In Nearley, "null" is not an epsilon production.
#    We replace it with a genuine empty production.
# -------------------------------------------------------------------

echo
echo "===== NEARLEY SOURCE REPAIR ====="

python3 - <<'PY'
from pathlib import Path

p = Path("packages/mythos-policy-engine/src/dsl/grammar.ne")
s = p.read_text()

old = '''  if_clause -> "if:" _ condition {% 
    ([_, __, condition]) => condition 
  %}
    | null {% () => ({ type: 'always_true' }) %}
'''

new = '''  if_clause -> "if:" _ condition {% 
    ([_, __, condition]) => condition 
  %}
    | {% () => ({ type: 'always_true' }) %}
'''

count = s.count(old)

if count != 1:
    raise SystemExit(
        "ABORT: expected the exact live malformed if_clause production once; "
        f"found {count}"
    )

p.write_text(s.replace(old, new, 1))
print("Repaired Nearley optional if_clause production.")
PY

# -------------------------------------------------------------------
# 7. Repair the known malformed double-quoted string production.
#    We do not touch the single-quoted production.
# -------------------------------------------------------------------

python3 - <<'PY'
from pathlib import Path

p = Path("packages/mythos-policy-engine/src/dsl/grammar.ne")
s = p.read_text()

old = '''  string -> """ [^"]:* """ {% 
    ([_, chars]) => chars.join('') 
  %}
'''

new = '''  string -> "\\"" [^"]:* "\\"" {% 
    ([_, chars]) => chars.join('') 
  %}
'''

count = s.count(old)

if count != 1:
    raise SystemExit(
        "ABORT: expected the exact live malformed double-quoted string "
        f"production once; found {count}"
    )

p.write_text(s.replace(old, new, 1))
print("Repaired Nearley double-quoted string production.")
PY

# -------------------------------------------------------------------
# 8. Compile Nearley from source of truth.
# -------------------------------------------------------------------

echo
echo "===== NEARLEY COMPILE ====="

pnpm --filter @agi-ecosystem/mythos-policy-engine exec nearleyc \
  src/dsl/grammar.ne \
  -o src/dsl/grammar.ts

[[ -s packages/mythos-policy-engine/src/dsl/grammar.ts ]] || \
  abort "Nearley generated an empty grammar.ts"

echo "Generated grammar.ts:"
wc -c packages/mythos-policy-engine/src/dsl/grammar.ts

# -------------------------------------------------------------------
# 9. Verify generated grammar is structurally usable without creating
#    a parser implementation.
# -------------------------------------------------------------------

echo
echo "===== GENERATED NEARLEY GATE ====="

pnpm --filter @agi-ecosystem/mythos-policy-engine exec node --input-type=module <<'NODE'
import nearley from "nearley";
import grammar from "./src/dsl/grammar.js";

const compiled = nearley.Grammar.fromCompiled(grammar);
const parser = new nearley.Parser(compiled);

console.log("Nearley compiled grammar loaded successfully.");
console.log(`Start rule: ${grammar.ParserStart}`);
console.log(`Rule count: ${grammar.ParserRules.length}`);
NODE

# -------------------------------------------------------------------
# 10. Exercise the ACTUAL Policy Engine parser through dsl/index.ts.
# -------------------------------------------------------------------

echo
echo "===== POLICY PARSER CONTRACT GATE ====="

pnpm --filter @agi-ecosystem/mythos-policy-engine exec node --input-type=module <<'NODE'
import { MythosParser } from "./src/dsl/index.ts";

const source = `
policy {
  rule "no_unapproved_execution" {
    when: pre_execution
    if: risk > threshold
    then: reject
  }

  rule "audit_all_actions" {
    when: any
    then: log_event
  }

  rule "low_trust_quarantine" {
    when: agent_spawn
    if: agent.trust < 0.3
    then: quarantine
  }

  rule "high_value_approval" {
    when: pre_execution
    if: payload.value > 10000
    then: require_approval("human_operator")
  }
}
`;

const parser = new MythosParser();
const parsed = parser.parse(source);

if (!parsed || parsed.type !== "policy") {
  throw new Error("Policy parser returned an invalid root node.");
}

if (!Array.isArray(parsed.rules) || parsed.rules.length !== 4) {
  throw new Error(
    `Expected 4 parsed rules, received ${
      Array.isArray(parsed.rules) ? parsed.rules.length : "non-array"
    }`
  );
}

console.log("Policy parser accepted the real test policy.");
console.dir(parsed, { depth: 10 });
NODE

# -------------------------------------------------------------------
# 11. TypeScript gates BEFORE full test suite.
# -------------------------------------------------------------------

echo
echo "===== TARGET TYPESCRIPT ====="

pnpm --filter @agi/mythos-engine exec tsc --noEmit
pnpm --filter @agi-ecosystem/mythos-policy-engine exec tsc --noEmit

# -------------------------------------------------------------------
# 12. Targeted tests.
# -------------------------------------------------------------------

echo
echo "===== MYTHOS ENGINE TEST ====="

pnpm --filter @agi/mythos-engine test

echo
echo "===== POLICY ENGINE TEST ====="

pnpm --filter @agi-ecosystem/mythos-policy-engine test

# -------------------------------------------------------------------
# 13. Target builds.
# -------------------------------------------------------------------

echo
echo "===== TARGET BUILDS ====="

pnpm --filter @agi/mythos-engine build
pnpm --filter @agi-ecosystem/mythos-policy-engine build

# -------------------------------------------------------------------
# 14. Full workspace build.
# -------------------------------------------------------------------

echo
echo "===== FULL WORKSPACE BUILD ====="

pnpm -r build

echo
echo "============================================================"
echo " VERIFIED REPAIR COMPLETED"
echo "============================================================"
echo "Backup: $BACKUP"
echo
