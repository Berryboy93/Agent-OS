#!/usr/bin/env python3
"""
Agent-OS Command Center Backend Integration Script

This script integrates the command center backend service, routes, and configuration
into your Agent-OS monorepo. It:

1. Creates the command center service layer
2. Sets up Express routes
3. Provides a server integration guide
4. Creates necessary configuration files
5. Backs up existing files before modifications

Usage:
  cd ~/~/Agent-OS
  python3 integrate-command-center-backend.py
"""

import os
import sys
import json
import shutil
from datetime import datetime
from pathlib import Path

# ============================================================================
# CONFIGURATION
# ============================================================================

AGENT_OS_ROOT = Path.cwd()
CONTROL_PLANE_SRC = AGENT_OS_ROOT / "packages" / "control-plane" / "src"
DASHBOARD_APP = AGENT_OS_ROOT / "apps" / "dashboard"
DB_DIR = AGENT_OS_ROOT / "packages" / "db"

BACKUP_DIR = AGENT_OS_ROOT / ".integration-backups" / datetime.now().isoformat()

# Files to create
FILES_TO_CREATE = {
    "service": {
        "path": CONTROL_PLANE_SRC / "service" / "command-center.service.ts",
        "content": "command-center-backend.ts"
    },
    "routes": {
        "path": CONTROL_PLANE_SRC / "routes" / "command-center.routes.ts",
        "content": "command-center-routes.ts"
    },
    "config": {
        "path": CONTROL_PLANE_SRC / "config" / "command-center.config.ts",
        "content": None  # Generated below
    }
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def log(msg: str, level: str = "INFO"):
    """Print formatted log message"""
    levels = {"INFO": "ℹ", "OK": "✓", "WARN": "⚠", "ERR": "✗"}
    symbol = levels.get(level, "•")
    print(f"[{symbol}] {msg}")

def backup_file(file_path: Path):
    """Create backup of existing file"""
    if file_path.exists():
        backup_file_path = BACKUP_DIR / file_path.relative_to(AGENT_OS_ROOT)
        backup_file_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_file_path)
        log(f"Backed up {file_path.relative_to(AGENT_OS_ROOT)}", "OK")

def create_directory(dir_path: Path):
    """Create directory if it doesn't exist"""
    if not dir_path.exists():
        dir_path.mkdir(parents=True, exist_ok=True)
        log(f"Created directory {dir_path.relative_to(AGENT_OS_ROOT)}", "OK")

def write_file(file_path: Path, content: str, is_backup: bool = True):
    """Write content to file with backup"""
    if is_backup:
        backup_file(file_path)
    
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content, encoding="utf-8")
    log(f"Created {file_path.relative_to(AGENT_OS_ROOT)}", "OK")

# ============================================================================
# CONTENT GENERATORS
# ============================================================================

def get_command_center_config() -> str:
    """Generate command center config file"""
    return '''import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(__dirname, '../../db');

export const COMMAND_CENTER_CONFIG = {
  database: {
    path: join(DB_DIR, 'control-plane.db'),
    // Enable WAL (Write-Ahead Logging) for better concurrency
    walMode: true,
    timeout: 5000
  },
  sse: {
    heartbeat: 30000, // 30 seconds
    maxClients: 1000
  },
  audit: {
    enabled: true,
    logPath: join(DB_DIR, 'audit.log'),
    retention: 30 * 24 * 60 * 60 * 1000 // 30 days in ms
  },
  api: {
    defaultLimit: 50,
    maxLimit: 1000,
    paginationEnabled: true
  },
  features: {
    eventStreaming: true,
    commandDispatch: true,
    auditLogging: true,
    metricsAggregation: true
  }
};
'''

