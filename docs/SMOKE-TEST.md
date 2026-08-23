# Agent-OS/Agi-Suite/Stable Integration Smoke Test
# Execute on: Penguin (r3v@penguin) + Kali (for PostgreSQL access)
# Status: POST-PATCH validation

## STEP 1: Apply Routes Patch (Penguin)

```bash
cat > /tmp/patch-agent-os-routes.sh << 'PATCH_SCRIPT'
#!/bin/bash
set -e
ROUTES_FILE="$HOME/Agent-OS/apps/dashboard/server/agent-os-routes.ts"
BACKUP_FILE="$ROUTES_FILE.$(date +%s).bak"

echo "[routes-patch] Backing up..."
cp "$ROUTES_FILE" "$BACKUP_FILE"

head -n -1 "$ROUTES_FILE" > /tmp/routes-intermediate.ts

cat >> /tmp/routes-intermediate.ts << 'ROUTES_PATCH'

// ErrorPredictor integration routes
import { setupErrorPrediction, ErrorEvent } from '../services/errorPredictor';
const { observer, predictor, breaker, onError } = setupErrorPrediction();

// POST /api/errors/report — Submit error event
router.post('/api/errors/report', (req, res) => {
  try {
    const event: ErrorEvent = {
      timestamp: Date.now(),
      source: req.body.source || 'unknown',
      errorType: req.body.errorType || 'error',
      message: req.body.message || '',
      stack: req.body.stack,
      metadata: req.body.metadata,
    };
    const prediction = onError(event);
    res.json({ success: true, prediction });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/errors/recent — Fetch recent errors + predictions
router.get('/api/errors/recent', (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 5;
    const events = observer.getRecentEvents(minutes);
    const predictions = events.map(event => ({
      event,
      prediction: predictor.predict(event),
    }));
    res.json({ success: true, events: predictions, count: events.length });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/errors/patterns — Get active patterns + circuit breaker state
router.get('/api/errors/patterns', (req, res) => {
  try {
    const recent = observer.getRecentEvents(5);
    const patterns: Record<string, number> = {};
    recent.forEach(event => {
      const pred = predictor.predict(event);
      patterns[pred.pattern] = (patterns[pred.pattern] || 0) + 1;
    });
    res.json({
      success: true,
      patterns,
      circuitBreakerState: breaker.getState(),
      windowSize: recent.length,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/circuit-breaker/reset — Manual reset
router.post('/api/circuit-breaker/reset', (req, res) => {
  try {
    breaker.reset();
    res.json({ success: true, state: breaker.getState() });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

ROUTES_PATCH

echo "" >> /tmp/routes-intermediate.ts
echo "export default router" >> /tmp/routes-intermediate.ts

ORIG=$(wc -l < "$ROUTES_FILE")
NEW=$(wc -l < /tmp/routes-intermediate.ts)

if [ "$NEW" -le "$ORIG" ]; then
    echo "[ERROR] Patch reduced lines ($NEW vs $ORIG)"
    cp "$BACKUP_FILE" "$ROUTES_FILE"
    exit 1
fi

cp /tmp/routes-intermediate.ts "$ROUTES_FILE"
echo "✅ Routes patched: $ORIG → $NEW lines"
echo "   Backup: $BACKUP_FILE"
PATCH_SCRIPT

chmod +x /tmp/patch-agent-os-routes.sh
bash /tmp/patch-agent-os-routes.sh
```

## STEP 2: Copy ErrorPredictor Service (Penguin)

```bash
# Create services directory if needed
mkdir -p ~/Agent-OS/apps/dashboard/src/services

# Copy ErrorPredictor (use the uploaded errorPredictor-service.ts)
cp /path/to/errorPredictor-service.ts ~/Agent-OS/apps/dashboard/src/services/errorPredictor.ts
```

## STEP 3: TypeScript Check (Penguin)

```bash
cd ~/Agent-OS/apps/dashboard
pnpm tsc --noEmit
```

