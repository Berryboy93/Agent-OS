/**
 * Agent-OS Dashboard Server Integration Guide
 * How to wire CommandCenterService into apps/dashboard/server.ts
 * 
 * This file shows the complete server setup pattern for integrating
 * the command center backend with your existing Express + Vite setup.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createViteServer } from 'vite';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Import command center backend
import { CommandCenterService } from '@agent-os/control-plane'; // Or local path
import { createCommandCenterRoutes, commandCenterErrorHandler } from '@agent-os/control-plane'; // Or local path

// Import ControlPlaneServer for integration
import { ControlPlaneServer, initializeControlPlane } from '@agent-os/control-plane';

// ============================================================================
// SETUP
// ============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const app: Express = express();
const port = process.env.PORT || 5173;
const isDev = process.env.NODE_ENV === 'development';

// Database path (same as ControlPlaneServer)
const DB_PATH = join(__dirname, '../../db/control-plane.db');

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const method = req.method;
  const path = req.path;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    console.log(`[${method}] ${path} - ${status} (${duration}ms)`);
  });

  next();
});

// ============================================================================
// INITIALIZE COMMAND CENTER SERVICE
// ============================================================================

let commandCenterService: CommandCenterService;

try {
  commandCenterService = new CommandCenterService(DB_PATH);
  console.log('✓ Command Center Service initialized');
} catch (err) {
  console.error('✗ Failed to initialize Command Center Service:', err);
  process.exit(1);
}

// Listen for service events (optional - for logging/debugging)
commandCenterService.on('run:created', (data) => {
  console.log(`[EVENT] Run created: ${data.id} (agent: ${data.agentId})`);
});

commandCenterService.on('run:updated', (data) => {
  console.log(`[EVENT] Run updated: ${data.runId} -> ${data.status}`);
});

commandCenterService.on('event:recorded', (data) => {
  console.log(`[EVENT] Event recorded: ${data.type} in run ${data.runId}`);
});

commandCenterService.on('command:dispatched', (data) => {
  console.log(`[EVENT] Command dispatched: ${data.command} in run ${data.runId}`);
});

commandCenterService.on('audit:logged', (data) => {
  console.log(`[AUDIT] ${data.action} on ${data.resourceType}/${data.resourceId} by ${data.userId}: ${data.status}`);
});

// ============================================================================
// API ROUTES
// ============================================================================

// Mount command center routes with /api/command-center prefix
app.use('/api/command-center', createCommandCenterRoutes(commandCenterService));

// Mount legacy ControlPlane routes (if using existing ControlPlaneServer)
const controlPlane = new ControlPlaneServer();
app.use('/api/control-plane', async (req: Request, res: Response, next: NextFunction) => {
  // This integrates existing ControlPlaneServer endpoints if needed
  // Optionally delegate to control-plane initialization
  next();
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'dashboard-server',
    timestamp: Date.now(),
    commandCenter: {
      status: 'connected',
      database: DB_PATH
    }
  });
});

// Error handling
app.use(commandCenterErrorHandler);

// ============================================================================
// VITE DEV SERVER (in development)
// ============================================================================

let vite: any;

if (isDev) {
  vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  // Fallback to index.html for SPA routing
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next(); // Let API routes handle
    }

    vite.transformIndexHtml(req.originalUrl, `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Agent-OS Command Center</title>
        </head>
        <body>
          <div id="app"></div>
          <script type="module" src="/src/main.tsx"></script>
        </body>
      </html>
    `).then(html => res.end(html));
  });
} else {
  // Production: serve static build
  app.use(express.static(join(__dirname, '../../dist')));

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(join(__dirname, '../../dist/index.html'));
  });
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const server = app.listen(port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Agent-OS Command Center Dashboard Server               ║
║                                                                ║
║  🚀 Server running on http://localhost:${port}
║  📊 Command Center API: /api/command-center
║  🔌 SSE Stream: /api/command-center/events/stream
║  🏥 Health Check: /api/health
║                                                                ║
║  Database: ${DB_PATH}
║  Environment: ${isDev ? 'development' : 'production'}
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n[SHUTDOWN] SIGTERM received, gracefully shutting down...');

  // Close all SSE connections
  commandCenterService.close();

  // Close server
  server.close(() => {
    console.log('[SHUTDOWN] Server closed');
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    console.error('[SHUTDOWN] Force exit after timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] SIGINT received, gracefully shutting down...');

  commandCenterService.close();
  server.close(() => {
    console.log('[SHUTDOWN] Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[SHUTDOWN] Force exit after timeout');
    process.exit(1);
  }, 10000);
});

// ============================================================================
// EXPORT for testing or alternative server creation
// ============================================================================

export { app, commandCenterService, controlPlane };
