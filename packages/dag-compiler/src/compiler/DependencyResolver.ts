/**
 * Dependency Resolution Engine
 * Resolves input/output port mappings and validates data flow
 */

import type { UUID } from '@agi-ecosystem/shared';
import { ValidationError } from '@agi-ecosystem/shared';
import type { DAG, DAGNode, DAGEdge } from '../types/DAG.js';

export interface ResolvedDependency {
  nodeId: UUID;
  dependencies: UUID[]; // Nodes this node depends on
  dependents: UUID[];  // Nodes that depend on this node
  inputPorts: Map<string, { sourceNodeId: UUID; sourcePort: string }>;
  outputPorts: Map<string, { targetNodeIds: UUID[]; targetPort: string }>;
}

export class DependencyResolver {
  resolve(dag: DAG): Map<UUID, ResolvedDependency> {
    const resolution = new Map<UUID, ResolvedDependency>();

    // Initialize all nodes
    for (const [id] of dag.nodes) {
      resolution.set(id, {
        nodeId: id,
        dependencies: [],
        dependents: [],
        inputPorts: new Map(),
        outputPorts: new Map(),
      });
    }

    // Resolve edges
    for (const edge of dag.edges) {
      const source = resolution.get(edge.sourceNodeId);
      const target = resolution.get(edge.targetNodeId);

      if (!source || !target) {
        throw new ValidationError(
          `Edge references non-existent node: ${edge.sourceNodeId} -> ${edge.targetNodeId}`,
          { edgeId: edge.id }
        );
      }

      // Track dependencies
      if (!target.dependencies.includes(edge.sourceNodeId)) {
        target.dependencies.push(edge.sourceNodeId);
      }
      if (!source.dependents.includes(edge.targetNodeId)) {
        source.dependents.push(edge.targetNodeId);
      }

      // Track port mappings
      target.inputPorts.set(edge.targetPort, {
        sourceNodeId: edge.sourceNodeId,
        sourcePort: edge.sourcePort,
      });

      const existingOutputs = source.outputPorts.get(edge.sourcePort);
      if (existingOutputs) {
        existingOutputs.targetNodeIds.push(edge.targetNodeId);
      } else {
        source.outputPorts.set(edge.sourcePort, {
          targetNodeIds: [edge.targetNodeId],
          targetPort: edge.targetPort,
        });
      }
    }

    // Validate all required inputs are connected
    for (const [id, node] of dag.nodes) {
      const resolved = resolution.get(id)!;

      for (const [port, value] of Object.entries(node.inputs)) {
        if (!resolved.inputPorts.has(port) && !value.startsWith('param:')) {
          throw new ValidationError(
            `Node ${node.name} (${id}) has unconnected input port: ${port}`,
            { nodeId: id, port }
          );
        }
      }
    }

    return resolution;
  }

  async findCriticalPath(dag: DAG, resolution: Map<UUID, ResolvedDependency>): Promise<UUID[]> {
    // Dynamic programming to find longest path
    const distances = new Map<UUID, number>();
    const predecessors = new Map<UUID, UUID | null>();

    for (const [id] of dag.nodes) {
      distances.set(id, 0);
      predecessors.set(id, null);
    }

    // Topological order is guaranteed at this point
    const sorter = new (await import('./TopologicalSorter.js')).TopologicalSorter();
    const { order } = sorter.sort(dag);

    for (const nodeId of order) {
      const resolved = resolution.get(nodeId)!;
      const node = dag.nodes.get(nodeId)!;
      const weight = node.timeoutMs; // Use timeout as weight proxy

      for (const depId of resolved.dependencies) {
        const newDist = (distances.get(depId) ?? 0) + weight;
        if (newDist > (distances.get(nodeId) ?? 0)) {
          distances.set(nodeId, newDist);
          predecessors.set(nodeId, depId);
        }
      }
    }

    // Find max distance node
    let maxNode: UUID = order[0];
    let maxDist = 0;
    for (const [id, dist] of distances) {
      if (dist > maxDist) {
        maxDist = dist;
        maxNode = id;
      }
    }

    // Reconstruct path
    const path: UUID[] = [];
    let current: UUID | null = maxNode;
    while (current) {
      path.unshift(current);
      current = predecessors.get(current) ?? null;
    }

    return path;
  }
}
