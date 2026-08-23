import express, { Request, Response } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createDb } from '@agent-os/db';
import { EventStore } from '@agent-os/events';
import { AgentRunner } from '@agent-os/runtime';
import { AnthropicAdapter } from '@agent-os/adapters';
import { AGENT_OS_VERSION, APPROVAL_TIMEOUT_DEFAULT_MS } from '@agent-os/core';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env['AGENT_OS_DB'] ?? resolve(__dirname, '../../agent-os.db');
const PORT = parseInt(process.env['PORT'] ?? '5000', 10);
const DASHBOARD_SECRET = process.env['DASHBOARD_SECRET'];

const db = createDb(DB_PATH);
const eventStore = new EventStore(db);

const rawDb = db as unknown as {
  session: {
    client: {
      prepare: (sql: string) => {
        all: (...args: unknown[]) => unknown[];
        get: (...args: unknown[]) => unknown;
        run: (...args: unknown[]) => void;
      };
    };
  };
};

const app = express();
app.use(cors());
app.use(express.json());

const sseClients = new Set<{ res: Response; id: string }>();

function broadcast(payload: unknown): void {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
}

eventStore.on('*', (event) => {
  broadcast({ type: 'agent.event', event });
});

function requireAuth(req: Request, res: Response): boolean {
  if (!DASHBOARD_SECRET) return true;
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${DASHBOARD_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: AGENT_OS_VERSION,
    timestamp: new Date().toISOString(),
    db: DB_PATH,
  });
});

