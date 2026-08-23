# Agent-OS Command Center Backend Specification

**Status**: Production-Ready Backend (UI unchanged)  
**Version**: 1.0.0  
**Created**: 2026-08-15

## Executive Summary

This backend implementation provides a complete production-grade service layer for the Agent-OS Command Center UI. It integrates with your existing control-plane infrastructure, provides real-time event streaming via SSE, and implements full RBAC audit logging.

**Key Features:**
- ✓ Runs management (CRUD + filtering)
- ✓ Event streaming (immutable event log + SSE broadcast)
- ✓ Command dispatch & execution tracking
- ✓ Live metrics aggregation
- ✓ RBAC-aware audit logging
- ✓ SQLite persistence
- ✓ Graceful shutdown handling
- ✓ Production-ready error handling

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   React Dashboard (Frontend)                 │
│                 (NO CHANGES - Keep as is)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    /api/command-center
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Express API Routes (command-center.routes.ts)    │
│                                                               │
│  POST   /runs              (create)                          │
│  GET    /runs              (list + filter + paginate)        │
│  GET    /runs/:id          (details + events)                │
│  PATCH  /runs/:id          (update status/output)            │
│                                                               │
│  POST   /runs/:runId/events           (record)               │
│  GET    /runs/:runId/events           (retrieve)             │
│  GET    /events/stream                (SSE stream)           │
│                                                               │
│  POST   /runs/:runId/commands         (dispatch)             │
│  PATCH  /runs/:runId/commands/:id     (update status)        │
│                                                               │
│  GET    /metrics          (live dashboard stats)             │
│  GET    /health           (service health)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│          CommandCenterService (command-center.service.ts)    │
│                                                               │
│  Core business logic:                                        │
│  - createRun()           - Create new agent run              │
│  - getRun()              - Fetch run details                 │
│  - listRuns()            - List + filter + paginate          │
│  - updateRun()           - Update run state                  │
│  - addEvent()            - Record event in stream            │
│  - getRunEvents()        - Retrieve event history            │
│  - dispatchCommand()     - Execute command                   │
│  - updateCommand()       - Track execution                   │
│  - auditLog()            - Log RBAC action                   │
│  - getMetrics()          - Aggregate statistics              │
│  - registerSSEClient()   - Subscribe to live stream          │
│  - broadcast()           - Broadcast to all clients          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  SQLite Database                              │
│                                                               │
│  Tables:                                                     │
│  - runs              (agent executions)                      │
│  - run_events        (immutable event log)                   │
│  - commands          (dispatch history)                      │
│  - metrics           (aggregated snapshots)                  │
│  - audit_log         (RBAC audit trail)                      │
│                                                               │
│  Location: packages/db/control-plane.db                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### AgentRun
```typescript
interface AgentRun {
  id: string;                           // UUID
  agentId: string;                      // Agent identifier
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;                    // Timestamp (ms)
  completedAt: number | null;           // Timestamp (ms) or null
  metadata: Record<string, any>;        // Custom metadata
  output: string | null;                // Run output/results
  error: string | null;                 // Error message if failed
}
```

### AgentEvent
```typescript
interface AgentEvent {
  id: string;                           // UUID
  runId: string;                        // Parent run ID
  type: 'start' | 'step' | 'tool' | 'turn' | 'complete' | 'error';
  timestamp: number;                    // Event time (ms)
  data: Record<string, any>;            // Event-specific data
}
```

### CommandRequest
```typescript
interface CommandRequest {
  id: string;                           // UUID
  runId: string;                        // Parent run ID
  command: string;                      // Command name
  args: Record<string, any>;            // Command arguments
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result: any;                          // Command result/output
  createdAt: number;                    // Timestamp (ms)
}
```

---

## API Reference

### Runs Endpoints

#### Create Run
```
POST /api/command-center/runs

Request Body:
{
  "agentId": "string",           // Required
  "metadata": {                  // Optional
    "version": "1.0",
    "config": { ... }
  }
}

Response (201 Created):
{
  "id": "uuid",
  "agentId": "string",
  "status": "pending",
  "startedAt": 1692547200000,
  "completedAt": null,
  "metadata": { ... },
  "output": null,
  "error": null
}
```

#### List Runs
```
GET /api/command-center/runs

Query Parameters:
  limit?: number         (default: 50, max: 1000)
  offset?: number        (default: 0)
  status?: string        (filter: pending|running|completed|failed)
  agentId?: string       (filter by agent)
  sortBy?: string        (created_at|started_at, default: created_at)
  sortOrder?: string     (ASC|DESC, default: DESC)

Response (200 OK):
{
  "runs": [ { ...AgentRun }, ... ],
  "total": 1234,
  "limit": 50,
  "offset": 0
}
```

