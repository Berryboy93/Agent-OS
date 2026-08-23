"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const sampleDAG = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    version: '2.0.0',
    nodes: [
        {
            id: 'a1',
            type: 'compute',
            executor: 'math.add',
            payload: { a: 1, b: 2 },
            metadata: { priority: 80, timeout_ms: 1000 }
        },
        {
            id: 'a2',
            type: 'agent_task',
            executor: 'agent.analyze',
            payload: { query: 'test' },
            metadata: { priority: 90, timeout_ms: 5000, retry_policy: { max_retries: 2 } }
        },
        {
            id: 'a3',
            type: 'memory_write',
            executor: 'store.result',
            payload: { key: 'output' },
            metadata: { priority: 50, timeout_ms: 2000 }
        }
    ],
    edges: [
        { from: 'a1', to: 'a2' },
        { from: 'a2', to: 'a3' }
    ],
    entrypoint: 'a1'
};
(0, vitest_1.describe)('DAGCompiler', () => {
    (0, vitest_1.it)('compiles a valid DAG into an execution plan', () => {
        const compiler = new index_js_1.DAGCompiler();
        const plan = compiler.compile(sampleDAG);
        (0, vitest_1.expect)(plan.dag_id).toBe(sampleDAG.id);
        (0, vitest_1.expect)(plan.stages.length).toBe(3); // sequential in this case
        (0, vitest_1.expect)(plan.critical_path.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(plan.risk_score).toBeGreaterThan(0);
        (0, vitest_1.expect)(plan.risk_score).toBeLessThanOrEqual(1);
    });
    (0, vitest_1.it)('detects cycles', () => {
        const cyclic = {
            ...sampleDAG,
            edges: [
                { from: 'a1', to: 'a2' },
                { from: 'a2', to: 'a3' },
                { from: 'a3', to: 'a1' } // cycle!
            ]
        };
        const compiler = new index_js_1.DAGCompiler();
        (0, vitest_1.expect)(() => compiler.compile(cyclic)).toThrow('Cycle detected');
    });
    (0, vitest_1.it)('parses JSON DAG', () => {
        const json = JSON.stringify(sampleDAG);
        const dag = index_js_1.DAGParser.fromJSON(json);
        (0, vitest_1.expect)(dag.nodes.length).toBe(3);
    });
    (0, vitest_1.it)('generates DOT graph', () => {
        const dag = index_js_1.DAGParser.fromJSON(JSON.stringify(sampleDAG));
        const dot = index_js_1.DAGParser.toDOT(dag);
        (0, vitest_1.expect)(dot).toContain('digraph DAG');
        (0, vitest_1.expect)(dot).toContain('a1 -> a2');
    });
});
//# sourceMappingURL=compiler.test.js.map