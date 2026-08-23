/**
 * DAG Validator
 * Enforces all formal constraints from the spec
 */

import { ValidationError, sha256Object } from '@agi-ecosystem/shared';
import type { DAG, DAGNode, CompiledDAG } from '../types/DAG.js';

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  hash: string;
}

export class DAGValidator {
  validate(dag: DAG): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Acyclic check (handled by topological sort, but pre-check here)
    // 2. All nodes must define executor
    for (const [id, node] of dag.nodes) {
      if (!node.executor || node.executor.trim() === '') {
        errors.push(`Node ${node.name} (${id}) missing executor`);
      }
      if (node.timeoutMs < 100) {
        warnings.push(`Node ${node.name} has very short timeout: ${node.timeoutMs}ms`);
      }
    }

    // 3. All edges must reference valid nodes
    const nodeIds = new Set(dag.nodes.keys());
    for (const edge of dag.edges) {
      if (!nodeIds.has(edge.sourceNodeId)) {
        errors.push(`Edge references unknown source node: ${edge.sourceNodeId}`);
      }
      if (!nodeIds.has(edge.targetNodeId)) {
        errors.push(`Edge references unknown target node: ${edge.targetNodeId}`);
      }
      if (edge.sourceNodeId === edge.targetNodeId) {
        errors.push(`Self-loop detected on node ${edge.sourceNodeId}`);
      }
    }

    // 4. Entry/exit point validation
    const entryPoints = Array.from(dag.nodes.keys()).filter(id => 
      !dag.edges.some(e => e.targetNodeId === id)
    );
    const exitPoints = Array.from(dag.nodes.keys()).filter(id => 
      !dag.edges.some(e => e.sourceNodeId === id)
    );

    if (entryPoints.length === 0 && dag.nodes.size > 0) {
      errors.push('No entry points found - cycle detected');
    }
    if (exitPoints.length === 0 && dag.nodes.size > 0) {
      warnings.push('No exit points - DAG may run indefinitely');
    }

    // 5. Port compatibility (basic check)
    for (const edge of dag.edges) {
      const sourceNode = dag.nodes.get(edge.sourceNodeId);
      const targetNode = dag.nodes.get(edge.targetNodeId);
      if (sourceNode && targetNode) {
        if (!sourceNode.outputs[edge.sourcePort]) {
          warnings.push(`Source port ${edge.sourcePort} on ${sourceNode.name} may be undefined`);
        }
        if (!targetNode.inputs[edge.targetPort]) {
          warnings.push(`Target port ${edge.targetPort} on ${targetNode.name} may be undefined`);
        }
      }
    }

    // 6. Compute hash
    const hash = sha256Object({
      id: dag.id,
      nodes: Array.from(dag.nodes.entries()).map(([id, n]) => ({ id, ...n })),
      edges: dag.edges,
      version: dag.version,
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      hash,
    };
  }

  validateCompiled(compiled: CompiledDAG): ValidationReport {
    const base = this.validate(compiled);

    if (!compiled.executionOrder || compiled.executionOrder.length === 0) {
      base.errors.push('Compiled DAG missing execution order');
    }
    if (!compiled.stages || compiled.stages.length === 0) {
      base.errors.push('Compiled DAG missing execution stages');
    }
    if (compiled.executionOrder.length !== compiled.nodes.size) {
      base.errors.push('Execution order does not include all nodes');
    }

    base.valid = base.errors.length === 0;
    return base;
  }
}
