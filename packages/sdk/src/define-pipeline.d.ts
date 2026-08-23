import type { PipelineDefinition, PipelineStep } from '@agent-os/core';
export interface DefinePipelineInput {
    id: string;
    name: string;
    version?: string;
    description?: string;
    steps: PipelineStep[];
    metadata?: Record<string, unknown>;
}
export declare function definePipeline(input: DefinePipelineInput): PipelineDefinition;
//# sourceMappingURL=define-pipeline.d.ts.map