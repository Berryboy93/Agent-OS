// tools-routes.ts — Standalone tools API routes for Agent-OS Dashboard
// Import this in server.ts: import { initToolsSchema, setupToolsRoutes } from './tools-routes';

import { randomUUID } from 'crypto';

const TOOLS_SCHEMA = `
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK(category IN ('agent','system','utility','integration')),
  status TEXT CHECK(status IN ('active','deprecated','experimental','error')) DEFAULT 'active',
  version TEXT DEFAULT '1.0.0',
  endpoint TEXT NOT NULL,
  method TEXT CHECK(method IN ('GET','POST','PUT','DELETE','PATCH')) DEFAULT 'POST',
  parameters TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  executionCount INTEGER DEFAULT 0,
  avgLatency REAL DEFAULT 0,
  errorRate REAL DEFAULT 0,
  lastExecuted TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_executions (
  id TEXT PRIMARY KEY,
  toolId TEXT NOT NULL,
  toolName TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending','running','completed','failed','cancelled')),
  parameters TEXT DEFAULT '{}',
  result TEXT,
  error TEXT,
  startedAt TEXT NOT NULL,
  completedAt TEXT,
  duration INTEGER,
  triggeredBy TEXT DEFAULT 'system',
  correlationId TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tool_executions_toolId ON tool_executions(toolId);
CREATE INDEX IF NOT EXISTS idx_tool_executions_startedAt ON tool_executions(startedAt);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
`;

