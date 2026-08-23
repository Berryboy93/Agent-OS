import type { AgentEvent, TokenUsage, ToolDefinition } from '@agent-os/core';

export interface AgentContext {
  runId: string;
  agentId: string;
  correlationId: string;
  turnNumber: number;
  tokenUsage: TokenUsage;
  memory: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
    delete: (key: string) => void;
  };
  tools: ToolDefinition[];
  emit: (event: Omit<AgentEvent, 'sequenceNumber'>) => void;
}
