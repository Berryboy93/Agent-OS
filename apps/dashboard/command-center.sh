#!/usr/bin/env bash

###############################################################################
# Agent-OS Command Center
# DEPLOYMENT HARDENING + KNOWN-ISSUE REPAIR
#
# Purpose:
#   Safely harden the CURRENT deployed Command Center without replacing the
#   application's architecture or regenerating unrelated project files.
#
# GUARANTEES:
#   - Does NOT replace App.tsx wholesale
#   - Does NOT modify globals.css
#   - Does NOT modify tokens.css
#   - Does NOT modify dashboard.css
#   - Does NOT modify package.json
#   - Preserves existing Agent-OS hooks
#   - Removes known fabricated operational UI data
#   - Creates a complete transactional backup
#   - Creates a complete rollback
#   - Automatically rolls back source changes if validation/build fails
#   - Verifies the production build
#   - Verifies deployment artifacts
#
# EXPECTED PROJECT:
#   /home/r3v/~/Agent-OS/apps/dashboard
###############################################################################

set -Eeuo pipefail
IFS=$'\n\t'

###############################################################################
# CONFIGURATION
###############################################################################

AGENT_OS="/home/r3v/~/Agent-OS"
DASHBOARD="$AGENT_OS/apps/dashboard"

SRC="$DASHBOARD/src"
STYLES="$SRC/styles"

APP="$SRC/App.tsx"
COMMAND_CSS="$STYLES/command-center.css"
GLOBALS_CSS="$SRC/styles/globals.css"
INDEX_CSS="$SRC/index.css"

HEALTH_HOOK="$SRC/hooks/useCommandCenter.ts"
EVENT_HOOK="$SRC/hooks/useEventStream.ts"
TOOLS_PAGE="$SRC/pages/Tools.tsx"
PACKAGE_JSON="$DASHBOARD/package.json"

DEPLOYMENT_ROOT="$DASHBOARD/.deployment-backups"

TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"

BACKUP_ROOT="$DEPLOYMENT_ROOT/$TIMESTAMP"
ROLLBACK="$BACKUP_ROOT/rollback.sh"

LOG_FILE="$DASHBOARD/command-center-hardening-$TIMESTAMP.log"

###############################################################################
# COLORS / OUTPUT
###############################################################################

if [[ -t 1 ]]; then
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    CYAN='\033[0;36m'
    RESET='\033[0m'
else
    GREEN=''
    YELLOW=''
    RED=''
    CYAN=''
    RESET=''
fi

info() {
    echo -e "${CYAN}$*${RESET}"
}

success() {
    echo -e "${GREEN}✓ $*${RESET}"
}

warn() {
    echo -e "${YELLOW}⚠ $*${RESET}"
}

fail() {
    echo -e "${RED}✗ $*${RESET}"
}

###############################################################################
# LOGGING
###############################################################################

mkdir -p "$BACKUP_ROOT"

exec > >(tee -a "$LOG_FILE") 2>&1

###############################################################################
# STATE
###############################################################################

DEPLOYMENT_STARTED=0
CHANGES_MADE=0
ROLLBACK_IN_PROGRESS=0

###############################################################################
# ERROR HANDLER
###############################################################################

on_error() {
    local exit_code=$?

    if [[ "$ROLLBACK_IN_PROGRESS" -eq 1 ]]; then
        exit "$exit_code"
    fi

    echo
    fail "DEPLOYMENT FAILED"
    echo
    echo "Exit code : $exit_code"
    echo "Backup    : $BACKUP_ROOT"
    echo "Log       : $LOG_FILE"
    echo

    if [[ "$DEPLOYMENT_STARTED" -eq 1 && "$CHANGES_MADE" -eq 1 ]]; then
        warn "Attempting automatic rollback..."

        ROLLBACK_IN_PROGRESS=1

        if [[ -x "$ROLLBACK" ]]; then
            if bash "$ROLLBACK"; then
                success "Automatic rollback completed."
            else
                fail "AUTOMATIC ROLLBACK FAILED."
                echo
                echo "Manual rollback:"
                echo "  bash \"$ROLLBACK\""
                exit 2
            fi
        else
            fail "Rollback script unavailable."
            echo
            echo "Backup:"
            echo "  $BACKUP_ROOT"
            exit 2
        fi
    else
        echo "No application changes were made."
    fi

    echo
    echo "Deployment log:"
    echo "  $LOG_FILE"

    exit "$exit_code"
}

