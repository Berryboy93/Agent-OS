/**
 * @r3/api-types
 *
 * Shared type-only package bridging Stable (R3v4) and Agi-Suite monorepos.
 * Contains ZERO runtime code — only TypeScript type exports.
 * Import with `import type` exclusively.
 *
 * Placement: ~/Stable/packages/r3-api-types/src/index.ts
 * Linked in Agi-Suite via pnpm-workspace.yaml catalog entry.
 */

// ─── AppRouter (re-exported from R3v4 server) ─────────────────────────────
// The actual AppRouter type lives in R3v4. This package re-exports it
// so Agi-Suite can type the tRPC client without a runtime cross-monorepo dep.
//
// To keep this in sync: whenever you add/modify a router in R3v4,
// bump the version and rebuild: pnpm --filter @r3/api-types build

export type { AppRouter } from './router-type';

// ─── Shared DTOs (used by both monorepos) ─────────────────────────────────

export type AgentFindingSeverity = 'info' | 'warn' | 'error' | 'critical';

export interface AgentFinding {
  severity:   AgentFindingSeverity;
  category:   string;
  message:    string;
  fix?:       string;
  autoApply?: boolean;
}

export interface AgentDecisionPayload {
  sessionId:    string;
  decisionType: string;
  confidence:   number;     // 0–1
  rationale:    string;
  agentSource:  string;     // e.g. "agi-suite:<agentId>"
  metadata:     Record<string, unknown>;
}

export interface MixSuggestionPayload {
  sessionId:   string;
  trackId:     string;
  parameter:   string;
  value:       number;
  confidence:  number;
  agentSource: string;
}

export interface VocalSpectraNodeConfig {
  nodeId:      string;
  settings:    Record<string, unknown>;
  agentSource: string;
}

export interface DiagnosticsIngestPayload {
  sessionId: string | null;
  projectId: string | null;
  agentId:   string;
  findings:  AgentFinding[];
}

// ─── WebSocket message types (agent ↔ R3v4 WS bus) ───────────────────────

export type AgentWSMessageType =
  | 'agent:auth'
  | 'agent:auth:ack'
  | 'agent:auth:error'
  | 'dsp:param'
  | 'dsp:param:ack'
  | 'agent:ping'
  | 'agent:pong';

export interface AgentWSMessage {
  type:     AgentWSMessageType;
  agentId?: string;
  token?:   string;
  nodeId?:  string;
  param?:   string;
  value?:   number;
  error?:   string;
}
