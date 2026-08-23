/**
 * apps/agent-runner/src/handlers/index.ts  (Agi-Suite monorepo)
 *
 * Central handler registry.
 * Add new agent types here — the worker and sandbox pick them up automatically.
 */
import type { AgentBridge } from '../agent-bridge';
import { TroubleshootHandler } from './troubleshoot';
import { MixHandler }          from './mix';
import { VocalSpectraHandler } from './vocal-spectra';
import { StyleDeltaHandler }   from './style-delta';

export interface AgentHandler {
  execute(config: Record<string, unknown>, bridge: AgentBridge): Promise<void>;
}

const REGISTRY: Record<string, AgentHandler> = {
  'troubleshoot':  TroubleshootHandler,
  'mix':           MixHandler,
  'vocal-spectra': VocalSpectraHandler,
  'style-delta':   StyleDeltaHandler,
  // Register custom agents at runtime via registerHandler()
};

export function resolveAgentHandler(type: string): AgentHandler {
  const h = REGISTRY[type];
  if (!h) throw new Error(`No handler registered for agent type: "${type}". Check REGISTRY in handlers/index.ts`);
  return h;
}

// Allow dynamic registration for 'custom' agent types loaded from config
export function registerHandler(type: string, handler: AgentHandler): void {
  if (REGISTRY[type]) {
    console.warn(`[HandlerRegistry] Overwriting existing handler for type: ${type}`);
  }
  REGISTRY[type] = handler;
}
