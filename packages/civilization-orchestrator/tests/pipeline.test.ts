import { afterEach, describe, expect, it } from 'vitest';
import type { DAG } from '@agi-ecosystem/dag-compiler';
import { HybridEventStore } from '@agi-ecosystem/event-store';
import { EndToEndPipeline } from '../src/pipeline/index.js';

const pipelines: EndToEndPipeline[] = [];

function makeDag(): DAG {
  const nodeId = crypto.randomUUID();

  return {
    id: crypto.randomUUID(),
    version: '2.0.0',
    nodes: [
      {
        id: nodeId,
        type: 'compute',
        executor: 'math.add',
        payload: {
          a: 1,
          b: 2,
        },
        metadata: {
          priority: 50,
          timeout_ms: 1000,
          retry_policy: {
            max_retries: 0,
            backoff_ms: 0,
          },
        },
      },
    ],
    edges: [],
    entrypoint: nodeId,
    metadata: {
      created_at: new Date().toISOString(),
      tags: [],
    },
  };
}

describe('Civilization End-to-End Pipeline', () => {
  afterEach(async () => {
    while (pipelines.length > 0) {
      const pipeline = pipelines.pop();
      if (pipeline) {
        await pipeline.close();
      }
    }
  });

  it('passes a valid DAG through simulation, Mythos, Swarm, and BullMQ', async () => {
    const eventStore = new HybridEventStore();

    const pipeline = new EndToEndPipeline({
      mythos_policies: [
        `policy {
  rule "allow_execution" {
    when: pre_execution
    then: approve
  }
}`,
      ],
      simulation_enabled: false,
      swarm_config: {
        redis: {
          host: '127.0.0.1',
          port: 6379,
        },
        max_concurrent_agents: 1,
        fault_tolerance: 'strict',
      },
      event_store: eventStore,
    });

    pipelines.push(pipeline);

    const result = await pipeline.process(makeDag());

    expect(result.status).toBe('accepted');
    expect(result.simulation_passed).toBe(true);
    expect(result.mythos_approved).toBe(true);
    expect(result.swarm_job_id).toBeTruthy();
    expect(result.swarm_result?.success).toBe(true);
    expect(result.swarm_result?.results).toBeDefined();
    expect(Object.values(result.swarm_result?.results ?? {})).toContain(3);

    expect(result.events).toContain('dag_compiled');
    expect(result.events).toContain('mythos_evaluated');
    expect(result.events).toContain('swarm_submitted');

    const events = eventStore.getEntries();

    expect(events.some((event) => event.type === 'dag_submitted')).toBe(true);
    expect(events.some((event) => event.type === 'dag_completed')).toBe(true);
    expect(events.some((event) => event.type === 'dag_accepted')).toBe(true);
  });
});
