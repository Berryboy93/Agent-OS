import type { DAG, ValidationResult } from '../types.js';

export class DAGValidator {
  validate(dag: DAG): ValidationResult {
    const errors: string[] = [];

    if (!dag.nodes?.length) {
      errors.push("DAG must contain at least one node");
    }

    const nodeIds = new Set(dag.nodes.map(n => n.id));

    // Edge validation
    for (const edge of dag.edges) {
      if (!nodeIds.has(edge.from)) errors.push(`Unknown source node: ${edge.from}`);
      if (!nodeIds.has(edge.to)) errors.push(`Unknown target node: ${edge.to}`);
    }

    const exitPoints = this.findExitPoints(dag);
    if (exitPoints.length === 0 && dag.nodes.length > 0) {
      errors.push("No exit points found in DAG");
    }

    return {
      valid: errors.length === 0,
      errors,
      nodes: dag.nodes,
    };
  }

  private findExitPoints(dag: DAG): string[] {
    const incoming = new Set(dag.edges.map(e => e.to));
    return dag.nodes.filter(n => !incoming.has(n.id)).map(n => n.id);
  }
}
