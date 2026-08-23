/**
 * runner/handlers/index.ts  (Agi-Suite)
 * Handler registry — maps agent type → handler function.
 */

import type { AgentPayload, AgentResult } from "@r3/api-types";

export type AgentHandler = (payload: AgentPayload) => Promise<AgentResult>;

import { troubleshootHandler } from "./troubleshoot";
import { mixHandler } from "./mix";
import { vocalSpectraHandler } from "./vocal-spectra";
import { styleDeltaHandler } from "./style-delta";

const REGISTRY: Partial<Record<string, AgentHandler>> = {
  troubleshoot: troubleshootHandler as AgentHandler,
  mix: mixHandler as AgentHandler,
  "vocal-spectra": vocalSpectraHandler as AgentHandler,
  "style-delta": styleDeltaHandler as AgentHandler,
};

export function resolveAgentHandler(type: string): AgentHandler | null {
  return REGISTRY[type] ?? null;
}
