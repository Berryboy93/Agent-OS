import { describe, it, expect } from "vitest";
import { DAGCompiler } from "../compiler.js";
import { DAG } from "../types.js";

const createValidDAG = (): DAG => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "test-dag",
  version: "1.0.0",
  nodes: [
    { id: "n1", type: "compute", executor: "math.add", payload: { a: 1, b: 2 }, metadata: { timeoutMs: 30000, retries: 3, priority: 50 } },
    { id: "n2", type: "compute", executor: "math.mul", payload: { x: 3 }, metadata: { timeoutMs: 30000, retries: 3, priority: 50 } },
    { id: "n3", type: "validate", executor: "assert.positive", payload: {}, metadata: { timeoutMs: 30000, retries: 3, priority: 50 } }
  ],
  edges: [
    { from: "n1", to: "n2" },
    { from: "n2", to: "n3" }
  ]
});

describe("DAGCompiler", () => {
  const compiler = new DAGCompiler();

  it("compiles valid DAG successfully", () => {
    const result = compiler.compile(createValidDAG());
    expect(result.success).toBe(true);
    expect(result.plan).toBeDefined();
    expect(result.plan!.stages).toHaveLength(3);
    expect(result.plan!.criticalPath).toEqual(["n1", "n2", "n3"]);
  });

  it("detects cycles", () => {
    const cyclic = createValidDAG();
    cyclic.edges.push({ from: "n3", to: "n1" });

    const result = compiler.compile(cyclic);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Cycle detected");
  });

  it("partitions parallel stages correctly", () => {
    const parallelDAG: DAG = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "parallel-dag",
      version: "1.0.0",
      nodes: [
        { id: "a", type: "compute", executor: "task.a", payload: {}, metadata: { timeoutMs: 30000, retries: 3, priority: 50 } },
        { id: "b", type: "compute", executor: "task.b", payload: {}, metadata: { timeoutMs: 30000, retries: 3, priority: 50 } },
        { id: "c", type: "compute", executor: "task.c", payload: {}, metadata: { timeoutMs: 30000, retries: 3, priority: 50 } },
        { id: "d", type: "validate", executor: "check.all", payload: {}, metadata: { timeoutMs: 30000, retries: 3, priority: 50 } }
      ],
      edges: [
        { from: "a", to: "d" },
        { from: "b", to: "d" },
        { from: "c", to: "d" }
      ]
    };

    const result = compiler.compile(parallelDAG);
    expect(result.success).toBe(true);
    expect(result.plan!.stages).toHaveLength(2);
    expect(result.plan!.stages[0]).toHaveLength(3);
    expect(result.plan!.stages[1]).toHaveLength(1);
  });
});
