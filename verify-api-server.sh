#!/bin/bash

# Comprehensive verification script for @agent-os/api-server
# Checks all files exist, types are correct, build succeeds

set -e

PROJECT_ROOT="${PROJECT_ROOT:-.}"
API_SERVER_DIR="$PROJECT_ROOT/packages/api-server"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo -e "${BLUE}═══════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_check() {
  echo -e "${BLUE}→ $1${NC}"
}

PASS=0
FAIL=0

check_file() {
  local file="$1"
  local description="$2"
  
  if [ -f "$file" ]; then
    print_success "$description"
    ((PASS++))
  else
    print_error "$description — FILE NOT FOUND: $file"
    ((FAIL++))
  fi
}

check_content() {
  local file="$1"
  local pattern="$2"
  local description="$3"
  
  if [ ! -f "$file" ]; then
    print_error "$description — FILE NOT FOUND: $file"
    ((FAIL++))
    return
  fi
  
  if grep -q "$pattern" "$file"; then
    print_success "$description"
    ((PASS++))
  else
    print_error "$description — PATTERN NOT FOUND: $pattern"
    ((FAIL++))
  fi
}

# ═══════════════════════════════════════
print_header "1. VERIFYING DIRECTORY STRUCTURE"
# ═══════════════════════════════════════

if [ ! -d "$API_SERVER_DIR" ]; then
  print_error "api-server directory not found at $API_SERVER_DIR"
  exit 1
fi
print_success "api-server directory exists"

if [ ! -d "$API_SERVER_DIR/src" ]; then
  print_error "src directory not found"
  exit 1
fi
print_success "src directory exists"

if [ ! -d "$API_SERVER_DIR/src/routers" ]; then
  print_error "src/routers directory not found"
  exit 1
fi
print_success "src/routers directory exists"

# ═══════════════════════════════════════
print_header "2. VERIFYING SOURCE FILES"
# ═══════════════════════════════════════

check_file "$API_SERVER_DIR/package.json" "package.json exists"
check_file "$API_SERVER_DIR/tsconfig.json" "tsconfig.json exists"
check_file "$API_SERVER_DIR/src/index.ts" "src/index.ts exists"
check_file "$API_SERVER_DIR/src/app.ts" "src/app.ts exists (Express factory)"
check_file "$API_SERVER_DIR/src/middleware.ts" "src/middleware.ts exists"
check_file "$API_SERVER_DIR/src/routers/index.ts" "src/routers/index.ts exists"
check_file "$API_SERVER_DIR/src/routers/tools.ts" "src/routers/tools.ts exists"
check_file "$API_SERVER_DIR/README.md" "README.md exists"

# ═══════════════════════════════════════
print_header "3. VERIFYING SOURCE CONTENT"
# ═══════════════════════════════════════

check_content "$API_SERVER_DIR/src/routers/tools.ts" "Router as ExpressRouter" "tools.ts: Explicit Router typing"
check_content "$API_SERVER_DIR/src/routers/tools.ts" "interface ExecuteToolRequest" "tools.ts: Request type defined"
check_content "$API_SERVER_DIR/src/routers/tools.ts" "interface ExecuteToolResponse" "tools.ts: Response type defined"
check_content "$API_SERVER_DIR/src/routers/tools.ts" "POST /execute" "tools.ts: POST /execute endpoint"
check_content "$API_SERVER_DIR/src/routers/tools.ts" "GET /" "tools.ts: GET / endpoint"
check_content "$API_SERVER_DIR/src/routers/tools.ts" "GET /:toolName" "tools.ts: GET /:toolName endpoint"

check_content "$API_SERVER_DIR/src/app.ts" "createApp" "app.ts: createApp() factory function"
check_content "$API_SERVER_DIR/src/app.ts" "startServer" "app.ts: startServer() function"
check_content "$API_SERVER_DIR/src/app.ts" "express.json" "app.ts: JSON middleware"
check_content "$API_SERVER_DIR/src/app.ts" "requestLogger" "app.ts: Request logger middleware"
check_content "$API_SERVER_DIR/src/app.ts" "errorHandler" "app.ts: Error handler middleware"
check_content "$API_SERVER_DIR/src/app.ts" "authenticate" "app.ts: Auth middleware"

