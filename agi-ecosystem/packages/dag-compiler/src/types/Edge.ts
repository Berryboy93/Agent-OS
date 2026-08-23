import type { DAGEdge } from './DAG.js';
import type { UUID } from '@agi-ecosystem/shared';

export interface EdgeBuilder {
  from(sourceNodeId: UUID, port: string): EdgeBuilder;
  to(targetNodeId: UUID, port: string): EdgeBuilder;
  when(condition: string): EdgeBuilder;
  build(): DAGEdge;
}

export class DAGEdgeBuilder implements EdgeBuilder {
  private edge: Partial<DAGEdge> = {};

  from(sourceNodeId: UUID, port: string): EdgeBuilder {
    this.edge.sourceNodeId = sourceNodeId;
    this.edge.sourcePort = port;
    return this;
  }

  to(targetNodeId: UUID, port: string): EdgeBuilder {
    this.edge.targetNodeId = targetNodeId;
    this.edge.targetPort = port;
    return this;
  }

  when(condition: string): EdgeBuilder {
    this.edge.condition = condition;
    return this;
  }

  build(): DAGEdge {
    if (!this.edge.sourceNodeId || !this.edge.targetNodeId) {
      throw new Error('Edge must have source and target');
    }
    return {
      id: crypto.randomUUID(),
      sourceNodeId: this.edge.sourceNodeId,
      targetNodeId: this.edge.targetNodeId,
      sourcePort: this.edge.sourcePort ?? 'default',
      targetPort: this.edge.targetPort ?? 'default',
      condition: this.edge.condition,
    };
  }
}
