import { describe, expect, it } from 'vitest';
import type { DAG } from '@agi-ecosystem/dag-compiler';
import type { SwarmOrchestrator } from '@agi-ecosystem/swarm-runtime';
import { HybridEventStore } from '@agi-ecosystem/event-store';
import { LongHorizonPlanner } from '../src/long-horizon/index.ts';
import { CivilizationOrchestrator } from '../src/coordination/index.ts';

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

const passingVerification = async () => ({
  profileIds: [
    'evidence-tests',
    'evidence-typecheck',
    'civilization-typecheck',
  ] as const,
  checks: [
    {
      id: 'coordination-test-test',
      category: 'test' as const,
      status: 'passed' as const,
      required: true,
      critical: true,
      metadata: { source: 'coordination-test' },
    },
    {
      id: 'coordination-test-build',
      category: 'build' as const,
      status: 'passed' as const,
      required: true,
      critical: true,
      metadata: { source: 'coordination-test' },
    },
    {
      id: 'coordination-test-security',
      category: 'security' as const,
      status: 'passed' as const,
      required: true,
      critical: true,
      metadata: { source: 'coordination-test' },
    },
  ],
});

describe('Civilization coordination promotion gate', () => {
  it('pauses for rollback when critical evidence fails', async () => {
    const planner = new LongHorizonPlanner();
    const eventStore = new HybridEventStore();

    const swarm = {
      submitDAG: async (_dag: DAG) => 'coordination-job-rollback',
      waitForJob: async (_jobId: string) => ({
        success: false,
        dag_id: 'coordination-dag-rollback',
        results: {},
      }),
    } as unknown as SwarmOrchestrator;

    const orchestrator = new CivilizationOrchestrator(
      planner,
      swarm,
      eventStore,
      {
        verification_collector: passingVerification,
      },
    );

    planner.defineGoal({
      id: 'goal-coordination-rollback',
      description: 'Validate rollback governance',
      priority: 100,
      constraints: [],
      sub_goals: ['sub-goal-rollback'],
    });

    const session = await orchestrator.initiateGoal(
      'goal-coordination-rollback',
    );

    session.strategy.phases[0].dags.push(makeDag());

    const result = await orchestrator.executePhase(session.id, 0);

    expect(result.promotions).toHaveLength(1);
    expect(result.promotions[0]?.decision).toBe('rollback');
    expect(result.status).toBe('failed');

    const updatedSession = orchestrator.getSession(session.id);
    expect(updatedSession?.status).toBe('paused');

    const events = eventStore.getEntries();

    expect(
      events.some((event) => event.type === 'verification_completed'),
    ).toBe(true);

    expect(
      events.some((event) => event.type === 'dag_rollback_required'),
    ).toBe(true);

    expect(
      events.some((event) => event.type === 'phase_rollback_required'),
    ).toBe(true);

    expect(
      events.some((event) => event.type === 'phase_human_review'),
    ).toBe(false);

    expect(
      events.some((event) => event.type === 'phase_started'),
    ).toBe(false);
  });

  it('advances a phase when runtime and authoritative verification pass', async () => {
    const planner = new LongHorizonPlanner();
    const eventStore = new HybridEventStore();

    const swarm = {
      submitDAG: async (_dag: DAG) => 'coordination-job-1',
      waitForJob: async (_jobId: string) => ({
        success: true,
        dag_id: 'coordination-dag-1',
        results: {
          result: 3,
        },
      }),
    } as unknown as SwarmOrchestrator;

    const orchestrator = new CivilizationOrchestrator(
      planner,
      swarm,
      eventStore,
      {
        verification_collector: passingVerification,
      },
    );

    planner.defineGoal({
      id: 'goal-coordination-promotion',
      description: 'Validate coordination promotion governance',
      priority: 100,
      constraints: [],
      sub_goals: ['sub-goal-1'],
    });

    const session = await orchestrator.initiateGoal(
      'goal-coordination-promotion',
    );

    session.strategy.phases[0].dags.push(makeDag());

    const result = await orchestrator.executePhase(session.id, 0);

    expect(result.status).toBe('promoted');
    expect(result.promotions).toHaveLength(1);
    expect(result.promotions[0]?.decision).toBe('promote');
    expect(result.promotions[0]?.evidenceHash).toMatch(/^[a-f0-9]{64}$/);

    const updatedSession = orchestrator.getSession(session.id);
    expect(updatedSession?.status).toBe('executing');

    const events = eventStore.getEntries();

    expect(
      events.some((event) => event.type === 'verification_completed'),
    ).toBe(true);

    const promotionEvent = events.find(
      (event) => event.type === 'promotion_decided',
    );

    expect(promotionEvent).toBeDefined();
    expect(promotionEvent?.payload).toMatchObject({
      decision: 'promote',
      evidence_hash: result.promotions[0]?.evidenceHash,
    });

    expect(
      events.some((event) => event.type === 'dag_human_review'),
    ).toBe(false);

    expect(
      events.some((event) => event.type === 'phase_started'),
    ).toBe(true);
  });
});
