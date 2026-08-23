import { LongHorizonPlanner, ExecutionStrategy, ExecutionPhase } from '../long-horizon/index.js';
import { SwarmOrchestrator } from '@agi-ecosystem/swarm-runtime';
import { HybridEventStore } from '@agi-ecosystem/event-store';

export interface CoordinationSession {
  id: string;
  goal_id: string;
  strategy: ExecutionStrategy;
  current_phase: number;
  status: 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
  started_at: Date;
  updated_at: Date;
}

export class CivilizationOrchestrator {
  private planner: LongHorizonPlanner;
  private swarm: SwarmOrchestrator;
  private eventStore: HybridEventStore;
  private sessions = new Map<string, CoordinationSession>();

  constructor(
    planner: LongHorizonPlanner,
    swarm: SwarmOrchestrator,
    eventStore: HybridEventStore
  ) {
    this.planner = planner;
    this.swarm = swarm;
    this.eventStore = eventStore;
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

  async executePhase(sessionId: string, phaseIndex: number): Promise<void> {
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

    // Submit all DAGs in phase to swarm
    for (const dag of phase.dags) {
      await this.swarm.submitDAG(dag);
    }

    await this.eventStore.append('phase_started', {
        session_id: sessionId,
        phase_id: phase.id,
        phase_name: phase.name,
        dag_count: phase.dags.length
      });
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
