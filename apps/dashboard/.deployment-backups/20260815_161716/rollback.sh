#!/usr/bin/env bash

set -Eeuo pipefail
IFS=$'\n\t'

DASHBOARD="/home/r3v/~/Agent-OS/apps/dashboard"
SRC="$DASHBOARD/src"
STYLES="$SRC/styles"
BACKUP="/home/r3v/~/Agent-OS/apps/dashboard/.deployment-backups/20260815_161716"

echo
echo "════════════════════════════════════════════════════════════"
echo " AGENT-OS COMMAND CENTER — COMPLETE ROLLBACK"
echo "════════════════════════════════════════════════════════════"
echo

restore_required() {
    local source="$1"
    local destination="$2"

    if [[ ! -f "$source" ]]; then
        echo "ERROR: Missing backup:"
        echo "  $source"
        exit 1
    fi

    cp -p "$source" "$destination"
    echo "✓ Restored $destination"
}

restore_required "$BACKUP/App.tsx" "$SRC/App.tsx"
restore_required "$BACKUP/useCommandCenter.ts" "$SRC/hooks/useCommandCenter.ts"
restore_required "$BACKUP/useEventStream.ts" "$SRC/hooks/useEventStream.ts"
restore_required "$BACKUP/Tools.tsx" "$SRC/pages/Tools.tsx"
restore_required "$BACKUP/package.json" "$DASHBOARD/package.json"

if [[ -f "$BACKUP/command-center.css" ]]; then
    cp -p "$BACKUP/command-center.css" "$STYLES/command-center.css"
    echo "✓ Restored $STYLES/command-center.css"
elif [[ -f "$BACKUP/command-center.css.absent" ]]; then
    rm -f "$STYLES/command-center.css"
    echo "✓ Removed command-center.css because it did not exist before deployment"
fi

#
# Restore protected styling files if they were captured.
#

if [[ -f "$BACKUP/globals.css" ]]; then
    cp -p "$BACKUP/globals.css" "$SRC/styles/globals.css"
    echo "✓ Restored globals.css"
fi

if [[ -f "$BACKUP/index.css" ]]; then
    cp -p "$BACKUP/index.css" "$SRC/index.css"
    echo "✓ Restored index.css"
fi

if [[ -f "$BACKUP/tokens.css" ]]; then
    cp -p "$BACKUP/tokens.css" "$STYLES/tokens.css"
    echo "✓ Restored tokens.css"
fi

if [[ -f "$BACKUP/dashboard.css" ]]; then
    cp -p "$BACKUP/dashboard.css" "$STYLES/dashboard.css"
    echo "✓ Restored dashboard.css"
fi

echo
echo "Rollback source restoration complete."

cd "$DASHBOARD"

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
