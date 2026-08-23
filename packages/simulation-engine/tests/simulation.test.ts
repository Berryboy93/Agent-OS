import { describe, it, expect } from 'vitest';
import { CounterfactualEngine } from '../src/index.js';

const sampleDAG = {
  id: 'sim-test',
  version: '2.0.0',
  nodes: [
    { id: 'n1', type: 'compute', executor: 'math.add', payload: { a: 1 }, metadata: { priority: 50, timeout_ms: 1000 } },
    { id: 'n2', type: 'agent_task', executor: 'agent.analyze', payload: { q: 'test' }, metadata: { priority: 50, timeout_ms: 5000 } },
    { id: 'n3', type: 'memory_write', executor: 'store', payload: { k: 'v' }, metadata: { priority: 50, timeout_ms: 2000 } }
  ],
  edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }],
  entrypoint: 'n1'
};

describe('CounterfactualEngine', () => {
  it('evaluates DAG and generates branches', () => {
    const engine = new CounterfactualEngine();
    const result = engine.evaluate(sampleDAG as any);

    expect(result.branches.length).toBeGreaterThan(1);
    expect(result.scores.length).toBe(result.branches.length);
    expect(result.ranked_paths.length).toBe(result.branches.length);
    expect(result.recommendation).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('ranks branches by score', () => {
    const engine = new CounterfactualEngine();
    const result = engine.evaluate(sampleDAG as any);

    const sorted = [...result.ranked_paths].sort((a, b) => a.score - b.score);
    expect(result.ranked_paths[0].score).toBe(sorted[sorted.length - 1].score);
    expect(result.ranked_paths[0].rank).toBe(1);
  });
});
