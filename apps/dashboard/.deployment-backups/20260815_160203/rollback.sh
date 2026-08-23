#!/usr/bin/env bash
set -Eeuo pipefail

DASHBOARD="/home/r3v/~/Agent-OS/apps/dashboard"
BACKUP="/home/r3v/~/Agent-OS/apps/dashboard/.deployment-backups/20260815_160203"

echo "Rolling back Agent-OS Command Center deployment..."
echo

cp -p "$BACKUP/App.tsx" "$DASHBOARD/src/App.tsx"

if [[ -f "$BACKUP/command-center.css" ]]; then
    cp -p "$BACKUP/command-center.css"           "$DASHBOARD/src/styles/command-center.css"
else
    rm -f "$DASHBOARD/src/styles/command-center.css"
fi

echo "✓ App.tsx restored"
echo "✓ Command Center CSS restored"
echo
echo "Rollback complete."
