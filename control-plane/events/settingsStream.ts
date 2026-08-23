import express from 'express';
import { runtimeStore } from '../store/runtimeStore';

const clients = new Set<any>();

export const settingsStreamRouter = express.Router();

settingsStreamRouter.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders?.();

  clients.add(res);

  res.write(`data: ${JSON.stringify(runtimeStore)}\n\n`);

  req.on('close', () => {
    clients.delete(res);
  });
});

// heartbeat (prevents proxy kill)
setInterval(() => {
  for (const c of clients) {
    c.write(': heartbeat\n\n');
  }
}, 25000);

export function broadcastSettingsUpdate() {
  for (const c of clients) {
    c.write(`data: ${JSON.stringify(runtimeStore)}\n\n`);
  }
}