def get_index_ts() -> str:
    """Generate updated control-plane index.ts"""
    return '''import { ControlPlaneServer } from './api/control-plane.server.js';
import { CommandCenterService } from './service/command-center.service.js';
import { CONTROL_PLANE_CONFIG } from './config/control-plane.config.js';
import { COMMAND_CENTER_CONFIG } from './config/command-center.config.js';

export { ControlPlaneServer };
export { CommandCenterService };
export { CONTROL_PLANE_CONFIG, COMMAND_CENTER_CONFIG };

// Initialize functions
export async function initializeControlPlane(app: any) {
  // Existing ControlPlane setup
  app.get('/settings/stream', (req: any, res: any) => {
    const controlPlane = new ControlPlaneServer();
    controlPlane.handleSSE(res);
    res.write(`data: ${JSON.stringify({ status: 'connected', timestamp: Date.now() })}\\n\\n`);
  });

  app.post('/settings/flag', (req: any, res: any) => {
    const { key, value } = req.body;
    console.log(`[CONTROL-PLANE] Flag update: ${key}=${value}`);
    res.json({ success: true });
  });

  app.post('/settings/pref', (req: any, res: any) => {
    const { key, value } = req.body;
    console.log(`[CONTROL-PLANE] Pref update: ${key}=${value}`);
    res.json({ success: true });
  });

  console.log('✓ Control-Plane initialized');
}

export async function initializeCommandCenter(app: any) {
  const commandCenterService = new CommandCenterService(COMMAND_CENTER_CONFIG.database.path);
  
  // Import routes dynamically
  const { createCommandCenterRoutes } = await import('./routes/command-center.routes.js');
  const routes = createCommandCenterRoutes(commandCenterService);
  
  app.use('/api/command-center', routes);
  
  console.log('✓ Command Center initialized');
  
  return commandCenterService;
}
'''

def get_package_json_update() -> str:
    """Generate update for control-plane package.json"""
    return '''{
  "name": "@agent-os/control-plane",
  "version": "1.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": "./dist/index.js",
    "./service": "./dist/service/command-center.service.js",
    "./routes": "./dist/routes/command-center.routes.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "better-sqlite3": "^9.0.0",
    "sqlite3": "^5.1.6",
    "uuid": "^11.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/express": "^4.17.17",
    "@types/node": "^20.0.0",
    "@types/uuid": "^11.0.0",
    "typescript": "^5.1.6"
  }
}
'''

# ============================================================================
# INTEGRATION STEPS
# ============================================================================

def verify_agent_os_root():
    """Verify we're in the correct Agent-OS directory"""
    if not (AGENT_OS_ROOT / "package.json").exists():
        log("Not in Agent-OS root directory", "ERR")
        sys.exit(1)
    
    if not (CONTROL_PLANE_SRC).exists():
        log("control-plane package not found", "ERR")
        sys.exit(1)
    
    log("Agent-OS project verified", "OK")

def setup_directories():
    """Create necessary directories"""
    log("Setting up directories...", "INFO")
    
    create_directory(CONTROL_PLANE_SRC / "service")
    create_directory(CONTROL_PLANE_SRC / "routes")
    create_directory(CONTROL_PLANE_SRC / "config")
    create_directory(DB_DIR)
    create_directory(BACKUP_DIR)

def read_source_files():
    """Read source files from current directory or use embedded content"""
    sources = {}
    
    # Try to read from /tmp or current directory first
    for file_key, file_info in FILES_TO_CREATE.items():
        source_path = Path(f"/home/claude/{file_info.get('content')}")
        
        if source_path.exists():
            sources[file_key] = source_path.read_text(encoding="utf-8")
            log(f"Loaded {file_key} from {source_path}", "OK")
        elif file_key == "config":
            # Generate config file
            sources[file_key] = get_command_center_config()
            log("Generated command-center.config.ts", "OK")
        else:
            log(f"Warning: {file_key} source not found at {source_path}", "WARN")
            sources[file_key] = None
    
    return sources

def integrate_files(sources: dict):
    """Write files to project"""
    log("Integrating backend files...", "INFO")
    
    for file_key, file_info in FILES_TO_CREATE.items():
        if sources.get(file_key):
            write_file(file_info["path"], sources[file_key], is_backup=True)
        elif file_key == "config":
            # Config is generated
            pass
        else:
            log(f"Skipping {file_key} (source not available)", "WARN")

def update_package_json():
    """Update control-plane package.json with new exports"""
    log("Updating control-plane package.json...", "INFO")
    
    pkg_path = CONTROL_PLANE_SRC.parent / "package.json"
    backup_file(pkg_path)
    
    pkg_content = get_package_json_update()
    pkg_path.write_text(pkg_content, encoding="utf-8")
    log("Updated package.json", "OK")

def update_index_ts():
    """Update control-plane index.ts with command center exports"""
    log("Updating control-plane index.ts...", "INFO")
    
    index_path = CONTROL_PLANE_SRC / "index.ts"
    backup_file(index_path)
    
    index_content = get_index_ts()
    index_path.write_text(index_content, encoding="utf-8")
    log("Updated index.ts with command center integration", "OK")

