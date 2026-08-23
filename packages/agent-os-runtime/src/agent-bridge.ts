/**
 * apps/agent-runner/src/agent-bridge.ts  (Agi-Suite monorepo)
 *
 * The sole injection layer between Agi-Suite agents and R3v4.
 * Agents must NEVER touch R3v4's DB directly — everything goes through here.
 *
 * Fixes applied vs. v1:
 *   ✅ httpLink (not httpBatchLink) — correct for service-to-service
 *   ✅ Buffered agentActions writes — one INSERT at flush(), not one per call
 *   ✅ Heartbeat — updates agents.lastHeartbeat every 10s
 *   ✅ WebSocket channel — sub-millisecond DSP param injection
 *   ✅ WS auth handshake + reconnect logic
 *   ✅ destroy() for clean thread teardown
 */
import { createTRPCClient, httpLink } from '@trpc/client';
import { WebSocket }                  from 'ws';
import { eq }                         from 'drizzle-orm';
import { db }                         from '@agi-suite/db';
import { agents, agentActions }       from '@agi-suite/db/schema/agents';
import type { NewAgentAction }        from '@agi-suite/db/schema/agents';
import type { AppRouter }             from '@r3/api-types';
import type {
  AgentDecisionPayload,
  MixSuggestionPayload,
  DiagnosticsIngestPayload,
  VocalSpectraNodeConfig,
  AgentWSMessage,
} from '@r3/api-types';

// ─── Config ───────────────────────────────────────────────────────────────

const R3_TRPC_URL     = process.env.R3V4_TRPC_URL!;
const R3_WS_URL       = process.env.R3V4_WS_URL!;
const AGENT_TOKEN     = process.env.AGENT_SERVICE_TOKEN!;
const HEARTBEAT_MS    = 10_000;
const WS_RECONNECT_MS = 3_000;

interface BridgeConfig {
  agentId:   string;
  sessionId: string | null;
  projectId: string | null;
  ownerId:   string;
}

// ─── AgentBridge ──────────────────────────────────────────────────────────

export class AgentBridge {
  private r3:              ReturnType<typeof createTRPCClient<AppRouter>>;
  private ws:              WebSocket | null = null;
  private wsReady:         boolean = false;
  private wsReconnecting:  boolean = false;
  private heartbeatTimer:  ReturnType<typeof setInterval> | null = null;
  private pendingActions:  NewAgentAction[] = [];
  private destroyed:       boolean = false;

  readonly config: BridgeConfig;

  constructor(config: BridgeConfig) {
    this.config = config;

    // ✅ httpLink — no batching for service-to-service sequential calls
    this.r3 = createTRPCClient<AppRouter>({
      links: [
        httpLink({
          url: R3_TRPC_URL,
          headers: () => ({
            'x-agent-token': AGENT_TOKEN,
            'x-agent-id':    config.agentId,
          }),
        }),
      ],
    });

    // ✅ Start heartbeat immediately
    this.startHeartbeat();
  }

  // ─── Real-time WebSocket (DSP agents) ──────────────────────────────────

