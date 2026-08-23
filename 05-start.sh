#!/bin/bash
set -e

# 05-start.sh — Start all R3 production services
# Orchestrates: Agent-OS Control Plane, R3 Stable, Hermes, OpenClaw

PROD_DIR="/opt/r3-production"
ENV_FILE="$PROD_DIR/env/.env.production"
LOGS_DIR="$PROD_DIR/logs"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "══════════════════════════════════════════════════════"
echo "Starting R3 Production Environment"
echo "══════════════════════════════════════════════════════"

# Load environment
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Environment file not found: $ENV_FILE"
  exit 1
fi

source "$ENV_FILE"

# Verify all required directories exist
for dir in $PROD_DIR/agent-os-standalone/dist $PROD_DIR/r3-stable/dist $PROD_DIR/adapters; do
  if [ ! -d "$dir" ]; then
    echo "ERROR: Directory not found: $dir"
    echo "Run build scripts first: 01-build-standalone.sh, 02-build-stable.sh, 03-build-adapters.sh"
    exit 1
  fi
done

# Create logs directory
mkdir -p $LOGS_DIR

# Function to start service
start_service() {
  local name=$1
  local cmd=$2
  local log_file="$LOGS_DIR/${name}.log"
  
  echo -e "${BLUE}[${name}]${NC} Starting..."
  
  # Start service in background
  eval "$cmd" > "$log_file" 2>&1 &
  local pid=$!
  
  echo $pid > "$PROD_DIR/pids/${name}.pid" 2>/dev/null || true
  echo -e "${GREEN}[${name}]${NC} Started (PID: $pid, log: $log_file)"
  
  return $pid
}

# Create PID directory
mkdir -p "$PROD_DIR/pids"

echo ""
echo "Services starting in parallel..."
echo ""

# 1. Start PostgreSQL (if not already running)
if ! pgrep -x "postgres" > /dev/null; then
  echo -e "${YELLOW}PostgreSQL not running; starting...${NC}"
  pg_ctl start || true
  sleep 2
fi

# 2. Start Agent-OS Control Plane
start_service "agent-os-control-plane" \
  "cd $PROD_DIR/agent-os-standalone/dist && NODE_ENV=production node server/server.js"
sleep 2

# 3. Start R3 v4 Stable
start_service "r3-stable" \
  "cd $PROD_DIR/r3-stable && pnpm start"
sleep 2

# 4. Start Hermes Adapter
start_service "hermes-adapter" \
  "node $PROD_DIR/adapters/hermes/index.js"
sleep 1

# 5. Start OpenClaw Adapter
start_service "openclaw-adapter" \
  "node $PROD_DIR/adapters/openclaw/index.js"

echo ""
echo "══════════════════════════════════════════════════════"
echo "✅ All services started"
echo "══════════════════════════════════════════════════════"
echo ""
echo "Services running:"
echo -e "  ${GREEN}✓ Agent-OS Control Plane${NC}  — http://localhost:8080"
echo -e "  ${GREEN}✓ R3 v4 Stable${NC}             — http://localhost:3000"
echo -e "  ${GREEN}✓ Hermes Adapter${NC}           — registered with control plane"
echo -e "  ${GREEN}✓ OpenClaw Adapter${NC}         — registered with control plane"
echo ""
echo "Web UI:"
echo -e "  ${BLUE}Command Center${NC}   http://localhost:8080"
echo -e "  ${BLUE}R3 Studio${NC}         http://localhost:3000"
echo ""
echo "Logs:"
for log in agent-os-control-plane r3-stable hermes-adapter openclaw-adapter; do
  echo "  tail -f $LOGS_DIR/${log}.log"
done
echo ""
echo "Stop all services:"
echo "  bash $PROD_DIR/scripts/stop.sh"
echo ""
echo "Monitor services:"
echo "  bash $PROD_DIR/scripts/monitor.sh"
echo ""

# Function to handle Ctrl+C
trap 'cleanup' SIGINT SIGTERM

cleanup() {
  echo ""
  echo "══════════════════════════════════════════════════════"
  echo "Shutting down services..."
  echo "══════════════════════════════════════════════════════"
  
  # Kill all background processes
  for pid_file in $PROD_DIR/pids/*.pid; do
    if [ -f "$pid_file" ]; then
      pid=$(cat "$pid_file")
      if kill -0 $pid 2>/dev/null; then
        kill $pid 2>/dev/null || true
        echo "  Stopped PID $pid"
      fi
      rm "$pid_file"
    fi
  done
  
  echo "✅ Shutdown complete"
  exit 0
}

# Keep script running
wait
