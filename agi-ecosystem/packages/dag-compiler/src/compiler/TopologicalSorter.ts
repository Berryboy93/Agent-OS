/**
 * Topological Sorting with Kahn's Algorithm
 * O(V + E) complexity
 * Detects cycles (which violate DAG constraints)
 */

import type { UUID } from '@agi-ecosystem/shared';
import { ValidationError } from '@agi-ecosystem/shared';
import type { DAG, CompiledDAG } from '../types/DAG.js';

export interface SortResult {
  order: UUID[];
  stages: UUID[][];
  levels: Map<UUID, number>; // Topological level of each node
}

export class TopologicalSorter {
  sort(dag: DAG): SortResult {
    const inDegree = new Map<UUID, number>();
    const adjacency = new Map<UUID, UUID[]>();

    // Initialize
    for (const [id] of dag.nodes) {
      inDegree.set(id, 0);
      adjacency.set(id, []);
    }

    // Build adjacency and in-degree
    for (const edge of dag.edges) {
      const current = inDegree.get(edge.targetNodeId) ?? 0;
      inDegree.set(edge.targetNodeId, current + 1);
      adjacency.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    }

    // Kahn's algorithm
    const queue: UUID[] = [];
    const levels = new Map<UUID, number>();

    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
        levels.set(id, 0);
      }
    }

    const order: UUID[] = [];
    const stages: UUID[][] = [];
    let currentStage: UUID[] = [];
    let stageLevel = 0;

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      order.push(nodeId);

      const level = levels.get(nodeId)!;
      if (level > stageLevel) {
        stages.push(currentStage);
        currentStage = [nodeId];
        stageLevel = level;
      } else {
        currentStage.push(nodeId);
      }

      for (const neighbor of adjacency.get(nodeId) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
          levels.set(neighbor, level + 1);
        }
      }
    }

    if (currentStage.length > 0) {
      stages.push(currentStage);
    }

    // Cycle detection
    if (order.length !== dag.nodes.size) {
      const cycleNodes = Array.from(dag.nodes.keys()).filter(id => !order.includes(id));
      throw new ValidationError(
        `Cycle detected in DAG. Unreachable nodes: ${cycleNodes.join(', ')}`,
        { dagId: dag.id, cycleNodes }
      );
    }

    return { order, stages, levels };
  }
}
