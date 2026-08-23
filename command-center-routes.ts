/**
 * Agent-OS Command Center Express Routes
 * Integrates CommandCenterService with ControlPlaneServer for production API
 * 
 * Location: packages/control-plane/src/routes/command-center.routes.ts
 */

import { Router, Request, Response, NextFunction } from 'express';
import { CommandCenterService } from '../service/command-center.service.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Factory: Create command center routes with service instance
 */
export function createCommandCenterRoutes(service: CommandCenterService): Router {
  const router = Router();

  // Middleware: Audit logging wrapper
  const withAudit = (action: string, resourceType: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      const userId = req.user?.id || 'anonymous';
      const resourceId = req.params.id || req.params.runId || 'batch';

      // Capture original res.json to audit after response
      const originalJson = res.json;
      res.json = function (data: any) {
        const statusCode = res.statusCode;
        const success = statusCode >= 200 && statusCode < 300;

        service.auditLog(
          userId,
          action,
          resourceType,
          resourceId,
          success ? 'success' : 'failure',
          { statusCode, endpoint: req.path, method: req.method }
        );

        return originalJson.call(this, data);
      };

      next();
    };
  };

  // ============================================================================
  // RUNS ENDPOINTS
  // ============================================================================

  /**
   * POST /api/runs
   * Create a new agent run
   */
  router.post('/runs', withAudit('create', 'run'), (req: AuthRequest, res: Response) => {
    try {
      const { agentId, metadata } = req.body;

      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }

      const run = service.createRun(agentId, metadata);
      res.status(201).json(run);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/runs
   * List runs with filtering and pagination
   */
  router.get('/runs', (req: AuthRequest, res: Response) => {
    try {
      const {
        limit = '50',
        offset = '0',
        status,
        agentId,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const runs = service.listRuns({
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        status: status as string | undefined,
        agentId: agentId as string | undefined,
        sortBy: (sortBy as 'created_at' | 'started_at') || 'created_at',
        sortOrder: (sortOrder as 'ASC' | 'DESC') || 'DESC'
      });

      const total = service.listRuns({ limit: 999999 }).length; // Simple count (optimize with DB count query in production)

      res.json({ runs, total, limit: parseInt(limit as string, 10), offset: parseInt(offset as string, 10) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/runs/:id
   * Get run details with full event history
   */
  router.get('/runs/:id', (req: AuthRequest, res: Response) => {
    try {
      const run = service.getRun(req.params.id);
      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }

      const events = service.getRunEvents(req.params.id);

      res.json({ run, events });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * PATCH /api/runs/:id
   * Update run status and output
   */
  router.patch('/runs/:id', withAudit('update', 'run'), (req: AuthRequest, res: Response) => {
    try {
      const { status, output, error } = req.body;
      const run = service.updateRun(req.params.id, { status, output, error });

      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }

      res.json(run);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ============================================================================
  // EVENTS ENDPOINTS
  // ============================================================================

  /**
   * POST /api/runs/:runId/events
   * Record an event in a run's event stream
   */
  router.post('/runs/:runId/events', withAudit('create', 'event'), (req: AuthRequest, res: Response) => {
    try {
      const { type, data } = req.body;

      if (!type) {
        return res.status(400).json({ error: 'type is required' });
      }

      const event = service.addEvent(req.params.runId, type, data || {});
      res.status(201).json(event);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/runs/:runId/events
   * Get all events for a run
   */
  router.get('/runs/:runId/events', (req: AuthRequest, res: Response) => {
    try {
      const events = service.getRunEvents(req.params.runId);
      res.json({ events, count: events.length });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/events/stream
   * Server-Sent Events stream for live run and event updates
   */
  router.get('/events/stream', (req: AuthRequest, res: Response) => {
    service.registerSSEClient(res);

    // Heartbeat every 30s to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(`:heartbeat\n\n`);
      } catch (err) {
        clearInterval(heartbeat);
      }
    }, 30000);

    res.on('close', () => clearInterval(heartbeat));
  });

  // ============================================================================
  // COMMANDS ENDPOINTS
  // ============================================================================

  /**
   * POST /api/runs/:runId/commands
   * Dispatch a command to a run
   */
  router.post('/runs/:runId/commands', withAudit('dispatch', 'command'), (req: AuthRequest, res: Response) => {
    try {
      const { command, args } = req.body;

      if (!command) {
        return res.status(400).json({ error: 'command is required' });
      }

      const cmd = service.dispatchCommand(req.params.runId, command, args || {});
      res.status(201).json(cmd);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * PATCH /api/runs/:runId/commands/:commandId
   * Update command execution status
   */
  router.patch('/runs/:runId/commands/:commandId', withAudit('update', 'command'), (req: AuthRequest, res: Response) => {
    try {
      const { status, result } = req.body;
      const cmd = service.updateCommand(req.params.commandId, { status, result });

      if (!cmd) {
        return res.status(404).json({ error: 'Command not found' });
      }

      res.json(cmd);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ============================================================================
  // METRICS ENDPOINT
  // ============================================================================

  /**
   * GET /api/metrics
   * Get live dashboard metrics (runs, events, agents, health)
   */
  router.get('/metrics', (req: AuthRequest, res: Response) => {
    try {
      const metrics = service.getMetrics();
      res.json(metrics);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  /**
   * GET /api/health
   * Service health status
   */
  router.get('/health', (req: AuthRequest, res: Response) => {
    res.json({
      status: 'ok',
      service: 'command-center',
      timestamp: Date.now()
    });
  });

  return router;
}

/**
 * Error handling middleware for command center routes
 */
export const commandCenterErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[COMMAND-CENTER] Error:', err.message);

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};