app.get('/api/agents', (_req: Request, res: Response) => {
  try {
    const agents = rawDb.session.client.prepare(
      `SELECT * FROM agent_definitions ORDER BY updated_at DESC`
    ).all();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/agents/:id/runs', (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query['limit'] as string) ?? '50', 10);
    const runs = rawDb.session.client.prepare(
      `SELECT * FROM agent_runs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?`
    ).all(req.params['id']!, limit);
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/runs', (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query['limit'] as string) ?? '50', 10);
    const runs = rawDb.session.client.prepare(
      `SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT ?`
    ).all(limit);
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/runs/:id', (req: Request, res: Response) => {
  try {
    const run = rawDb.session.client.prepare(
      `SELECT * FROM agent_runs WHERE id = ?`
    ).get(req.params['id']!);
    if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/runs/:id/events', (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query['limit'] as string) ?? '500', 10);
    const cursor = req.query['cursor'] as string | undefined;
    let query = `SELECT * FROM agent_events WHERE run_id = ?`;
    const params: unknown[] = [req.params['id']!];
    if (cursor) { query += ` AND sequence_number > ?`; params.push(parseInt(cursor, 10)); }
    query += ` ORDER BY sequence_number ASC LIMIT ?`;
    params.push(limit);
    const events = rawDb.session.client.prepare(query).all(...params);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/runs/:id/checkpoints', (req: Request, res: Response) => {
  try {
    const checkpoints = rawDb.session.client.prepare(
      `SELECT id, run_id, agent_id, turn_index, input_tokens, output_tokens, total_tokens, created_at
       FROM execution_checkpoints WHERE run_id = ? ORDER BY turn_index ASC`
    ).all(req.params['id']!);
    res.json(checkpoints);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/pipelines', (_req: Request, res: Response) => {
  try {
    const pipelines = rawDb.session.client.prepare(
      `SELECT * FROM pipeline_runs ORDER BY created_at DESC LIMIT 100`
    ).all();
    res.json(pipelines);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/deployments', (_req: Request, res: Response) => {
  try {
    const deployments = rawDb.session.client.prepare(
      `SELECT * FROM deployments ORDER BY created_at DESC LIMIT 100`
    ).all();
    res.json(deployments);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/deployments/:id/rollback', (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const dep = rawDb.session.client.prepare(
      `SELECT * FROM deployments WHERE id = ?`
    ).get(req.params['id']!) as Record<string, unknown> | undefined;

    if (!dep) { res.status(404).json({ error: 'Deployment not found' }); return; }

    const rollbackId = uuidv4();
    const now = Date.now();
    rawDb.session.client.prepare(`
      INSERT INTO deployments (id, agent_id, version, status, target, rollback_of, config_json, deployed_by, deployed_at, created_at)
      VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, 'dashboard', ?, ?)
    `).run(
      rollbackId,
      dep['agent_id'],
      dep['version'],
      dep['target'],
      dep['id'],
      dep['config_json'] ?? '{}',
      now,
      now
    );

    rawDb.session.client.prepare(`UPDATE deployments SET status = 'ROLLED_BACK' WHERE id = ?`).run(dep['id'] as string);

    eventStore.appendSync({
      id: uuidv4(),
      runId: rollbackId,
      agentId: dep['agent_id'] as string,
      type: 'run.started',
      data: { action: 'rollback', deploymentId: dep['id'], rollbackDeploymentId: rollbackId },
      timestamp: new Date(),
    });

    res.json({ rollbackDeploymentId: rollbackId, status: 'ACTIVE', originalId: dep['id'] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/approvals', (_req: Request, res: Response) => {
  try {
    const approvals = rawDb.session.client.prepare(
      `SELECT * FROM approval_requests ORDER BY created_at DESC LIMIT 100`
    ).all();
    res.json(approvals);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/approvals/:id/resolve', (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const approval = rawDb.session.client.prepare(
      `SELECT * FROM approval_requests WHERE id = ?`
    ).get(req.params['id']!) as Record<string, unknown> | undefined;

    if (!approval) { res.status(404).json({ error: 'Approval request not found' }); return; }
    if (approval['status'] !== 'PENDING') {
      res.status(409).json({ error: `Approval already ${approval['status'] as string}` });
      return;
    }

    const { decision, note, resolvedBy } = req.body as {
      decision: 'APPROVED' | 'REJECTED';
      note?: string;
      resolvedBy?: string;
    };

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      res.status(400).json({ error: 'decision must be APPROVED or REJECTED' });
      return;
    }

    const now = Date.now();
    rawDb.session.client.prepare(`
      UPDATE approval_requests
      SET status = ?, resolved_at = ?, resolved_by = ?, resolution_note = ?
      WHERE id = ?
    `).run(decision, now, resolvedBy ?? 'dashboard', note ?? null, req.params['id']!);

    eventStore.appendSync({
      id: uuidv4(),
      runId: approval['execution_id'] as string ?? approval['run_id'] as string ?? 'unknown',
      agentId: approval['agent_id'] as string ?? 'unknown',
      type: 'approval.resolved',
      data: { approvalId: req.params['id']!, decision, resolvedBy: resolvedBy ?? 'dashboard', note },
      timestamp: new Date(),
    });

    res.json({ id: req.params['id']!, status: decision, resolvedAt: new Date(now).toISOString() });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/events', (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query['limit'] as string) ?? '100', 10);
    const events = rawDb.session.client.prepare(
      `SELECT * FROM agent_events ORDER BY timestamp DESC LIMIT ?`
    ).all(limit);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/stats', (_req: Request, res: Response) => {
  try {
    const total = rawDb.session.client.prepare(`SELECT COUNT(*) as count FROM agent_runs`).get() as { count: number };
    const byStatus = rawDb.session.client.prepare(
      `SELECT status, COUNT(*) as count FROM agent_runs GROUP BY status`
    ).all() as Array<{ status: string; count: number }>;
    const totalTokens = rawDb.session.client.prepare(
      `SELECT SUM(total_tokens) as total FROM agent_runs`
    ).get() as { total: number | null };
    const recentEvents = rawDb.session.client.prepare(
      `SELECT COUNT(*) as count FROM agent_events WHERE timestamp > ?`
    ).get(Date.now() - 3600000) as { count: number };
    const checkpointCount = rawDb.session.client.prepare(
      `SELECT COUNT(*) as count FROM execution_checkpoints`
    ).get() as { count: number };
    const pendingApprovals = rawDb.session.client.prepare(
      `SELECT COUNT(*) as count FROM approval_requests WHERE status = 'PENDING'`
    ).get() as { count: number };
    const deploymentCount = rawDb.session.client.prepare(
      `SELECT COUNT(*) as count FROM deployments WHERE status = 'ACTIVE'`
    ).get() as { count: number };

    res.json({
      runs: { total: total.count, byStatus },
      tokens: { total: totalTokens.total ?? 0 },
      events: { lastHour: recentEvents.count },
      checkpoints: { total: checkpointCount.count },
      approvals: { pending: pendingApprovals.count },
      deployments: { active: deploymentCount.count },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/runs/demo', (_req: Request, res: Response) => {
  try {
    const runId = uuidv4();
    const now = Date.now();
    const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'FAILED', 'RUNNING'];
    const agents = ['summarizer-agent', 'code-reviewer', 'data-analyst', 'research-agent'];
    const status = statuses[Math.floor(Math.random() * statuses.length)] as string;
    const agentId = agents[Math.floor(Math.random() * agents.length)] as string;
    const tokens = Math.floor(Math.random() * 8000) + 500;
    const correlationId = uuidv4();

    rawDb.session.client.prepare(`
      INSERT INTO agent_runs (id, agent_id, agent_version, status, input_json, output_json, input_tokens, output_tokens, total_tokens, correlation_id, started_at, completed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      runId, agentId, '1.0.0', status,
      JSON.stringify({ task: `Demo task ${runId.slice(0, 6)}` }),
      status === 'COMPLETED' ? JSON.stringify({ content: 'Task completed successfully.' }) : null,
      Math.floor(tokens * 0.6), Math.floor(tokens * 0.4), tokens,
      correlationId,
      now - 5000, status !== 'RUNNING' ? now : null, now
    );

    const eventTypes = ['run.started', 'turn.started', 'turn.completed', 'token.usage', 'run.completed'] as const;
    eventTypes.forEach((type, i) => {
      eventStore.appendSync({
        id: uuidv4(),
        runId,
        agentId,
        type,
        data: { demo: true, turn: i },
        timestamp: new Date(now + i * 100),
      });
    });

    res.json({ runId, status });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/approvals/demo', (_req: Request, res: Response) => {
  try {
    const id = uuidv4();
    const executionId = uuidv4();
    const now = Date.now();
    rawDb.session.client.prepare(`
      INSERT INTO approval_requests (id, execution_id, pipeline_run_id, step_id, status, reason, payload_json, prompt_json, expires_at, created_at)
      VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)
    `).run(
      id, executionId, uuidv4(), 'deploy-approval',
      'Approve deployment to production',
      JSON.stringify({ action: 'deploy', environment: 'production', agent: 'demo-agent' }),
      JSON.stringify({ question: 'Approve this deployment?', context: { version: '1.2.0' } }),
      now + APPROVAL_TIMEOUT_DEFAULT_MS,
      now
    );
    eventStore.appendSync({
      id: uuidv4(), runId: executionId, agentId: 'demo-agent',
      type: 'approval.requested',
      data: { approvalId: id, reason: 'Approve deployment to production' },
      timestamp: new Date(),
    });
    res.json({ id, executionId, status: 'PENDING' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/deployments/demo', (_req: Request, res: Response) => {
  try {
    const id = uuidv4();
    const agents = ['summarizer-agent', 'code-reviewer', 'data-analyst'];
    const targets = ['local', 'railway', 'docker'] as const;
    const agentId = agents[Math.floor(Math.random() * agents.length)] as string;
    const target = targets[Math.floor(Math.random() * targets.length)]!;
    const statuses = ['ACTIVE', 'ACTIVE', 'INACTIVE', 'FAILED'] as const;
    const status = statuses[Math.floor(Math.random() * statuses.length)]!;
    const now = Date.now();
    rawDb.session.client.prepare(`
      INSERT INTO deployments (id, agent_id, version, status, target, config_json, deployed_by, deployed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, agentId, `1.${Math.floor(Math.random() * 9)}.0`, status, target, '{}', 'demo-user', now, now);
    res.json({ id, agentId, status, target });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

let defaultRunner: AgentRunner | null = null;

function getDefaultRunner(tokenBudget?: { maxTotalTokens: number; onBudgetExceeded: 'hard_stop' | 'warn' | 'graceful_finish' }): AgentRunner {
  if (defaultRunner) return defaultRunner;
  const adapter = new AnthropicAdapter();
  defaultRunner = new AgentRunner({
    adapter,
    db,
    eventStore,
    concurrencyLimit: parseInt(process.env['AGENT_OS_CONCURRENCY'] ?? '50', 10),
    defaultTokenBudget: tokenBudget,
  });
  return defaultRunner;
}

app.post('/api/run', async (req: Request, res: Response) => {
  const { agentId = 'demo-agent', input = {}, systemPrompt, tokenBudget } = req.body as {
    agentId?: string;
    input?: Record<string, unknown>;
    systemPrompt?: string;
    tokenBudget?: { maxTotalTokens: number; onBudgetExceeded: 'hard_stop' | 'warn' | 'graceful_finish' };
  };

  if (!process.env['ANTHROPIC_API_KEY']) {
    res.status(422).json({
      error: 'ANTHROPIC_API_KEY not set — cannot run real agent. Use /api/runs/demo for demo data.',
    });
    return;
  }

  try {
    const runId = uuidv4();
    const runner = getDefaultRunner(tokenBudget);
    res.json({ runId, status: 'QUEUED', message: 'Agent run enqueued' });
    runner.run({ runId, agentId, input, systemPrompt }).catch((err: Error) => {
      console.error('[/api/run] Agent run failed:', err);
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const clientId = uuidv4();
  const client = { res, id: clientId };
  sseClients.add(client);

  res.write(`data: ${JSON.stringify({ type: 'connected', clientId, timestamp: new Date().toISOString() })}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(`: heartbeat\n\n`); } catch { /* ignore */ }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(client);
  });
});

app.get('/api/sse', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const clientId = uuidv4();
  const client = { res, id: clientId };
  sseClients.add(client);

  res.write(`data: ${JSON.stringify({ type: 'connected', clientId, timestamp: new Date().toISOString() })}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(`: heartbeat\n\n`); } catch { /* ignore */ }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(client);
  });
});

const DIST = resolve(__dirname, 'dist');
const isDev = !existsSync(DIST);

if (!isDev) {
  app.use(express.static(DIST));
  app.get('/{*splat}', (_req: Request, res: Response) => res.sendFile(resolve(DIST, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Agent-OS Dashboard v${AGENT_OS_VERSION} on port ${PORT}`);
  console.log(`DB: ${DB_PATH}`);
  console.log(`Frontend: ${isDev ? 'dev mode (serve separately)' : 'static build'}`);
  console.log(`EventStore: active with 5-stage redaction pipeline`);
  console.log(`SSE endpoints: /events (PRD §26.3), /api/sse (compat)`);

  if (process.env['ANTHROPIC_API_KEY']) {
    const runner = getDefaultRunner();
    runner.recoverCrashedRuns().then((count) => {
      if (count > 0) console.log(`[Recovery] Re-enqueued ${count} interrupted run(s)`);
    }).catch((err: Error) => {
      console.error('[Recovery] Failed:', err.message);
    });
  } else {
    const recoverable = rawDb.session.client.prepare(
      `SELECT COUNT(*) as count FROM agent_runs WHERE status IN ('RUNNING', 'RESUMING')`
    ).get() as { count: number } | undefined;
    if (recoverable && recoverable.count > 0) {
      console.log(`[Recovery] ${recoverable.count} interrupted run(s) — set ANTHROPIC_API_KEY to resume`);
      rawDb.session.client.prepare(
        `UPDATE agent_runs SET status = 'RESUMING' WHERE status IN ('RUNNING', 'RESUMING')`
      ).run();
    }
  }
});
