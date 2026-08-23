export function defineTool(input) {
    return {
        name: input.name,
        description: input.description,
        inputSchema: input.inputSchema,
        outputSchema: input.outputSchema,
        idempotent: input.idempotent,
        sideEffects: input.sideEffects,
        timeoutMs: input.timeoutMs,
        retryPolicy: input.retryPolicy,
        execute: input.execute,
    };
}
//# sourceMappingURL=define-tool.js.map