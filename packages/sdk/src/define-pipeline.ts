import type { PipelineDefinition, PipelineStep } from '@agent-os/core';

export interface DefinePipelineInput {
  id: string;
  name: string;
  version?: string;
  description?: string;
  steps: PipelineStep[];
  metadata?: Record<string, unknown>;
}

export function definePipeline(input: DefinePipelineInput): PipelineDefinition {
  return {
    id: input.id,
    name: input.name,
    version: input.version ?? '1.0.0',
    description: input.description,
    steps: input.steps,
    metadata: input.metadata ?? {},
  };
}