async function executeTool(tool: any, parameters: Record<string, unknown>): Promise<unknown> {
  const url = tool.endpoint.startsWith('http')
    ? tool.endpoint
    : `http://localhost:${process.env.AGENT_OS_PORT || 8080}${tool.endpoint}`;
  const response = await fetch(url, {
    method: tool.method || 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parameters),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tool execution failed: ${error}`);
  }
  return response.json();
}

function broadcastToolExecution(event: any) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  if ((globalThis as any).sseClients) {
    (globalThis as any).sseClients.forEach((client: any) => {
      try { client.write(data); } catch (e) {}
    });
  }
  if ((globalThis as any).compatClients) {
    (globalThis as any).compatClients.forEach((client: any) => {
      try { client.write(data); } catch (e) {}
    });
  }
}

export function initToolsSchema(db: any) {
  console.log('[DB] Initializing tools schema...');
  // Split schema into individual statements and execute
  const statements = TOOLS_SCHEMA.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    if (stmt.trim()) {
      db.session.client.prepare(stmt.trim()).run();
    }
  }
  console.log('[DB] Tools schema ready.');
}

export function setupToolsRoutes(app: any, db: any) {
  app.get('/api/tools', (req: any, res: any) => {
    try {
      const { category, status, search, tags } = req.query;
      let tools = db.session.client.prepare('SELECT * FROM tools').all();
      if (category) tools = tools.filter((t: any) => t.category === category);
      if (status) tools = tools.filter((t: any) => t.status === status);
      if (search) {
        const s = String(search).toLowerCase();
        tools = tools.filter((t: any) => t.name.toLowerCase().includes(s) || t.description?.toLowerCase().includes(s));
      }
      if (tags) {
        const tagList = String(tags).split(',');
        tools = tools.filter((t: any) => {
          const toolTags = JSON.parse(t.tags || '[]');
          return tagList.some((tag: string) => toolTags.includes(tag));
        });
      }
      res.json(tools.map((t: any) => ({
        ...t,
        parameters: JSON.parse(t.parameters || '[]'),
        tags: JSON.parse(t.tags || '[]'),
        metadata: JSON.parse(t.metadata || '{}'),
      })));
    } catch (error: any) {
      console.error('[Tools API] List error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/tools/:id', (req: any, res: any) => {
    try {
      const tool = db.session.client.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id);
      if (!tool) return res.status(404).json({ error: 'Tool not found' });
      res.json({ ...tool, parameters: JSON.parse(tool.parameters || '[]'), tags: JSON.parse(tool.tags || '[]'), metadata: JSON.parse(tool.metadata || '{}') });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/tools', (req: any, res: any) => {
    try {
      const id = randomUUID();
      const now = new Date().toISOString();
      const { name, description, category, status, version, endpoint, method, parameters, tags, metadata } = req.body;
      db.session.client.prepare(`INSERT INTO tools (id, name, description, category, status, version, endpoint, method, parameters, tags, metadata, executionCount, avgLatency, errorRate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, name, description, category || 'utility', status || 'active', version || '1.0.0', endpoint, method || 'POST', JSON.stringify(parameters || []), JSON.stringify(tags || []), JSON.stringify(metadata || {}), 0, 0, 0, now, now);
      const tool = db.session.client.prepare('SELECT * FROM tools WHERE id = ?').get(id);
      res.status(201).json({ ...tool, parameters: JSON.parse(tool.parameters || '[]'), tags: JSON.parse(tool.tags || '[]'), metadata: JSON.parse(tool.metadata || '{}') });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/tools/:id', (req: any, res: any) => {
    try {
      const now = new Date().toISOString();
      const existing = db.session.client.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Tool not found' });
      const updates = req.body;
      const fields: string[] = [];
      const values: any[] = [];
      if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
      if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
      if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
      if (updates.version !== undefined) { fields.push('version = ?'); values.push(updates.version); }
      if (updates.endpoint !== undefined) { fields.push('endpoint = ?'); values.push(updates.endpoint); }
      if (updates.method !== undefined) { fields.push('method = ?'); values.push(updates.method); }
      if (updates.parameters !== undefined) { fields.push('parameters = ?'); values.push(JSON.stringify(updates.parameters)); }
      if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
      if (updates.metadata !== undefined) { fields.push('metadata = ?'); values.push(JSON.stringify(updates.metadata)); }
      fields.push('updatedAt = ?');
      values.push(now);
      values.push(req.params.id);
      db.session.client.prepare(`UPDATE tools SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      const tool = db.session.client.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id);
      res.json({ ...tool, parameters: JSON.parse(tool.parameters || '[]'), tags: JSON.parse(tool.tags || '[]'), metadata: JSON.parse(tool.metadata || '{}') });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/tools/:id', (req: any, res: any) => {
    try {
      const existing = db.session.client.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Tool not found' });
      db.session.client.prepare('DELETE FROM tools WHERE id = ?').run(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/tools/:id/execute', async (req: any, res: any) => {
    let executionId: string | null = null;
    try {
      const tool = db.session.client.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id);
      if (!tool) return res.status(404).json({ error: 'Tool not found' });
      executionId = randomUUID();
      const correlationId = randomUUID();
      const startedAt = new Date().toISOString();
      const parameters = req.body.parameters || {};
      db.session.client.prepare(`INSERT INTO tool_executions (id, toolId, toolName, status, parameters, startedAt, triggeredBy, correlationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(executionId, tool.id, tool.name, 'running', JSON.stringify(parameters), startedAt, 'dashboard', correlationId);
      broadcastToolExecution({ type: 'execution.started', execution: { id: executionId, toolId: tool.id, toolName: tool.name, status: 'running', parameters, startedAt, triggeredBy: 'dashboard', correlationId, duration: 0 }, timestamp: startedAt });
      const startTime = Date.now();
      const result = await executeTool(tool, parameters);
      const duration = Date.now() - startTime;
      const completedAt = new Date().toISOString();
      db.session.client.prepare('UPDATE tool_executions SET status = ?, result = ?, completedAt = ?, duration = ? WHERE id = ?').run('completed', JSON.stringify(result), completedAt, duration, executionId);
      const stats = db.session.client.prepare('SELECT executionCount, avgLatency FROM tools WHERE id = ?').get(tool.id);
      const newCount = (stats?.executionCount || 0) + 1;
      const newAvg = newCount === 1 ? duration : (((stats?.avgLatency || 0) * (newCount - 1)) + duration) / newCount;
      db.session.client.prepare('UPDATE tools SET executionCount = ?, avgLatency = ?, lastExecuted = ? WHERE id = ?').run(newCount, newAvg, completedAt, tool.id);
      broadcastToolExecution({ type: 'execution.completed', execution: { id: executionId, toolId: tool.id, toolName: tool.name, status: 'completed', parameters, result, startedAt, completedAt, duration, triggeredBy: 'dashboard', correlationId }, timestamp: completedAt });
      res.json({ executionId, result, duration });
    } catch (error: any) {
      const failedAt = new Date().toISOString();
      if (executionId) {
        db.session.client.prepare('UPDATE tool_executions SET status = ?, error = ?, completedAt = ? WHERE id = ?').run('failed', error.message, failedAt, executionId);
        broadcastToolExecution({ type: 'execution.failed', execution: { id: executionId, toolId: req.params.id, toolName: 'unknown', status: 'failed', parameters: req.body.parameters || {}, error: error.message, startedAt: failedAt, completedAt: failedAt, duration: 0, triggeredBy: 'dashboard', correlationId: randomUUID() }, timestamp: failedAt });
      }
      res.status(500).json({ error: error.message, executionId });
    }
  });

  app.post('/api/tools/executions/:id/cancel', (req: any, res: any) => {
    try {
      const execution = db.session.client.prepare('SELECT * FROM tool_executions WHERE id = ?').get(req.params.id);
      if (!execution) return res.status(404).json({ error: 'Execution not found' });
      if (execution.status !== 'running') return res.status(400).json({ error: 'Execution not running' });
      const cancelledAt = new Date().toISOString();
      db.session.client.prepare('UPDATE tool_executions SET status = ?, completedAt = ? WHERE id = ?').run('cancelled', cancelledAt, req.params.id);
      broadcastToolExecution({ type: 'execution.updated', execution: { ...execution, status: 'cancelled', completedAt: cancelledAt, duration: Date.now() - new Date(execution.startedAt).getTime() }, timestamp: cancelledAt });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/tools/executions', (req: any, res: any) => {
    try {
      const { toolId, limit = '50' } = req.query;
      let query = 'SELECT * FROM tool_executions';
      const params: any[] = [];
      if (toolId) { query += ' WHERE toolId = ?'; params.push(toolId); }
      query += ' ORDER BY startedAt DESC LIMIT ?';
      params.push(Number(limit));
      const executions = db.session.client.prepare(query).all(...params);
      res.json(executions.map((e: any) => ({ ...e, parameters: JSON.parse(e.parameters || '{}'), result: e.result ? JSON.parse(e.result) : undefined })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/tools/executions/:id', (req: any, res: any) => {
    try {
      const execution = db.session.client.prepare('SELECT * FROM tool_executions WHERE id = ?').get(req.params.id);
      if (!execution) return res.status(404).json({ error: 'Execution not found' });
      res.json({ ...execution, parameters: JSON.parse(execution.parameters || '{}'), result: execution.result ? JSON.parse(execution.result) : undefined });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/tools/stats', (req: any, res: any) => {
    try {
      const totalTools = db.session.client.prepare('SELECT COUNT(*) as count FROM tools').get().count;
      const activeTools = db.session.client.prepare("SELECT COUNT(*) as count FROM tools WHERE status = 'active'").get().count;
      const execStats = db.session.client.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success FROM tool_executions WHERE startedAt > datetime('now', '-24 hours')").get();
      const avgLatency = db.session.client.prepare("SELECT AVG(duration) as avg FROM tool_executions WHERE status = 'completed' AND duration IS NOT NULL").get().avg || 0;
      const topTools = db.session.client.prepare('SELECT toolId, toolName, COUNT(*) as count FROM tool_executions GROUP BY toolId ORDER BY count DESC LIMIT 5').all();
      const executionsByDay = db.session.client.prepare("SELECT date(startedAt) as date, COUNT(*) as count, SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as errors FROM tool_executions WHERE startedAt > datetime('now', '-7 days') GROUP BY date(startedAt) ORDER BY date DESC").all();
      res.json({ totalTools, activeTools, totalExecutions: execStats?.total || 0, successRate: execStats?.total > 0 ? (execStats.success / execStats.total) : 1, avgLatency: Math.round(avgLatency), topTools: topTools || [], executionsByDay: executionsByDay || [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/tools/:id/health', async (req: any, res: any) => {
    try {
      const tool = db.session.client.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id);
      if (!tool) return res.status(404).json({ error: 'Tool not found' });
      const start = Date.now();
      try {
        await executeTool(tool, {});
        res.json({ healthy: true, latency: Date.now() - start, message: 'Tool responding normally' });
      } catch (error: any) {
        res.json({ healthy: false, latency: Date.now() - start, message: error.message });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/tools/seed', (req: any, res: any) => {
    try {
      const count = db.session.client.prepare('SELECT COUNT(*) as count FROM tools').get().count;
      if (count > 0) return res.json({ message: 'Tools already seeded', count });
      const sampleTools = [
        { name: 'Agent Status Check', description: 'Check health and status of all registered agents', category: 'system', endpoint: '/api/agents/status', method: 'GET', parameters: [{ name: 'agentId', type: 'string', required: false, description: 'Specific agent ID to check' }], tags: ['health', 'monitoring'] },
        { name: 'Deploy Pipeline', description: 'Trigger deployment pipeline for agent or service', category: 'agent', endpoint: '/api/pipelines/deploy', method: 'POST', parameters: [{ name: 'pipelineId', type: 'string', required: true, description: 'Pipeline identifier' }, { name: 'environment', type: 'string', required: true, description: 'Target environment', enum: ['dev', 'staging', 'production'] }], tags: ['deploy', 'ci-cd'] },
        { name: 'Log Analyzer', description: 'Analyze system logs for errors and patterns', category: 'utility', endpoint: '/api/logs/analyze', method: 'POST', parameters: [{ name: 'timeRange', type: 'string', required: true, description: 'Time range (e.g., 1h, 24h, 7d)' }, { name: 'level', type: 'string', required: false, description: 'Log level filter', enum: ['debug', 'info', 'warn', 'error', 'fatal'] }], tags: ['logs', 'analysis'] },
        { name: 'Webhook Trigger', description: 'Send webhook notification to external systems', category: 'integration', endpoint: '/api/webhooks/trigger', method: 'POST', parameters: [{ name: 'url', type: 'string', required: true, description: 'Webhook URL' }, { name: 'payload', type: 'object', required: true, description: 'JSON payload to send' }, { name: 'secret', type: 'string', required: false, description: 'Webhook secret for HMAC signature' }], tags: ['webhook', 'integration', 'notification'] },
        { name: 'Database Backup', description: 'Create backup of Agent-OS database', category: 'system', endpoint: '/api/system/backup', method: 'POST', parameters: [{ name: 'compress', type: 'boolean', required: false, description: 'Compress backup with gzip', defaultValue: true }], tags: ['backup', 'database', 'maintenance'] },
      ];
      const now = new Date().toISOString();
      const stmt = db.session.client.prepare('INSERT INTO tools (id, name, description, category, status, version, endpoint, method, parameters, tags, metadata, executionCount, avgLatency, errorRate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      sampleTools.forEach(tool => {
        stmt.run(randomUUID(), tool.name, tool.description, tool.category, 'active', '1.0.0', tool.endpoint, tool.method, JSON.stringify(tool.parameters), JSON.stringify(tool.tags), '{}', 0, 0, 0, now, now);
      });
      res.json({ message: 'Sample tools seeded', count: sampleTools.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
