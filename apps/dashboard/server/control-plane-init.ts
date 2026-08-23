import { initializeControlPlane } from '@agent-os/control-plane';
import type { Express } from 'express';

export async function wireControlPlane(app: Express) {
  try {
    await initializeControlPlane(app);
    console.log('[WIRING] Control-Plane connected');
  } catch (error) {
    console.error('[WIRING] Control-Plane failed:', error);
  }
}
