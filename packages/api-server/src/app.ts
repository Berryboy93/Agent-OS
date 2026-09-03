import express, { type Express } from 'express';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { toolsRouter } from './routers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: Express = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api', toolsRouter);
app.use('/', toolsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[api-server] Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api-server] ✓ Listening on http://0.0.0.0:${PORT}`);
    console.log(`[api-server] ✓ Health: GET http://localhost:${PORT}/health`);
    console.log(`[api-server] ✓ Tools: GET http://localhost:${PORT}/tools`);
  });
}

export { app };