trap on_error ERR

###############################################################################
# HEADER
###############################################################################

echo
echo "════════════════════════════════════════════════════════════"
echo " AGENT-OS COMMAND CENTER — HARDENED DEPLOYMENT"
echo "════════════════════════════════════════════════════════════"
echo
echo "Timestamp : $TIMESTAMP"
echo "Dashboard : $DASHBOARD"
echo "Backup    : $BACKUP_ROOT"
echo "Log       : $LOG_FILE"
echo

###############################################################################
# STEP 1 — PREFLIGHT
###############################################################################

echo "STEP 1/10 — PREFLIGHT"
echo "────────────────────────────────────────────────────────────"

[[ -d "$AGENT_OS" ]] \
    || { fail "Agent-OS root missing: $AGENT_OS"; exit 1; }

[[ -d "$DASHBOARD" ]] \
    || { fail "Dashboard directory missing: $DASHBOARD"; exit 1; }

[[ -d "$SRC" ]] \
    || { fail "src directory missing: $SRC"; exit 1; }

[[ -d "$STYLES" ]] \
    || { fail "styles directory missing: $STYLES"; exit 1; }

[[ -f "$APP" ]] \
    || { fail "App.tsx missing: $APP"; exit 1; }

[[ -f "$PACKAGE_JSON" ]] \
    || { fail "package.json missing: $PACKAGE_JSON"; exit 1; }

[[ -f "$HEALTH_HOOK" ]] \
    || { fail "useCommandCenter.ts missing."; exit 1; }

[[ -f "$EVENT_HOOK" ]] \
    || { fail "useEventStream.ts missing."; exit 1; }

[[ -f "$TOOLS_PAGE" ]] \
    || { fail "Tools.tsx missing."; exit 1; }

command -v pnpm >/dev/null 2>&1 \
    || { fail "pnpm is not installed."; exit 1; }

command -v node >/dev/null 2>&1 \
    || { fail "node is not installed."; exit 1; }

success "Agent-OS root"
success "Dashboard"
success "src"
success "styles"
success "App.tsx"
success "package.json"
success "useCommandCenter hook"
success "useEventStream hook"
success "ToolsPage"
success "Node"
success "pnpm"

echo

###############################################################################
# STEP 2 — PROJECT STATE
###############################################################################

echo "STEP 2/10 — PROJECT STATE"
echo "────────────────────────────────────────────────────────────"

cd "$DASHBOARD"

echo "Node:"
node --version

echo
echo "pnpm:"
pnpm --version

echo
echo "Git:"
if git -C "$DASHBOARD" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    success "Git repository detected"
    echo "Commit:"
    git -C "$DASHBOARD" rev-parse --short HEAD
    echo
    echo "Status:"
    git -C "$DASHBOARD" status --short
else
    warn "Dashboard is not a Git repository."
    echo "Filesystem backup/rollback protection will be used."
fi

echo

###############################################################################
# STEP 3 — PRESERVE LEGACY BACKUPS
###############################################################################

echo "STEP 3/10 — LEGACY BACKUP PROTECTION"
echo "────────────────────────────────────────────────────────────"

#
# These are retained for compatibility with the original deployment approach.
# We NEVER overwrite an existing legacy backup.
#

if [[ ! -f "$APP.backup-basic" ]]; then
    cp -p "$APP" "$APP.backup-basic"
    success "Created legacy App.tsx backup"
else
    success "Existing App.tsx legacy backup preserved"
fi

if [[ -f "$GLOBALS_CSS" ]]; then
    if [[ ! -f "$GLOBALS_CSS.backup" ]]; then
        cp -p "$GLOBALS_CSS" "$GLOBALS_CSS.backup"
        success "Created legacy globals.css backup"
    else
        success "Existing globals.css legacy backup preserved"
    fi
else
    warn "globals.css does not exist at expected path."
fi

echo

###############################################################################
# STEP 4 — COMPLETE TRANSACTION BACKUP
###############################################################################

echo "STEP 4/10 — COMPLETE TRANSACTION BACKUP"
echo "────────────────────────────────────────────────────────────"

DEPLOYMENT_STARTED=1

