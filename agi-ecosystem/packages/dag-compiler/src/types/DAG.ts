/**
 * DAG (Directed Acyclic Graph) Core Types
 * Formal model: DAG = (Nodes, Edges)
 */

import type { UUID, Hash, Identifiable, Versioned } from '@agi-ecosystem/shared';

export type NodeType = 
  | 'compute' 
  | 'memory_read' 
  | 'memory_write' 
  | 'validate' 
  | 'agent_task';

export type NodeStatus = 
  | 'pending' 
  | 'compiling' 
  | 'ready' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface DAGNode extends Identifiable {
  type: NodeType;
  name: string;
  executor: string; // Must define executor
  config: Record<string, unknown>;
  status: NodeStatus;
  inputs: Record<string, string>; // port -> source mapping
  outputs: Record<string, string>; // port -> destination mapping
  retryCount: number;
  timeoutMs: number;
  priority: number; // 0-100, higher = more urgent
}

export interface DAGEdge {
  id: UUID;
  sourceNodeId: UUID;
  targetNodeId: UUID;
  sourcePort: string;
  targetPort: string;
  condition?: string; // Conditional edge expression
}

export interface DAG extends Identifiable, Versioned {
  name: string;
  description: string;
  nodes: Map<UUID, DAGNode>;
  edges: DAGEdge[];
  entryPoints: UUID[]; // Nodes with no incoming edges
  exitPoints: UUID[];  // Nodes with no outgoing edges
  hash: Hash; // Deterministic hash of the entire DAG
  compiled: boolean;
  metadata: {
    author: string;
    tags: string[];
    estimatedDurationMs: number;
    maxParallelism: number;
  };
}

export interface CompiledDAG extends DAG {
  executionOrder: UUID[]; // Topologically sorted node IDs
  stages: UUID[][]; // Nodes grouped by execution stage (parallelizable)
  criticalPath: UUID[]; // Longest path = minimum execution time
  compiledAt: number;
  compilerVersion: string;
}

export interface DAGTemplate {
  id: UUID;
  name: string;
  schema: object;
  parameters: ParameterDef[];
}

export interface ParameterDef {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  required: boolean;
  default?: unknown;
  validation?: string; // Zod schema string
}
