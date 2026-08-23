# Agent-OS → Agi-Suite → R3v4 Integration
# Production Implementation Checklist
# ════════════════════════════════════════════════════════════════════════════

## File Placement Map

### Stable monorepo (~/Stable)
```
packages/
  r3-api-types/              ← NEW: cross-monorepo type bridge
    package.json
    src/
      index.ts
      router-type.ts

apps/r3vibe/src/server/
  middleware/
    agentAuth.ts             ← NEW: agentProcedure guard
  routers/
    diagnostics.ts           ← NEW: agent receiving endpoint
    _app.ts                  ← EDIT: add diagnosticsRouter
  ws/
    agent-ws-handler.ts      ← NEW: DSP WebSocket handler
  server.ts (or index.ts)    ← EDIT: mount createAgentWSHandler
```

### Agi-Suite monorepo (~/Agi-Suite)
```
pnpm-workspace.yaml          ← EDIT: add workspace link to Stable

packages/db/schema/
  agents.ts                  ← NEW: agents + agent_actions tables

apps/agent-runner/src/
  worker.ts                  ← NEW: supervisor process
  agent-sandbox.ts           ← NEW: worker-thread entry point
  agent-bridge.ts            ← NEW: R3v4 injection layer
  event-bus/
    index.ts                 ← NEW: pg NOTIFY subscriber
  handlers/
    index.ts                 ← NEW: handler registry
    troubleshoot.ts          ← NEW: troubleshoot handler
    mix.ts                   ← TODO: implement MixHandler
    vocal-spectra.ts         ← TODO: implement VocalSpectraHandler
    style-delta.ts           ← TODO: implement StyleDeltaHandler
```

---

## Implementation Order

### Step 1 — Shared types package
```bash
cd ~/Stable
mkdir -p packages/r3-api-types/src
# Copy: shared-types/package.json → packages/r3-api-types/package.json
# Copy: shared-types/src/index.ts → packages/r3-api-types/src/index.ts
# Copy: shared-types/src/router-type.ts → packages/r3-api-types/src/router-type.ts
pnpm --filter @r3/api-types build
```

### Step 2 — Agi-Suite workspace link
```bash
cd ~/Agi-Suite
# Edit pnpm-workspace.yaml (copy from output)
pnpm install
# Verify: pnpm --filter @agi-suite/agent-runner ls @r3/api-types
```

### Step 3 — DB migration (Agi-Suite)
```bash
cd ~/Agi-Suite
# Copy schema/agents.ts to packages/db/schema/agents.ts
# Add agents and agentActions to packages/db/schema/index.ts exports
pnpm --filter @agi-suite/db db:generate
pnpm --filter @agi-suite/db db:migrate
# Verify: psql $DATABASE_URL -c "\dt agents"
# Verify: psql $DATABASE_URL -c "\dt agent_actions"
```

### Step 4 — Environment
```bash
# Generate token ONCE
TOKEN=$(openssl rand -hex 32)

# Set in both repos
echo "AGENT_SERVICE_TOKEN=$TOKEN" >> ~/Agi-Suite/.env
echo "AGENT_SERVICE_TOKEN=$TOKEN" >> ~/Stable/.env

# Set R3v4 injection URLs in Agi-Suite
echo "R3V4_TRPC_URL=http://localhost:3000/api/trpc" >> ~/Agi-Suite/.env
echo "R3V4_WS_URL=ws://localhost:3000/ws/agent"     >> ~/Agi-Suite/.env
```

### Step 5 — R3v4 receiving endpoints
```bash
cd ~/Stable
# Copy r3v4/middleware/agentAuth.ts → apps/r3vibe/src/server/middleware/agentAuth.ts
# Copy r3v4/routers/diagnostics.ts  → apps/r3vibe/src/server/routers/diagnostics.ts
# Copy r3v4/routers/agent-ws-handler.ts → apps/r3vibe/src/server/ws/agent-ws-handler.ts

# Add to _app.ts:
#   import { diagnosticsRouter } from './diagnostics';
#   diagnostics: diagnosticsRouter,

# Add to server entry:
#   import { createAgentWSHandler } from './ws/agent-ws-handler';
#   createAgentWSHandler(new WebSocketServer({ server: httpServer, path: '/ws/agent' }));

# TSC gate (MUST pass before next step):
pnpm tsc --noEmit
```

### Step 6 — Agent Runner
```bash
cd ~/Agi-Suite
# Copy runner files to apps/agent-runner/src/
pnpm --filter @agi-suite/agent-runner build

# Start R3v4 first
cd ~/Stable && pnpm dev &

# Start agent runner
cd ~/Agi-Suite && pnpm --filter @agi-suite/agent-runner dev
```

### Step 7 — Smoke test
```bash
# Register a troubleshoot agent via Agent-OS or direct tRPC call:
curl -X POST http://localhost:PORT/api/trpc/agents.register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user-jwt>" \
  -d '{
    "name": "smoke-test-troubleshoot",
    "type": "troubleshoot",
    "target": "r3v4",
    "config": {
      "checkAudioBuffer": true,
      "checkDrizzleMigrations": true
    }
  }'

# Watch agent-runner logs — expect:
# [EventBus] LISTEN active on channel: agent_registered
# [Worker] Deploying agent <id> (type=troubleshoot, timeout=60000ms)
# [Worker] Agent <id> completed successfully

# Verify findings appeared in R3v4:
psql $R3_DATABASE_URL -c "SELECT * FROM diagnostic_findings ORDER BY created_at DESC LIMIT 5;"
```

---

## Fixes Verified in This Implementation

| # | Issue | Fixed In |
|---|-------|----------|
| 1 | Cross-monorepo type import | shared-types package + pnpm-workspace.yaml |
| 2 | pg NOTIFY drops events on restart | polling outbox in worker.ts |
| 3 | Double-execution race | atomic claimAgent() with WHERE status='registered' |
| 4 | httpBatchLink wrong for S2S | httpLink in agent-bridge.ts |
| 5 | Sync DB write per bridge call | pendingActions buffer + flush() |
| 6 | Handler crash kills worker | worker_threads isolation in agent-sandbox.ts |
| 7 | No execution timeout | Promise.race + per-type AGENT_TIMEOUTS |
| 8 | Heartbeat column unused | setInterval in AgentBridge constructor |
| 9 | HTTP too slow for DSP params | WebSocket channel + pushDSPParam() |

## Still TODO (implement per PRD schedule)

- [ ] MixHandler (mix.ts)
- [ ] VocalSpectraHandler (vocal-spectra.ts) — requires WS connectRealtime()
- [ ] StyleDeltaHandler (style-delta.ts) — uses StyleDeltaApplicator contracted module
- [ ] defaultDSPParamHandler → wire to real AudioEngine.setNodeParam()
- [ ] diagnostics.getAudioMetrics → replace placeholder with real metrics query
- [ ] Nginx: restrict /api/trpc/diagnostics.* and /ws/agent to 127.0.0.1 only
- [ ] W-01 fix verified: ownerId always sourced from JWT in worker.ts, never from agent.config
