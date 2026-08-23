export type UUID = string;

export interface DAGNodeMetadata {
  timeoutMs: number;
  retries: number;
  priority: number;
}

export interface DAGNode {
  id: string;
  type: "compute" | "memory_read" | "memory_write" | "validate" | "agent_task";
  executor: string;
  payload: Record<string, unknown>;
  metadata: DAGNodeMetadata;
}

export interface DAGEdge {
  from: string;
  to: string;
}

export interface DAG {
  id: string;
  name: string;
  version: string;
  nodes: DAGNode[];
  edges: DAGEdge[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  nodes?: DAGNode[];
}

export interface CompilationResult {
  valid: boolean;
  errors: string[];
  stages: string[][];
  executionOrder?: string[];
}

export interface ResolutionResult {
  executionOrder: string[];
  criticalPath: string[];
  resolved: Map<UUID, any>;
}
export interface ResolutionResult {
  executionOrder: string[];
  criticalPath: string[];
  resolved: Map<string, any>;
}
