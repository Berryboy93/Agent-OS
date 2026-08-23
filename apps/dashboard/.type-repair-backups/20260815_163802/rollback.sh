#!/usr/bin/env bash
set -Eeuo pipefail

DASHBOARD="/home/r3v/~/Agent-OS/apps/dashboard"
SRC="$DASHBOARD/src"
BACKUP="/home/r3v/~/Agent-OS/apps/dashboard/.type-repair-backups/20260815_163802"

cp -p "$BACKUP/App.tsx" "$SRC/App.tsx"
cp -p "$BACKUP/App-integrated.tsx" "$SRC/App-integrated.tsx"
cp -p "$BACKUP/useEventStream.ts" "$SRC/hooks/useEventStream.ts"

if [[ -f "$BACKUP/useCommandCenter.ts" ]]; then
    cp -p "$BACKUP/useCommandCenter.ts" "$SRC/hooks/useCommandCenter.ts"
fi

if [[ -f "$BACKUP/useHealthCheck.ts" ]]; then
    cp -p "$BACKUP/useHealthCheck.ts" "$SRC/hooks/useHealthCheck.ts"
fi

if [[ -f "$BACKUP/useRuns.ts" ]]; then
    cp -p "$BACKUP/useRuns.ts" "$SRC/hooks/useRuns.ts"
fi

cp -p "$BACKUP/package.json" "$DASHBOARD/package.json"
cp -p "$BACKUP/tsconfig.json" "$DASHBOARD/tsconfig.json"

echo "Rollback completed."