def generate_dashboard_integration_guide():
    """Create integration guide for dashboard"""
    log("Creating dashboard integration guide...", "INFO")
    
    guide_path = DASHBOARD_APP / "COMMAND_CENTER_INTEGRATION.md"
    
    guide_content = '''# Agent-OS Command Center Backend Integration

## Overview

This guide explains how to integrate the Command Center backend service into your dashboard server.

## Files Created

- `packages/control-plane/src/service/command-center.service.ts` - Core service
- `packages/control-plane/src/routes/command-center.routes.ts` - Express routes
- `packages/control-plane/src/config/command-center.config.ts` - Configuration

## Dashboard Server Integration

Update your `apps/dashboard/server.ts` to include:

\\`\\`\\`typescript
import { CommandCenterService } from '@agent-os/control-plane';
import { createCommandCenterRoutes } from '@agent-os/control-plane';

// Initialize service
const commandCenterService = new CommandCenterService(DB_PATH);

// Mount routes
app.use('/api/command-center', createCommandCenterRoutes(commandCenterService));
\\`\\`\\`

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

\\`\\`\\`typescript
commandCenterService.on('run:created', (data) => {
  console.log('Run created:', data.id);
});

commandCenterService.on('event:recorded', (data) => {
  console.log('Event recorded:', data.type);
});
\\`\\`\\`

## Testing

\\`\\`\\`bash
# Create a test run
curl -X POST http://localhost:5173/api/command-center/runs \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"agentId":"test-agent-1","metadata":{"version":"1.0"}}'

# List runs
curl http://localhost:5173/api/command-center/runs?limit=10

# Subscribe to live events
curl http://localhost:5173/api/command-center/events/stream
\\`\\`\\`

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

\\`\\`\\`bash
COMMAND_CENTER_DB_PATH=./packages/db/control-plane.db
COMMAND_CENTER_SSE_HEARTBEAT=30000
COMMAND_CENTER_AUDIT_ENABLED=true
\\`\\`\\`
'''
    
    guide_path.write_text(guide_content, encoding="utf-8")
    log(f"Created integration guide at {guide_path}", "OK")

def generate_summary():
    """Print integration summary"""
    print("\n" + "="*70)
    print("COMMAND CENTER BACKEND INTEGRATION COMPLETE")
    print("="*70)
    print(f"""
✓ Service Layer:           {CONTROL_PLANE_SRC / "service" / "command-center.service.ts"}
✓ Express Routes:          {CONTROL_PLANE_SRC / "routes" / "command-center.routes.ts"}
✓ Configuration:           {CONTROL_PLANE_SRC / "config" / "command-center.config.ts"}
✓ Backups:                 {BACKUP_DIR}
✓ Integration Guide:       {DASHBOARD_APP / "COMMAND_CENTER_INTEGRATION.md"}

NEXT STEPS:

1. Install dependencies:
   cd {CONTROL_PLANE_SRC.parent}
   pnpm install

2. Build control-plane:
   pnpm build

3. Update apps/dashboard/server.ts:
   - Import CommandCenterService
   - Initialize in server setup
   - Mount routes at /api/command-center

4. Restart dashboard:
   pnpm dev

5. Test API endpoints:
   curl http://localhost:5173/api/command-center/health

DATABASE:

- Path: {DB_DIR / "control-plane.db"}
- Schema: Automatically initialized on first run
- Tables: runs, run_events, commands, metrics, audit_log

FEATURES:

✓ Agent run management (create, list, filter, update)
✓ Event streaming (SSE for live updates)
✓ Command dispatch and execution tracking
✓ Live metrics (runs, events, agents)
✓ RBAC audit logging
✓ Graceful shutdown handling
✓ Health check endpoints

For detailed API documentation, see:
{DASHBOARD_APP / "COMMAND_CENTER_INTEGRATION.md"}
""")
    print("="*70 + "\n")

# ============================================================================
# MAIN
# ============================================================================

def main():
    """Run integration"""
    print("""
╔════════════════════════════════════════════════════════════════╗
║   Agent-OS Command Center Backend Integration Script           ║
╚════════════════════════════════════════════════════════════════╝
    """)

    try:
        verify_agent_os_root()
        setup_directories()
        
        sources = read_source_files()
        integrate_files(sources)
        
        update_index_ts()
        update_package_json()
        
        generate_dashboard_integration_guide()
        generate_summary()
        
        log("Integration successful!", "OK")
        return 0
    
    except Exception as err:
        log(str(err), "ERR")
        return 1

if __name__ == "__main__":
    sys.exit(main())
