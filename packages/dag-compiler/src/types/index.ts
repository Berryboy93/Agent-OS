import { z } from 'zod';

export const NodeType = z.enum([
  'compute',
  'memory_read', 
  'memory_write',
  'validate',
  'agent_task'
]);
export type NodeType = z.infer<typeof NodeType>;

export const DAGNode = z.object({
  id: z.string().uuid(),
  type: NodeType,
  executor: z.string().min(1),
  payload: z.record(z.any()).default({}),
  metadata: z.object({
    priority: z.number().int().min(0).max(100).default(50),
    timeout_ms: z.number().int().positive().default(30000),
    retry_policy: z.object({
      max_retries: z.number().int().min(0).default(3),
      backoff_ms: z.number().int().positive().default(1000)
    }).default({})
  }).default({})
});
export type DAGNode = z.infer<typeof DAGNode>;

export const DAGEdge = z.object({
  from: z.string().uuid(),
  to: z.string().uuid(),
  condition: z.string().optional() // optional conditional edge
});
export type DAGEdge = z.infer<typeof DAGEdge>;

export const DAG = z.object({
  id: z.string().uuid(),
  version: z.string().default('2.0.0'),
  nodes: z.array(DAGNode).min(1),
  edges: z.array(DAGEdge).default([]),
  entrypoint: z.string().uuid(),
  metadata: z.object({
    created_at: z.string().datetime().default(() => new Date().toISOString()),
    author: z.string().optional(),
    tags: z.array(z.string()).default([])
  }).default({})
});
export type DAG = z.infer<typeof DAG>;

export const ExecutionPlan = z.object({
  dag_id: z.string().uuid(),
  stages: z.array(z.array(z.string().uuid())), // parallelizable stages
  critical_path: z.array(z.string().uuid()),
  estimated_duration_ms: z.number().int().positive(),
  risk_score: z.number().min(0).max(1)
});
export type ExecutionPlan = z.infer<typeof ExecutionPlan>;
