"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../compiler/index.js");
const defaultMetadata = { timeoutMs: 10000, retries: 3, priority: 50 };
const createValidDAG = () => ({
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
(0, vitest_1.describe)("DAGCompiler", () => {
    (0, vitest_1.it)("should compile a valid DAG", async () => {
        const compiler = new index_js_1.DAGCompiler();
        const dag = createValidDAG();
        const result = await compiler.compile(dag);
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.executionOrder?.length).toBe(3);
    });
});
//# sourceMappingURL=compiler.test.js.map