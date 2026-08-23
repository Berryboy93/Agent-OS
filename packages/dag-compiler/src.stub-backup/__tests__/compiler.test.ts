import { describe, it, expect } from "vitest";
import { DAGCompiler } from "../compiler/index.js";
import type { DAG } from "../types.js";

const defaultMetadata = { timeoutMs: 10000, retries: 3, priority: 50 } as const;

const createValidDAG = (): DAG => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "test-dag",
  version: "1.0.0",
  nodes: [
    { id: "n1", type: "compute", executor: "math.add", payload: { a: 1, b: 2 }, metadata: defaultMetadata },
    { id: "n2", type: "compute", executor: "math.mul", payload: { x: 3 }, metadata: defaultMetadata },
    { id: "n3", type: "validate", executor: "assert.positive", payload: {}, metadata: defaultMetadata }
  ],
  edges: [
    { from: "n1", to: "n2" },
    { from: "n2", to: "n3" }
  ]
});

describe("DAGCompiler", () => {
  it("should compile a valid DAG", async () => {
    const compiler = new DAGCompiler();
    const dag = createValidDAG();
    const result = await compiler.compile(dag);
    expect(result.valid).toBe(true);
    expect(result.executionOrder?.length).toBe(3);
  });
});
