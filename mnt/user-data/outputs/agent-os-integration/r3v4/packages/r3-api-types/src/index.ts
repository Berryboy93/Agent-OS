/**
 * @r3/api-types
 * Type-only package shared between R3v4 (Stable) and Agi-Suite.
 * NO runtime imports. NO side effects. Pure TypeScript types only.
 */

// ─── Agent Types ───────────────────────────────────────────────────────────────

export type AgentType =
  | "troubleshoot"
  | "mix"
  | "vocal-spectra"
  | "style-delta";

export type AgentStatus =
  | "pending"
  | "claimed"
  | "running"
  | "done"
  | "failed";

// ─── Payloads (Agent-OS → Agi-Suite) ──────────────────────────────────────────

export interface TroubleshootPayload {
  sessionId: string;
  symptoms: string[];
  diagnosticDepth?: "shallow" | "deep";
}

export interface MixPayload {
  sessionId: string;
  trackIds: string[];
  targetLUFS?: number;
  genre?: string;
}

export interface VocalSpectraPayload {
  sessionId: string;
  trackId: string;
  analysisMode?: "realtime" | "offline";
}

export interface StyleDeltaPayload {
  sessionId: string;
  referenceTrackId: string;
  targetTrackId: string;
}

export type AgentPayload =
  | ({ type: "troubleshoot" } & TroubleshootPayload)
  | ({ type: "mix" } & MixPayload)
  | ({ type: "vocal-spectra" } & VocalSpectraPayload)
  | ({ type: "style-delta" } & StyleDeltaPayload);

// ─── Results (Agi-Suite → R3v4 via AgentBridge) ───────────────────────────────

export interface TroubleshootResult {
  issues: Array<{ code: string; message: string; severity: "low" | "medium" | "high" }>;
  suggestedFixes: string[];
}

export interface MixResult {
  decisions: Array<{
    trackId: string;
    gainDb: number;
    panPercent: number;
    eqBands?: Array<{ freq: number; gainDb: number; q: number }>;
  }>;
  masterLUFS: number;
}

export interface VocalSpectraResult {
  fundamentalHz: number;
  formants: number[];
  pitchConfidence: number;
  config: VocalSpectraDSPConfig;
}

export interface StyleDeltaResult {
  energyDelta: number;
  spectralDelta: number;
  suggestedBPMShift: number;
}

export type AgentResult =
  | ({ type: "troubleshoot" } & TroubleshootResult)
  | ({ type: "mix" } & MixResult)
  | ({ type: "vocal-spectra" } & VocalSpectraResult)
  | ({ type: "style-delta" } & StyleDeltaResult);

// ─── DSP Params (real-time WebSocket channel, sub-ms) ─────────────────────────

export interface VocalSpectraDSPConfig {
  windowSize: 256 | 512 | 1024 | 2048;
  hopSize: number;
  smoothingCoeff: number;
  pitchAlgorithm: "YIN" | "CREPE" | "PYIN";
}

export interface DSPParamUpdate {
  sessionId: string;
  trackId: string;
  paramType: "vocalSpectraConfig" | "mixGain" | "eqBand";
  value: VocalSpectraDSPConfig | number | { freq: number; gainDb: number; q: number };
  timestamp: number; // performance.now() equivalent, ms
}

// ─── WebSocket Message Envelopes (/ws/agent) ──────────────────────────────────

export interface WsAgentMessage {
  type: "dsp_update" | "heartbeat" | "agent_result" | "error";
  agentId?: string;
  payload?: DSPParamUpdate | AgentResult | { message: string };
  ts: number;
}

// ─── tRPC Agent Router Input/Output shapes ────────────────────────────────────

export interface RegisterAgentInput {
  type: AgentType;
  payload: Omit<AgentPayload, "type">;
  idempotencyKey?: string; // optional — prevents duplicate dispatches
}

export interface RegisterAgentOutput {
  agentId: string;
  status: AgentStatus;
  queuedAt: string; // ISO-8601
}

export interface AgentStatusOutput {
  agentId: string;
  status: AgentStatus;
  result?: AgentResult;
  error?: string;
  createdAt: string;
  completedAt?: string;
}
