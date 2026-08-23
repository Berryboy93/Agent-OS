/**
 * Agent-OS Dashboard — Express Server Entry
 * Port 5000 (API + static Vite build)
 */

import express from 'express'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import apiRouter from './agent-os-routes.js'
import { setupAgiIntegration } from './agi-integration.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = Number(process.env.PORT ?? 5000)

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// CORS for Vite dev server (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    if (_req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })
}

// ── API ─────────────────────────────────────────────────────────────────────
// Get db instance from routes (hack - we'll need to refactor)
// For now, setupAgiIntegration will be called inside agent-os-routes
app.use('/api', apiRouter)

// ── Static (production build) ────────────────────────────────────────────────
const distPath = path.resolve(__dirname, '../dist')
app.use(express.static(distPath))

// SPA fallback — must be last
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server error]', err.message)
  res.status(500).json({ error: err.message ?? 'Internal server error' })
})

// ── Start ────────────────────────────────────────────────────────────────────
const httpServer = createServer(app)

httpServer.listen(PORT, () => {
  console.log(`[agent-os] dashboard listening on http://localhost:${PORT}`)
  console.log(`[agent-os] db path: ${process.env.AGENT_OS_DB_PATH ?? '~/Agent-OS/agent-os.db'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => { httpServer.close(() => process.exit(0)) })
process.on('SIGINT',  () => { httpServer.close(() => process.exit(0)) })
