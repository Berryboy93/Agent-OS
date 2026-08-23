import type { DAGNode, NodeType, NodeStatus } from './DAG.js';
import type { UUID } from '@agi-ecosystem/shared';

export interface NodeBuilder {
  setType(type: NodeType): NodeBuilder;
  setName(name: string): NodeBuilder;
  setExecutor(executor: string): NodeBuilder;
  setConfig(config: Record<string, unknown>): NodeBuilder;
  setTimeout(timeoutMs: number): NodeBuilder;
  setPriority(priority: number): NodeBuilder;
  addInput(port: string, source: string): NodeBuilder;
  addOutput(port: string, destination: string): NodeBuilder;
  build(): DAGNode;
}

export class DAGNodeBuilder implements NodeBuilder {
  private node: Partial<DAGNode> = {};

  setType(type: NodeType): NodeBuilder {
    this.node.type = type;
    return this;
  }

  setName(name: string): NodeBuilder {
    this.node.name = name;
    return this;
  }

  setExecutor(executor: string): NodeBuilder {
    this.node.executor = executor;
    return this;
  }

  setConfig(config: Record<string, unknown>): NodeBuilder {
    this.node.config = config;
    return this;
  }

  setTimeout(timeoutMs: number): NodeBuilder {
    this.node.timeoutMs = timeoutMs;
    return this;
  }

  setPriority(priority: number): NodeBuilder {
    this.node.priority = Math.max(0, Math.min(100, priority));
    return this;
  }

  addInput(port: string, source: string): NodeBuilder {
    if (!this.node.inputs) this.node.inputs = {};
    this.node.inputs[port] = source;
    return this;
  }

  addOutput(port: string, destination: string): NodeBuilder {
    if (!this.node.outputs) this.node.outputs = {};
    this.node.outputs[port] = destination;
    return this;
  }

  build(): DAGNode {
    if (!this.node.type || !this.node.name || !this.node.executor) {
      throw new Error('Node must have type, name, and executor');
    }
    return {
      id: crypto.randomUUID(),
      type: this.node.type,
      name: this.node.name,
      executor: this.node.executor,
      config: this.node.config ?? {},
      status: 'pending',
      inputs: this.node.inputs ?? {},
      outputs: this.node.outputs ?? {},
      retryCount: 0,
      timeoutMs: this.node.timeoutMs ?? 30000,
      priority: this.node.priority ?? 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}