#### Get Run Details
```
GET /api/command-center/runs/:id

Response (200 OK):
{
  "run": { ...AgentRun },
  "events": [ { ...AgentEvent }, ... ]
}

Response (404 Not Found):
{
  "error": "Run not found"
}
```

#### Update Run
```
PATCH /api/command-center/runs/:id

Request Body:
{
  "status": "running",           // Optional
  "output": "...",               // Optional
  "error": "..."                 // Optional
}

Response (200 OK):
{ ...AgentRun }
```

### Events Endpoints

#### Record Event
```
POST /api/command-center/runs/:runId/events

Request Body:
{
  "type": "start|step|tool|turn|complete|error",   // Required
  "data": { ... }                                    // Optional
}

Response (201 Created):
{ ...AgentEvent }
```

#### Get Run Events
```
GET /api/command-center/runs/:runId/events

Response (200 OK):
{
  "events": [ { ...AgentEvent }, ... ],
  "count": 42
}
```

#### Live Event Stream (SSE)
```
GET /api/command-center/events/stream

Emits Server-Sent Events:
event: data
data: {
  "type": "run:created|run:updated|event:recorded|command:dispatched|...",
  "timestamp": 1692547200000,
  ...
}

Heartbeat: Every 30 seconds
```

### Commands Endpoints

#### Dispatch Command
```
POST /api/command-center/runs/:runId/commands

Request Body:
{
  "command": "auto-leveling",        // Required
  "args": {                          // Optional
    "target": "master",
    "intensity": 0.8
  }
}

Response (201 Created):
{ ...CommandRequest }
```

#### Update Command Status
```
PATCH /api/command-center/runs/:runId/commands/:commandId

Request Body:
{
  "status": "executing|completed|failed",  // Optional
  "result": { ... }                         // Optional
}

Response (200 OK):
{ ...CommandRequest }
```

### Metrics Endpoint

#### Get Live Metrics
```
GET /api/command-center/metrics

Response (200 OK):
{
  "runs": {
    "total": 1234,
    "active": 5,
    "completed": 1200,
    "failed": 29
  },
  "events": {
    "total": 45678
  },
  "agents": {
    "unique": 12
  },
  "timestamp": 1692547200000
}
```

### Health Check

#### Service Health
```
GET /api/command-center/health

Response (200 OK):
{
  "status": "ok",
  "service": "command-center",
  "timestamp": 1692547200000
}
```

---

## Database Schema

### runs table
```sql
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL,                -- pending|running|completed|failed
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  metadata TEXT,                       -- JSON
  output TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  INDEX idx_agent_id (agent_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### run_events table
```sql
CREATE TABLE run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  type TEXT NOT NULL,                  -- start|step|tool|turn|complete|error
  timestamp INTEGER NOT NULL,
  data TEXT,                           -- JSON
  created_at INTEGER NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id),
  INDEX idx_run_id (run_id),
  INDEX idx_type (type),
  INDEX idx_timestamp (timestamp)
);
```

### commands table
```sql
CREATE TABLE commands (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  command TEXT NOT NULL,
  args TEXT,                           -- JSON
  status TEXT NOT NULL,                -- pending|executing|completed|failed
  result TEXT,                         -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id),
  INDEX idx_run_id (run_id),
  INDEX idx_status (status)
);
```

### audit_log table
```sql
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  status TEXT NOT NULL,                -- success|failure
  details TEXT,                        -- JSON
  timestamp INTEGER NOT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_timestamp (timestamp)
);
```

---

## Integration Steps

### 1. Copy Backend Files

```bash
cd ~/~/Agent-OS

# Run integration script
python3 /path/to/integrate-command-center-backend.py
```

This creates:
- `packages/control-plane/src/service/command-center.service.ts`
- `packages/control-plane/src/routes/command-center.routes.ts`
- `packages/control-plane/src/config/command-center.config.ts`
- Updates `packages/control-plane/src/index.ts`
- Updates `packages/control-plane/package.json`

### 2. Build Control-Plane

```bash
cd packages/control-plane
pnpm install
pnpm build
```

### 3. Update Dashboard Server

In `apps/dashboard/server.ts`, add:

```typescript
import { 
  CommandCenterService, 
  createCommandCenterRoutes 
} from '@agent-os/control-plane';

