import { DAG, ExecutionPlan } from '@agi-ecosystem/dag-compiler';

export interface NodeAssignment {
  node_id: string;
  agent_id: string;
  priority: number;
  estimated_duration_ms: number;
}

export interface ScheduleResult {
  assignments: NodeAssignment[];
  partitions: string[][]; // Nodes grouped by execution partition
  estimated_makespan_ms: number;
  load_balance_score: number; // 0-1, higher is better
}

export class DAGScheduler {
  private agents: Map<string, { capacity: number; load: number }> = new Map();

  registerAgent(agentId: string, capacity: number = 1): void {
    this.agents.set(agentId, { capacity, load: 0 });
  }

  schedule(plan: ExecutionPlan, dag: DAG): ScheduleResult {
    const assignments: NodeAssignment[] = [];
    const partitions: string[][] = [];

    // Reset loads
    for (const [id, agent] of this.agents) {
      agent.load = 0;
    }

    // For each stage, assign to least-loaded agent
    for (const stage of plan.stages) {
      const stageAssignments: string[] = [];

      for (const nodeId of stage) {
        const node = dag.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        // Find least-loaded agent
        let bestAgent = '';
        let bestLoad = Infinity;

        for (const [agentId, agent] of this.agents) {
          if (agent.load < bestLoad && agent.load < agent.capacity) {
            bestLoad = agent.load;
            bestAgent = agentId;
          }
        }

        if (!bestAgent) {
          // All agents at capacity — queue to least loaded anyway
          for (const [agentId, agent] of this.agents) {
            if (agent.load < bestLoad) {
              bestLoad = agent.load;
              bestAgent = agentId;
            }
          }
        }

        assignments.push({
          node_id: nodeId,
          agent_id: bestAgent,
          priority: node.metadata.priority,
          estimated_duration_ms: node.metadata.timeout_ms
        });

        this.agents.get(bestAgent)!.load += 1;
        stageAssignments.push(nodeId);
      }

      partitions.push(stageAssignments);
    }

    // Calculate makespan (simplified: sum of longest stage)
    const makespan = partitions.reduce((max, stage) => {
      const stageDuration = stage.reduce((sum, nodeId) => {
        const node = dag.nodes.find(n => n.id === nodeId);
        return sum + (node?.metadata.timeout_ms || 0);
      }, 0);
      return Math.max(max, stageDuration);
    }, 0);

    // Load balance score: variance of agent loads (lower variance = better)
    const loads = Array.from(this.agents.values()).map(a => a.load);
    const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance = loads.reduce((sum, l) => sum + Math.pow(l - avgLoad, 2), 0) / loads.length;
    const balanceScore = 1 / (1 + variance); // Normalize to 0-1

    return {
      assignments,
      partitions,
      estimated_makespan_ms: makespan,
      load_balance_score: balanceScore
    };
  }

  getAgentLoad(agentId: string): number {
    return this.agents.get(agentId)?.load || 0;
  }

  getAllLoads(): Map<string, number> {
    return new Map(Array.from(this.agents.entries()).map(([id, a]) => [id, a.load]));
  }
}
