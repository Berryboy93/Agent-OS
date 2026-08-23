import { DAG, DAGNode, DAGEdge } from '../types/index.js';

export class DAGValidator {
  private visited = new Set<string>();
  private recStack = new Set<string>();
  private adjacency = new Map<string, string[]>();

  validate(dag: DAG): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Check all nodes have executors
    for (const node of dag.nodes) {
      if (!node.executor || node.executor.trim() === '') {
        errors.push(`Node ${node.id} missing executor`);
      }
    }

    // 2. Build adjacency list
    this.adjacency.clear();
    for (const node of dag.nodes) {
      this.adjacency.set(node.id, []);
    }
    for (const edge of dag.edges) {
      if (!this.adjacency.has(edge.from)) {
        errors.push(`Edge references unknown node: ${edge.from}`);
      }
      if (!this.adjacency.has(edge.to)) {
        errors.push(`Edge references unknown node: ${edge.to}`);
      }
      this.adjacency.get(edge.from)?.push(edge.to);
    }

    // 3. Check entrypoint exists
    if (!this.adjacency.has(dag.entrypoint)) {
      errors.push(`Entrypoint ${dag.entrypoint} not found in nodes`);
    }

    // 4. Check all nodes are reachable from entrypoint
    const reachable = this.bfsReachable(dag.entrypoint);
    for (const node of dag.nodes) {
      if (!reachable.has(node.id)) {
        errors.push(`Node ${node.id} is unreachable from entrypoint`);
      }
    }

    // 5. Check acyclicity (DFS)
    this.visited.clear();
    this.recStack.clear();
    for (const node of dag.nodes) {
      if (!this.visited.has(node.id)) {
        if (this.hasCycle(node.id)) {
          errors.push(`Cycle detected involving node ${node.id}`);
          break;
        }
      }
    }

    // 6. Check all edges reference valid nodes
    const nodeIds = new Set(dag.nodes.map(n => n.id));
    for (const edge of dag.edges) {
      if (!nodeIds.has(edge.from)) errors.push(`Invalid edge.from: ${edge.from}`);
      if (!nodeIds.has(edge.to)) errors.push(`Invalid edge.to: ${edge.to}`);
    }

    return { valid: errors.length === 0, errors };
  }

  private bfsReachable(start: string): Set<string> {
    const visited = new Set<string>();
    const queue = [start];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const neighbors = this.adjacency.get(current) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) queue.push(n);
      }
    }
    return visited;
  }

  private hasCycle(nodeId: string): boolean {
    this.visited.add(nodeId);
    this.recStack.add(nodeId);

    const neighbors = this.adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!this.visited.has(neighbor)) {
        if (this.hasCycle(neighbor)) return true;
      } else if (this.recStack.has(neighbor)) {
        return true;
      }
    }

    this.recStack.delete(nodeId);
    return false;
  }

  getTopologicalOrder(dag: DAG): string[] {
    const inDegree = new Map<string, number>();
    for (const node of dag.nodes) {
      inDegree.set(node.id, 0);
    }
    for (const edge of dag.edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);
      const neighbors = this.adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    return order;
  }
}
