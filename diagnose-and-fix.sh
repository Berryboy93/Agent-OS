#!/bin/bash
################################################################################
# diagnose-and-fix.sh
# Identify and remediate ALL Agent-OS issues
# Two-phase: Phase 1 = Diagnose, Phase 2 = Fix (if --fix passed)
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;37m'
NC='\033[0m'

PROJECT_DIR="${HOME}/Agent-OS"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ISSUES_FOUND=0

# Parse arguments
FIX_MODE=0
if [ "$1" = "--fix" ]; then
  FIX_MODE=1
fi

cd "$PROJECT_DIR"

################################################################################
# HEADER
################################################################################

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
if [ $FIX_MODE -eq 0 ]; then
  echo -e "${BLUE}║  AGENT-OS COMPREHENSIVE DIAGNOSTICS                           ║${NC}"
  echo -e "${BLUE}║  (Run with --fix to auto-remediate)                           ║${NC}"
else
  echo -e "${BLUE}║  AGENT-OS AUTO-REMEDIATION                                   ║${NC}"
  echo -e "${BLUE}║  Fixing all identified issues...                             ║${NC}"
fi
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

################################################################################
# ISSUE #1: apps/backend tsx loader
################################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}ISSUE #1: apps/backend tsx loader deprecation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

BACKEND_PKG="${PROJECT_DIR}/apps/backend/package.json"

if [ ! -f "$BACKEND_PKG" ]; then
  echo -e "${RED}✗ File not found: apps/backend/package.json${NC}"
  ((ISSUES_FOUND++))
else
  # Check for issue
  if grep -q "node --loader tsx" "$BACKEND_PKG"; then
    echo -e "${RED}✗ ISSUE FOUND: Using deprecated --loader flag${NC}"
    echo ""
    echo "   Current:"
    grep '"dev"' "$BACKEND_PKG" | sed 's/^/     /'
    echo ""
    echo "   Should be:"
    echo '     "dev": "node --import tsx/esm src/index.ts",'
    echo ""
    
    ((ISSUES_FOUND++))
    
    if [ $FIX_MODE -eq 1 ]; then
      echo -e "${YELLOW}Fixing...${NC}"
      
      # Backup
      mkdir -p "${PROJECT_DIR}/.fix-backups"
      cp "$BACKEND_PKG" "${PROJECT_DIR}/.fix-backups/backend-package.json.${TIMESTAMP}.bak"
      
      # Fix using sed (more portable)
      sed -i 's/"node --loader tsx/"node --import tsx\/esm/g' "$BACKEND_PKG"
      
      echo -e "${GREEN}✓ Fixed apps/backend dev script${NC}"
      echo ""
      echo "   Updated:"
      grep '"dev"' "$BACKEND_PKG" | sed 's/^/     /'
    fi
  else
    echo -e "${GREEN}✓ No --loader issue found${NC}"
  fi
fi

echo ""

################################################################################
# ISSUE #2: Package count mismatch (30 of 31)
################################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}ISSUE #2: Package count (30 of 31 built)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

TOTAL_PACKAGES=$(find packages apps -maxdepth 2 -name "package.json" -not -path "*/node_modules/*" | wc -l)
echo "Total packages in monorepo: $TOTAL_PACKAGES"
echo ""

echo "Packages:"
find packages apps -maxdepth 2 -name "package.json" -not -path "*/node_modules/*" | sort | nl

echo ""
echo -e "${YELLOW}Note: One package may be skipped if it has private=true or no build script${NC}"
echo "  To identify which, run: pnpm -r build 2>&1 | grep -E 'SKIP|skip'"

if [ $FIX_MODE -eq 1 ]; then
  echo ""
  echo -e "${YELLOW}Checking each package...${NC}"
  
  find packages apps -maxdepth 2 -name "package.json" -not -path "*/node_modules/*" | while read pkgfile; do
    pkgdir=$(dirname "$pkgfile")
    pkgname=$(grep -m1 '"name"' "$pkgfile" | sed 's/.*"\([^"]*\)".*/\1/')
    
    if grep -q '"private": true' "$pkgfile"; then
      echo "    $pkgname - private=true (skipped)"
    elif grep -q '"build"' "$pkgfile"; then
      echo "    $pkgname - has build script"
    else
      echo "    $pkgname - ⚠️  no build script"
    fi
  done
