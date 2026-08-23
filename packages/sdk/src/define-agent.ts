import type { AgentDefinition, TokenBudgetPolicy, RetryPolicy, ToolDefinition, AdapterConfig } from '@agent-os/core';

export interface DefineAgentInput {
  id: string;
  name: string;
  description?: string;
  version?: string;
  adapter: AdapterConfig;
  tools?: ToolDefinition[];
  systemPrompt?: string;
  tokenBudget?: TokenBudgetPolicy;
  retryPolicy?: RetryPolicy;
  metadata?: Record<string, unknown>;
}

export function defineAgent(input: DefineAgentInput): AgentDefinition {
  const now = new Date();
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    version: input.version ?? '1.0.0',
    adapter: input.adapter,
    tools: input.tools ?? [],
    systemPrompt: input.systemPrompt,
    tokenBudget: input.tokenBudget,
    retryPolicy: input.retryPolicy,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
}
