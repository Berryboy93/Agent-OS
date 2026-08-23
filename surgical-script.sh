#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "STRUCTURE CHECK"
echo "═══════════════════════════════════════════════════════════"

echo "1. Does apps/ exist?"
ls -ld ~/Agent-OS/apps 2>/dev/null || echo "❌ NO"

echo ""
echo "2. What's inside apps/?"
ls -la ~/Agent-OS/apps/ 2>/dev/null || echo "❌ Directory doesn't exist"

echo ""
echo "3. Does dashboard exist?"
ls -ld ~/Agent-OS/apps/dashboard 2>/dev/null || echo "❌ NO"

echo ""
echo "4. master-integration.sh exists?"
ls -lah ~/Agent-OS/master-integration.sh 2>/dev/null || echo "❌ NO"

echo ""
echo "5. Last 30 lines of master-integration.sh:"
tail -30 ~/Agent-OS/master-integration.sh 2>/dev/null || echo "❌ Can't read"

echo ""
echo "6. Entire Agent-OS directory tree (2 levels):"
tree -L 2 ~/Agent-OS 2>/dev/null || find ~/Agent-OS -maxdepth 2 -type d | head -30
