import express from 'express';
import { runtimeStore } from '../store/runtimeStore';
import { SnapshotStore } from '../store/snapshotStore';
import { AuditLog } from '../audit/auditLog';
import { broadcastSettingsUpdate } from '../events/settingsStream';
import { randomUUID } from 'crypto';

export const settingsRouter = express.Router();

function validateFlag(key: string) {
  return key in runtimeStore.flags;
}

function validatePref(key: string) {
  return key in runtimeStore.prefs;
}

settingsRouter.get('/', (_req, res) => {
  res.json(runtimeStore);
});

settingsRouter.post('/flag', (req, res) => {
  const { key, value } = req.body;

  if (!validateFlag(key)) return res.status(400).json({ error: 'Invalid flag' });

  runtimeStore.flags[key] = value;

  AuditLog.record('flag', key, value);
  SnapshotStore.create(randomUUID(), runtimeStore);

  broadcastSettingsUpdate();

  res.json(runtimeStore.flags);
});

settingsRouter.post('/pref', (req, res) => {
  const { key, value } = req.body;

  if (!validatePref(key)) return res.status(400).json({ error: 'Invalid pref' });

  runtimeStore.prefs[key] = value;

  AuditLog.record('pref', key, value);
  SnapshotStore.create(randomUUID(), runtimeStore);

  broadcastSettingsUpdate();

  res.json(runtimeStore.prefs);
});

// RBAC-GUARDED KILL SWITCH
settingsRouter.post('/kill', (req, res) => {
  if (req.headers['x-role'] !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  runtimeStore.flags.killAllAgents = true;

  AuditLog.record('kill', 'killAllAgents', true);
  SnapshotStore.create(randomUUID(), runtimeStore);

  broadcastSettingsUpdate();

  res.json({ ok: true });
});