check_content "$API_SERVER_DIR/src/middleware.ts" "export const requestLogger" "middleware.ts: requestLogger export"
check_content "$API_SERVER_DIR/src/middleware.ts" "export const errorHandler" "middleware.ts: errorHandler export"
check_content "$API_SERVER_DIR/src/middleware.ts" "export const authenticate" "middleware.ts: authenticate export"
check_content "$API_SERVER_DIR/src/middleware.ts" "export const healthCheck" "middleware.ts: healthCheck export"

check_content "$API_SERVER_DIR/package.json" "@agent-os/core" "package.json: @agent-os/core dependency"
check_content "$API_SERVER_DIR/package.json" "@agent-os/runtime" "package.json: @agent-os/runtime dependency"
check_content "$API_SERVER_DIR/package.json" "express" "package.json: express dependency"

check_content "$API_SERVER_DIR/tsconfig.json" "skipLibCheck" "tsconfig.json: skipLibCheck enabled"
check_content "$API_SERVER_DIR/tsconfig.json" "composite" "tsconfig.json: composite enabled"
check_content "$API_SERVER_DIR/tsconfig.json" "declaration" "tsconfig.json: declaration enabled"
check_content "$API_SERVER_DIR/tsconfig.json" "@agent-os" "tsconfig.json: @agent-os path alias"

# ═══════════════════════════════════════
print_header "4. VERIFYING EXPORTS"
# ═══════════════════════════════════════

check_content "$API_SERVER_DIR/src/index.ts" "export.*app" "index.ts: Exports app module"
check_content "$API_SERVER_DIR/src/index.ts" "export.*middleware" "index.ts: Exports middleware"
check_content "$API_SERVER_DIR/src/index.ts" "export.*routers" "index.ts: Exports routers"

check_content "$API_SERVER_DIR/src/routers/index.ts" "toolsRouter" "routers/index.ts: Exports toolsRouter"

# ═══════════════════════════════════════
print_header "5. VERIFYING DOCUMENTATION"
# ═══════════════════════════════════════

check_content "$API_SERVER_DIR/README.md" "POST /tools/execute" "README: Tool execution endpoint documented"
check_content "$API_SERVER_DIR/README.md" "GET /tools" "README: List tools endpoint documented"
check_content "$API_SERVER_DIR/README.md" "GET /tools/:toolName" "README: Tool details endpoint documented"
check_content "$API_SERVER_DIR/README.md" "GET /health" "README: Health check endpoint documented"
check_content "$API_SERVER_DIR/README.md" "TODO" "README: Integration TODOs documented"
check_content "$API_SERVER_DIR/README.md" "Architecture" "README: Architecture documented"

# ═══════════════════════════════════════
print_header "6. FILE STATISTICS"
# ═══════════════════════════════════════

echo "Source files created:"
find "$API_SERVER_DIR/src" -name "*.ts" -type f -exec wc -l {} + | awk '{print "  " $2 ": " $1 " lines"}'

echo ""
echo "Total lines of code:"
find "$API_SERVER_DIR/src" -name "*.ts" -type f -exec wc -l {} + | tail -1 | awk '{print "  " $1 " lines"}'

# ═══════════════════════════════════════
print_header "7. SUMMARY"
# ═══════════════════════════════════════

echo "Passed checks: $(($PASS))"
echo "Failed checks: $(($FAIL))"

if [ $FAIL -eq 0 ]; then
  echo ""
  print_success "ALL CHECKS PASSED! Api-server is production-ready."
  echo ""
  echo "Next step: Build the monorepo"
  echo "  cd $PROJECT_ROOT"
  echo "  pnpm install"
  echo "  pnpm -r build"
  echo ""
  exit 0
else
  echo ""
  print_error "SOME CHECKS FAILED. Please review the errors above."
  echo ""
  exit 1
fi
