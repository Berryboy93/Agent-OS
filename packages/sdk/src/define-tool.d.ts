import type { ToolDefinition, SideEffect, ToolContext, ToolResult, RetryPolicy } from '@agent-os/core';
export interface DefineToolInput<TInput extends Record<string, unknown> = Record<string, unknown>> {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    idempotent: boolean;
    sideEffects: SideEffect[];
    timeoutMs?: number;
    retryPolicy?: RetryPolicy;
    execute: (input: TInput, context: ToolContext) => Promise<ToolResult>;
}
export declare function defineTool<TInput extends Record<string, unknown> = Record<string, unknown>>(input: DefineToolInput<TInput>): ToolDefinition;
//# sourceMappingURL=define-tool.d.ts.map