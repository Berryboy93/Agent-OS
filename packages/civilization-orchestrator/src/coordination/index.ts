import { LongHorizonPlanner, ExecutionStrategy, ExecutionPhase } from '../long-horizon/index.js';
import { SwarmOrchestrator } from '@agi-ecosystem/swarm-runtime';
import { HybridEventStore } from '@agi-ecosystem/event-store';
import {
  EvidenceRecorder,
  type EvidenceCheck,
  type EvidenceStore,
  type PromotionResult,
} from '@agi-ecosystem/evidence-engine';
import { evaluateExecutionPromotion } from '../promotion-gate.js';
import {
  collectExecutionVerification,
  type ExecutionVerificationResult,
} from '../execution-verification.js';
import type { TrustedVerificationProfileId } from '../verification-profiles.js';

export interface CoordinationSession {
  id: string;
  goal_id: string;
  strategy: ExecutionStrategy;
  current_phase: number;
  status: 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
  started_at: Date;
  updated_at: Date;
}

export interface CoordinationConfig {
  evidence_store: EvidenceStore;
  verification_profile_ids?: readonly TrustedVerificationProfileId[];
  verification_collector?: (options: {
    repositoryRoot?: string;
    profileIds?: readonly TrustedVerificationProfileId[];
  }) => Promise<ExecutionVerificationResult>;
}

export interface PhaseExecutionResult {
  phase_id: string;
  status: 'promoted' | 'human_review' | 'rejected' | 'failed';
  dag_results: Array<{
    dag_id: string;
    swarm_job_id: string;
    success: boolean;
  }>;
  promotions: PromotionResult[];
}

export class CivilizationOrchestrator {
  private planner: LongHorizonPlanner;
  private swarm: SwarmOrchestrator;
  private eventStore: HybridEventStore;
  private readonly evidenceRecorder: EvidenceRecorder;
  private readonly verificationProfileIds:
    readonly TrustedVerificationProfileId[] | undefined;
  private readonly verificationCollector: NonNullable<
    CoordinationConfig['verification_collector']
  >;
  private sessions = new Map<string, CoordinationSession>();

  constructor(
    planner: LongHorizonPlanner,
    swarm: SwarmOrchestrator,
    eventStore: HybridEventStore,
    config: CoordinationConfig,
  ) {
    this.planner = planner;
    this.swarm = swarm;
    this.eventStore = eventStore;
    this.evidenceRecorder = new EvidenceRecorder(config.evidence_store);
    this.verificationProfileIds = config.verification_profile_ids
      ? [...config.verification_profile_ids]
      : undefined;
    this.verificationCollector =
      config.verification_collector ??
      collectExecutionVerification;
  }

  async initiateGoal(goalId: string): Promise<CoordinationSession> {
    const strategy = this.planner.planStrategy(goalId);

    const session: CoordinationSession = {
      id: crypto.randomUUID(),
      goal_id: goalId,
      strategy,
      current_phase: 0,
      status: 'planning',
      started_at: new Date(),
      updated_at: new Date()
    };

    this.sessions.set(session.id, session);

    await this.eventStore.append('goal_initiated', {
        session_id: session.id,
        goal_id: goalId,
        strategy_phases: strategy.phases.length,
        estimated_completion: strategy.estimated_completion
      });

    return session;
  }

  async executePhase(
    sessionId: string,
    phaseIndex: number
  ): Promise<PhaseExecutionResult> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (session.status !== 'planning' && session.status !== 'executing') {
      throw new Error(`Cannot execute phase: session status is ${session.status}`);
    }

    const phase = session.strategy.phases[phaseIndex];
    if (!phase) throw new Error(`Phase ${phaseIndex} not found`);

    // Check dependencies
    for (const depId of phase.dependencies) {
      const depPhase = session.strategy.phases.find(p => p.id === depId);
      if (depPhase) {
        // In production: check if dependency phase completed
        console.log(`[COORDINATION] Waiting for dependency: ${depId}`);
      }
    }

    session.status = 'executing';
    session.current_phase = phaseIndex;
    session.updated_at = new Date();

    const dagResults: PhaseExecutionResult['dag_results'] = [];
    const promotions: PromotionResult[] = [];

