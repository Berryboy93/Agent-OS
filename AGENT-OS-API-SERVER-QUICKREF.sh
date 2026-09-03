#!/bin/bash
################################################################################
# AGENT-OS API SERVER — Quick Reference
# Cheat sheet for common operations
################################################################################

cd ~/Agent-OS

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         AGENT-OS API SERVER — Quick Reference                 ║"
echo "║                                                                ║"
echo "║  Status: ✅ PRODUCTION READY                                  ║"
echo "║  Port: 3000                                                    ║"
echo "║  Module: packages/api-server                                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "📋 COMMON OPERATIONS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "1️⃣  BUILD MONOREPO"
echo "   cd ~/Agent-OS"
echo "   pnpm -r build"
echo ""

echo "2️⃣  START SERVER (foreground)"
echo "   node packages/api-server/dist/app.js"
echo ""

echo "3️⃣  START SERVER (background)"
echo "   nohup node packages/api-server/dist/app.js > api-server.log 2>&1 &"
echo "   echo \$! > api-server.pid"
echo ""

echo "4️⃣  STOP SERVER (background)"
echo "   kill \$(cat api-server.pid)"
echo "   rm api-server.pid"
echo ""

echo "5️⃣  CHECK SERVER STATUS"
echo "   curl http://localhost:3000/health | jq ."
echo ""

echo "6️⃣  VIEW LOGS (if running in background)"
echo "   tail -f api-server.log"
echo ""

echo "7️⃣  START WITH CUSTOM PORT"
echo "   PORT=5000 node packages/api-server/dist/app.js"
echo ""

echo "8️⃣  REBUILD ONLY API SERVER"
echo "   pnpm --filter @agent-os/api-server build"
echo ""

echo ""
echo "🧪 API TESTING"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Health Check:"
echo "  curl http://localhost:3000/health"
echo ""

echo "List Tools:"
echo "  curl http://localhost:3000/tools"
echo ""

echo "Execute Tool:"
echo "  curl -X POST http://localhost:3000/tools \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"toolName\": \"my-tool\", \"input\": {}}'"
echo ""

echo "With Pretty JSON:"
echo "  curl http://localhost:3000/health | jq ."
echo ""

echo ""
echo "📁 KEY FILES"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Source:"
echo "  packages/api-server/src/app.ts      (Express initialization)"
echo "  packages/api-server/src/index.ts    (Module exports)"
echo "  packages/api-server/src/routers/    (API routes)"
echo ""

echo "Compiled:"
echo "  packages/api-server/dist/app.js     (Entry point)"
echo "  packages/api-server/dist/index.js   (Module exports)"
echo "  packages/api-server/dist/routers/   (Compiled routes)"
echo ""

echo "Configuration:"
echo "  packages/api-server/tsconfig.json"
echo "  packages/api-server/package.json"
echo ""

echo "Backups:"
echo "  packages/api-server/.backups/       (Wire.txt backups)"
echo ""

echo ""
echo "🔧 TROUBLESHOOTING"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Port already in use?"
echo "  lsof -i :3000"
echo "  kill -9 <PID>"
echo "  PORT=5000 node packages/api-server/dist/app.js"
echo ""

echo "Build failed?"
echo "  rm -rf packages/api-server/dist"
echo "  pnpm -r build"
echo ""

echo "TypeScript errors?"
echo "  cd packages/api-server"
echo "  npx tsc -p tsconfig.json"
echo ""

echo "Module not found?"
echo "  cd ~/Agent-OS"
echo "  pnpm install"
echo "  pnpm -r build"
echo ""

echo "Server won't start?"
echo "  1. Check Node.js version: node --version"
echo "  2. Verify dist/app.js exists: ls -la packages/api-server/dist/app.js"
echo "  3. Check for errors: node packages/api-server/dist/app.js 2>&1 | head -20"
echo ""

echo ""
echo "📚 DOCUMENTATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Full Integration Guide:"
echo "  cat AGENT-OS-API-SERVER-INTEGRATION.md"
echo ""

echo "Wire.txt Commit Record:"
echo "  cat WIRE-COMMIT-AGENT-OS-API-SERVER.txt"
echo ""

echo "Integration Script:"
echo "  cat integrate-api-server.sh"
echo ""

echo ""
echo "✅ Ready to go!"
echo ""
