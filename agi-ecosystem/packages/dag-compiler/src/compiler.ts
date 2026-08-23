import { DAG, DAGNode, ExecutionPlan, CompilationResult } from "./types.js";

export class DAGCompiler {
  private adjacencyList: Map<string, string[]> = new Map();
  private inDegree: Map<string, number> = new Map();
  private nodes: Map<string, DAGNode> = new Map();

  compile(dag: DAG): CompilationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      this.buildGraph(dag);

      const cycle = this.detectCycle();
      if (cycle) {
        errors.push(`Cycle detected: ${cycle.join(" -> ")}`);
        return { success: false, errors, warnings };
      }

      const orphanNodes = this.findOrphanNodes(dag);
      if (orphanNodes.length > 0) {
        warnings.push(`Orphan nodes: ${orphanNodes.join(", ")}`);
      }

      const stages = this.topologicalSortStages();
      const criticalPath = this.findCriticalPath(dag);
      const estimatedDuration = this.estimateDuration(criticalPath);

      const plan: ExecutionPlan = {
        dagId: dag.id,
        stages,
        criticalPath,
        estimatedDurationMs: estimatedDuration
      };

      return { success: true, plan, errors, warnings };
    } catch (err) {
      errors.push(`Compilation error: ${err instanceof Error ? err.message : String(err)}`);
      return { success: false, errors, warnings };
    }
  }

  private buildGraph(dag: DAG): void {
    this.adjacencyList.clear();
    this.inDegree.clear();
    this.nodes.clear();

    for (const node of dag.nodes) {
      this.nodes.set(node.id, node);
      this.adjacencyList.set(node.id, []);
      this.inDegree.set(node.id, 0);
    }

    for (const edge of dag.edges) {
      this.adjacencyList.get(edge.from)!.push(edge.to);
      this.inDegree.set(edge.to, this.inDegree.get(edge.to)! + 1);
    }
  }

  private detectCycle(): string[] | null {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): string[] | null => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      for (const neighbor of this.adjacencyList.get(nodeId) || []) {
        if (!visited.has(neighbor)) {
          const cycle = dfs(neighbor, path);
          if (cycle) return cycle;
        } else if (recStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          return path.slice(cycleStart).concat(neighbor);
        }
      }

      path.pop();
      recStack.delete(nodeId);
      return null;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const cycle = dfs(nodeId, []);
        if (cycle) return cycle;
      }
    }

    return null;
  }

  private topologicalSortStages(): DAGNode[][] {
    const inDegree = new Map(this.inDegree);
    const stages: DAGNode[][] = [];
    let currentStage: DAGNode[] = [];

    while (true) {
      currentStage = [];
      for (const [nodeId, degree] of inDegree) {
        if (degree === 0 && this.nodes.has(nodeId)) {
          currentStage.push(this.nodes.get(nodeId)!);
        }
      }

      if (currentStage.length === 0) break;
      stages.push(currentStage);

      for (const node of currentStage) {
        inDegree.delete(node.id);
        for (const neighbor of this.adjacencyList.get(node.id) || []) {
          inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        }
      }
    }

    return stages;
  }

  private findCriticalPath(dag: DAG): string[] {
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string | null>();

    for (const node of dag.nodes) {
      distances.set(node.id, 0);
      predecessors.set(node.id, null);
    }

    const stages = this.topologicalSortStages();
    for (const stage of stages) {
      for (const node of stage) {
        for (const neighbor of this.adjacencyList.get(node.id) || []) {
          const newDist = distances.get(node.id)! + 1;
          if (newDist > distances.get(neighbor)!) {
            distances.set(neighbor, newDist);
            predecessors.set(neighbor, node.id);
          }
        }
      }
    }

    let maxNode = "";
    let maxDist = -1;
    for (const [nodeId, dist] of distances) {
      if (dist > maxDist) {
        maxDist = dist;
        maxNode = nodeId;
      }
    }

    const path: string[] = [];
    let current: string | null = maxNode;
    while (current) {
      path.unshift(current);
      current = predecessors.get(current) || null;
    }

    return path;
  }

  private estimateDuration(criticalPath: string[]): number {
    return criticalPath.reduce((sum, nodeId) => {
      const node = this.nodes.get(nodeId);
      return sum + (node?.metadata.timeoutMs || 30000);
    }, 0);
  }

  private findOrphanNodes(dag: DAG): string[] {
    const connected = new Set<string>();
    for (const edge of dag.edges) {
      connected.add(edge.from);
      connected.add(edge.to);
    }
    return dag.nodes.filter(n => !connected.has(n.id)).map(n => n.id);
  }
}