    try {
      for (const dag of phase.dags) {
        const swarmJobId = await this.swarm.submitDAG(dag);
        const swarmResult = await this.swarm.waitForJob(swarmJobId);

        dagResults.push({
          dag_id: dag.id,
          swarm_job_id: swarmJobId,
          success: swarmResult.success,
        });

        const verification = await this.verificationCollector({
          repositoryRoot:
            process.env.NATIVE_SHIFT_REPOSITORY_ROOT ??
            process.cwd(),
          profileIds: this.verificationProfileIds,
        });

        await this.eventStore.append('verification_completed', {
          session_id: sessionId,
          phase_id: phase.id,
          dag_id: dag.id,
          swarm_job_id: swarmJobId,
          profile_ids: verification.profileIds,
        });

        const checks: EvidenceCheck[] = [
          {
            id: `runtime:${dag.id}`,
            category: 'runtime',
            status: swarmResult.success ? 'passed' : 'failed',
            required: true,
            critical: true,
            metadata: {
              session_id: sessionId,
              phase_id: phase.id,
              dag_id: dag.id,
              swarm_job_id: swarmJobId,
            },
          },
          ...verification.checks,
        ];

        const { promotion } = evaluateExecutionPromotion({
          runId: swarmJobId,
          taskId: dag.id,
          baseRevision: dag.version,
          operations: [`execute-phase:${phase.id}`, `execute-dag:${dag.id}`],
          checks,
        });

        promotions.push(promotion);

        await this.eventStore.append('promotion_decided', {
          session_id: sessionId,
          phase_id: phase.id,
          dag_id: dag.id,
          swarm_job_id: swarmJobId,
          decision: promotion.decision,
          score: promotion.score,
          reasons: promotion.reasons,
          evidence_hash: promotion.evidenceHash,
        });

        if (promotion.decision === 'human_review') {
          await this.eventStore.append('dag_human_review', {
            session_id: sessionId,
            phase_id: phase.id,
            dag_id: dag.id,
            promotion,
            evidence_hash: promotion.evidenceHash,
          });
        } else if (promotion.decision === 'reject') {
          await this.eventStore.append('dag_rejected_promotion', {
            session_id: sessionId,
            phase_id: phase.id,
            dag_id: dag.id,
            promotion,
            evidence_hash: promotion.evidenceHash,
          });
          } else if (promotion.decision === 'rollback') {
            await this.eventStore.append('dag_rollback_required', {
              session_id: sessionId,
              phase_id: phase.id,
              dag_id: dag.id,
              promotion,
              evidence_hash: promotion.evidenceHash,
            });
        } else {
          await this.eventStore.append('dag_accepted', {
            session_id: sessionId,
            phase_id: phase.id,
            dag_id: dag.id,
            evidence_hash: promotion.evidenceHash,
          });
        }
      }

      const allPromoted =
        promotions.length > 0 &&
        promotions.every((promotion) => promotion.decision === 'promote');

        const hasRollback = promotions.some(
          (promotion) => promotion.decision === 'rollback',
        );

      const hasRejection = promotions.some(
        (promotion) => promotion.decision === 'reject',
      );

      if (allPromoted) {
        await this.eventStore.append('phase_started', {
          session_id: sessionId,
          phase_id: phase.id,
          phase_name: phase.name,
          dag_count: phase.dags.length,
        });

        return {
          phase_id: phase.id,
          status: 'promoted',
          dag_results: dagResults,
          promotions,
        };
      }

        if (hasRollback) {
          session.status = 'paused';
          session.updated_at = new Date();

          await this.eventStore.append('phase_rollback_required', {
            session_id: sessionId,
            phase_id: phase.id,
            promotions,
          });

          return {
            phase_id: phase.id,
            status: 'failed',
            dag_results: dagResults,
            promotions,
          };
        }

      if (hasRejection) {
        session.status = 'failed';
        session.updated_at = new Date();

        await this.eventStore.append('phase_rejected_promotion', {
          session_id: sessionId,
          phase_id: phase.id,
          promotions,
        });

        return {
          phase_id: phase.id,
          status: 'rejected',
          dag_results: dagResults,
          promotions,
        };
      }

      session.status = 'paused';
      session.updated_at = new Date();

      await this.eventStore.append('phase_human_review', {
        session_id: sessionId,
        phase_id: phase.id,
        promotions,
      });

      return {
        phase_id: phase.id,
        status: 'human_review',
        dag_results: dagResults,
        promotions,
      };
    } catch (error) {
      session.status = 'failed';
      session.updated_at = new Date();

      await this.eventStore.append('phase_execution_failed', {
        session_id: sessionId,
        phase_id: phase.id,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        phase_id: phase.id,
        status: 'failed',
        dag_results: dagResults,
        promotions,
      };
    }
  }

  async checkpoint(sessionId: string): Promise<{ passed: boolean; action: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const currentPhase = session.strategy.phases[session.current_phase];
    const checkpoint = session.strategy.checkpoints.find(c => c.phase_id === currentPhase.id);

    if (!checkpoint) return { passed: true, action: 'continue' };

    // In production: evaluate checkpoint condition against event store
    const passed = true; // Placeholder

    if (!passed) {
      await this.eventStore.append('checkpoint_failed', {
          session_id: sessionId,
          phase_id: currentPhase.id,
          condition: checkpoint.condition,
          action: checkpoint.action_on_failure
        });

      if (checkpoint.action_on_failure === 'abort') {
        session.status = 'failed';
      } else if (checkpoint.action_on_failure === 'rollback') {
        // Trigger rollback
        await this.rollback(sessionId);
      }
    }

    return { passed, action: checkpoint.action_on_failure };
  }

  async rollback(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    await this.eventStore.append('rollback_initiated', {
        session_id: sessionId,
        current_phase: session.current_phase,
        timestamp: new Date().toISOString()
      });

    // In production: trigger compensating transactions
    console.log(`[COORDINATION] Rolling back session ${sessionId} to phase ${session.current_phase - 1}`);
    session.current_phase = Math.max(0, session.current_phase - 1);
    session.status = 'paused';
  }

  getSession(sessionId: string): CoordinationSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): CoordinationSession[] {
    return Array.from(this.sessions.values());
  }
}
