#!/bin/bash
################################################################################
# manage-services.sh (v2) - Enhanced Agent-OS Service Management
# 
# Features:
#   • Project validation & diagnostics
#   • Structured logging with rotation
#   • Health checks with retry logic
#   • Configuration file support
#   • Stale PID file recovery
#   • Detailed error reporting
#   • Service dependency management
################################################################################

set -o pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_DIR="${PROJECT_DIR:-${HOME}/Agent-OS}"
readonly CONFIG_FILE="${PROJECT_DIR}/.services.config"

# Service configuration
readonly API_SERVER_PORT=3000
readonly API_SERVER_BINARY="${PROJECT_DIR}/packages/api-server/dist/app.js"
readonly API_PID_FILE="${PROJECT_DIR}/.runtime/api-server.pid"
readonly API_LOG="${PROJECT_DIR}/.logs/api-server.log"

readonly BACKEND_PORT=5001
readonly BACKEND_DIR="${PROJECT_DIR}/apps/backend"
readonly BACKEND_PID_FILE="${PROJECT_DIR}/.runtime/backend.pid"
readonly BACKEND_LOG="${PROJECT_DIR}/.logs/backend.log"

# Feature flags
readonly ENABLE_HEALTH_CHECKS=true
readonly HEALTH_CHECK_TIMEOUT=5
readonly HEALTH_CHECK_RETRIES=3
readonly LOG_ROTATION_SIZE=$((10 * 1024 * 1024))  # 10MB
readonly STARTUP_WAIT=3

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly GRAY='\033[0;37m'
readonly NC='\033[0m'

# ============================================================================
# LOGGING & OUTPUT
# ============================================================================

log() {
  local level=$1
  shift
  local msg="$@"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${timestamp} [${level}] ${msg}"
}

print_header() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  $1${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
}

print_status() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${CYAN}ℹ${NC} $1"
}

print_debug() {
  if [[ "${DEBUG:-0}" == "1" ]]; then
    echo -e "${GRAY}→${NC} $1"
  fi
}