// Initialize service
const commandCenterService = new CommandCenterService(
  join(__dirname, '../../packages/db/control-plane.db')
);

// Mount routes
const commandCenterRoutes = createCommandCenterRoutes(commandCenterService);
app.use('/api/command-center', commandCenterRoutes);

// Graceful shutdown
process.on('SIGTERM', () => {
  commandCenterService.close();
  // ... rest of shutdown
});
```

### 4. Restart Dashboard

```bash
cd apps/dashboard
pnpm dev
```

### 5. Test Endpoints

```bash
# Health check
curl http://localhost:5173/api/command-center/health

# Create run
curl -X POST http://localhost:5173/api/command-center/runs \
  -H "Content-Type: application/json" \
  -d '{"agentId":"test-agent-1"}'

# List runs
curl http://localhost:5173/api/command-center/runs

# Subscribe to live events
curl http://localhost:5173/api/command-center/events/stream
```

---

## Features & Guarantees

### Data Integrity
- ✓ SQLite transactions for consistency
- ✓ Immutable event log (append-only)
- ✓ Foreign key constraints
- ✓ Indexed queries for performance

### Real-Time Updates
- ✓ Server-Sent Events (SSE) for live streaming
- ✓ Heartbeat every 30 seconds
- ✓ Automatic client cleanup on disconnect
- ✓ Broadcast to all connected clients

### Observability
- ✓ RBAC-aware audit logging
- ✓ Event-driven architecture (emits)
- ✓ Comprehensive error messages
- ✓ Request/response logging

### Reliability
- ✓ Graceful shutdown (close SSE + DB)
- ✓ Connection timeout handling
- ✓ Null-safety checks
- ✓ Idempotent operations

---

## Configuration

Environment variables (optional, in `apps/dashboard/.env`):

```bash
COMMAND_CENTER_DB_PATH=./packages/db/control-plane.db
COMMAND_CENTER_SSE_HEARTBEAT=30000
COMMAND_CENTER_AUDIT_ENABLED=true
NODE_ENV=development
PORT=5173
```

---

## Performance Considerations

### Indexing Strategy
- `idx_created_at` on runs (frequent sorting)
- `idx_status` on runs (filtering)
- `idx_agent_id` on runs (filtering)
- `idx_run_id` on run_events (lookups)
- `idx_timestamp` on audit_log (retention queries)

### Query Optimization
- Pagination with LIMIT/OFFSET
- Status filtering before pagination
- Indexed columns in WHERE clauses
- Sorted results at DB level

### SSE Performance
- Max 1000 concurrent clients
- Heartbeat prevents client disconnects
- Non-blocking broadcast (try/catch)
- Automatic cleanup on client disconnect

---

## Testing

### Unit Testing Pattern
```typescript
import { CommandCenterService } from '@agent-os/control-plane';

describe('CommandCenterService', () => {
  let service: CommandCenterService;
  
  beforeEach(() => {
    service = new CommandCenterService(':memory:'); // In-memory DB
  });
  
  it('should create run', () => {
    const run = service.createRun('test-agent');
    expect(run.status).toBe('pending');
  });
});
```

### Integration Testing
```bash
# Start server
pnpm dev

# In another terminal
curl -X POST http://localhost:5173/api/command-center/runs \
  -H "Content-Type: application/json" \
  -d '{"agentId":"test"}'
```

---

## Monitoring

### Health Checks
```bash
curl http://localhost:5173/api/command-center/health
```

### Metrics Retrieval
```bash
curl http://localhost:5173/api/command-center/metrics
```

### Audit Log Query
```sql
SELECT * FROM audit_log 
WHERE timestamp > strftime('%s', 'now') - 3600 
ORDER BY timestamp DESC;
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Database locked | Check if multiple processes access DB; use WAL mode |
| SSE connection drops | Client timeout; restart connection; check firewall |
| Missing events | Verify run ID in request; check event timestamps |
| Audit log full | Implement retention policy (30 days default) |
| Slow list queries | Add indexes to sort/filter columns |

---

## Next Steps

1. **Backend Integration**: Run integration script
2. **Build & Deploy**: Compile and restart dashboard
3. **Frontend Wiring**: Update React components to use `/api/command-center` endpoints
4. **Testing**: Verify all endpoints with Postman/curl
5. **Production**: Monitor audit logs and metrics

---

## Support

For issues or questions:
1. Check audit_log for errors
2. Review database schema alignment
3. Verify network connectivity to SSE
4. Check Docker/Crostini file permissions

---

**End of Specification**
