import { QueryClient } from '@tanstack/react-query';
import { ControlPlaneRouter } from './router';
import { ControlEvent } from './events';
import { eventStore } from '../event-store';

let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isDestroyed = false;

export function initControlPlane(queryClient: QueryClient) {
  if (isDestroyed || eventSource) return;

  const router = new ControlPlaneRouter(queryClient);
  const SSE_URL = import.meta.env.VITE_SSE_URL || 'http://localhost:5001/api/sse';

  eventSource = new EventSource(SSE_URL);

  eventSource.onopen = () => {
    console.log('[ControlPlane] Connected');
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  eventSource.onmessage = (message: MessageEvent) => {
    try {
      const raw = JSON.parse(message.data);
      const controlEvent = normalize(raw);
      if (!controlEvent) return;
      router.handle(controlEvent);
      eventStore.append({
        id: crypto.randomUUID(),
        type: controlEvent.type,
        timestamp: Date.now(),
        runId: (controlEvent as any).runId,
        agentId: (controlEvent as any).agentId,
        deploymentId: (controlEvent as any).deploymentId,
        approvalId: (controlEvent as any).approvalId,
        payload: controlEvent,
      });
    } catch (err) {
      console.warn('control-plane stream error', err);
    }
  };

  eventSource.onerror = () => {
    eventSource?.close();
    eventSource = null;
    if (!isDestroyed && !reconnectTimer) {
      console.warn('[ControlPlane] Disconnected, retrying in 5s...');
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        initControlPlane(queryClient);
      }, 5000);
    }
  };
}

function normalize(raw: any): ControlEvent | null {
  if (!raw || typeof raw.type !== 'string') return null;
  switch (raw.type) {
    case 'run_created': return { type: 'run.started', runId: String(raw.id) };
    case 'run_updated': return { type: 'run.updated', runId: String(raw.id) };
    case 'run_completed': return { type: 'run.completed', runId: String(raw.id) };
    case 'agent_changed': return { type: 'agent.updated', agentId: String(raw.id) };
    case 'approval_changed': return { type: 'approval.updated', approvalId: String(raw.id) };
    case 'deployment_changed': return { type: 'deployment.updated', deploymentId: String(raw.id) };
    case 'system_health': return { type: 'system.health', status: String(raw.status) };
    default: return null;
  }
}
