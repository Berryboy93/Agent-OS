/**
 * Capability Manager
 * Registers, validates, and dispatches capabilities
 */

import type { UUID } from '@agi-ecosystem/shared';
import { ValidationError, SecurityError } from '@agi-ecosystem/shared';
import type { 
  Capability, 
  CapabilityInvocation, 
  CapabilityResult,
  ParameterSchema 
} from '../types/Capability.js';
import type { Agent, Permission } from '../types/Agent.js';

export class CapabilityManager {
  private capabilities = new Map<UUID, Capability>();
  private handlers = new Map<string, Function>();

  register(capability: Capability, handler: Function): void {
    if (this.capabilities.has(capability.id)) {
      throw new ValidationError(`Capability ${capability.id} already registered`);
    }
    this.capabilities.set(capability.id, capability);
    this.handlers.set(capability.handler, handler);
  }

  unregister(capabilityId: UUID): void {
    const cap = this.capabilities.get(capabilityId);
    if (cap) {
      this.handlers.delete(cap.handler);
      this.capabilities.delete(capabilityId);
    }
  }

  async invoke(
    invocation: CapabilityInvocation, 
    agent: Agent
  ): Promise<CapabilityResult> {
    const capability = this.capabilities.get(invocation.capabilityId);
    if (!capability) {
      throw new ValidationError(`Unknown capability: ${invocation.capabilityId}`);
    }

    // Permission check
    if (!this.hasPermission(agent, capability)) {
      throw new SecurityError(
        `Agent ${agent.id} lacks permission for capability ${capability.name}`,
        { agentId: agent.id, capabilityId: capability.id }
      );
    }

    // Parameter validation
    const validation = this.validateParameters(invocation.parameters, capability.parameters);
    if (!validation.valid) {
      throw new ValidationError(
        `Invalid parameters for ${capability.name}: ${validation.errors.join(', ')}`
      );
    }

    const startTime = Date.now();
    const timeout = Math.min(invocation.timeoutMs, capability.maxExecutionTimeMs);

    try {
      const handler = this.handlers.get(capability.handler);
      if (!handler) {
        throw new ValidationError(`No handler registered for ${capability.handler}`);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(
        () => handler(invocation.parameters, agent),
        timeout
      );

      return {
        success: true,
        data: result,
        executionTimeMs: Date.now() - startTime,
        traceId: invocation.traceId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Date.now() - startTime,
        traceId: invocation.traceId,
      };
    }
  }

  private hasPermission(agent: Agent, capability: Capability): boolean {
    const required = new Set(capability.requiredPermissions);

    for (const perm of agent.permissions) {
      for (const req of capability.requiredPermissions) {
        if (this.permissionMatches(perm, req)) {
          required.delete(req);
        }
      }
    }

    return required.size === 0;
  }

  private permissionMatches(permission: Permission, required: string): boolean {
    // Simple pattern matching: "memory:read:*" matches "memory:read:users"
    const permPattern = permission.resource.replace(/\*/g, '.*');
    const regex = new RegExp(`^${permPattern}$`);
    return regex.test(required);
  }

  private validateParameters(
    params: Record<string, unknown>, 
    schemas: ParameterSchema[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const schema of schemas) {
      const value = params[schema.name];

      if (schema.required && value === undefined) {
        errors.push(`Missing required parameter: ${schema.name}`);
        continue;
      }

      if (value !== undefined && typeof value !== schema.type) {
        errors.push(`Parameter ${schema.name} must be ${schema.type}, got ${typeof value}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>, 
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Capability execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  listCapabilities(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  getCapability(id: UUID): Capability | undefined {
    return this.capabilities.get(id);
  }
}
