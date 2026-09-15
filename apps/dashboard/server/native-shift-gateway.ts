import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { DAG } from '@agi-ecosystem/dag-compiler';
import {
  HybridEventStore,
  PostgresEventStore,
  type EventStoreConfig,
} from '@agi-ecosystem/event-store';
import {
  PostgresEvidenceStore,
} from '@agi-ecosystem/evidence-engine';
import { EndToEndPipeline } from '@agi-ecosystem/civilization-orchestrator';

const NATIVE_SHIFT_REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

process.env.NATIVE_SHIFT_REPOSITORY_ROOT ??=
  NATIVE_SHIFT_REPOSITORY_ROOT;

export interface NativeShiftMissionRequest {
  objective?: string;
}

export interface NativeShiftMission {
  runId: string;
  objective: string;
  dagId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

type PublishEvent = (event: {
  type: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}) => void;

class TelemetryEventStore extends HybridEventStore {
  constructor(private readonly publish: PublishEvent) {
    super();
  }

  override append<T extends Record<string, unknown>>(
    type: string,
    payload: T,
  ) {
    const entry = super.append(type, payload);

    this.publish({
      type,
      timestamp: entry.timestamp,
      data: {
        sequence: entry.sequence,
        runId: payload.run_id,
        dagId: payload.dag_id,
        ...payload,
      },
    });

    return entry;
  }
}

function createEvidenceDatabaseConfig(): EventStoreConfig {
  const required = [
    'TEST_DB_HOST',
    'TEST_DB_PORT',
    'TEST_DB_NAME',
    'TEST_DB_USER',
    'TEST_DB_PASSWORD',
  ] as const;

  for (const name of required) {
    if (!process.env[name]) {
      throw new Error(
        `Missing required evidence database environment variable: ${name}`,
      );
    }
  }

  return {
    host: process.env.TEST_DB_HOST!,
    port: Number(process.env.TEST_DB_PORT),
    database: process.env.TEST_DB_NAME!,
    user: process.env.TEST_DB_USER!,
    password: process.env.TEST_DB_PASSWORD!,
  };
}

function createDemoDag(): DAG {
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
      tags: ['native-shift', 'show-and-tell'],
    },
  };
}

export class NativeShiftGateway {
  private readonly missions = new Map<string, NativeShiftMission>();

  constructor(private readonly publish: PublishEvent) {}

  async startMission(
    request: NativeShiftMissionRequest = {},
  ): Promise<NativeShiftMission> {
    const runId = crypto.randomUUID();
    const objective =
      request.objective?.trim() ||
      'Validate the NATIVE//SHIFT autonomous engineering pipeline';

    const dag = createDemoDag();

    const mission: NativeShiftMission = {
      runId,
      objective,
      dagId: dag.id,
      status: 'queued',
    };

    this.missions.set(runId, mission);

    this.publish({
      type: 'native_shift.mission.started',
      data: {
        runId,
        dagId: dag.id,
        objective,
        source: 'native-shift-gateway',
      },
    });

    void this.execute(runId, dag);

    return mission;
  }

  getMission(runId: string): NativeShiftMission | undefined {
    return this.missions.get(runId);
  }

  listMissions(): NativeShiftMission[] {
    return [...this.missions.values()].sort((a, b) =>
      b.runId.localeCompare(a.runId),
    );
  }

  private async execute(runId: string, dag: DAG): Promise<void> {
    const mission = this.missions.get(runId);

    if (!mission) {
      return;
    }

    mission.status = 'running';

    const eventStore = new TelemetryEventStore(this.publish);
    const evidenceStore = PostgresEvidenceStore.fromConfig(
      createEvidenceDatabaseConfig(),
      'native_shift_evidence',
    );

    await evidenceStore.init();

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
      evidence_store: evidenceStore,
    });

    try {
      this.publish({
        type: 'native_shift.pipeline.started',
        data: {
          runId,
          dagId: dag.id,
        },
      });

      const result = await pipeline.process(dag);

      mission.status =
        result.status === 'failed' ? 'failed' : 'completed';
      mission.result = result;

      this.publish({
        type: 'native_shift.pipeline.completed',
        data: {
          runId,
          dagId: dag.id,
          status: result.status,
          promotionDecision: result.promotion?.decision,
          evidenceHash: result.promotion?.evidenceHash,
          simulationPassed: result.simulation_passed,
          mythosApproved: result.mythos_approved,
          swarmJobId: result.swarm_job_id,
          swarmSuccess: result.swarm_result?.success,
          result: result.swarm_result?.results,
        },
      });
    } catch (error) {
      mission.status = 'failed';
      mission.error =
        error instanceof Error ? error.message : String(error);

      this.publish({
        type: 'native_shift.pipeline.failed',
        data: {
          runId,
          dagId: dag.id,
          error: mission.error,
        },
      });
    } finally {
      await pipeline.close();
      await evidenceStore.close();
    }
  }
}
