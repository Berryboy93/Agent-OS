import { DAG, ExecutionPlan, DAGNode } from '../types/index.js';
import { DAGValidator } from '../validator/index.js';

export class DAGCompiler {
  private validator = new DAGValidator();

  compile(dag: DAG): ExecutionPlan {
    const validation = this.validator.validate(dag);
    if (!validation.valid) {
      throw new Error(`DAG validation failed: ${validation.errors.join(', ')}`);
    }

    const topoOrder = this.validator.getTopologicalOrder(dag);
    const stages = this.computeStages(dag, topoOrder);
    const criticalPath = this.findCriticalPath(dag, topoOrder);
    const riskScore = this.computeRiskScore(dag);
    const estimatedDuration = this.estimateDuration(dag);

    return {
      dag_id: dag.id,
      stages,
      critical_path: criticalPath,
      estimated_duration_ms: estimatedDuration,
      risk_score: riskScore
    };
  }

  private computeStages(dag: DAG, topoOrder: string[]): string[][] {
    const nodeDepth = new Map<string, number>();
    const adjacency = this.buildAdjacency(dag);

    for (const nodeId of topoOrder) {
      let maxDepth = 0;
      // Find all predecessors
      for (const edge of dag.edges) {
        if (edge.to === nodeId) {
          maxDepth = Math.max(maxDepth, (nodeDepth.get(edge.from) || 0) + 1);
        }
      }
      nodeDepth.set(nodeId, maxDepth);
    }

    const maxStage = Math.max(...nodeDepth.values());
    const stages: string[][] = [];
    for (let i = 0; i <= maxStage; i++) {
      stages.push([]);
    }
    for (const [nodeId, depth] of nodeDepth) {
      stages[depth].push(nodeId);
    }

    return stages.filter(s => s.length > 0);
  }

  private findCriticalPath(dag: DAG, topoOrder: string[]): string[] {
    // Simplified: longest path by estimated duration
    const nodeMap = new Map(dag.nodes.map(n => [n.id, n]));
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();

    for (const id of topoOrder) {
      dist.set(id, 0);
      prev.set(id, null);
    }

    for (const nodeId of topoOrder) {
      const node = nodeMap.get(nodeId)!;
      const duration = node.metadata.timeout_ms;
      for (const edge of dag.edges) {
        if (edge.from === nodeId) {
          const newDist = (dist.get(nodeId) || 0) + duration;
          if (newDist > (dist.get(edge.to) || 0)) {
            dist.set(edge.to, newDist);
            prev.set(edge.to, nodeId);
          }
        }
      }
    }

    // Reconstruct path from max distance node
    let maxNode = topoOrder[0];
    let maxDist = 0;
    for (const [id, d] of dist) {
      if (d > maxDist) {
        maxDist = d;
        maxNode = id;
      }
    }

    const path: string[] = [];
    let current: string | null = maxNode;
    while (current) {
      path.unshift(current);
      current = prev.get(current) || null;
    }
    return path;
  }

  private computeRiskScore(dag: DAG): number {
    // Risk = weighted average of node risks
    let totalRisk = 0;
    for (const node of dag.nodes) {
      const typeRisk = {
        'compute': 0.1,
        'memory_read': 0.05,
        'memory_write': 0.15,
        'validate': 0.2,
        'agent_task': 0.5
      }[node.type];
      const retryRisk = node.metadata.retry_policy.max_retries * 0.05;
      totalRisk += typeRisk + retryRisk;
    }
    return Math.min(totalRisk / dag.nodes.length, 1.0);
  }

  private estimateDuration(dag: DAG): number {
    return dag.nodes.reduce((sum, n) => sum + n.metadata.timeout_ms, 0);
  }

  private buildAdjacency(dag: DAG): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const node of dag.nodes) adj.set(node.id, []);
    for (const edge of dag.edges) {
      adj.get(edge.from)?.push(edge.to);
    }
    return adj;
  }
}