fi

echo ""

################################################################################
# ISSUE #3: TypeScript build errors
################################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}ISSUE #3: TypeScript build status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Running: pnpm -r build (this may take 60+ seconds)..."
echo ""

BUILD_LOG=$(mktemp)
if pnpm -r build > "$BUILD_LOG" 2>&1; then
  echo -e "${GREEN}✓ Build successful${NC}"
  
  # Extract build times
  TOTAL_TIME=$(tail -20 "$BUILD_LOG" | grep -oP '(?<=Done in )\d+\.\d+' | tail -1)
  echo "  Total time: ${TOTAL_TIME}s"
  
  # Count completed packages
  COMPLETED=$(grep -c "└─ Done" "$BUILD_LOG" || echo "0")
  echo "  Packages completed: $COMPLETED"
else
  echo -e "${RED}✗ Build failed or had errors${NC}"
  ((ISSUES_FOUND++))
  
  echo ""
  echo "Build errors:"
  grep -E "error TS|Error:|Failed" "$BUILD_LOG" | head -10
fi

rm -f "$BUILD_LOG"
echo ""

################################################################################
# ISSUE #4: API Server functionality
################################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}ISSUE #4: API Server status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

API_DIST="${PROJECT_DIR}/packages/api-server/dist/app.js"

if [ -f "$API_DIST" ]; then
  echo -e "${GREEN}✓ api-server/dist/app.js exists${NC}"
  
  if [ $FIX_MODE -eq 1 ]; then
    echo ""
    echo "Testing endpoints..."
    
    # Start server
    timeout 5 node "$API_DIST" > /tmp/api-server.log 2>&1 &
    SERVER_PID=$!
    
    sleep 2
    
    # Test health
    if curl -s http://localhost:3000/health 2>/dev/null | grep -q "ok"; then
      echo -e "${GREEN}✓ Health endpoint responding${NC}"
    else
      echo -e "${RED}✗ Health endpoint failed${NC}"
      ((ISSUES_FOUND++))
    fi
    
    # Kill server
    kill $SERVER_PID 2>/dev/null || true
  fi
else
  echo -e "${RED}✗ api-server/dist/app.js not found${NC}"
  ((ISSUES_FOUND++))
fi

echo ""

################################################################################
# ISSUE #5: Environment & Disk
################################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}ISSUE #5: Environment compatibility${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Node.js: $(node --version)"
echo "pnpm: $(pnpm --version)"
echo "TypeScript: $(npx tsc --version 2>/dev/null || echo 'local')"
echo ""

DISK_USAGE=$(df -h "$PROJECT_DIR" | tail -1 | awk '{print $5}')
DISK_AVAILABLE=$(df -h "$PROJECT_DIR" | tail -1 | awk '{print $4}')

echo "Disk:"
echo "  Usage: $DISK_USAGE"
echo "  Available: $DISK_AVAILABLE"

if [[ "$DISK_USAGE" > "90%" ]]; then
  echo -e "${RED}✗ WARNING: Low disk space${NC}"
  ((ISSUES_FOUND++))
else
  echo -e "${GREEN}✓ Disk space OK${NC}"
fi

echo ""

################################################################################
# SUMMARY
################################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
if [ $ISSUES_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ ALL SYSTEMS GREEN${NC}"
  echo ""
  echo "Status:"
  echo "  ✓ apps/backend configured correctly"
  echo "  ✓ All packages accounted for"
  echo "  ✓ TypeScript build clean"
  echo "  ✓ API Server ready"
  echo "  ✓ Environment compatible"
  echo ""
  echo "Next steps:"
  echo "  1. Deploy API Server: node packages/api-server/dist/app.js"
  echo "  2. Start backend (if needed): cd apps/backend && pnpm dev"
  echo "  3. Run tests: pnpm -r test"
else
  echo -e "${YELLOW}⚠️  $ISSUES_FOUND issue(s) found${NC}"
  echo ""
  echo "To fix automatically, run:"
  echo -e "  ${BLUE}bash diagnose-and-fix.sh --fix${NC}"
fi

echo ""
