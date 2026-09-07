import type { DAGNode, ExecutionPlan } from '@agi-ecosystem/dag-compiler';
import {
  AgentSandbox,
  type SandboxResult,
} from '../sandbox/index.js';
import {
  CapabilityManager,
  type Capability,
} from '../capabilities/index.js';
import { EventEmitter } from '../events/index.js';
import { MythosEngine } from '@agi-ecosystem/mythos-policy-engine';

export interface ExecutionContext {
  agent_id: string;
  session_id: string;
  plan: ExecutionPlan;
  variables: Map<string, unknown>;
  nodes: ReadonlyMap<string, DAGNode>;
}

export interface NodeExecutionResult {
  node_id: string;
  success: boolean;
  output: unknown;
  sandbox_result: SandboxResult;
  events_emitted: string[];
}

interface AuthorizationRequest {
  resource: string;
  action: string;
  scope: string;
}

export class AgentExecutor {
  private readonly sandbox: AgentSandbox;
  private readonly capabilityManager: CapabilityManager;
  private readonly eventEmitter: EventEmitter;
  private readonly mythos: MythosEngine;
  private readonly context: ExecutionContext;

  constructor(
    context: ExecutionContext,
    capabilityManager: CapabilityManager,
    eventEmitter: EventEmitter,
    mythos: MythosEngine,
  ) {
    this.context = context;
    this.capabilityManager = capabilityManager;
    this.eventEmitter = eventEmitter;
    this.mythos = mythos;

    this.sandbox = new AgentSandbox({
      timeout_ms: 30000,
      memory_limit_mb: 256,
      network_access: false,
      file_system_access: false,
    });
  }

  async executeNode(
    node: DAGNode,
  ): Promise<NodeExecutionResult> {
    const profile = this.capabilityManager.getProfile(
      this.context.agent_id,
    );

    if (!profile) {
      throw new Error(
        `Execution denied: agent profile not found for ${this.context.agent_id}`
      );
    }

    const request = this.getAuthorizationRequest(node);
    const payloadSize = JSON.stringify(node.payload).length;

    const capabilityCheck =
      this.capabilityManager.authorize(
        this.context.agent_id,
        {
          ...request,
          executor: node.executor,
          context: {
            executor: node.executor,
            path:
              typeof node.payload.path === 'string'
                ? node.payload.path
                : undefined,
            size: payloadSize,
            node_id: node.id,
          },
        },
      );

    if (!capabilityCheck.allowed) {
      throw new Error(
        `Capability denied: ${capabilityCheck.reason}`
      );
    }

    const capability = capabilityCheck.capability;
    if (!capability) {
      throw new Error(
        'Capability authorization succeeded without a capability'
      );
    }

    const mythosDecision = this.mythos.evaluate(
      'pre_execution',
      {
        agent_id: this.context.agent_id,
        session_id: this.context.session_id,
        risk_score: this.context.plan.risk_score,
        trust_level: profile.trust_level,
        payload: node.payload,
        data: {
          node_id: node.id,
          node_type: node.type,
          executor: node.executor,
          resource: request.resource,
          action: request.action,
          scope: request.scope,
          capability_id: capability.id,
        },
      },
    );

    if (!mythosDecision.allowed) {
      throw new Error(
        `Mythos policy denied execution: ${mythosDecision.reasons.join('; ')}`
      );
    }

    await this.eventEmitter.emit({
      type: 'node_execution_start',
      payload: {
        node_id: node.id,
        agent_id: this.context.agent_id,
        session_id: this.context.session_id,
        executor: node.executor,
        capability_id: capability.id,
      },
    });

    const code = this.generateExecutionCode(node);
    const input = this.prepareInput(node);

    const sandboxResult = await this.sandbox.execute(
      code,
      input,
    );

    if (sandboxResult.success) {
      this.context.variables.set(
        node.id,
        sandboxResult.output,
      );
    }

    await this.eventEmitter.emit({
      type: sandboxResult.success
        ? 'node_execution_success'
        : 'node_execution_failure',
      payload: {
        node_id: node.id,
        agent_id: this.context.agent_id,
        session_id: this.context.session_id,
        duration_ms: sandboxResult.execution_time_ms,
        output: sandboxResult.success
          ? sandboxResult.output
          : null,
        error: sandboxResult.error,
      },
    });

    return {
      node_id: node.id,
      success: sandboxResult.success,
      output: sandboxResult.output,
      sandbox_result: sandboxResult,
      events_emitted: [node.id],
    };
  }

  private getAuthorizationRequest(
    node: DAGNode,
  ): AuthorizationRequest {
    switch (node.type) {
      case 'memory_read':
        return {
          resource: 'memory',
          action: 'read',
          scope: 'isolated',
        };

      case 'memory_write':
        return {
          resource: 'memory',
          action: 'write',
          scope: 'isolated',
        };

      case 'compute':
      case 'validate':
      case 'agent_task':
      default:
        return {
          resource: 'compute',
          action: 'execute',
          scope: 'sandbox',
        };
    }
  }

  private generateExecutionCode(
    node: DAGNode,
  ): string {
    switch (node.executor) {
      case 'math.add':
        return 'return input_a + input_b;';

      case 'agent.analyze':
        return `
          return {
            analysis: 'completed',
            query: input_query
          };
        `;

      case 'store.result':
        return `
          return {
            stored: true,
            key: input_key
          };
        `;

      default:
        throw new Error(
          `Unsupported executor: ${node.executor}`
        );
    }
  }

  private prepareInput(
    node: DAGNode,
  ): Record<string, unknown> {
    const input: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(
      node.payload,
    )) {
      input[key] = value;
    }

    return input;
  }

  async executePlan(): Promise<
    Map<string, NodeExecutionResult>
  > {
    const results = new Map<
      string,
      NodeExecutionResult
    >();

    for (const stage of this.context.plan.stages) {
      const stageResults = await Promise.all(
        stage.map(nodeId => {
          const node = this.context.nodes.get(nodeId);

          if (!node) {
            throw new Error(
              `Planned node ${nodeId} not found in execution context`
            );
          }

          return this.executeNode(node);
        }),
      );

      for (const result of stageResults) {
        results.set(result.node_id, result);
      }
    }

    return results;
  }
}
