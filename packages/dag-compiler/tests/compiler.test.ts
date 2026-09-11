import { describe, it, expect } from 'vitest';
import { DAGCompiler, DAGParser } from '../src/index.js';

const sampleDAG = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  version: '2.0.0',
  nodes: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      type: 'compute',
      executor: 'math.add',
      payload: { a: 1, b: 2 },
      metadata: { priority: 80, timeout_ms: 1000 }
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      type: 'agent_task',
      executor: 'agent.analyze',
      payload: { query: 'test' },
      metadata: { priority: 90, timeout_ms: 5000, retry_policy: { max_retries: 2 } }
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      type: 'memory_write',
      executor: 'store.result',
      payload: { key: 'output' },
      metadata: { priority: 50, timeout_ms: 2000 }
    }
  ],
  edges: [
    { from: '11111111-1111-4111-8111-111111111111', to: '22222222-2222-4222-8222-222222222222' },
    { from: '22222222-2222-4222-8222-222222222222', to: '33333333-3333-4333-8333-333333333333' }
  ],
  entrypoint: '11111111-1111-4111-8111-111111111111'
};

describe('DAGCompiler', () => {
  it('compiles a valid DAG into an execution plan', () => {
    const compiler = new DAGCompiler();
    const dag = DAGParser.fromJSON(JSON.stringify(sampleDAG));
    const plan = compiler.compile(dag);

    expect(plan.dag_id).toBe(sampleDAG.id);
    expect(plan.stages.length).toBe(3); // sequential in this case
    expect(plan.critical_path.length).toBeGreaterThan(0);
    expect(plan.risk_score).toBeGreaterThan(0);
    expect(plan.risk_score).toBeLessThanOrEqual(1);
  });

  it('detects cycles', () => {
    const cyclic = {
      ...sampleDAG,
      edges: [
        { from: '11111111-1111-4111-8111-111111111111', to: '22222222-2222-4222-8222-222222222222' },
        { from: '22222222-2222-4222-8222-222222222222', to: '33333333-3333-4333-8333-333333333333' },
        { from: '33333333-3333-4333-8333-333333333333', to: '11111111-1111-4111-8111-111111111111' } // cycle!
      ]
    };
    const compiler = new DAGCompiler();
    const dag = DAGParser.fromJSON(JSON.stringify(cyclic));
    expect(() => compiler.compile(dag)).toThrow('Cycle detected');
  });

  it('parses JSON DAG', () => {
    const json = JSON.stringify(sampleDAG);
    const dag = DAGParser.fromJSON(json);
    expect(dag.nodes.length).toBe(3);
  });

  it('generates DOT graph', () => {
    const dag = DAGParser.fromJSON(JSON.stringify(sampleDAG));
    const dot = DAGParser.toDOT(dag);
    expect(dot).toContain('digraph DAG');
    expect(dot).toContain(
      '"11111111-1111-4111-8111-111111111111" -> "22222222-2222-4222-8222-222222222222"'
    );
  });
});
