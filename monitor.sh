#!/bin/bash

# monitor.sh — Monitor R3 production services

PROD_DIR="/opt/r3-production"
ENV_FILE="$PROD_DIR/env/.env.production"

source "$ENV_FILE" 2>/dev/null

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_service() {
  local name=$1
  local port=$2
  local endpoint=$3
  
  if curl -s -m 2 "http://localhost:$port/$endpoint" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $name ($port/$endpoint)"
    return 0
  else
    echo -e "${RED}✗${NC} $name ($port/$endpoint) — not responding"
    return 1
  fi
}

echo "══════════════════════════════════════════════════════"
echo "R3 Production Services Monitor"
echo "══════════════════════════════════════════════════════"
echo ""

status=0

echo "Health Checks:"
check_service "Agent-OS Control Plane" 8080 "api/snapshot" || status=1
check_service "R3 v4 Stable" 3000 "api/health" || status=1
check_service "PostgreSQL" 5432 "" 2>/dev/null || {
  if pgrep postgres > /dev/null; then
    echo -e "${GREEN}✓${NC} PostgreSQL (5432)"
  else
    echo -e "${RED}✗${NC} PostgreSQL (5432) — not running"
    status=1
  fi
}

echo ""
echo "Service Processes:"
for service in agent-os-control-plane r3-stable hermes-adapter openclaw-adapter; do
  pid_file="$PROD_DIR/pids/${service}.pid"
  if [ -f "$pid_file" ]; then
    pid=$(cat "$pid_file")
    if kill -0 $pid 2>/dev/null; then
      echo -e "${GREEN}✓${NC} $service (PID: $pid)"
    else
      echo -e "${RED}✗${NC} $service (PID $pid not running)"
      status=1
    fi
  else
    echo -e "${YELLOW}?${NC} $service (no PID file)"
  fi
done

echo ""
echo "Database:"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as total_runs FROM runs;" 2>/dev/null | tail -2 || {
  echo -e "${RED}✗${NC} Database connection failed"
  status=1
}

echo ""
echo "Recent Activity:"
echo "Last 5 completed runs:"
psql "$DATABASE_URL" -c "SELECT run_id, agent_id, status, completed_at FROM runs WHERE status='completed' ORDER BY completed_at DESC LIMIT 5;" 2>/dev/null || echo "  (no data)"

echo ""
echo "Log Tails (last 3 lines each):"
for log in $PROD_DIR/logs/*.log; do
  if [ -f "$log" ]; then
    echo ""
    echo "  $(basename $log):"
    tail -3 "$log" | sed 's/^/    /'
  fi
done

echo ""
echo "══════════════════════════════════════════════════════"

if [ $status -eq 0 ]; then
  echo -e "${GREEN}✓ All services operational${NC}"
else
  echo -e "${RED}✗ Some services are down — restart with: bash $PROD_DIR/scripts/05-start.sh${NC}"
fi

exit $status