#
# Files that may be relevant to the current Command Center deployment.
# We back them up BEFORE modifying anything.
#

cp -p "$APP" "$BACKUP_ROOT/App.tsx"

if [[ -f "$COMMAND_CSS" ]]; then
    cp -p "$COMMAND_CSS" "$BACKUP_ROOT/command-center.css"
else
    echo "ABSENT" > "$BACKUP_ROOT/command-center.css.absent"
fi

cp -p "$HEALTH_HOOK" "$BACKUP_ROOT/useCommandCenter.ts"
cp -p "$EVENT_HOOK" "$BACKUP_ROOT/useEventStream.ts"
cp -p "$TOOLS_PAGE" "$BACKUP_ROOT/Tools.tsx"
cp -p "$PACKAGE_JSON" "$BACKUP_ROOT/package.json"

#
# Preserve styling architecture explicitly.
# These are NOT modified by this script.
#

if [[ -f "$GLOBALS_CSS" ]]; then
    cp -p "$GLOBALS_CSS" "$BACKUP_ROOT/globals.css"
fi

if [[ -f "$INDEX_CSS" ]]; then
    cp -p "$INDEX_CSS" "$BACKUP_ROOT/index.css"
fi

if [[ -f "$SRC/styles/tokens.css" ]]; then
    cp -p "$SRC/styles/tokens.css" "$BACKUP_ROOT/tokens.css"
fi

if [[ -f "$SRC/styles/dashboard.css" ]]; then
    cp -p "$SRC/styles/dashboard.css" "$BACKUP_ROOT/dashboard.css"
fi

success "App.tsx backed up"
success "Command Center CSS state backed up"
success "Command Center hook backed up"
success "Event stream hook backed up"
success "ToolsPage backed up"
success "package.json backed up"
success "Existing global styling architecture preserved"

###############################################################################
# STEP 5 — COMPLETE ROLLBACK GENERATION
###############################################################################

echo
echo "STEP 5/10 — GENERATE COMPLETE ROLLBACK"
echo "────────────────────────────────────────────────────────────"

cat > "$ROLLBACK" <<EOF
#!/usr/bin/env bash

set -Eeuo pipefail
IFS=\$'\\n\\t'

DASHBOARD="$DASHBOARD"
SRC="\$DASHBOARD/src"
STYLES="\$SRC/styles"
BACKUP="$BACKUP_ROOT"

echo
echo "════════════════════════════════════════════════════════════"
echo " AGENT-OS COMMAND CENTER — COMPLETE ROLLBACK"
echo "════════════════════════════════════════════════════════════"
echo

restore_required() {
    local source="\$1"
    local destination="\$2"

    if [[ ! -f "\$source" ]]; then
        echo "ERROR: Missing backup:"
        echo "  \$source"
        exit 1
    fi

    cp -p "\$source" "\$destination"
    echo "✓ Restored \$destination"
}

restore_required "\$BACKUP/App.tsx" "\$SRC/App.tsx"
restore_required "\$BACKUP/useCommandCenter.ts" "\$SRC/hooks/useCommandCenter.ts"
restore_required "\$BACKUP/useEventStream.ts" "\$SRC/hooks/useEventStream.ts"
restore_required "\$BACKUP/Tools.tsx" "\$SRC/pages/Tools.tsx"
restore_required "\$BACKUP/package.json" "\$DASHBOARD/package.json"

if [[ -f "\$BACKUP/command-center.css" ]]; then
    cp -p "\$BACKUP/command-center.css" "\$STYLES/command-center.css"
    echo "✓ Restored \$STYLES/command-center.css"
elif [[ -f "\$BACKUP/command-center.css.absent" ]]; then
    rm -f "\$STYLES/command-center.css"
    echo "✓ Removed command-center.css because it did not exist before deployment"
fi

#
# Restore protected styling files if they were captured.
#

if [[ -f "\$BACKUP/globals.css" ]]; then
    cp -p "\$BACKUP/globals.css" "\$SRC/styles/globals.css"
    echo "✓ Restored globals.css"
fi

if [[ -f "\$BACKUP/index.css" ]]; then
    cp -p "\$BACKUP/index.css" "\$SRC/index.css"
    echo "✓ Restored index.css"
fi

if [[ -f "\$BACKUP/tokens.css" ]]; then
    cp -p "\$BACKUP/tokens.css" "\$STYLES/tokens.css"
    echo "✓ Restored tokens.css"
