export function definePipeline(input) {
    return {
        id: input.id,
        name: input.name,
        version: input.version ?? '1.0.0',
        description: input.description,
        steps: input.steps,
        metadata: input.metadata ?? {},
    };
}
//# sourceMappingURL=define-pipeline.js.map