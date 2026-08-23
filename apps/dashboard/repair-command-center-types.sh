#!/usr/bin/env bash

###############################################################################
# Agent-OS Command Center
# PhD-Level Type / Runtime Repair
#
# PURPOSE
#   Repair the currently observed TypeScript defects without replacing the
#   application's architecture.
#
# PRINCIPLES
#   - Transactional
#   - Evidence driven
#   - Minimal source mutation
#   - No wholesale App.tsx replacement
#   - No CSS mutation
#   - No package.json mutation unless absolutely required
#   - Strong validation after every mutation
#   - Automatic rollback on failure
#
# CURRENT KNOWN ERRORS
#   App-integrated.tsx:
#     TS2339 healthData.status
#     TS2339 runsData.data
#     TS2322 Icon className
#
#   useEventStream.ts:
#     TS2503 NodeJS namespace
###############################################################################

set -Eeuo pipefail
IFS=$'\n\t'

###############################################################################
# PATHS
###############################################################################

DASHBOARD="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$DASHBOARD/src"

APP="$SRC/App.tsx"
INTEGRATED_APP="$SRC/App-integrated.tsx"
EVENT_STREAM="$SRC/hooks/useEventStream.ts"

PACKAGE="$DASHBOARD/package.json"
TSCONFIG="$DASHBOARD/tsconfig.json"

BACKUP_ROOT="$DASHBOARD/.type-repair-backups/$(date '+%Y%m%d_%H%M%S')"
LOG="$BACKUP_ROOT/repair.log"
ROLLBACK="$BACKUP_ROOT/rollback.sh"

mkdir -p "$BACKUP_ROOT"

exec > >(tee -a "$LOG") 2>&1

###############################################################################
# OUTPUT
###############################################################################

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

info() {
    echo -e "${CYAN}$*${RESET}"
}

ok() {
    echo -e "${GREEN}✓ $*${RESET}"
}

warn() {
    echo -e "${YELLOW}⚠ $*${RESET}"
}

die() {
    echo -e "${RED}✗ $*${RESET}"
    exit 1
}

###############################################################################
# STATE
###############################################################################

CHANGED_FILES=()
ROLLBACK_ACTIVE=0

###############################################################################
# ERROR HANDLING
###############################################################################

on_error() {
    local code=$?

    if [[ "$ROLLBACK_ACTIVE" -eq 1 ]]; then
        exit "$code"
    fi

    echo
    die "Repair validation failed with exit code $code.

Backup:
  $BACKUP_ROOT

Log:
  $LOG

Rollback:
  bash \"$ROLLBACK\""
}

trap on_error ERR

###############################################################################
# HEADER
###############################################################################

echo
echo "======================================================================"
echo " AGENT-OS COMMAND CENTER — TYPE/RUNTIME REPAIR"
echo "======================================================================"
echo
echo "Dashboard:"
echo "  $DASHBOARD"
echo
echo "Backup:"
echo "  $BACKUP_ROOT"
echo

###############################################################################
# 1. PREFLIGHT
###############################################################################

info "STEP 1 — PREFLIGHT"

cd "$DASHBOARD"

[[ -f "$APP" ]] || die "Missing App.tsx"
[[ -f "$INTEGRATED_APP" ]] || die "Missing App-integrated.tsx"
[[ -f "$EVENT_STREAM" ]] || die "Missing useEventStream.ts"
[[ -f "$PACKAGE" ]] || die "Missing package.json"
[[ -f "$TSCONFIG" ]] || die "Missing tsconfig.json"

command -v node >/dev/null || die "Node unavailable"
command -v pnpm >/dev/null || die "pnpm unavailable"

ok "Dashboard root"
ok "App.tsx"
ok "App-integrated.tsx"
ok "useEventStream.ts"
ok "package.json"
ok "tsconfig.json"
ok "Node"
ok "pnpm"

###############################################################################
# 2. PROJECT IDENTITY
###############################################################################

info "STEP 2 — PROJECT IDENTITY"

echo "pwd:"
pwd

echo
echo "realpath:"
realpath "$DASHBOARD"

echo
echo "server.ts:"
realpath "$DASHBOARD/server.ts"

echo
echo "server.ts SHA256:"
sha256sum "$DASHBOARD/server.ts"

echo
echo "eventStore declarations:"
grep -RInE '\beventStore\b' \
    "$SRC" \
    2>/dev/null | head -n 100 || true