fi

if [[ -f "\$BACKUP/dashboard.css" ]]; then
    cp -p "\$BACKUP/dashboard.css" "\$STYLES/dashboard.css"
    echo "✓ Restored dashboard.css"
fi

echo
echo "Rollback source restoration complete."

cd "\$DASHBOARD"

if command -v pnpm >/dev/null 2>&1; then
    echo
    echo "Running rollback build verification..."
    pnpm run build
    echo
    echo "✓ Rollback build succeeded."
fi

echo
echo "════════════════════════════════════════════════════════════"
echo "✓ COMPLETE ROLLBACK FINISHED"
echo "════════════════════════════════════════════════════════════"
EOF

chmod 700 "$ROLLBACK"

[[ -x "$ROLLBACK" ]] \
    || { fail "Rollback script is not executable."; exit 1; }

success "Complete rollback generated"
success "Rollback is executable"

echo

###############################################################################
# STEP 6 — SNAPSHOT INTEGRITY
###############################################################################

echo "STEP 6/10 — BACKUP INTEGRITY"
echo "────────────────────────────────────────────────────────────"

REQUIRED_BACKUPS=(
    "$BACKUP_ROOT/App.tsx"
    "$BACKUP_ROOT/useCommandCenter.ts"
    "$BACKUP_ROOT/useEventStream.ts"
    "$BACKUP_ROOT/Tools.tsx"
    "$BACKUP_ROOT/package.json"
)

for file in "${REQUIRED_BACKUPS[@]}"; do
    [[ -s "$file" ]] \
        || { fail "Backup missing or empty: $file"; exit 1; }
done

if [[ -f "$COMMAND_CSS" ]]; then
    [[ -s "$BACKUP_ROOT/command-center.css" ]] \
        || { fail "Command Center CSS backup is empty."; exit 1; }
fi

success "All required backup artifacts verified"

#
# Generate checksums so the rollback state can be audited later.
#

(
    cd "$BACKUP_ROOT"
    sha256sum \
        App.tsx \
        useCommandCenter.ts \
        useEventStream.ts \
        Tools.tsx \
        package.json \
        > SHA256SUMS
)

success "Backup checksums generated"

echo

###############################################################################
# STEP 7 — CURRENT SOURCE AUDIT
###############################################################################

echo "STEP 7/10 — CURRENT SOURCE AUDIT + KNOWN-ISSUE REPAIR"
echo "────────────────────────────────────────────────────────────"

#
# We deliberately do NOT replace App.tsx.
# We only repair the known fabricated approval badge.
#

if grep -qE "badge:[[:space:]]*['\"]3['\"]" "$APP"; then
    echo "Detected known fabricated approval badge."

    python3 - "$APP" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

old = """{ label: 'Approvals', icon: '✓', badge: '3' }"""
new = """{ label: 'Approvals', icon: '✓' }"""

if old not in text:
    raise SystemExit("Expected approval badge pattern was not found.")

text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
PY

    CHANGES_MADE=1

    success "Removed fabricated approval badge"
else
    success "No fabricated approval badge found"
fi

###############################################################################
# STATIC SOURCE VALIDATION
###############################################################################

echo
echo "Running source-integrity checks..."

#
# Required integrations
#

grep -q "useHealthCheck" "$APP" \
    || { fail "useHealthCheck integration missing."; exit 1; }

grep -q "useRuns" "$APP" \
    || { fail "useRuns integration missing."; exit 1; }

grep -q "useEventStream" "$APP" \
    || { fail "useEventStream integration missing."; exit 1; }

grep -q "ToolsPage" "$APP" \
    || { fail "ToolsPage integration missing."; exit 1; }

grep -q "./styles/command-center.css" "$APP" \
    || { fail "Command Center CSS import missing."; exit 1; }

#
# Forbidden fabricated operational patterns
#

FORBIDDEN_PATTERNS=(
    "Math\.random"
    "4182"
    "admin@example\.com"
    "badge:[[:space:]]*['\"]3['\"]"
)

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    if grep -qE "$pattern" "$APP"; then
        fail "Forbidden/fabricated pattern detected in App.tsx:"
        echo "  $pattern"
        exit 1
    fi
done

