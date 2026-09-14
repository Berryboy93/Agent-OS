import { DAG, DAGCompiler } from '@agi-ecosystem/dag-compiler';
import { CounterfactualEngine } from '@agi-ecosystem/simulation-engine';
import { MythosEngine } from '@agi-ecosystem/mythos-policy-engine';
import { SwarmOrchestrator } from '@agi-ecosystem/swarm-runtime';
import { HybridEventStore } from '@agi-ecosystem/event-store';
import { CapabilityManager, EventEmitter } from '@agi-ecosystem/agent-os-runtime';
import { InMemoryEvidenceStore, type PromotionResult } from '@agi-ecosystem/evidence-engine';
import { evaluateExecutionPromotion } from '../promotion-gate.js';
import {
  collectExecutionVerification,
  type ExecutionVerificationResult,
} from '../execution-verification.js';
import type { TrustedVerificationProfileId } from '../verification-profiles.js';
import { CivilizationOrchestrator, LongHorizonPlanner } from '../index.js';

export interface PipelineConfig {
  mythos_policies: string[];
  simulation_enabled: boolean;
  swarm_config: ConstructorParameters<typeof SwarmOrchestrator>[0];
  event_store: HybridEventStore;
  verification_profile_ids?: readonly TrustedVerificationProfileId[];
  verification_collector?: (
    options?: {
      repositoryRoot?: string;
      profileIds?: readonly TrustedVerificationProfileId[];
    },
  ) => Promise<ExecutionVerificationResult>;
}

export interface PipelineResult {
  dag_id: string;
  simulation_passed: boolean;
  mythos_approved: boolean;
  swarm_job_id?: string;
  swarm_result?: {
    success: boolean;
    dag_id: string;
    results: Record<string, unknown>;
  };
  promotion?: PromotionResult;
  events: string[];
  status: 'accepted' | 'rejected' | 'simulated' | 'human_review' | 'failed';
}

export class EndToEndPipeline {
  private dagCompiler: DAGCompiler;
  private simulator: CounterfactualEngine;
  private mythos: MythosEngine;
  private swarm: SwarmOrchestrator;
  private eventStore: HybridEventStore;
  private civ: CivilizationOrchestrator;
  private swarmInitialized = false;
  private simulationEnabled: boolean;
  private readonly verificationProfileIds:
    readonly TrustedVerificationProfileId[] | undefined;
  private readonly verificationCollector: NonNullable<
    PipelineConfig['verification_collector']
  >;

  constructor(config: PipelineConfig) {
    this.dagCompiler = new DAGCompiler();
    this.simulator = new CounterfactualEngine();
    this.mythos = new MythosEngine();
    this.eventStore = config.event_store;
    this.simulationEnabled = config.simulation_enabled;
    this.verificationProfileIds = config.verification_profile_ids
      ? [...config.verification_profile_ids]
      : undefined;
    this.verificationCollector =
      config.verification_collector ??
      collectExecutionVerification;

    // Register policies
    for (const policy of config.mythos_policies) {
      this.mythos.registerPolicy(`policy-${Date.now()}`, policy);
    }

    // Initialize swarm with real runtime authorization/event services.
    const capabilityManager = new CapabilityManager();
    const eventEmitter = new EventEmitter();
    this.swarm = new SwarmOrchestrator(
      config.swarm_config,
      config.event_store,
      capabilityManager,
      eventEmitter,
      this.mythos
    );

    const planner = new LongHorizonPlanner();
      const evidenceStore = new InMemoryEvidenceStore();
    this.civ = new CivilizationOrchestrator(
      planner,
      this.swarm,
      this.eventStore,
      {
        evidence_store: evidenceStore,
        verification_profile_ids: this.verificationProfileIds,
        verification_collector: this.verificationCollector,
      },
    );
  }

