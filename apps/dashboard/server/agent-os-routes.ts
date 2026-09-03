import express from 'express'
import path from 'path'
import os from 'os'
import { mkdirSync, existsSync } from 'fs'
import Database from 'better-sqlite3'

import type { Router as ExpressRouter } from 'express';

const router: ExpressRouter = express.Router();

// ── Database Setup ──────────────────────────────────
const dbPath = process.env.AGENT_OS_DB_PATH
  ? path.resolve(process.env.AGENT_OS_DB_PATH.replace('~/', os.homedir() + '/'))
  : path.join(os.homedir(), 'Agent-OS', 'agent-os.db')

// Ensure directory exists before opening database
const dbDir = path.dirname(dbPath)
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

// ── Schema Init ─────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    command TEXT NOT NULL,
    args JSON,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id)
  );
`)

// ── Health ──────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', database: 'connected' })
})

// ── Runs ─────────────────────────────────────────────
router.get('/runs', (_req, res) => {
  try {
    const runs = db.prepare('SELECT * FROM runs ORDER BY created_at DESC').all()
    res.json(runs)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/runs', (req, res) => {
  try {
    const { agent_id } = req.body
    if (!agent_id) return res.status(400).json({ error: 'agent_id required' })
    
    const result = db.prepare('INSERT INTO runs (agent_id) VALUES (?)').run(agent_id)
    res.status(201).json({ id: result.lastInsertRowid, agent_id, status: 'pending' })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ── Commands ─────────────────────────────────────────
router.post('/runs/:runId/commands', (req, res) => {
  try {
    const { runId } = req.params
    const { command, args } = req.body
    if (!command) return res.status(400).json({ error: 'command required' })
    
    const result = db.prepare('INSERT INTO commands (run_id, command, args) VALUES (?, ?, ?)').run(
      runId,
      command,
      JSON.stringify(args || {})
    )
    res.status(201).json({ id: result.lastInsertRowid, runId, command, status: 'pending' })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
