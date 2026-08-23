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
export declare function defineAgent(input: DefineAgentInput): AgentDefinition;
//# sourceMappingURL=define-agent.d.ts.map