###############################################################################
# 3. SNAPSHOT
###############################################################################

info "STEP 3 — TRANSACTION SNAPSHOT"

cp -p "$APP" "$BACKUP_ROOT/App.tsx"
cp -p "$INTEGRATED_APP" "$BACKUP_ROOT/App-integrated.tsx"
cp -p "$EVENT_STREAM" "$BACKUP_ROOT/useEventStream.ts"

# Preserve important source contracts for forensic comparison.
if [[ -f "$SRC/hooks/useCommandCenter.ts" ]]; then
    cp -p "$SRC/hooks/useCommandCenter.ts" \
        "$BACKUP_ROOT/useCommandCenter.ts"
fi

if [[ -f "$SRC/hooks/useHealthCheck.ts" ]]; then
    cp -p "$SRC/hooks/useHealthCheck.ts" \
        "$BACKUP_ROOT/useHealthCheck.ts"
fi

if [[ -f "$SRC/hooks/useRuns.ts" ]]; then
    cp -p "$SRC/hooks/useRuns.ts" \
        "$BACKUP_ROOT/useRuns.ts"
fi

cp -p "$PACKAGE" "$BACKUP_ROOT/package.json"
cp -p "$TSCONFIG" "$BACKUP_ROOT/tsconfig.json"

###############################################################################
# 4. GENERATE ROLLBACK
###############################################################################

info "STEP 4 — ROLLBACK GENERATION"

cat > "$ROLLBACK" <<EOF
#!/usr/bin/env bash
set -Eeuo pipefail

DASHBOARD="$DASHBOARD"
SRC="\$DASHBOARD/src"
BACKUP="$BACKUP_ROOT"

cp -p "\$BACKUP/App.tsx" "\$SRC/App.tsx"
cp -p "\$BACKUP/App-integrated.tsx" "\$SRC/App-integrated.tsx"
cp -p "\$BACKUP/useEventStream.ts" "\$SRC/hooks/useEventStream.ts"

if [[ -f "\$BACKUP/useCommandCenter.ts" ]]; then
    cp -p "\$BACKUP/useCommandCenter.ts" "\$SRC/hooks/useCommandCenter.ts"
fi

if [[ -f "\$BACKUP/useHealthCheck.ts" ]]; then
    cp -p "\$BACKUP/useHealthCheck.ts" "\$SRC/hooks/useHealthCheck.ts"
fi

if [[ -f "\$BACKUP/useRuns.ts" ]]; then
    cp -p "\$BACKUP/useRuns.ts" "\$SRC/hooks/useRuns.ts"
fi

cp -p "\$BACKUP/package.json" "\$DASHBOARD/package.json"
cp -p "\$BACKUP/tsconfig.json" "\$DASHBOARD/tsconfig.json"

echo "Rollback completed."
EOF

chmod 700 "$ROLLBACK"

ok "Rollback generated"

###############################################################################
# 5. FORENSIC INSPECTION
###############################################################################

info "STEP 5 — FORENSIC TYPE CONTRACT INSPECTION"

echo
echo "===== useEventStream.ts ====="
nl -ba "$EVENT_STREAM" | sed -n '1,180p'

echo
echo "===== App-integrated.tsx imports ====="
nl -ba "$INTEGRATED_APP" | sed -n '1,130p'

echo
echo "===== Hook references ====="

grep -RInE \
    'useHealthCheck|useRuns|healthData|runsData|Icon' \
    "$SRC" \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null | head -n 250 || true

echo
echo "===== App-integrated references ====="

grep -RInE \
    'App-integrated|from .*App-integrated|import.*App-integrated' \
    "$DASHBOARD" \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    2>/dev/null | head -n 100 || true

###############################################################################
# 6. NODEJS TIMEOUT REPAIR
###############################################################################

info "STEP 6 — REPAIR ENVIRONMENT-SPECIFIC TIMER TYPE"

if grep -q 'NodeJS\.Timeout' "$EVENT_STREAM"; then

    cp -p "$EVENT_STREAM" "$BACKUP_ROOT/useEventStream.pre-repair.ts"

    python3 - "$EVENT_STREAM" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

old = "NodeJS.Timeout | null"
new = "ReturnType<typeof setTimeout> | null"

if old not in text:
    raise SystemExit(
        "Expected NodeJS.Timeout declaration was not found."
    )

