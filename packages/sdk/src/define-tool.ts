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

export function defineTool<TInput extends Record<string, unknown> = Record<string, unknown>>(
  input: DefineToolInput<TInput>
): ToolDefinition {
  return {
    name: input.name,
    description: input.description,
    inputSchema: input.inputSchema,
    outputSchema: input.outputSchema,
    idempotent: input.idempotent,
    sideEffects: input.sideEffects,
    timeoutMs: input.timeoutMs,
    retryPolicy: input.retryPolicy,
    execute: input.execute as (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>,
  };
}
