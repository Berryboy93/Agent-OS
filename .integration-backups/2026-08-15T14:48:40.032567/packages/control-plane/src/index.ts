import { ControlPlaneServer } from './api/control-plane.server.js';
import { CONTROL_PLANE_CONFIG } from './config/control-plane.config.js';

export const controlPlane = new ControlPlaneServer();

export async function initializeControlPlane(app: any) {
  // SSE endpoint for settings stream
  app.get('/settings/stream', (req: any, res: any) => {
    controlPlane.handleSSE(res);
    res.write(`data: ${JSON.stringify({ status: 'connected', timestamp: Date.now() })}\n\n`);
  });

  // Settings flag update
  app.post('/settings/flag', (req: any, res: any) => {
    const { key, value } = req.body;
    console.log(`[CONTROL-PLANE] Flag update: ${key}=${value}`);
    res.json({ success: true });
  });

  // Settings preference update
  app.post('/settings/pref', (req: any, res: any) => {
    const { key, value } = req.body;
    console.log(`[CONTROL-PLANE] Pref update: ${key}=${value}`);
    res.json({ success: true });
  });

  // RBAC endpoints
  app.get('/rbac/roles', (req: any, res: any) => {
    res.json(controlPlane.getRoles());
  });

  app.get('/rbac/policies', (req: any, res: any) => {
    res.json(controlPlane.getPolicies());
  });

  console.log('✓ Control-Plane initialized');
}
