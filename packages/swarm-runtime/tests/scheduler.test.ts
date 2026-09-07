import { describe, it, expect } from 'vitest';
import { DAGScheduler } from '../src/index.js';

describe('DAGScheduler', () => {
  it('balances load across agents', () => {
    const scheduler = new DAGScheduler();
    scheduler.registerAgent('agent-1', 3);
    scheduler.registerAgent('agent-2', 3);
    scheduler.registerAgent('agent-3', 3);

    const plan = {
      dag_id: 'test',
      stages: [['n1', 'n2'], ['n3', 'n4'], ['n5']],
      critical_path: ['n1', 'n3', 'n5'],
      estimated_duration_ms: 1000,
      risk_score: 0.1
    };

    const dag = {
      id: 'test',
      nodes: [
        { id: 'n1', type: 'compute', executor: 'test', payload: {}, metadata: { priority: 50, timeout_ms: 100 } },
        { id: 'n2', type: 'compute', executor: 'test', payload: {}, metadata: { priority: 50, timeout_ms: 100 } },
        { id: 'n3', type: 'compute', executor: 'test', payload: {}, metadata: { priority: 50, timeout_ms: 100 } },
        { id: 'n4', type: 'compute', executor: 'test', payload: {}, metadata: { priority: 50, timeout_ms: 100 } },
        { id: 'n5', type: 'compute', executor: 'test', payload: {}, metadata: { priority: 50, timeout_ms: 100 } }
      ],
      edges: [],
      entrypoint: 'n1'
    };

    const schedule = scheduler.schedule(plan as any, dag as any);
    expect(schedule.assignments.length).toBe(5);
    expect(schedule.load_balance_score).toBeGreaterThan(0);
  });
});