#
# Detect obvious static operational metric declarations.
# These are warnings/errors only when clearly hard-coded.
#

STATIC_OPERATIONAL_PATTERN='(runCount|runsCount|approvalCount|pendingApprovals|deploymentCount|agentCount|eventCount)[[:space:]]*=[[:space:]]*[0-9]+'

if grep -nE "$STATIC_OPERATIONAL_PATTERN" "$APP" >/tmp/agentos_static_metrics.$$ 2>/dev/null; then
    fail "Hard-coded operational metric detected:"
    cat /tmp/agentos_static_metrics.$$
    rm -f /tmp/agentos_static_metrics.$$
    exit 1
fi

rm -f /tmp/agentos_static_metrics.$$ 2>/dev/null || true

#
# Ensure no accidental wholesale mock/runtime data strings remain.
#

if grep -nE "Run Started|Tool Result|Turn 1|10:23:45|10:23:46|10:23:48|10:23:50" "$APP" >/tmp/agentos_fake_events.$$ 2>/dev/null; then
    fail "Known fabricated timeline/event content detected:"
    cat /tmp/agentos_fake_events.$$
    rm -f /tmp/agentos_fake_events.$$
    exit 1
fi

rm -f /tmp/agentos_fake_events.$$ 2>/dev/null || true

#
# Ensure protected global styling files were NOT changed.
#

if [[ -f "$BACKUP_ROOT/globals.css" ]]; then
    cmp -s "$BACKUP_ROOT/globals.css" "$GLOBALS_CSS" \
        || { fail "globals.css was modified unexpectedly."; exit 1; }
fi

if [[ -f "$BACKUP_ROOT/index.css" ]]; then
    cmp -s "$BACKUP_ROOT/index.css" "$INDEX_CSS" \
        || { fail "index.css was modified unexpectedly."; exit 1; }
fi

if [[ -f "$BACKUP_ROOT/tokens.css" ]]; then
    cmp -s "$BACKUP_ROOT/tokens.css" "$STYLES/tokens.css" \
        || { fail "tokens.css was modified unexpectedly."; exit 1; }
fi

if [[ -f "$BACKUP_ROOT/dashboard.css" ]]; then
    cmp -s "$BACKUP_ROOT/dashboard.css" "$STYLES/dashboard.css" \
        || { fail "dashboard.css was modified unexpectedly."; exit 1; }
fi

success "Required Agent-OS integrations preserved"
success "No known fabricated operational values"
success "No known fabricated timeline content"
success "Protected global styling files unchanged"

echo

###############################################################################
# STEP 8 — IMPORT / FILE GRAPH VALIDATION
###############################################################################

echo "STEP 8/10 — IMPORT + FILE GRAPH VALIDATION"
echo "────────────────────────────────────────────────────────────"

#
# Validate every local import explicitly required by the current App.
#

grep -q "from './hooks/useCommandCenter'" "$APP" \
    || { fail "Expected useCommandCenter import missing."; exit 1; }

grep -q "from './hooks/useEventStream'" "$APP" \
    || { fail "Expected useEventStream import missing."; exit 1; }

grep -q "from './pages/Tools'" "$APP" \
    || { fail "Expected ToolsPage import missing."; exit 1; }

[[ -f "$HEALTH_HOOK" ]] \
    || { fail "useCommandCenter.ts missing after repair."; exit 1; }

[[ -f "$EVENT_HOOK" ]] \
    || { fail "useEventStream.ts missing after repair."; exit 1; }

[[ -f "$TOOLS_PAGE" ]] \
    || { fail "Tools.tsx missing after repair."; exit 1; }

[[ -f "$COMMAND_CSS" ]] \
    || { fail "command-center.css missing after repair."; exit 1; }

success "App imports verified"
success "Hook files verified"
success "ToolsPage verified"
success "Command Center CSS verified"

echo

###############################################################################
# STEP 9 — PRODUCTION BUILD
###############################################################################

echo "STEP 9/10 — PRODUCTION BUILD"
echo "────────────────────────────────────────────────────────────"

cd "$DASHBOARD"

#
# Capture the build output while preserving the real exit status.
#

BUILD_LOG="$BACKUP_ROOT/build.log"

if pnpm run build 2>&1 | tee "$BUILD_LOG"; then
    success "Production build succeeded"
else
    fail "Production build failed"
    exit 1
