/**
 * server/ws-agent.ts  (R3v4 / Stable)
 *
 * WebSocket server at /ws/agent.
 * AgentBridge connects here to push real-time DSP parameter updates
 * directly to the audio engine — bypassing tRPC for sub-ms latency.
 *
 * Mount in your Express server:
 *   import { mountAgentWS } from "./ws-agent";
 *   const server = app.listen(PORT, () => mountAgentWS(server));
 */

import { IncomingMessage, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { WsAgentMessage, DSPParamUpdate } from "@r3/api-types";

const AGENT_TOKEN = process.env.AGENT_SERVICE_TOKEN!;

// ─── Active DSP subscribers (trackId → Set<WebSocket>) ────────────────────────
// Frontend audio worklet clients subscribe to receive DSP updates.
const dspSubscribers = new Map<string, Set<WebSocket>>();

export function mountAgentWS(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/agent" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    // ── Auth ────────────────────────────────────────────────────────────────
    const url = new URL(req.url ?? "/", "http://localhost");
    const token = url.searchParams.get("token");

    if (!token || token !== AGENT_TOKEN) {
      ws.close(4001, "Unauthorized");
      return;
    }

    console.log("[ws/agent] AgentBridge connected");

    // ── Heartbeat tracking ──────────────────────────────────────────────────
    let isAlive = true;
    const pingInterval = setInterval(() => {
      if (!isAlive) {
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, 10_000); // 10s heartbeat matches agent-bridge.ts

    ws.on("pong", () => { isAlive = true; });

    // ── Message handler ─────────────────────────────────────────────────────
    ws.on("message", (raw) => {
      let msg: WsAgentMessage;
      try {
        msg = JSON.parse(raw.toString()) as WsAgentMessage;
      } catch {
        ws.send(JSON.stringify({ type: "error", payload: { message: "Invalid JSON" }, ts: Date.now() }));
        return;
      }

      switch (msg.type) {
        case "dsp_update": {
          const update = msg.payload as DSPParamUpdate;
          handleDSPUpdate(update);
          break;
        }
        case "heartbeat": {
          const pong: WsAgentMessage = { type: "heartbeat", ts: Date.now() };
          ws.send(JSON.stringify(pong));
          break;
        }
        default:
          console.warn(`[ws/agent] Unknown message type: ${msg.type}`);
      }
    });

    ws.on("close", () => {
      clearInterval(pingInterval);
      console.log("[ws/agent] AgentBridge disconnected");
    });

    ws.on("error", (err) => {
      console.error("[ws/agent] Error:", err.message);
      clearInterval(pingInterval);
    });
  });

  console.log("[ws/agent] WebSocket server mounted at /ws/agent");
}

// ─── DSP Update handler ────────────────────────────────────────────────────────

function handleDSPUpdate(update: DSPParamUpdate): void {
  console.log(
    `[ws/agent] DSP update — track=${update.trackId} param=${update.paramType} ts=${update.timestamp}`
  );

  // TODO: wire to your AudioWorklet param port
  // AudioWorklet runs in the browser, so this server-side handler should:
  //   1. Push update to any connected browser clients via a second WS (or SSE)
  //   2. OR store in a session state map that the browser polls
  //
  // Example pattern for forwarding to browser clients:
  const subscribers = dspSubscribers.get(update.trackId);
  if (subscribers) {
    const outbound = JSON.stringify({
      type: "dsp_update",
      payload: update,
      ts: Date.now(),
    } satisfies WsAgentMessage);

    for (const client of subscribers) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(outbound);
      }
    }
  }
}

// ─── Browser client subscription (called from your frontend WS setup) ─────────

export function subscribeTrackDSP(trackId: string, ws: WebSocket): void {
  if (!dspSubscribers.has(trackId)) {
    dspSubscribers.set(trackId, new Set());
  }
  dspSubscribers.get(trackId)!.add(ws);

  ws.on("close", () => {
    dspSubscribers.get(trackId)?.delete(ws);
  });
}
