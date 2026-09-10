import type { DAG } from '@agi-ecosystem/dag-compiler';
import { DAGCompiler } from '@agi-ecosystem/dag-compiler';
import {
  AgentExecutor,
  type ExecutionContext,
  CapabilityManager,
  EventEmitter
} from '@agi-ecosystem/agent-os-runtime';
import { HybridEventStore } from '@agi-ecosystem/event-store';
import { MythosEngine } from '@agi-ecosystem/mythos-policy-engine';
import { DAGScheduler } from '../scheduler/index.js';
import type { ScheduleResult } from '../scheduler/index.js';
import { Queue, Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { Redis } from 'ioredis';

export interface SwarmConfig {
  redis: { host: string; port: number };
  max_concurrent_agents: number;
  fault_tolerance: 'strict' | 'best_effort';
}

export class SwarmOrchestrator {
  private scheduler: DAGScheduler;
  private capabilityManager: CapabilityManager;
  private eventEmitter: EventEmitter;
  private eventStore: HybridEventStore;
  private mythos: MythosEngine;
  private queue: Queue;
  private workers: Worker[] = [];
  private workerProfileIds = new Map<string, string>();
  private config: SwarmConfig;

  constructor(
    config: SwarmConfig,
    eventStore: HybridEventStore,
    capabilityManager: CapabilityManager,
    eventEmitter: EventEmitter,
    mythos: MythosEngine,
  ) {
    this.config = config;
    this.eventStore = eventStore;
    this.capabilityManager = capabilityManager;
    this.eventEmitter = eventEmitter;
    this.mythos = mythos;
    this.scheduler = new DAGScheduler();

    const redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null
    });

    this.queue = new Queue('dag-execution', {
      connection: redis
    });
  }

  async init(): Promise<void> {
    for (let i = 0; i < this.config.max_concurrent_agents; i++) {
      const agentId = `swarm-agent-${i}`;
      const profileId = crypto.randomUUID();

      this.scheduler.registerAgent(agentId, 5);
      this.workerProfileIds.set(agentId, profileId);

      this.capabilityManager.registerProfile({
        id: profileId,
        name: `Swarm Worker ${i}`,
        capabilities: [
          {
            id: 'compute',
            resource: 'compute',
            action: 'execute',
            scope: 'sandbox',
            constraints: {
              executors: ['math.add', 'agent.analyze', 'store.result']
            }
          },
          {
            id: 'memory_read',
            resource: 'memory',
            action: 'read',
            scope: 'isolated',
            constraints: {}
          },
          {
            id: 'memory_write',
            resource: 'memory',
            action: 'write',
            scope: 'isolated',
            constraints: {}
          }
        ],
        max_concurrent_tasks: 5,
        trust_level: 0.8
      });
    }

    const redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      maxRetriesPerRequest: null
    });

    for (let i = 0; i < this.config.max_concurrent_agents; i++) {
      const worker = new Worker(
        'dag-execution',
        async (job: Job) => this.executeJob(job.data),
        {
          connection: redis,
          concurrency: 5,
          autorun: false
        }
      );

      this.workers.push(worker);
      worker.run().catch((error) => {
        this.eventStore.append('worker_failed', {
          error: error instanceof Error ? error.message : String(error),
          worker_id: `swarm-agent-${i}`
        });
      });
    }
  }

  async waitForJob(
    jobId: string,
    timeoutMs = 15000,
    pollIntervalMs = 50,
  ): Promise<{
    success: boolean;
    dag_id: string;
    results: Record<string, unknown>;
  }> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        throw new Error(`Swarm job ${jobId} not found`);
      }

      const state = await job.getState();

      if (state === 'completed') {
        // The Job instance may have been hydrated while the worker was still
        // processing it. Re-read the completed job so returnvalue comes from
        // the persisted BullMQ record rather than stale in-memory state.
        const completedJob = await this.queue.getJob(jobId);

        if (!completedJob) {
          throw new Error(`Swarm job ${jobId} disappeared after completion`);
        }

        if (completedJob.returnvalue === undefined) {
          throw new Error(
            `Swarm job ${jobId} completed without a persisted return value`
          );
        }

        return completedJob.returnvalue;
      }

      if (state === 'failed') {
        throw new Error(
          `Swarm job ${jobId} failed: ${job.failedReason ?? 'unknown error'}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(
      `Timed out waiting for Swarm job ${jobId} after ${timeoutMs}ms`
    );
  }

  async submitDAG(dag: DAG): Promise<string> {
    const compiler = new DAGCompiler();
    const plan = compiler.compile(dag);
    const schedule = this.scheduler.schedule(plan, dag);

    this.eventStore.append('dag_submitted', {
      dag_id: dag.id,
      plan,
      schedule,
      timestamp: new Date().toISOString()
    });

    const job = await this.queue.add(
      'execute-dag',
      {
        dag_id: dag.id,
        dag,
        plan,
        schedule
      },
      {
        attempts: this.config.fault_tolerance === 'strict' ? 3 : 1,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    );

    return job.id!;
  }

  private async executeJob(data: any): Promise<any> {
    const { dag_id, dag, plan, schedule } = data;
    const sessionId = crypto.randomUUID();
    const results = new Map<string, any>();

    try {
      for (const stage of schedule.partitions) {
        const stageResults = await Promise.allSettled(
          stage.map(async (nodeId: string) => {
            const assignment = schedule.assignments.find(
              (a: ScheduleResult['assignments'][number]) =>
                a.node_id === nodeId
            );

            if (!assignment) {
              throw new Error(`No assignment for node ${nodeId}`);
            }

            const profileId = this.workerProfileIds.get(assignment.agent_id);
            if (!profileId) {
              throw new Error(
                `No capability profile registered for worker ${assignment.agent_id}`
              );
            }

            const context: ExecutionContext = {
              agent_id: profileId,
              session_id: sessionId,
              plan,
              variables: results,
              nodes: new Map(
                dag.nodes.map((candidate: any) => [candidate.id, candidate]),
              ),
            };

            const executor = new AgentExecutor(
              context,
              this.capabilityManager,
              this.eventEmitter,
              this.mythos,
            );

            const node = dag.nodes.find(
              (candidate: DAG['nodes'][number]) => candidate.id === nodeId
            );

            if (!node) {
              throw new Error(`Node ${nodeId} not found in DAG`);
            }

            return executor.executeNode(node);
          })
        );

        const failures = stageResults.filter(
          (result) => result.status === 'rejected'
        );

        if (
          failures.length > 0 &&
          this.config.fault_tolerance === 'strict'
        ) {
          throw new Error(
            `Stage failed: ${failures
              .map(
                (failure) =>
                  String(
                    (failure as PromiseRejectedResult).reason
                  )
              )
              .join(', ')}`
          );
        }

        for (const result of stageResults) {
          if (result.status === 'fulfilled') {
            const nodeResult = result.value;
            results.set(nodeResult.node_id, nodeResult.output);
          }
        }
      }

      this.eventStore.append('dag_completed', {
        dag_id,
        session_id: sessionId,
        results: Object.fromEntries(results),
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        dag_id,
        results: Object.fromEntries(results)
      };
    } catch (error) {
      this.eventStore.append('dag_failed', {
        dag_id,
        session_id: sessionId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed
    };
  }

  async close(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close();
    }

    await this.queue.close();
  }
}