# Append to service log with rotation
append_log() {
  local log_file=$1
  shift
  local msg="$@"
  
  mkdir -p "$(dirname "$log_file")"
  
  # Rotate if needed
  if [[ -f "$log_file" ]] && [[ $(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file") -gt $LOG_ROTATION_SIZE ]]; then
    mv "$log_file" "${log_file}.$(date +%s)"
    gzip "${log_file}."* 2>/dev/null || true
  fi
  
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $msg" >> "$log_file"
}

# ============================================================================
# VALIDATION & DIAGNOSTICS
# ============================================================================

validate_prerequisites() {
  local errors=0
  
  print_header "Validating Prerequisites"
  echo ""
  
  # Check Agent-OS directory exists
  if [[ ! -d "$PROJECT_DIR" ]]; then
    print_error "Agent-OS directory not found: $PROJECT_DIR"
    ((errors++))
  else
    print_status "Agent-OS directory: $PROJECT_DIR"
  fi
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    print_error "Node.js not installed"
    ((errors++))
  else
    local node_version=$(node --version)
    print_status "Node.js: $node_version"
  fi
  
  # Check pnpm
  if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm not installed (required for Backend)"
    ((errors++))
  else
    local pnpm_version=$(pnpm --version)
    print_status "pnpm: $pnpm_version"
  fi
  
  # Check API Server binary
  if [[ -d "$PROJECT_DIR/packages/api-server" ]]; then
    if [[ ! -f "$API_SERVER_BINARY" ]]; then
      print_warning "API Server not built: $API_SERVER_BINARY (run: pnpm build)"
    else
      print_status "API Server binary: ✓ Built"
    fi
  else
    print_error "API Server source not found: ${PROJECT_DIR}/packages/api-server"
    ((errors++))
  fi
  
  # Check Backend directory
  if [[ ! -d "$BACKEND_DIR" ]]; then
    print_error "Backend directory not found: $BACKEND_DIR"
    ((errors++))
  else
    if [[ ! -f "$BACKEND_DIR/package.json" ]]; then
      print_error "Backend package.json not found"
      ((errors++))
    else
      print_status "Backend: ✓ Found"
    fi
  fi
  
  # Check curl for health checks
  if ! command -v curl &> /dev/null; then
    print_warning "curl not installed (health checks disabled)"
  else
    print_status "curl: ✓ Available"
  fi
  
  # Check lsof for port monitoring
  if ! command -v lsof &> /dev/null; then
    print_warning "lsof not installed (port monitoring disabled)"
  else
    print_status "lsof: ✓ Available"
  fi
  
  echo ""
  if [[ $errors -gt 0 ]]; then
    print_error "$errors prerequisite(s) missing"
    return 1
  else
    print_status "All prerequisites OK"
    return 0
  fi
}

diagnose_system() {
  print_header "System Diagnostics"
  echo ""
  
  # Process check
  echo "Active Node/pnpm processes:"
  ps aux | grep -E '(node|pnpm)' | grep -v grep | awk '{print "  PID " $2 ": " $11}' || echo "  (none)"
  
  echo ""
  echo "Port usage:"
  
  # Port 3000
  if lsof -i :${API_SERVER_PORT} &>/dev/null; then
    echo -e "  ${RED}Port ${API_SERVER_PORT}:${NC} In use"
    lsof -i :${API_SERVER_PORT} | tail -n +2 | awk '{print "    PID " $2 ": " $1}'
  else
    echo -e "  ${GREEN}Port ${API_SERVER_PORT}:${NC} Available"
  fi
  
  # Port 5001
  if lsof -i :${BACKEND_PORT} &>/dev/null; then
    echo -e "  ${RED}Port ${BACKEND_PORT}:${NC} In use"
    lsof -i :${BACKEND_PORT} | tail -n +2 | awk '{print "    PID " $2 ": " $1}'
  else
    echo -e "  ${GREEN}Port ${BACKEND_PORT}:${NC} Available"
  fi
  
  echo ""
  echo "PID files:"
  [[ -f "$API_PID_FILE" ]] && echo "  API Server: $(cat "$API_PID_FILE")" || echo "  API Server: (missing)"
  [[ -f "$BACKEND_PID_FILE" ]] && echo "  Backend: $(cat "$BACKEND_PID_FILE")" || echo "  Backend: (missing)"
  
  echo ""
  echo "Disk usage:"
  du -sh "$PROJECT_DIR" 2>/dev/null || echo "  (unable to determine)"
  
  echo ""
}

# ============================================================================
# PROCESS MANAGEMENT
# ============================================================================

kill_port() {
  local port=$1
  local pids=$(lsof -ti:$port 2>/dev/null || true)
  
  if [[ -z "$pids" ]]; then
    return 0
  fi
  
  for pid in $pids; do
    if kill -9 "$pid" 2>/dev/null; then
      append_log "$API_LOG" "KILLED process on port $port (PID: $pid)"
    fi
  done
  
  sleep 1
}

cleanup_stale_pids() {
  # Remove PID files for processes that don't exist
  for pid_file in "$API_PID_FILE" "$BACKEND_PID_FILE"; do
    if [[ -f "$pid_file" ]]; then
      local pid=$(cat "$pid_file")
      if ! kill -0 "$pid" 2>/dev/null; then
        rm "$pid_file"
        print_debug "Removed stale PID file: $pid_file"
      fi
    fi
  done
}

is_running() {
  local pid_file=$1
  
  if [[ ! -f "$pid_file" ]]; then
    return 1
  fi
  
  local pid=$(cat "$pid_file")
  kill -0 "$pid" 2>/dev/null
}

check_health() {
  local url=$1
  local service=$2
  local retries=${3:-$HEALTH_CHECK_RETRIES}
  
  if ! command -v curl &>/dev/null; then
    return 0  # Skip if curl unavailable
  fi
  
  for ((i=1; i<=retries; i++)); do
    if curl -sf --connect-timeout $HEALTH_CHECK_TIMEOUT "$url" > /dev/null 2>&1; then
      return 0
    fi
    
    if [[ $i -lt $retries ]]; then
      sleep 1
    fi
  done
  
  return 1
}

# ============================================================================
# SERVICE START/STOP
# ============================================================================

start_api_server() {
  print_header "Starting API Server (port ${API_SERVER_PORT})"
  
  # Validation
  if [[ ! -f "$API_SERVER_BINARY" ]]; then
    print_error "API Server binary not found: $API_SERVER_BINARY"
    print_info "Build the project first: cd $PROJECT_DIR && pnpm build"
    return 1
  fi
  
  # Cleanup
  cleanup_stale_pids
  kill_port ${API_SERVER_PORT}
  
  # Create runtime directories
  mkdir -p "$(dirname "$API_PID_FILE")" "$(dirname "$API_LOG")"
  
  # Start service
  cd "$PROJECT_DIR"
  append_log "$API_LOG" "Starting API Server..."
  
  nohup node "$API_SERVER_BINARY" >> "$API_LOG" 2>&1 &
  local api_pid=$!
  echo "$api_pid" > "$API_PID_FILE"
  
  print_debug "API Server PID: $api_pid"
  sleep ${STARTUP_WAIT}
  
  # Verify
  if ! is_running "$API_PID_FILE"; then
    print_error "API Server failed to start"
    print_info "Recent logs:"
    tail -10 "$API_LOG" | sed 's/^/  /'
    append_log "$API_LOG" "FAILED to start"
    return 1
  fi
  
  print_status "API Server started (PID: $api_pid)"
  echo "     Log: $API_LOG"
  echo "     Health: curl http://localhost:${API_SERVER_PORT}/health"
  
  # Health check
  if [[ "$ENABLE_HEALTH_CHECKS" == "true" ]]; then
    if check_health "http://localhost:${API_SERVER_PORT}/health" "API Server"; then
      print_status "API Server health: ✓ Responding"
      append_log "$API_LOG" "Health check passed"
    else
      print_warning "API Server health check failed (may still be starting up)"
    fi
  fi
  
  append_log "$API_LOG" "Started successfully (PID: $api_pid)"
}

start_backend() {
  print_header "Starting Backend (port ${BACKEND_PORT})"
  
  # Validation
  if [[ ! -d "$BACKEND_DIR" ]] || [[ ! -f "$BACKEND_DIR/package.json" ]]; then
    print_error "Backend not found: $BACKEND_DIR"
    return 1
  fi
  
  # Check pnpm
  if ! command -v pnpm &>/dev/null; then
    print_error "pnpm is required but not installed"
    return 1
  fi
  
  # Cleanup
  cleanup_stale_pids
  kill_port ${BACKEND_PORT}
  
  # Create runtime directories
  mkdir -p "$(dirname "$BACKEND_PID_FILE")" "$(dirname "$BACKEND_LOG")"
  
  # Start service
  cd "$BACKEND_DIR"
  append_log "$BACKEND_LOG" "Starting Backend..."
  
  nohup pnpm dev >> "$BACKEND_LOG" 2>&1 &
  local backend_pid=$!
  echo "$backend_pid" > "$BACKEND_PID_FILE"
  
  print_debug "Backend PID: $backend_pid"
  sleep $((STARTUP_WAIT + 1))
  
  # Verify
  if ! is_running "$BACKEND_PID_FILE"; then
    print_error "Backend failed to start"
    print_info "Recent logs:"
    tail -10 "$BACKEND_LOG" | sed 's/^/  /'
    append_log "$BACKEND_LOG" "FAILED to start"
    return 1
  fi
  
  print_status "Backend started (PID: $backend_pid)"
  echo "     Log: $BACKEND_LOG"
  echo "     Health: curl http://localhost:${BACKEND_PORT}/health"
  
  # Health check
  if [[ "$ENABLE_HEALTH_CHECKS" == "true" ]]; then
    if check_health "http://localhost:${BACKEND_PORT}/health" "Backend"; then
      print_status "Backend health: ✓ Responding"
      append_log "$BACKEND_LOG" "Health check passed"
    else
      print_warning "Backend health check failed (may still be starting up)"
    fi
  fi
  
  append_log "$BACKEND_LOG" "Started successfully (PID: $backend_pid)"
}

stop_api_server() {
  print_header "Stopping API Server"
  
  if [[ -f "$API_PID_FILE" ]]; then
    local pid=$(cat "$API_PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      sleep 1
      print_status "API Server stopped (was PID: $pid)"
      append_log "$API_LOG" "Stopped (PID: $pid)"
    else
      print_warning "PID file exists but process not found"
    fi
    rm "$API_PID_FILE"
  else
    print_warning "API Server PID file not found"
  fi
  
  # Ensure port is clear
  kill_port ${API_SERVER_PORT}
}

stop_backend() {
  print_header "Stopping Backend"
  
  if [[ -f "$BACKEND_PID_FILE" ]]; then
    local pid=$(cat "$BACKEND_PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      sleep 1
      print_status "Backend stopped (was PID: $pid)"
      append_log "$BACKEND_LOG" "Stopped (PID: $pid)"
    else
      print_warning "PID file exists but process not found"
    fi
    rm "$BACKEND_PID_FILE"
  else
    print_warning "Backend PID file not found"
  fi
  
  # Ensure port is clear
  kill_port ${BACKEND_PORT}
}

# ============================================================================
# STATUS & MONITORING
# ============================================================================

status_all() {
  print_header "Service Status"
  echo ""
  
  # API Server
  echo "API Server (port ${API_SERVER_PORT}):"
  if is_running "$API_PID_FILE"; then
    local pid=$(cat "$API_PID_FILE")
    print_status "Running (PID: $pid)"
    
    if [[ "$ENABLE_HEALTH_CHECKS" == "true" ]]; then
      if check_health "http://localhost:${API_SERVER_PORT}/health" "API" 1; then
        echo "     Health: ${GREEN}✓${NC} Responding"
      else
        echo "     Health: ${RED}✗${NC} Not responding"
      fi
    fi
  else
    print_error "Not running"
  fi
  
  echo ""
  
  # Backend
  echo "Backend (port ${BACKEND_PORT}):"
  if is_running "$BACKEND_PID_FILE"; then
    local pid=$(cat "$BACKEND_PID_FILE")
    print_status "Running (PID: $pid)"
    
    if [[ "$ENABLE_HEALTH_CHECKS" == "true" ]]; then
      if check_health "http://localhost:${BACKEND_PORT}/health" "Backend" 1; then
        echo "     Health: ${GREEN}✓${NC} Responding"
      else
        echo "     Health: ${RED}✗${NC} Not responding"
      fi
    fi
  else
    print_error "Not running"
  fi
  
  echo ""
}

# ============================================================================
# LOGGING
# ============================================================================

show_logs() {
  local service=$1
  local lines=${2:-50}
  
  case "$service" in
    api)
      echo "API Server logs (last $lines lines):"
      echo "════════════════════════════════════"
      if [[ -f "$API_LOG" ]]; then
        tail -$lines "$API_LOG"
      else
        echo "(no logs yet)"
      fi
      ;;
    backend)
      echo "Backend logs (last $lines lines):"
      echo "═════════════════════════════════"
      if [[ -f "$BACKEND_LOG" ]]; then
        tail -$lines "$BACKEND_LOG"
      else
        echo "(no logs yet)"
      fi
      ;;
    both)
      show_logs "api" "$lines"
      echo ""
      echo ""
      show_logs "backend" "$lines"
      ;;
  esac
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  local cmd="${1:-status}"
  
  case "$cmd" in
    validate)
      validate_prerequisites
      ;;
    
    diagnose|diag)
      diagnose_system
      ;;
    
    start)
      validate_prerequisites || {
        print_error "Prerequisites not met. Fix issues and retry."
        return 1
      }
      echo ""
      start_api_server
      sleep 2
      start_backend
      echo ""
      status_all
      ;;
    
    stop)
      stop_backend
      echo ""
      stop_api_server
      echo ""
      print_header "All services stopped"
      ;;
    
    restart)
      stop_backend
      stop_api_server
      sleep 2
      echo ""
      start_api_server
      sleep 2
      start_backend
      echo ""
      status_all
      ;;
    
    restart-api)
      stop_api_server
      sleep 1
      start_api_server
      echo ""
      status_all
      ;;
    
    restart-backend)
      stop_backend
      sleep 1
      start_backend
      echo ""
      status_all
      ;;
    
    status)
      cleanup_stale_pids
      status_all
      ;;
    
    logs)
      show_logs "both" "${2:-50}"
      ;;
    
    logs-api)
      show_logs "api" "${2:-50}"
      ;;
    
    logs-backend)
      show_logs "backend" "${2:-50}"
      ;;
    
    kill-ports)
      print_header "Force killing ports ${API_SERVER_PORT} and ${BACKEND_PORT}"
      kill_port ${API_SERVER_PORT}
      print_status "Port ${API_SERVER_PORT} cleared"
      kill_port ${BACKEND_PORT}
      print_status "Port ${BACKEND_PORT} cleared"
      ;;
    
    *)
      cat << 'EOF'
Usage: manage-services.sh <command> [options]

COMMANDS:
  start               Start both services
  stop                Stop both services  
  restart             Restart both services
  restart-api         Restart API Server only
  restart-backend     Restart Backend only
  status              Show service status
  
MONITORING:
  logs [lines]        Show logs from both services (default: 50 lines)
  logs-api [lines]    Show API Server logs
  logs-backend [lines] Show Backend logs
  
DIAGNOSTICS:
  validate            Check prerequisites and dependencies
  diagnose            Run full system diagnostics
  kill-ports          Force kill processes on service ports
  
EXAMPLES:
  ./manage-services.sh start
  ./manage-services.sh restart
  ./manage-services.sh logs 100
  ./manage-services.sh diagnose
  ./manage-services.sh validate
  
  DEBUG=1 ./manage-services.sh start   (enable debug output)

EOF
      return 1
      ;;
  esac
}

main "$@"