  async connectRealtime(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(R3_WS_URL);

      const authTimeout = setTimeout(() => {
        reject(new Error('WS auth handshake timed out'));
      }, 5_000);

      this.ws.on('open', () => {
        const authMsg: AgentWSMessage = {
          type:    'agent:auth',
          agentId: this.config.agentId,
          token:   AGENT_TOKEN,
        };
        this.ws!.send(JSON.stringify(authMsg));
      });

      this.ws.on('message', (raw: any) => {
        try {
          const msg: AgentWSMessage = JSON.parse(raw.toString());

          if (msg.type === 'agent:auth:ack') {
            clearTimeout(authTimeout);
            this.wsReady = true;
            console.log(`[AgentBridge] WS authenticated for agent ${this.config.agentId}`);
            resolve();

          } else if (msg.type === 'agent:auth:error') {
            clearTimeout(authTimeout);
            reject(new Error(`WS auth rejected: ${msg.error}`));
          }
        } catch { /* ignore non-JSON frames */ }
      });

      this.ws.on('error', (err: any) => {
        if (!this.wsReady) { clearTimeout(authTimeout); reject(err); }
        else { this.scheduleWsReconnect(); }
      });

      this.ws.on('close', () => {
        this.wsReady = false;
        if (!this.destroyed) this.scheduleWsReconnect();
      });
    });
  }

  private scheduleWsReconnect(): void {
    if (this.wsReconnecting || this.destroyed) return;
    this.wsReconnecting = true;
    setTimeout(async () => {
      this.wsReconnecting = false;
      await this.connectRealtime().catch((err) =>
        console.error('[AgentBridge] WS reconnect failed:', err)
      );
    }, WS_RECONNECT_MS);
  }

  // ─── Heartbeat ─────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      if (this.destroyed) return;
      await db.update(agents)
        .set({ lastHeartbeat: new Date() })
        .where(eq(agents.id, this.config.agentId))
        .catch((err) => console.warn('[AgentBridge] Heartbeat write failed:', err));
    }, HEARTBEAT_MS);
  }

  // ─── Buffer helpers ────────────────────────────────────────────────────

  private enqueue(actionType: string, payload: Record<string, unknown>): void {
    this.pendingActions.push({
      agentId:    this.config.agentId,
      actionType,
      payload,
      status:     'pending',
    });
  }

  // Flush all buffered agentActions in a single INSERT
  async flush(): Promise<void> {
    if (this.pendingActions.length === 0) return;
    const toWrite = [...this.pendingActions];
    this.pendingActions = [];
    await db.insert(agentActions).values(toWrite);
  }

  // ─── R3v4 Injection Methods ────────────────────────────────────────────

  /**
   * Log an AI decision into R3v4's aiDecisionLog.
   * Counts toward the ≥65% acceptance-rate valuation gate.
   * Audit record is buffered — call flush() at end of handler.
   */
  async logDecision(params: Omit<AgentDecisionPayload, 'sessionId' | 'agentSource'>): Promise<void> {
    this.requireSession('logDecision');
    this.enqueue('logDecision', params);

    // Fire-and-forget to R3v4 — do NOT await here to avoid blocking the handler
    this.r3.sessionMetrics.recordDecision.mutate({
      sessionId:    this.config.sessionId!,
      agentSource:  `agi-suite:${this.config.agentId}`,
      ...params,
    }).catch((err) => console.error('[AgentBridge] logDecision R3 write failed:', err));
  }

  /**
   * Record an outcome for a previously logged decision.
   */
  async recordOutcome(params: {
    decisionId: string;
    accepted:   boolean;
    feedback?:  string;
  }): Promise<void> {
    this.enqueue('recordOutcome', params);
    this.r3.sessionMetrics.recordOutcome.mutate(params)
      .catch((err) => console.error('[AgentBridge] recordOutcome R3 write failed:', err));
  }

  /**
   * Apply a mix parameter suggestion to a track in R3v4.
   */
  async applyMixSuggestion(
    params: Omit<MixSuggestionPayload, 'sessionId' | 'agentSource'>
  ): Promise<void> {
    this.requireSession('applyMixSuggestion');
    this.enqueue('mixSuggestion', params);
    await this.r3.mixSuggestions.apply.mutate({
      sessionId:   this.config.sessionId!,
      agentSource: `agi-suite:${this.config.agentId}`,
      ...params,
    });
  }

  /**
   * Push troubleshooting findings into R3v4's diagnostic store.
   * Accepts both null sessionId (project-scoped) and null projectId (session-scoped).
   */
  async reportTroubleshooting(
    findings: DiagnosticsIngestPayload['findings']
  ): Promise<void> {
    this.enqueue('diagnostic', { findings });
    await this.r3.diagnostics.ingestAgentFindings.mutate({
      sessionId: this.config.sessionId,
      projectId: this.config.projectId,
      agentId:   this.config.agentId,
      findings,
    });
  }

  /**
   * Configure a VocalSpectra DSP edge node via tRPC.
   * Use pushDSPParam() instead for real-time continuous control.
   */
  async configureVocalSpectraNode(
    params: Omit<VocalSpectraNodeConfig, 'agentSource'>
  ): Promise<void> {
    this.enqueue('vocalSpectraConfig', params);
    await this.r3.vocalSpectra.configureNode.mutate({
      ...params,
      agentSource: `agi-suite:${this.config.agentId}`,
    });
  }

  /**
   * Push a DSP parameter change over WebSocket.
   * Fire-and-forget — sub-millisecond, does NOT wait for ack.
   * Use for continuous knob automation, not one-shot config changes.
   */
  pushDSPParam(nodeId: string, param: string, value: number): void {
    if (!this.wsReady || !this.ws) {
      console.warn('[AgentBridge] pushDSPParam called before WS ready, dropping');
      return;
    }
    const msg: AgentWSMessage = { type: 'dsp:param', agentId: this.config.agentId, nodeId, param, value };
    this.ws.send(JSON.stringify(msg));
    // Lightweight buffer entry — no await, no DB round-trip
    this.enqueue('dspParam', { nodeId, param, value });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  destroy(): void {
    this.destroyed = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.ws) { this.ws.terminate(); this.ws = null; }
  }

  // ─── Guards ────────────────────────────────────────────────────────────

  private requireSession(method: string): void {
    if (!this.config.sessionId) {
      throw new Error(`AgentBridge.${method} requires a sessionId`);
    }
  }
}
