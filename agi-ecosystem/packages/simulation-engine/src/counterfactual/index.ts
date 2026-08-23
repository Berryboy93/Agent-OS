import { DAG } from '@agi-ecosystem/dag-compiler';
import { BranchingEngine, SimulationBranch } from '../branching/index.js';
import { ScoringEngine, SimulationScore } from '../scoring/index.js';

export interface CounterfactualResult {
  original_dag: DAG;
  branches: SimulationBranch[];
  scores: SimulationScore[];
  ranked_paths: Array<{ branch_id: string; score: number; rank: number }>;
  recommendation: string;
  confidence: number;
}

export class CounterfactualEngine {
  private branching: BranchingEngine;
  private scoring: ScoringEngine;

  constructor() {
    this.branching = new BranchingEngine({
      max_branches: 20,
      max_depth: 2,
      mutation_strategies: ['executor_swap', 'timeout_increase', 'payload_modify']
    });
    this.scoring = new ScoringEngine();
  }

  evaluate(dag: DAG): CounterfactualResult {
    // 1. Generate all possible branches
    const branches = this.branching.generateBranches(dag);

    // 2. Score each branch
    const scores = this.scoring.scoreAllBranches(branches);

    // 3. Rank branches
    const ranked = this.scoring.rankBranches(branches);

    // 4. Generate recommendation
    const bestBranch = ranked[0];
    const recommendation = this.generateRecommendation(bestBranch, dag);
    const confidence = bestBranch.score.overall_score;

    return {
      original_dag: dag,
      branches,
      scores,
      ranked_paths: ranked.map(r => ({
        branch_id: r.branch.id,
        score: r.score.overall_score,
        rank: r.rank
      })),
      recommendation,
      confidence
    };
  }

  private generateRecommendation(
    best: { branch: SimulationBranch; score: SimulationScore },
    original: DAG
  ): string {
    if (best.score.overall_score > 0.8) {
      return `Execute as-is. Branch ${best.branch.id} shows high confidence (${(best.score.overall_score * 100).toFixed(1)}%).`;
    }
    if (best.score.safety < 0.5) {
      return `REJECT: Safety score too low (${(best.score.safety * 100).toFixed(1)}%). Requires policy review.`;
    }
    if (best.score.stability < 0.5) {
      return `CAUTION: Stability concerns. Consider reducing DAG complexity or increasing timeouts.`;
    }
    return `Proceed with monitoring. Score: ${(best.score.overall_score * 100).toFixed(1)}%.`;
  }
}
