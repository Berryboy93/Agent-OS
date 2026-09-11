import { Router, Request, Response, NextFunction } from 'express';
import { CommandCenterService } from '../service/command-center.service.js';

export function createCommandCenterRoutes(service: CommandCenterService): Router {
  const router = Router();
  const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  const qs = (v: unknown): string | undefined =>
    Array.isArray(v) ? v[0] : typeof v === 'string' ? v : undefined;

  router.get('/runs', asyncHandler(async (req: Request, res: Response) => {
    const result = await service.listRuns({
      status: qs(req.query.status),
      limit: req.query.limit ? parseInt(qs(req.query.limit) ?? '0') : undefined,
      offset: req.query.offset ? parseInt(qs(req.query.offset) ?? '0') : undefined
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
    const run = await service.getRun(qs(req.params.runId)!);
    res.json(run);
  }));

  router.patch('/runs/:runId/status', asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status field required' });
    const run = await service.updateRunStatus(qs(req.params.runId)!, status);
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