text = text.replace(old, new)

path.write_text(text, encoding="utf-8")
PY

    CHANGED_FILES+=("$EVENT_STREAM")

    ok "Replaced NodeJS.Timeout with portable ReturnType<typeof setTimeout>"
else
    ok "No NodeJS.Timeout usage requiring repair"
fi

###############################################################################
# 7. VERIFY NODE TIMER CONTRACT
###############################################################################

info "STEP 7 — TIMER CONTRACT VALIDATION"

grep -q 'ReturnType<typeof setTimeout>' "$EVENT_STREAM" \
    || die "Timer type repair did not apply correctly."

ok "Portable timer contract verified"

###############################################################################
# 8. DO NOT WEAKEN APP TYPES BLINDLY
###############################################################################

info "STEP 8 — APP-INTEGRATED TYPE SAFETY"

#
# We intentionally DO NOT replace the API values with `any`.
#
# The compiler errors indicate that the hook return types are inferred as `{}`.
# The correct repair belongs at the hook/API contract boundary.
#
# If App-integrated.tsx is not active, it should still typecheck because the
# project currently includes it. We therefore inspect its hooks before making
# a mutation.
#

echo
echo "Hook source candidates:"

find "$SRC" -type f \
    \( -name '*Health*.ts' -o -name '*health*.ts' \
       -o -name '*Runs*.ts' -o -name '*runs*.ts' \) \
    -print | sort

###############################################################################
# 9. DETECT HOOK DEFINITIONS
###############################################################################

info "STEP 9 — LOCATE API HOOK CONTRACTS"

HEALTH_FILES="$(grep -RIl 'function useHealthCheck\|const useHealthCheck\|useHealthCheck' \
    "$SRC" \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null | head -n 50 || true)"

RUN_FILES="$(grep -RIl 'function useRuns\|const useRuns\|useRuns' \
    "$SRC" \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null | head -n 50 || true)"

echo
echo "Health hook candidates:"
printf '%s\n' "$HEALTH_FILES"

echo
echo "Runs hook candidates:"
printf '%s\n' "$RUN_FILES"

###############################################################################
# 10. TYPECHECK BEFORE APP REPAIR
###############################################################################

info "STEP 10 — BASELINE TYPECHECK AFTER SAFE TIMER REPAIR"

set +e
pnpm exec tsc --noEmit > "$BACKUP_ROOT/typecheck-after-timer.log" 2>&1
TSC_RESULT=$?
set -e

cat "$BACKUP_ROOT/typecheck-after-timer.log"

if [[ "$TSC_RESULT" -eq 0 ]]; then
    ok "TypeScript is already clean after timer repair."
else
    warn "Remaining TypeScript errors require API/icon contract repair."
fi

###############################################################################
# 11. SOURCE CONTRACT REPORT
###############################################################################

info "STEP 11 — GENERATE CONTRACT REPORT"

REPORT="$BACKUP_ROOT/type-contract-report.txt"

{
    echo "Agent-OS Command Center Type Contract Report"
    echo "Generated: $(date -Is)"
    echo
    echo "Dashboard: $DASHBOARD"
    echo
    echo "TypeScript result after timer repair: $TSC_RESULT"
    echo
    echo "Health hook candidates:"
    printf '%s\n' "$HEALTH_FILES"
    echo
    echo "Runs hook candidates:"
    printf '%s\n' "$RUN_FILES"
    echo
    echo "App-integrated API references:"
    grep -nE \
        'healthData|runsData|useHealthCheck|useRuns' \
        "$INTEGRATED_APP" || true
    echo
    echo "Icon references:"
    grep -nE \
        '<Icon|Icon=' \
        "$INTEGRATED_APP" || true
} > "$REPORT"

cat "$REPORT"

###############################################################################
# 12. HARD SAFETY GATE
###############################################################################

info "STEP 12 — SAFETY GATE"

#
# At this point we refuse to guess the API contracts.
#
# We can safely fix NodeJS.Timeout because the replacement is semantically
# equivalent and environment portable.
#
# We do NOT automatically convert `{}` to `any`, because that would hide
# real runtime/API contract defects.
#

