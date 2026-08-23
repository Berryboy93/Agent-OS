import { z } from "zod";

export const NodeType = z.enum([
  "compute",
  "memory_read", 
  "memory_write",
  "validate",
  "agent_task"
]);

export const NodeSchema = z.object({
  id: z.string().uuid(),
  type: NodeType,
  executor: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  metadata: z.object({
    timeoutMs: z.number().positive().default(30000),
    retries: z.number().min(0).default(3),
    priority: z.number().min(0).max(100).default(50)
  }).default({})
});

export const EdgeSchema = z.object({
  from: z.string().uuid(),
  to: z.string().uuid(),
  condition: z.function().args(z.unknown()).returns(z.boolean()).optional()
});

export const DAGSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  nodes: z.array(NodeSchema).min(1),
  edges: z.array(EdgeSchema),
  version: z.string().default("1.0.0")
}).refine(
  (dag) => {
    const nodeIds = new Set(dag.nodes.map(n => n.id));
    return dag.edges.every(e => nodeIds.has(e.from) && nodeIds.has(e.to));
  },
  { message: "All edges must reference valid nodes" }
);

export type NodeType = z.infer<typeof NodeType>;
export type DAGNode = z.infer<typeof NodeSchema>;
export type DAGEdge = z.infer<typeof EdgeSchema>;
export type DAG = z.infer<typeof DAGSchema>;

export interface ExecutionPlan {
  dagId: string;
  stages: DAGNode[][];
  criticalPath: string[];
  estimatedDurationMs: number;
}

export interface CompilationResult {
  success: boolean;
  plan?: ExecutionPlan;
  errors: string[];
  warnings: string[];
}
