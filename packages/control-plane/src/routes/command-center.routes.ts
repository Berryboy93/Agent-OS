import { Router, Request, Response, NextFunction } from 'express';
import { CommandCenterService } from '../service/command-center.service.js';

export function createCommandCenterRoutes(service: CommandCenterService): Router {
  const router = Router();
  const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  router.get('/runs', asyncHandler(async (req: Request, res: Response) => {
    const result = await service.listRuns({
      status: req.query.status as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    });
    res.json(result);
  }));

  router.post('/runs', asyncHandler(async (req: Request, res: Response) => {
    const { agent } = req.body;
    if (!agent) return res.status(400).json({ error: 'agent field required' });
    const run = await service.createRun(agent);
    res.status(201).json(run);
  }));

  router.get('/runs/:runId', asyncHandler(async (req: Request, res: Response) => {
    const run = await service.getRun(req.params.runId);
    res.json(run);
  }));

  router.patch('/runs/:runId/status', asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status field required' });
    const run = await service.updateRunStatus(req.params.runId, status);
    res.json(run);
  }));

  router.post('/commands/dispatch', asyncHandler(async (req: Request, res: Response) => {
    const { runId, command, args } = req.body;
    if (!runId || !command) return res.status(400).json({ error: 'runId and command required' });
    const result = await service.dispatchCommand(runId, command, args);
    res.status(202).json(result);
  }));

  router.get('/events/stream', (req: Request, res: Response) => {
    service.handleEventStream(res);
  });

  router.get('/rbac/roles', asyncHandler(async (req: Request, res: Response) => {
    res.json(service.getRoles());
  }));

  router.get('/rbac/policies', asyncHandler(async (req: Request, res: Response) => {
    res.json(service.getPolicies());
  }));

  router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
}
