# Agent-OS Command Center Backend Integration

## Overview

This guide explains how to integrate the Command Center backend service into your dashboard server.

## Files Created

- `packages/control-plane/src/service/command-center.service.ts` - Core service
- `packages/control-plane/src/routes/command-center.routes.ts` - Express routes
- `packages/control-plane/src/config/command-center.config.ts` - Configuration

## Dashboard Server Integration

Update your `apps/dashboard/server.ts` to include:

\`\`\`typescript
import { CommandCenterService } from '@agent-os/control-plane';
import { createCommandCenterRoutes } from '@agent-os/control-plane';

// Initialize service
const commandCenterService = new CommandCenterService(DB_PATH);

// Mount routes
app.use('/api/command-center', createCommandCenterRoutes(commandCenterService));
\`\`\`

## API Endpoints

### Runs Management
- `POST /api/command-center/runs` - Create run
- `GET /api/command-center/runs` - List runs
- `GET /api/command-center/runs/:id` - Get run details
- `PATCH /api/command-center/runs/:id` - Update run

### Events
- `POST /api/command-center/runs/:runId/events` - Record event
- `GET /api/command-center/runs/:runId/events` - Get events
- `GET /api/command-center/events/stream` - SSE live stream

### Commands
- `POST /api/command-center/runs/:runId/commands` - Dispatch command
- `PATCH /api/command-center/runs/:runId/commands/:commandId` - Update command

### Metrics
- `GET /api/command-center/metrics` - Get live metrics
- `GET /api/command-center/health` - Health check

## Database Schema

The service automatically initializes these tables:
- `runs` - Agent run tracking
- `run_events` - Event stream log
- `commands` - Command dispatch history
- `metrics` - Aggregated metrics
- `audit_log` - RBAC audit trail

## Event Listening (Optional)

\`\`\`typescript
commandCenterService.on('run:created', (data) => {
  console.log('Run created:', data.id);
});

commandCenterService.on('event:recorded', (data) => {
  console.log('Event recorded:', data.type);
});
\`\`\`

## Testing

\`\`\`bash
# Create a test run
curl -X POST http://localhost:5173/api/command-center/runs \\
  -H "Content-Type: application/json" \\
  -d '{"agentId":"test-agent-1","metadata":{"version":"1.0"}}'

# List runs
curl http://localhost:5173/api/command-center/runs?limit=10

# Subscribe to live events
curl http://localhost:5173/api/command-center/events/stream
\`\`\`

## Audit Logging

All API operations are automatically logged to the audit table with:
- User ID
- Action performed
- Resource type and ID
- Status (success/failure)
- Timestamp

## Next Steps

1. Run `pnpm install` in control-plane package
2. Run `pnpm build` to compile TypeScript
3. Update `apps/dashboard/server.ts` with integration code above
4. Restart dashboard dev server
5. Test endpoints with curl or Postman

## Environment Variables

Optional configuration via `.env`:

\`\`\`bash
COMMAND_CENTER_DB_PATH=./packages/db/control-plane.db
COMMAND_CENTER_SSE_HEARTBEAT=30000
COMMAND_CENTER_AUDIT_ENABLED=true
\`\`\`
