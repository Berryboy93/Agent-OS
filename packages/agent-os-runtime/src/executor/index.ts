import { DAGNode, ExecutionPlan } from '@agi-ecosystem/dag-compiler';
import { AgentSandbox, SandboxResult } from '../sandbox/index.js';
import { CapabilityManager } from '../capabilities/index.js';
import { EventEmitter } from '../events/index.js';

export interface ExecutionContext {
  agent_id: string;
  session_id: string;
  plan: ExecutionPlan;
  variables: Map<string, any>;
}

export interface NodeExecutionResult {
  node_id: string;
  success: boolean;
  output: any;
  sandbox_result: SandboxResult;
  events_emitted: string[];
}

export class AgentExecutor {
  private sandbox: AgentSandbox;
  private capabilityManager: CapabilityManager;
  private eventEmitter: EventEmitter;
  private context: ExecutionContext;

  constructor(
    context: ExecutionContext,
    capabilityManager: CapabilityManager,
    eventEmitter: EventEmitter
  ) {
    this.context = context;
    this.capabilityManager = capabilityManager;
    this.eventEmitter = eventEmitter;
    this.sandbox = new AgentSandbox({
      timeout_ms: 30000,
      memory_limit_mb: 256,
      network_access: false,
      file_system_access: false
    });
  }

  async executeNode(node: DAGNode): Promise<NodeExecutionResult> {
    // 1. Capability check
    const capCheck = this.capabilityManager.checkCapabilityWithConstraints(
      this.context.agent_id,
      'compute',
      'execute',
      { executor: node.executor, payload: node.payload }
    );
    if (!capCheck.allowed) {
      throw new Error(`Capability denied: ${capCheck.reason}`);
    }

    // 2. Emit pre-execution event
    await this.eventEmitter.emit({
      type: 'node_execution_start',
      payload: {
        node_id: node.id,
        agent_id: this.context.agent_id,
        session_id: this.context.session_id,
        executor: node.executor
      }
    });

    // 3. Prepare execution code
    const code = this.generateExecutionCode(node);
    const input = this.prepareInput(node);

    // 4. Execute in sandbox
    const sandboxResult = await this.sandbox.execute(code, input);

    // 5. Store output in context variables
    if (sandboxResult.success) {
      this.context.variables.set(node.id, sandboxResult.output);
    }

    // 6. Emit post-execution event
    await this.eventEmitter.emit({
      type: sandboxResult.success ? 'node_execution_success' : 'node_execution_failure',
      payload: {
        node_id: node.id,
        agent_id: this.context.agent_id,
        session_id: this.context.session_id,
        duration_ms: sandboxResult.execution_time_ms,
        output: sandboxResult.success ? sandboxResult.output : null,
        error: sandboxResult.error
      }
    });

    return {
      node_id: node.id,
      success: sandboxResult.success,
      output: sandboxResult.output,
      sandbox_result: sandboxResult,
      events_emitted: [node.id]
    };
  }

  private generateExecutionCode(node: DAGNode): string {
    // In production, this would dispatch to registered executors
    // For now, generate a simple wrapper
    return `
      // Agent OS Runtime — Auto-generated execution wrapper
      // Executor: ${node.executor}
      // Node ID: ${node.id}

      const result = (function() {
        ${node.executor === 'math.add' ? 'return input_a + input_b;' : ''}
        ${node.executor === 'agent.analyze' ? 'return { analysis: "completed", query: input_query };' : ''}
        ${node.executor === 'store.result' ? 'return { stored: true, key: input_key };' : ''}
        return { executor: "${node.executor}", status: "executed" };
      })();

      result;
    `;
  }

  private prepareInput(node: DAGNode): Record<string, any> {
    const input: Record<string, any> = {};
    for (const [key, value] of Object.entries(node.payload)) {
      input[`input_${key}`] = value;
    }
    return input;
  }

  async executePlan(): Promise<Map<string, NodeExecutionResult>> {
    const results = new Map<string, NodeExecutionResult>();

    for (const stage of this.context.plan.stages) {
      // Execute nodes in parallel within each stage
      const stageResults = await Promise.all(
        stage.map((nodeId: string) => {
          // In production, look up node from plan
          // For now, create a placeholder
          const node: DAGNode = {
            id: nodeId,
            type: 'compute',
            executor: 'default',
            payload: {},
            metadata: { priority: 50, timeout_ms: 30000, retry_policy: { max_retries: 3, backoff_ms: 1000 } }
          };
          return this.executeNode(node);
        })
      );

      for (const result of stageResults) {
        results.set(result.node_id, result);
      }
    }

    return results;
  }
}
