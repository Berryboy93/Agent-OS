export function defineAgent(input) {
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
//# sourceMappingURL=define-agent.js.map