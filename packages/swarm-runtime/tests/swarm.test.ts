import { describe, expect, it } from 'vitest';
import { DAGScheduler } from '../src/scheduler/index.js';
import type { DAG } from '@agi-ecosystem/dag-compiler';

function makeNode(id = crypto.randomUUID(), name = 'add') {
  return {
    id,
    type: 'compute' as const,
    executor: 'math.add',
    payload: {
      a: 1,
      b: 2
    },
    metadata: {
      priority: 50,
      timeout_ms: 100,
      retry_policy: {
        max_retries: 3,
        backoff_ms: 1000
      }
    }
  };
}

function makeDag(): DAG {
  const firstNode = makeNode();

  return {
    id: crypto.randomUUID(),
    version: '2.0.0',
    nodes: [firstNode],
    edges: [],
    entrypoint: firstNode.id,
    metadata: {
      created_at: new Date().toISOString(),
      tags: []
    }
  };
}

describe('Swarm Runtime', () => {
  it('assigns DAG nodes to registered workers', () => {
    const scheduler = new DAGScheduler();
    scheduler.registerAgent('swarm-agent-0', 5);

    const dag = makeDag();

    const plan = {
      dag_id: dag.id,
      stages: [[dag.nodes[0].id]],
      critical_path: [dag.nodes[0].id],
      estimated_duration_ms: 100,
      risk_score: 0.1
    };

    const result = scheduler.schedule(plan, dag);

    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].node_id).toBe(dag.nodes[0].id);
    expect(result.assignments[0].agent_id).toBe('swarm-agent-0');
    expect(result.assignments[0].priority).toBe(50);
    expect(result.assignments[0].estimated_duration_ms).toBe(100);
  });

  it('creates partitions matching the execution plan stages', () => {
    const scheduler = new DAGScheduler();
    scheduler.registerAgent('swarm-agent-0', 5);
    scheduler.registerAgent('swarm-agent-1', 5);

    const dag = makeDag();
    const secondNode = makeNode(crypto.randomUUID(), 'second');
    dag.nodes.push(secondNode);

    const plan = {
      dag_id: dag.id,
      stages: [
        [dag.nodes[0].id],
        [secondNode.id]
      ],
      critical_path: [dag.nodes[0].id, secondNode.id],
      estimated_duration_ms: 200,
      risk_score: 0.1
    };

    const result = scheduler.schedule(plan, dag);

    expect(result.partitions).toEqual([
      [dag.nodes[0].id],
      [secondNode.id]
    ]);
  });

  it('tracks worker load after scheduling', () => {
    const scheduler = new DAGScheduler();
    scheduler.registerAgent('swarm-agent-0', 5);

    const dag = makeDag();

    const plan = {
      dag_id: dag.id,
      stages: [[dag.nodes[0].id]],
      critical_path: [dag.nodes[0].id],
      estimated_duration_ms: 100,
      risk_score: 0.1
    };

    scheduler.schedule(plan, dag);

    expect(scheduler.getAgentLoad('swarm-agent-0')).toBe(1);
  });

  it('produces a bounded load-balance score', () => {
    const scheduler = new DAGScheduler();
    scheduler.registerAgent('swarm-agent-0', 5);

    const dag = makeDag();

    const plan = {
      dag_id: dag.id,
      stages: [[dag.nodes[0].id]],
      critical_path: [dag.nodes[0].id],
      estimated_duration_ms: 100,
      risk_score: 0.1
    };

    const result = scheduler.schedule(plan, dag);

    expect(result.load_balance_score).toBeGreaterThanOrEqual(0);
    expect(result.load_balance_score).toBeLessThanOrEqual(1);
  });
});
