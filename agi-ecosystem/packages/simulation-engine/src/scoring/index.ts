import { SimulationBranch } from '../branching/index.js';

export interface SimulationScore {
  branch_id: string;
  stability: number;      // 0-1: probability of successful execution
  safety: number;         // 0-1: policy compliance score
  efficiency: number;     // 0-1: resource utilization score
  success_probability: number; // 0-1: combined probability
  overall_score: number;  // 0-1: weighted composite
}

export interface ScoringWeights {
  stability: number;
  safety: number;
  efficiency: number;
  success_probability: number;
}

export class ScoringEngine {
  private weights: ScoringWeights;

  constructor(weights: Partial<ScoringWeights> = {}) {
    this.weights = {
      stability: 0.25,
      safety: 0.35,
      efficiency: 0.20,
      success_probability: 0.20,
      ...weights
    };
  }

  scoreBranch(branch: SimulationBranch): SimulationScore {
    // Simulate execution outcomes
    const stability = this.calculateStability(branch);
    const safety = this.calculateSafety(branch);
    const efficiency = this.calculateEfficiency(branch);
    const successProbability = this.calculateSuccessProbability(stability, safety, efficiency);

    const overall = 
      stability * this.weights.stability +
      safety * this.weights.safety +
      efficiency * this.weights.efficiency +
      successProbability * this.weights.success_probability;

    return {
      branch_id: branch.id,
      stability,
      safety,
      efficiency,
      success_probability: successProbability,
      overall_score: overall
    };
  }

  scoreAllBranches(branches: SimulationBranch[]): SimulationScore[] {
    return branches.map(b => this.scoreBranch(b));
  }

  rankBranches(branches: SimulationBranch[]): { branch: SimulationBranch; score: SimulationScore; rank: number }[] {
    const scores = this.scoreAllBranches(branches);
    const sorted = scores
      .map((score, idx) => ({ branch: branches[idx], score, originalIdx: idx }))
      .sort((a, b) => b.score.overall_score - a.score.overall_score);

    return sorted.map((item, rank) => ({
      branch: item.branch,
      score: item.score,
      rank: rank + 1
    }));
  }

  private calculateStability(branch: SimulationBranch): number {
    // More modifications = less stable
    const modificationPenalty = Math.min(branch.modifications.length * 0.05, 0.5);
    // Deeper branches = less stable
    const depthPenalty = branch.depth * 0.1;
    return Math.max(0, 1 - modificationPenalty - depthPenalty);
  }

  private calculateSafety(branch: SimulationBranch): number {
    // Check for risky node types
    let riskScore = 0;
    for (const node of branch.dag.nodes) {
      if (node.type === 'agent_task') riskScore += 0.3;
      if (node.type === 'memory_write') riskScore += 0.1;
      if (node.metadata.timeout_ms > 60000) riskScore += 0.1;
    }
    return Math.max(0, 1 - riskScore / branch.dag.nodes.length);
  }

  private calculateEfficiency(branch: SimulationBranch): number {
    // Lower total timeout = more efficient
    const totalTimeout = branch.dag.nodes.reduce((sum, n) => sum + n.metadata.timeout_ms, 0);
    const avgTimeout = totalTimeout / branch.dag.nodes.length;
    // Normalize: 1000ms = 1.0, 10000ms = 0.5, 60000ms = 0.1
    return Math.max(0, 1 - (avgTimeout / 20000));
  }

  private calculateSuccessProbability(stability: number, safety: number, efficiency: number): number {
    // Bayesian-ish combination
    return (stability * safety * efficiency) ** (1/3);
  }
}
