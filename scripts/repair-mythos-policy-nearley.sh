#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE="$ROOT/packages/mythos-policy-engine"
GRAMMAR="$PACKAGE/src/dsl/grammar.ne"
GENERATED="$PACKAGE/src/dsl/grammar.ts"
TMP="$(mktemp "${TMPDIR:-/tmp}/mythos-grammar.XXXXXX.ts")"

cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT

cd "$ROOT"

echo "=================================================="
echo "MYTHOS POLICY NEARLEY REPAIR"
echo "=================================================="

echo "[1/8] Validating source grammar..."

test -s "$GRAMMAR"

grep -q '^main -> policy ' "$GRAMMAR"
grep -q '^policy -> ' "$GRAMMAR"
grep -q '^rules -> ' "$GRAMMAR"
grep -q '^if_clause -> ' "$GRAMMAR"
grep -q '^condition -> ' "$GRAMMAR"

if grep -q '| null' "$GRAMMAR"; then
  echo "ERROR: nullable if_clause production detected."
  exit 1
fi

if grep -q '"agent\.trust".*"<"' "$GRAMMAR"; then
  echo "ERROR: duplicate agent.trust comparison production detected."
  exit 1
fi

echo "Source grammar checks passed."

echo
echo "[2/8] Generating Nearley parser..."

pnpm --filter @agi-ecosystem/mythos-policy-engine exec nearleyc \
  "$GRAMMAR" \
  -o "$TMP"

test -s "$TMP"

BYTES="$(wc -c < "$TMP")"
echo "Generated parser size: ${BYTES} bytes"

if [ "$BYTES" -lt 1000 ]; then
  echo "ERROR: generated parser is suspiciously small."
  exit 1
fi

echo
echo "[3/8] Converting Nearley output to package ESM..."

python3 - "$TMP" "$GENERATED" <<'PY'
from pathlib import Path
import sys

src = Path(sys.argv[1])
dst = Path(sys.argv[2])

s = src.read_text()

if not s.strip():
    raise SystemExit("Generated parser is empty")

# Nearley emits an IIFE wrapper around the compiled grammar.
s = s.replace("(function () {\n", "", 1)

# Nearley's default CommonJS/browser export block is incompatible
# with this package's ESM/Vitest execution path.
footer = "if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {"

if footer in s:
    s = s[:s.index(footer)].rstrip()

if s.endswith("})();"):
    s = s[:-5].rstrip()

# Generated parser code is an artifact, not hand-maintained TS.
if not s.startswith("// @ts-nocheck"):
    s = "// @ts-nocheck\n" + s

s = s.rstrip()

if not s.endswith("export default grammar as any;"):
    s += "\n\nexport default grammar as any;"

dst.write_text(s + "\n")

if dst.stat().st_size < 1000:
    raise SystemExit("Final grammar.ts is suspiciously small")
PY

echo "Generated ESM parser written."

echo
echo "[4/8] Normalizing generated artifacts..."

python3 - "$GRAMMAR" "$GENERATED" <<'PYNORMALIZE'
from pathlib import Path
import sys

for value in sys.argv[1:]:
    p = Path(value)
    lines = p.read_text().splitlines()
    p.write_text("\n".join(line.rstrip() for line in lines) + "\n")
PYNORMALIZE

echo "Generated artifacts normalized."

echo
echo "[5/8] Verifying generated parser..."

if grep -qE '^\(function|module\.exports|window\.grammar|\}\)\(\);' "$GENERATED"; then
  echo "ERROR: forbidden Nearley wrapper/export remnants remain."
  exit 1
fi

grep -q '^export default grammar as any;$' "$GENERATED"

# Validate the actual TypeScript/ESM module using the package's TS runtime.
pnpm --filter @agi-ecosystem/mythos-policy-engine exec tsx --eval "
import grammar from './src/dsl/grammar.ts';

if (!grammar || typeof grammar !== 'object') {
  throw new Error('Generated grammar did not import as an object');
}

if (!Array.isArray(grammar.ParserRules)) {
  throw new Error('Generated grammar has no ParserRules array');
}

if (grammar.ParserStart !== 'main') {
  throw new Error('Generated grammar has unexpected ParserStart');
}

console.log('Generated grammar imported successfully.');
console.log('Parser rules:', grammar.ParserRules.length);
"

echo "Generated parser integrity checks passed."

echo
echo "[6/8] Typechecking policy engine..."

pnpm exec tsc -b "$PACKAGE/tsconfig.json" --pretty false

echo
echo "[7/8] Running policy tests..."

pnpm --filter @agi-ecosystem/mythos-policy-engine test

echo
echo "[8/8] Final parser sanity check..."

pnpm --filter @agi-ecosystem/mythos-policy-engine exec tsx --eval '
import nearley from "nearley";
import grammar from "./src/dsl/grammar.ts";
import fs from "node:fs";

const source = fs.readFileSync("./tests/policy.test.ts", "utf8")
  .match(/const samplePolicy = `([\s\S]*?)`;/)[1]
  .trim();

const parser = new nearley.Parser(
  nearley.Grammar.fromCompiled(grammar)
);

parser.feed(source);

if (parser.results.length !== 1) {
  throw new Error(`Expected exactly 1 parse result; got ${parser.results.length}`);
}

const policy = parser.results[0];

if (policy?.type !== "policy") {
  throw new Error("Generated parser did not return a policy object");
}

const approval = policy.rules.find(
  rule => rule.name === "high_value_approval"
);

if (!approval) {
  throw new Error("high_value_approval rule missing");
}

if (
  approval.then?.type !== "require_approval" ||
  approval.then?.approver !== "human_operator"
) {
  throw new Error("require_approval AST regression detected");
}

console.log("Parser sanity check passed.");
console.log(`Rules parsed: ${policy.rules.length}`);
console.log(`Parse results: ${parser.results.length}`);
'

echo
echo "=================================================="
echo "REPAIR COMPLETE — ALL POLICY GATES PASSED"
echo "=================================================="