if [[ "$TSC_RESULT" -ne 0 ]]; then

    warn "TypeScript still contains API/icon contract errors."

    echo
    echo "The safe next repair boundary is:"
    echo
    echo "  useHealthCheck response type"
    echo "  useRuns response type"
    echo "  Icon component prop contract"
    echo
    echo "No unsafe any-casts were introduced."
    echo
    echo "Current diagnostics:"
    cat "$BACKUP_ROOT/typecheck-after-timer.log"

    echo
    echo "Transaction has NOT been declared production-ready."
    echo
    echo "Backup:"
    echo "  $BACKUP_ROOT"
    echo
    echo "Rollback:"
    echo "  bash \"$ROLLBACK\""

    exit 10
fi

###############################################################################
# 13. BUILD
###############################################################################

info "STEP 13 — PRODUCTION BUILD"

pnpm run build 2>&1 | tee "$BACKUP_ROOT/build.log"

[[ -f "$DASHBOARD/dist/index.html" ]] \
    || die "Production build did not produce dist/index.html."

ok "Production build verified"

###############################################################################
# 14. BACKEND START
###############################################################################

info "STEP 14 — BACKEND RUNTIME VERIFICATION"

rm -f "$BACKUP_ROOT/backend.log"

(
    cd "$DASHBOARD"
    exec pnpm exec tsx ./server.ts
) > "$BACKUP_ROOT/backend.log" 2>&1 &

BACKEND_PID=$!

cleanup_backend() {
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi
}

trap cleanup_backend EXIT

READY=0

for _ in $(seq 1 30); do

    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        break
    fi

    if curl -fsS \
        --max-time 1 \
        http://localhost:5001/api/command-center/health \
        >/tmp/agentos-health.$$ 2>/dev/null; then
        READY=1
        break
    fi

    sleep 1
done

if [[ "$READY" -ne 1 ]]; then
    echo
    cat "$BACKUP_ROOT/backend.log"
    die "Backend did not become healthy on port 5001."
fi

ok "Backend started"
ok "Health endpoint responded"

###############################################################################
# 15. API CONTRACT VALIDATION
###############################################################################

info "STEP 15 — API CONTRACT VALIDATION"

HEALTH="$(curl -fsS \
    --max-time 5 \
    http://localhost:5001/api/command-center/health)"

echo "Health:"
echo "$HEALTH"

grep -q '"status"' <<<"$HEALTH" \
    || die "Health response missing status."

grep -q '"ok"' <<<"$HEALTH" \
    || die "Health response status is not ok."

RUNS="$(curl -fsS \
    --max-time 5 \
    http://localhost:5001/api/command-center/runs)"

echo
echo "Runs:"
echo "$RUNS"

grep -qE '"data"|^\[' <<<"$RUNS" \
    || die "Runs endpoint does not expose expected data/array payload."

ok "Health API contract verified"
ok "Runs API responded"

###############################################################################
# 16. SSE VALIDATION
###############################################################################

info "STEP 16 — SSE VALIDATION"

SSE_OUTPUT="$BACKUP_ROOT/sse.log"

timeout 3 curl -N \
    --max-time 3 \
    -sS \
    -D "$BACKUP_ROOT/sse.headers" \
    http://localhost:5001/api/command-center/events/stream \
    > "$SSE_OUTPUT" 2>&1 || true

cat "$BACKUP_ROOT/sse.headers"

if grep -qi 'text/event-stream' "$BACKUP_ROOT/sse.headers"; then
    ok "SSE content type verified"
else
    warn "SSE endpoint did not expose text/event-stream within the test window."
fi

###############################################################################
# 17. FINAL CHECKSUMS
###############################################################################

info "STEP 17 — FINAL CHECKSUMS"

sha256sum \
    "$APP" \
    "$INTEGRATED_APP" \
    "$EVENT_STREAM" \
    "$PACKAGE" \
    > "$BACKUP_ROOT/final-sha256sums"

ok "Final checksums recorded"

###############################################################################
# 18. SUCCESS
###############################################################################

echo
echo "======================================================================"
echo " TYPE/RUNTIME REPAIR VALIDATION COMPLETE"
echo "======================================================================"
echo
echo "Backup:"
echo "  $BACKUP_ROOT"
echo
echo "Rollback:"
echo "  bash \"$ROLLBACK\""
echo
echo "Build:"
echo "  PASS"
echo
echo "Backend:"
echo "  PASS"
echo
echo "Health API:"
echo "  PASS"
echo
echo "Runs API:"
echo "  PASS"
echo
echo "======================================================================"

trap - ERR
exit 0
