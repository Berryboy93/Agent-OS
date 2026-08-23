import { DAG, ExecutionPlan, DAGCompiler } from '@agi-ecosystem/dag-compiler';
import { AgentExecutor, ExecutionContext, CapabilityManager, EventEmitter } from '@agi-ecosystem/agent-os-runtime';
import { HybridEventStore } from '@agi-ecosystem/event-store';
import { DAGScheduler, ScheduleResult } from '../scheduler/index.js';
import { Job, Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

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
  private queue: Queue;
  private workers: Worker[] = [];
  private config: SwarmConfig;

  constructor(
    config: SwarmConfig,
    eventStore: HybridEventStore,
    capabilityManager: CapabilityManager,
    eventEmitter: EventEmitter
  ) {
    this.config = config;
    this.eventStore = eventStore;
    this.capabilityManager = capabilityManager;
    this.eventEmitter = eventEmitter;
    this.scheduler = new DAGScheduler();

    const redis = new Redis({ host: config.redis.host, port: config.redis.port });
    this.queue = new Queue('dag-execution', { connection: redis });
  }

  async init(): Promise<void> {
    // Register worker agents
    for (let i = 0; i < this.config.max_concurrent_agents; i++) {
      const agentId = `swarm-agent-${i}`;
      this.scheduler.registerAgent(agentId, 5); // Each agent can handle 5 concurrent tasks

      this.capabilityManager.registerProfile({
        id: agentId,
        name: `Swarm Worker ${i}`,
        capabilities: [
          { id: 'compute', resource: 'compute', action: 'execute', scope: 'sandbox' },
          { id: 'memory_read', resource: 'memory', action: 'read', scope: 'isolated' },
          { id: 'memory_write', resource: 'memory', action: 'write', scope: 'isolated' }
        ],
        max_concurrent_tasks: 5,
        trust_level: 0.8
      });
    }

    // Start workers
    const redis = new Redis({ host: this.config.redis.host, port: this.config.redis.port });
    for (let i = 0; i < this.config.max_concurrent_agents; i++) {
      const worker = new Worker('dag-execution', async (job: Job) => {
        return this.executeJob(job.data);
      }, { connection: redis, concurrency: 5 });
      this.workers.push(worker);
    }
  }

  async submitDAG(dag: DAG): Promise<string> {
    const compiler = new DAGCompiler();
    const plan = compiler.compile(dag);
    const schedule = this.scheduler.schedule(plan, dag);

    // Store execution plan
    await this.eventStore.append({
      type: 'dag_submitted',
      payload: {
        dag_id: dag.id,
        plan,
        schedule,
        timestamp: new Date().toISOString()
      },
      dag_id: dag.id
    });

    // Queue for execution
    const job = await this.queue.add('execute-dag', {
      dag_id: dag.id,
      dag,
      plan,
      schedule
    }, {
      attempts: this.config.fault_tolerance === 'strict' ? 3 : 1,
      backoff: { type: 'exponential', delay: 1000 }
    });

    return job.id!;
  }

  private async executeJob(data: any): Promise<any> {
    const { dag_id, dag, plan, schedule } = data;
    const sessionId = crypto.randomUUID();
    const results = new Map<string, any>();

    try {
      for (const stage of schedule.partitions) {
        // Execute stage in parallel
        const stageResults = await Promise.allSettled(
          stage.map(async (nodeId: string) => {
            const assignment = schedule.assignments.find(a => a.node_id === nodeId);
            if (!assignment) throw new Error(`No assignment for node ${nodeId}`);

            const context: ExecutionContext = {
              agent_id: assignment.agent_id,
              session_id: sessionId,
              plan,
              variables: results
            };

            const executor = new AgentExecutor(
              context,
              this.capabilityManager,
              this.eventEmitter
            );

            const node = dag.nodes.find((n: any) => n.id === nodeId);
            return executor.executeNode(node);
          })
        );

        // Check for failures
        const failures = stageResults.filter(r => r.status === 'rejected');
        if (failures.length > 0 && this.config.fault_tolerance === 'strict') {
          throw new Error(`Stage failed: ${failures.map(f => (f as PromiseRejectedResult).reason).join(', ')}`);
        }

        // Collect results
        for (const result of stageResults) {
          if (result.status === 'fulfilled') {
            const r = (result as PromiseFulfilledResult<any>).value;
            results.set(r.node_id, r.output);
          }
        }
      }

      // Success
      await this.eventStore.append({
        type: 'dag_completed',
        payload: {
          dag_id,
          session_id: sessionId,
          results: Object.fromEntries(results),
          timestamp: new Date().toISOString()
        },
        dag_id
      });

      return { success: true, dag_id, results: Object.fromEntries(results) };

    } catch (error) {
      await this.eventStore.append({
        type: 'dag_failed',
        payload: {
          dag_id,
          session_id: sessionId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        },
        dag_id
      });
      throw error;
    }
  }

  async getQueueStatus(): Promise<{ waiting: number; active: number; completed: number; failed: number }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount()
    ]);
    return { waiting, active, completed, failed };
  }

  async close(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close();
    }
    await this.queue.close();
  }
}
