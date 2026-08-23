import { ControlPlaneServer } from './api/control-plane.server.js';
import { CommandCenterService } from './service/command-center.service.js';
import { CONTROL_PLANE_CONFIG } from './config/control-plane.config.js';
import { COMMAND_CENTER_CONFIG } from './config/command-center.config.js';

let controlPlaneInstance: ControlPlaneServer | null = null;
let commandCenterInstance: CommandCenterService | null = null;

export { ControlPlaneServer };
export { CommandCenterService };
export { CONTROL_PLANE_CONFIG, COMMAND_CENTER_CONFIG };

export function getControlPlane(): ControlPlaneServer {
  if (!controlPlaneInstance) {
    controlPlaneInstance = new ControlPlaneServer();
  }
  return controlPlaneInstance;
}

export function getCommandCenter(): CommandCenterService {
  if (!commandCenterInstance) {
    commandCenterInstance = new CommandCenterService(COMMAND_CENTER_CONFIG.database.path);
  }
  return commandCenterInstance;
}

export async function initializeControlPlane(app: any) {
  const controlPlane = getControlPlane();

  app.get('/settings/stream', (req: any, res: any) => {
    controlPlane.handleSSE(res);
    res.write(`data: ${JSON.stringify({ status: 'connected', timestamp: Date.now() })}\n\n`);
  });

  app.post('/settings/flag', (req: any, res: any) => {
    const { key, value } = req.body;
    console.log(`[CONTROL-PLANE] Flag update: ${key}=${value}`);
    controlPlane.broadcast({ event: 'settings:flag', key, value });
    res.json({ success: true });
  });

  app.post('/settings/pref', (req: any, res: any) => {
    const { key, value } = req.body;
    console.log(`[CONTROL-PLANE] Pref update: ${key}=${value}`);
    controlPlane.broadcast({ event: 'settings:pref', key, value });
    res.json({ success: true });
  });

  console.log('✓ Control-Plane initialized');
}

export async function initializeCommandCenter(app: any) {
  const commandCenter = getCommandCenter();
  const { createCommandCenterRoutes } = await import('./routes/command-center.routes.js');
  const routes = createCommandCenterRoutes(commandCenter);

  app.use('/api/command-center', routes);

  console.log('✓ Command Center initialized');
  console.log(`  → GET  /api/command-center/runs`);
  console.log(`  → POST /api/command-center/runs`);
  console.log(`  → POST /api/command-center/commands/dispatch`);
  console.log(`  → GET  /api/command-center/events/stream (SSE)`);

  return commandCenter;
}
