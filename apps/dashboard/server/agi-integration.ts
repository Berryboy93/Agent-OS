/**
 * agi-integration.ts
 * Agent-OS ↔ Agi-Suite bidirectional integration
 */
import { Request, Response, Router } from 'express'
import Database from 'better-sqlite3'

const AGENT_TOKEN = process.env.AGENT_SERVICE_TOKEN || ''
const AGI_SUITE_URL = process.env.AGI_SUITE_URL || 'http://localhost:3001'

export function setupAgiIntegration(router: Router, db: Database.Database) {
  async function fetchAgiSuite<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${AGI_SUITE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-agent-token': AGENT_TOKEN,
        ...(options?.headers || {}),
      },
    })
    if (!res.ok) throw new Error(`Agi-Suite error: ${res.statusText}`)
    return res.json()
  }

  // Get agents from Agi-Suite
  router.get('/agi-agents', async (_req: Request, res: Response) => {
    try {
      const agents = await fetchAgiSuite('/api/agents')
      res.json({ agents, source: 'agi-suite' })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
  return;
    }
  })

  // Execute tool with Agi-Suite agent
  router.post('/execute-with-agent', async (req: Request, res: Response) => {
    try {
      const { toolId, agentId, parameters } = req.body
      
      const tool = db.prepare('SELECT * FROM tools WHERE id = ?').get(toolId)
      if (!tool) return res.status(404).json({ error: 'Tool not found' })
      
      const execution = await fetchAgiSuite('/api/agents/execute', {
        method: 'POST',
        body: JSON.stringify({ agentId, input: { toolId, parameters } })
      })
      
      res.json({ success: true, execution })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })
}