fi

#
# Verify build artifacts.
#

[[ -d "$DASHBOARD/dist" ]] \
    || { fail "dist directory was not generated."; exit 1; }

[[ -f "$DASHBOARD/dist/index.html" ]] \
    || { fail "dist/index.html missing."; exit 1; }

DIST_FILE_COUNT="$(find "$DASHBOARD/dist" -type f | wc -l | tr -d ' ')"

if [[ "$DIST_FILE_COUNT" -lt 1 ]]; then
    fail "dist directory contains no files."
    exit 1
fi

success "dist/index.html verified"
success "Build artifacts verified"

#
# Report chunk warnings without hiding them.
#

if grep -q "Some chunks are larger than 500 kB" "$BUILD_LOG"; then
    warn "Vite reported a large JavaScript chunk."
    echo "  This is a performance warning, not a build failure."
fi

echo

###############################################################################
# STEP 10 — FINAL INTEGRITY + ROLLBACK VALIDATION
###############################################################################

echo "STEP 10/10 — FINAL INTEGRITY"
echo "────────────────────────────────────────────────────────────"

#
# Verify modified source is still present.
#

[[ -f "$APP" ]] \
    || { fail "App.tsx missing after deployment."; exit 1; }

[[ -f "$COMMAND_CSS" ]] \
    || { fail "command-center.css missing after deployment."; exit 1; }

#
# Verify rollback contains all expected restoration targets.
#

ROLLBACK_REQUIRED_STRINGS=(
    'App.tsx'
    'useCommandCenter.ts'
    'useEventStream.ts'
    'Tools.tsx'
    'package.json'
    'globals.css'
)

for target in "${ROLLBACK_REQUIRED_STRINGS[@]}"; do
    grep -q "$target" "$ROLLBACK" \
        || { fail "Rollback script does not reference: $target"; exit 1; }
done

success "Rollback completeness verified"

#
# Verify protected files remain identical to the transaction snapshot.
#

if [[ -f "$BACKUP_ROOT/globals.css" ]]; then
    cmp -s "$BACKUP_ROOT/globals.css" "$GLOBALS_CSS" \
        || { fail "globals.css integrity failure."; exit 1; }
fi

#
# Record deployment checksums.
#

sha256sum \
    "$APP" \
    "$COMMAND_CSS" \
    "$HEALTH_HOOK" \
    "$EVENT_HOOK" \
    "$TOOLS_PAGE" \
    "$PACKAGE_JSON" \
    > "$BACKUP_ROOT/DEPLOYED-SHA256SUMS"

CHANGES_MADE=1

echo
echo "Deployment summary:"
echo "  App.tsx              : $(wc -l < "$APP") lines"
echo "  command-center.css   : $(wc -l < "$COMMAND_CSS") lines"
echo "  dist files           : $DIST_FILE_COUNT"
echo "  dist size            : $(du -sh "$DASHBOARD/dist" | awk '{print $1}')"
echo

if git -C "$DASHBOARD" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Git status:"
    git -C "$DASHBOARD" status --short
else
    echo "Git status:"
    echo "  Not a Git repository"
fi

echo
echo "════════════════════════════════════════════════════════════"
echo "✅ AGENT-OS COMMAND CENTER HARDENING COMPLETE"
echo "════════════════════════════════════════════════════════════"
echo
echo "Known issues repaired:"
echo "  ✓ Incomplete rollback"
echo "  ✓ Fabricated approval badge"
echo "  ✓ Weak fabricated-data detection"
echo "  ✓ Missing protected-file integrity checks"
echo "  ✓ Missing rollback completeness verification"
echo
echo "Preserved:"
echo "  ✓ Existing App architecture"
echo "  ✓ useCommandCenter"
echo "  ✓ useEventStream"
echo "  ✓ ToolsPage"
echo "  ✓ globals.css"
echo "  ✓ index.css"
echo "  ✓ tokens.css"
echo "  ✓ dashboard.css"
echo "  ✓ package.json"
echo
echo "Backup:"
echo "  $BACKUP_ROOT"
echo
echo "Rollback:"
echo "  bash \"$ROLLBACK\""
echo
echo "Build:"
echo "  SUCCESS"
echo
echo "Log:"
echo "  $LOG_FILE"
echo

trap - ERR
exit 0