  async process(dag: DAG): Promise<PipelineResult> {
    const events: string[] = [];
    const dagId = dag.id;

    try {
      // Step 1: Compile DAG
      const plan = this.dagCompiler.compile(dag);
      events.push('dag_compiled');

      // Step 2: Simulation (counterfactual evaluation)
      let simulationPassed = true;
      if (this.simulationEnabled) {
        const simResult = this.simulator.evaluate(dag);
        simulationPassed = simResult.confidence > 0.5;
        events.push('simulation_completed');

        if (!simulationPassed) {
          await this.eventStore.append('dag_rejected_simulation', { dag_id: dagId, confidence: simResult.confidence });
          return {
            dag_id: dagId,
            simulation_passed: simulationPassed,
            mythos_approved: false,
            events,
            status: 'rejected'
          };
        }
      }

      // Step 3: Mythos Gate (policy enforcement)
      const mythosContext = {
        agent_id: 'pipeline-orchestrator',
        session_id: crypto.randomUUID(),
        risk_score: plan.risk_score,
        trust_level: 0.9,
        data: {},
        payload: { dag_id: dagId, node_count: dag.nodes.length }
      };

      const mythosDecision = this.mythos.evaluate('pre_execution', mythosContext);
      events.push('mythos_evaluated');

      if (!mythosDecision.allowed) {
        await this.eventStore.append('dag_rejected_mythos', {
            dag_id: dagId,
            reasons: mythosDecision.reasons || []
          });
        return {
          dag_id: dagId,
          simulation_passed: true,
          mythos_approved: false,
          events,
          status: 'rejected'
        };
      }

      // Step 4: Swarm Execution
      if (!this.swarmInitialized) {
        await this.swarm.init();
        this.swarmInitialized = true;
      }

      const jobId = await this.swarm.submitDAG(dag);
      events.push('swarm_submitted');

      const swarmResult = await this.swarm.waitForJob(jobId);
      events.push('swarm_completed');

        const verification = await this.verificationCollector({
          repositoryRoot:
            process.env.NATIVE_SHIFT_REPOSITORY_ROOT ??
            process.cwd(),
          profileIds: this.verificationProfileIds,
        });

        events.push('verification_completed');

        const { promotion } = evaluateExecutionPromotion({
          runId: jobId,
          taskId: dagId,
          baseRevision: dag.version,
          operations: [`execute-dag:${dagId}`],
          checks: [
            {
              id: `runtime:${dagId}`,
              category: 'runtime',
              status: swarmResult.success ? 'passed' : 'failed',
              required: true,
              critical: true,
              metadata: {
                dag_id: dagId,
                swarm_job_id: jobId,
              },
            },
            {
              id: `policy:${dagId}`,
              category: 'policy',
              status: mythosDecision.allowed ? 'passed' : 'failed',
              required: true,
              critical: true,
              metadata: {
                dag_id: dagId,
              },
            },
            ...verification.checks,
          ],
        });

      events.push('promotion_evaluated');

      await this.eventStore.append('promotion_decided', {
        dag_id: dagId,
        swarm_job_id: jobId,
        decision: promotion.decision,
        score: promotion.score,
        reasons: promotion.reasons,
        evidence_hash: promotion.evidenceHash,
      });

      if (promotion.decision === 'promote') {
        await this.eventStore.append('dag_accepted', {
          dag_id: dagId,
          plan,
          simulation_passed: simulationPassed,
          mythos_approved: true,
          evidence_hash: promotion.evidenceHash,
        });

        return {
          dag_id: dagId,
          simulation_passed: true,
          mythos_approved: true,
          swarm_job_id: jobId,
          swarm_result: swarmResult,
          promotion,
          events,
          status: 'accepted',
        };
      }

      if (promotion.decision === 'human_review') {
        await this.eventStore.append('dag_human_review', {
          dag_id: dagId,
          plan,
          promotion,
          evidence_hash: promotion.evidenceHash,
        });

        return {
          dag_id: dagId,
          simulation_passed: true,
          mythos_approved: true,
          swarm_job_id: jobId,
          swarm_result: swarmResult,
          promotion,
          events,
          status: 'human_review',
        };
      }

      await this.eventStore.append('dag_rejected_promotion', {
        dag_id: dagId,
        plan,
        promotion,
        evidence_hash: promotion.evidenceHash,
      });

      return {
        dag_id: dagId,
        simulation_passed: true,
        mythos_approved: true,
        swarm_job_id: jobId,
        swarm_result: swarmResult,
        promotion,
        events,
        status: 'rejected',
      };

    } catch (error) {
      await this.eventStore.append('pipeline_error', {
          dag_id: dagId,
          error: error instanceof Error ? error.message : String(error)
        });

      return {
        dag_id: dagId,
        simulation_passed: false,
        mythos_approved: false,
        events: [...events, 'error'],
        status: 'failed'
      };
    }
  }

  async close(): Promise<void> {
    if (this.swarmInitialized) {
      await this.swarm.close();
      this.swarmInitialized = false;
    }
  }

  // TODO: replay() and verifyChain() not yet implemented in HybridEventStore
  // async replay(dagId: string, fromSequence: number = 0): Promise<any[]> {
  //   return this.eventStore.replay(fromSequence);
  // }
  //
  // async verifyChain(): Promise<{ valid: boolean; first_invalid?: number }> {
  //   return this.eventStore.verifyChain();
  // }
}