**Expected:** Zero errors. If import errors on `errorPredictor`, check:
- File exists at `src/services/errorPredictor.ts`
- Path in routes patch matches exactly

## STEP 4: Agi-Suite API Server Check (Penguin)

```bash
cd ~/Agi-Suite
# Verify env vars
cat .env | grep DATABASE_URL
cat apps/api-server/.env | grep PORT

# Expected output:
# DATABASE_URL=postgresql://r3:r3local@127.0.0.1:5432/r3vibe
# PORT=3001
```

## STEP 5: PostgreSQL Connection Verify (Kali)

```bash
# On Kali (has network access to Railway)
psql postgresql://r3:r3local@127.0.0.1:5432/r3vibe -c "SELECT COUNT(*) FROM agi_agents;"

# Expected: Count of agents (0+ is fine)
```

## STEP 6: Run Three-Repo Smoke Test (Penguin)

### Terminal 1: Agi-Suite API Server
```bash
cd ~/Agi-Suite
pnpm --filter @workspace/api-server dev
# Expected: Server listening on :3001
```

### Terminal 2: Agent-OS Dashboard (API only, no frontend)
```bash
cd ~/Agent-OS/apps/dashboard
PORT=5000 NODE_ENV=development pnpm dev:server
# Expected: Express server listening on :5000
```

### Terminal 3: Test Endpoints
```bash
# Test Agent-OS routes
curl -X GET http://localhost:5000/api/agents
# Expected: { agents: [] } or agent list

# Test Agi-Suite API
curl -X GET http://localhost:3001/api/health
# Expected: { status: "ok" } or similar

# Test ErrorPredictor endpoint
curl -X POST http://localhost:5000/api/errors/report \
  -H "Content-Type: application/json" \
  -d '{"source":"test","errorType":"timeout","message":"test timeout"}'
# Expected: { success: true, prediction: { pattern: "Request Timeout", ... } }

# Test circuit breaker state
curl -X GET http://localhost:5000/api/errors/patterns
# Expected: { success: true, patterns: {...}, circuitBreakerState: "closed", windowSize: 1 }
```

## STEP 7: Stable (R3 v4) Check

```bash
cd ~/Stable
pnpm dev --filter web
# Expected: Vite dev server running (don't run full pnpm dev due to OOM)
```

## SMOKE TEST CHECKLIST

```
Agent-OS Routes Patch
  [ ] agent-os-routes.ts patched (backup created)
  [ ] All 4 ErrorPredictor endpoints added
  [ ] tsc --noEmit passes (zero errors)

Agent-OS API Server
  [ ] Starts on port 5000
  [ ] GET /api/agents responds
  [ ] POST /api/errors/report responds with prediction
  [ ] GET /api/errors/patterns responds
  [ ] Circuit breaker state readable

Agi-Suite API Server
  [ ] Starts on port 3001
  [ ] Database connection active (PostgreSQL)
  [ ] /api/agents endpoint works
  [ ] /api/health endpoint works

PostgreSQL
  [ ] agi_agents table exists
  [ ] agi_agents_status_idx index exists
  [ ] Row count > 0 (agents registered)

Stable (R3 v4)
  [ ] pnpm dev --filter web starts
  [ ] No OOM errors
  [ ] Vite bundling successful

Integration
  [ ] All three repos run simultaneously without port conflicts
  [ ] No console errors or warnings
  [ ] All endpoints reachable
```

## FAILURE RECOVERY

If any step fails:

```bash
# Restore Agent-OS routes from backup
cp ~/Agent-OS/apps/dashboard/server/agent-os-routes.ts.*.bak \
   ~/Agent-OS/apps/dashboard/server/agent-os-routes.ts

# Clear node_modules and reinstall (if dependency issues)
cd ~/Agent-OS && rm -rf node_modules pnpm-lock.yaml && pnpm install

# Check Crostini OOM
free -h
# If < 500MB available, kill other processes or use Kali
```

---
**Expected Duration:** 10–15 minutes  
**Success Criteria:** All checks pass, all three repos running, all endpoints reachable
