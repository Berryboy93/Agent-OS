import express from 'express';
import { createServer } from 'http';
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5001;
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
});
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// API routes (to be implemented)
app.get('/api/agents', (req, res) => {
    res.json({ agents: [], count: 0 });
});
app.get('/api/tasks', (req, res) => {
    res.json({ tasks: [], count: 0 });
});
// SSE endpoint for real-time updates
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n');
    const heartbeat = setInterval(() => {
        res.write(':\n');
    }, 30000);
    req.on('close', () => {
        clearInterval(heartbeat);
        res.end();
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});
// Start server
httpServer.listen(PORT, () => {
    console.log(`Agent-OS backend listening on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`API: http://localhost:${PORT}/api`);
    console.log(`Events: http://localhost:${PORT}/api/events`);
});
export default httpServer;
//# sourceMappingURL=index.js.map