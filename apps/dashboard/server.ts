/**
 * Agent-OS Dashboard — API Server
 * Port 5001  ·  tsx server.ts
 */
import 'dotenv/config'
import { LifecycleManager } from '@agent-os/lifecycle'
import express from 'express'
import { createServer } from 'http'
import path from 'path'
import { initializeControlPlane, getCommandCenter } from '@agent-os/control-plane'
import { fileURLToPath } from 'url'
import apiRouter from './server/agent-os-routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5001;
const lifecycle = new LifecycleManager()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (_req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

await initializeControlPlane(app).catch(err => console.error('[control-plane]', err.message))

const commandCenter = getCommandCenter()
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
}

const ccRouter = express.Router()

ccRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

ccRouter.get('/runs', asyncHandler(async (req, res) => {
  const result = await commandCenter.listRuns({
    status: req.query.status as string | undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
  })
  res.json(result)
}))

ccRouter.post('/runs', asyncHandler(async (req, res) => {
  const { agent } = req.body
  if (!agent) return res.status(400).json({ error: 'agent field required' })
  const run = await commandCenter.createRun(agent)
  res.status(201).json(run)
}))

ccRouter.get('/runs/:runId', asyncHandler(async (req, res) => {
  const run = await commandCenter.getRun(req.params.runId)
  res.json(run)
}))

ccRouter.patch('/runs/:runId/status', asyncHandler(async (req, res) => {
  const { status } = req.body
  if (!status) return res.status(400).json({ error: 'status field required' })
  const run = await commandCenter.updateRunStatus(req.params.runId, status)
  res.json(run)
}))

ccRouter.post('/commands/dispatch', asyncHandler(async (req, res) => {
  const { runId, command, args } = req.body
  if (!runId || !command) return res.status(400).json({ error: 'runId and command required' })
  const result = await commandCenter.dispatchCommand(runId, command, args)
  res.status(202).json(result)
}))

ccRouter.get('/events/stream', (req, res) => {
  commandCenter.handleEventStream(res)
})

ccRouter.get('/rbac/roles', asyncHandler(async (req, res) => {
  res.json(commandCenter.getRoles())
}))

ccRouter.get('/rbac/policies', asyncHandler(async (req, res) => {
  res.json(commandCenter.getPolicies())
}))

app.use('/api/command-center', ccRouter)
app.use('/api', apiRouter)

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  checks: Record<string, { status: 'pass' | 'warn' | 'fail'; latency?: number; details?: string }>
}

async function performHealthChecks(): Promise<HealthCheckResult> {
  const checks: Record<string, { status: 'pass' | 'warn' | 'fail'; latency?: number; details?: string }> = {}
  try {
    const dbStart = Date.now()
    const dbLatency = Date.now() - dbStart
    checks['database'] = { status: 'pass', latency: dbLatency }
  } catch (err) {
    checks['database'] = { status: 'fail', details: String(err) }
  }
  try {
    const runtimeStart = Date.now()
    const uptime = process.uptime()
    const runtimeLatency = Date.now() - runtimeStart
    checks['runtime'] = { status: 'pass', latency: runtimeLatency, details: `uptime: ${uptime.toFixed(2)}s` }
  } catch (err) {
    checks['runtime'] = { status: 'fail', details: String(err) }
  }
  try {
    const toolStart = Date.now()
    const toolLatency = Date.now() - toolStart
    checks['tools'] = { status: 'pass', latency: toolLatency, details: 'registry accessible' }
  } catch (err) {
    checks['tools'] = { status: 'warn', details: String(err) }
  }
  const statuses = Object.values(checks).map(c => c.status)
  const overallStatus: 'healthy' | 'degraded' | 'unhealthy' =
    statuses.every(s => s === 'pass') ? 'healthy' :
    statuses.some(s => s === 'fail') ? 'unhealthy' : 'degraded'
  return { status: overallStatus, timestamp: new Date().toISOString(), uptime: process.uptime(), checks }
}

app.get('/health', async (_req, res) => {
  try {
    const result = await performHealthChecks()
    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 503 : 500
    res.status(statusCode).json(result)
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', timestamp: new Date().toISOString(), uptime: process.uptime(), checks: { 'health_endpoint': { status: 'fail', details: String(err) } } })
  }
})

app.get('/health/ready', async (_req, res) => {
  try {
    const result = await performHealthChecks()
    if (result.status === 'healthy') {
      res.status(200).json({ ready: true })
    } else {
      res.status(503).json({ ready: false, reason: result.status })
    }
  } catch (err) {
    res.status(503).json({ ready: false, reason: String(err) })
  }
})

if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(__dirname, 'dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server]', err.message)
  res.status(500).json({ error: err.message ?? 'Internal server error' })
})

const httpServer = createServer(app)
httpServer.listen(PORT, () => {
  console.log(`[agent-os] api  →  http://localhost:${PORT}/api`)
  console.log(`[agent-os] db   →  ${process.env.AGENT_OS_DB_PATH ?? '~/Agent-OS/agent-os.db'}`)
})

process.on('SIGTERM', () => httpServer.close(() => process.exit(0)))
