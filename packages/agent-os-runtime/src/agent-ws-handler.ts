/**
 * apps/r3vibe/src/server/ws/agent-ws-handler.ts  (Stable / R3v4 monorepo)
 *
 * WebSocket handler for real-time agent DSP param injection.
 * Mounts alongside your existing tRPC WS server.
 *
 * Integration in server entry (e.g. server.ts / index.ts):
 *
 *   import { createAgentWSHandler } from './ws/agent-ws-handler';
 *   const wss = new WebSocketServer({ server: httpServer, path: '/ws/agent' });
 *   createAgentWSHandler(wss);
 *
 * Then set in Agi-Suite:
 *   R3V4_WS_URL=ws://localhost:3000/ws/agent
 */
import { WebSocketServer, WebSocket } from 'ws';
import type { AgentWSMessage }        from '@r3/api-types';

const AGENT_TOKEN = process.env.AGENT_SERVICE_TOKEN!;

interface AuthedSocket extends WebSocket {
  agentId?: string;
  authed?:  boolean;
}

// Per-node param change callback — wire this to your DSP engine / VocalSpectra
type DSPParamCallback = (agentId: string, nodeId: string, param: string, value: number) => void;

export function createAgentWSHandler(
  wss: WebSocketServer,
  onDSPParam: DSPParamCallback = defaultDSPParamHandler,
): void {
  wss.on('connection', (ws: any) => { const socket = ws as AuthedSocket;

    // Auth timeout — close unauthenticated sockets after 5s
    const authTimer = setTimeout(() => {
      if (!ws.authed) {
        ws.close(4401, 'Authentication timeout');
      }
    }, 5_000);

    ws.on('message', (raw: any) => {
      let msg: AgentWSMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return; // ignore malformed frames
      }

      // ── Auth handshake ──────────────────────────────────────────────────
      if (msg.type === 'agent:auth') {
        if (msg.token !== AGENT_TOKEN || !msg.agentId) {
          const reply: AgentWSMessage = { type: 'agent:auth:error', error: 'Invalid token or missing agentId' };
          ws.send(JSON.stringify(reply));
          ws.close(4403, 'Forbidden');
          return;
        }

        ws.authed  = true;
        ws.agentId = msg.agentId;
        clearTimeout(authTimer);

        const ack: AgentWSMessage = { type: 'agent:auth:ack', agentId: msg.agentId };
        ws.send(JSON.stringify(ack));
        console.log(`[AgentWS] Agent authenticated: ${msg.agentId}`);
        return;
      }

      // ── All subsequent messages require auth ───────────────────────────
      if (!ws.authed) {
        ws.close(4401, 'Not authenticated');
        return;
      }

      // ── DSP param push ─────────────────────────────────────────────────
      if (msg.type === 'dsp:param') {
        if (
          typeof msg.nodeId === 'string' &&
          typeof msg.param  === 'string' &&
          typeof msg.value  === 'number'
        ) {
          onDSPParam(ws.agentId!, msg.nodeId, msg.param, msg.value);

          // Optional ack (enable only for debugging — adds latency)
          if (process.env.AGENT_WS_ACK === 'true') {
            const ack: AgentWSMessage = { type: 'dsp:param:ack', nodeId: msg.nodeId, param: msg.param };
            ws.send(JSON.stringify(ack));
          }
        }
        return;
      }

      // ── Ping/pong keepalive ────────────────────────────────────────────
      if (msg.type === 'agent:ping') {
        ws.send(JSON.stringify({ type: 'agent:pong' }));
        return;
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimer);
      if (ws.agentId) {
        console.log(`[AgentWS] Agent disconnected: ${ws.agentId}`);
      }
    });

    ws.on('error', (err: any) => {
      console.error(`[AgentWS] Socket error (agentId=${ws.agentId}):`, err.message);
    });
  });

  console.log('[AgentWS] Handler mounted');
}

// ─── Default DSP handler — replace with your real AudioEngine/VocalSpectra call ──

function defaultDSPParamHandler(
  agentId: string,
  nodeId:  string,
  param:   string,
  value:   number,
): void {
  // TODO: wire to your AudioEngine or VocalSpectra DSP node registry
  // Example: AudioEngine.setNodeParam(nodeId, param, value);
  console.log(`[AgentWS] DSP param from ${agentId}: node=${nodeId} ${param}=${value}`);
}
