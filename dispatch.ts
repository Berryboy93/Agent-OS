/**
 * agent-os/dispatch.ts
 *
 * HTTP client for Agent-OS → Agi-Suite agent dispatch.
 * Uses plain fetch (REST) — Agi-Suite is Express-only, no tRPC.
 *
 * Agi-Suite endpoints:
 *   POST /api/agents/register    → RegisterAgentOutput
 *   GET  /api/agents/:id/status  → AgentStatusOutput
 *
 * Usage:
 *   const { agentId } = await dispatch({ type: "troubleshoot", payload: { ... } });
 *   const result = await pollUntilDone(agentId);
 */

import type {
  RegisterAgentInput,
  RegisterAgentOutput,
  AgentStatusOutput,
  AgentResult,
} from "@r3/api-types";

// ── Config ────────────────────────────────────────────────────────────────────

const AGI_SUITE_URL = process.env.AGI_SUITE_URL ?? "http://localhost:3001";
const AGENT_TOKEN   = process.env.AGENT_SERVICE_TOKEN;

if (!AGENT_TOKEN) {
  throw new Error(
    "[dispatch] AGENT_SERVICE_TOKEN is not set in Agent-OS .env\n" +
    "It must match the token in Agi-Suite .env and R3v4 .env"
  );
}

const HEADERS = {
  "Content-Type": "application/json",
  "x-agent-token": AGENT_TOKEN,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function agiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AGI_SUITE_URL}${path}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[dispatch] POST ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function agiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${AGI_SUITE_URL}${path}`, {
    method: "GET",
    headers: HEADERS,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[dispatch] GET ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── dispatch ──────────────────────────────────────────────────────────────────

export async function dispatch(
  input: RegisterAgentInput
): Promise<RegisterAgentOutput> {
  return agiPost<RegisterAgentOutput>("/api/agents/register", input);
}

// ── pollUntilDone ─────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2_000;
const MAX_WAIT_MS      = 5 * 60 * 1_000;

export async function pollUntilDone(agentId: string): Promise<AgentResult> {
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    const status = await agiGet<AgentStatusOutput>(
      `/api/agents/${agentId}/status`
    );

    if (status.status === "done") {
      if (!status.result) {
        throw new Error(`[dispatch] Agent ${agentId} completed but returned no result`);
      }
      return status.result;
    }

    if (status.status === "failed") {
      throw new Error(`[dispatch] Agent ${agentId} failed: ${status.error}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`[dispatch] Agent ${agentId} timed out after ${MAX_WAIT_MS / 1000}s`);
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export async function dispatchTroubleshoot(
  sessionId: string,
  symptoms: string[],
  opts?: { depth?: "shallow" | "deep"; idempotencyKey?: string }
): Promise<RegisterAgentOutput> {
  return dispatch({
    type: "troubleshoot",
    payload: { sessionId, symptoms, diagnosticDepth: opts?.depth },
    idempotencyKey: opts?.idempotencyKey,
  });
}

export async function dispatchMix(
  sessionId: string,
  trackIds: string[],
  opts?: { targetLUFS?: number; genre?: string; idempotencyKey?: string }
): Promise<RegisterAgentOutput> {
  return dispatch({
    type: "mix",
    payload: { sessionId, trackIds, targetLUFS: opts?.targetLUFS, genre: opts?.genre },
    idempotencyKey: opts?.idempotencyKey,
  });
}

export async function dispatchVocalSpectra(
  sessionId: string,
  trackId: string,
  opts?: { analysisMode?: "realtime" | "offline"; idempotencyKey?: string }
): Promise<RegisterAgentOutput> {
  return dispatch({
    type: "vocal-spectra",
    payload: { sessionId, trackId, analysisMode: opts?.analysisMode },
    idempotencyKey: opts?.idempotencyKey,
  });
}

export async function dispatchStyleDelta(
  sessionId: string,
  referenceTrackId: string,
  targetTrackId: string,
  opts?: { idempotencyKey?: string }
): Promise<RegisterAgentOutput> {
  return dispatch({
    type: "style-delta",
    payload: { sessionId, referenceTrackId, targetTrackId },
    idempotencyKey: opts?.idempotencyKey,
  });
}

// ── Util ──────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
