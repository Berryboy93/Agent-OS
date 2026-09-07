import { z } from 'zod';

export const Capability = z.object({
  id: z.string().min(1),
  resource: z.string().min(1),
  action: z.string().min(1),
  scope: z.string().min(1),
  constraints: z.record(z.string(), z.unknown()).default({})
});

export type Capability = z.infer<typeof Capability>;

export const AgentProfile = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  capabilities: z.array(Capability),
  max_concurrent_tasks: z.number().int().positive().default(1),
  trust_level: z.number().min(0).max(1).default(0.5)
});

export type AgentProfile = z.infer<typeof AgentProfile>;

export interface CapabilityRequest {
  resource: string;
  action: string;
  scope: string;
  executor?: string;
  context?: Record<string, unknown>;
}

export class CapabilityManager {
  private profiles = new Map<string, AgentProfile>();

  registerProfile(profile: AgentProfile): void {
    const validated = AgentProfile.parse(profile);
    this.profiles.set(validated.id, validated);
  }

  authorize(
    agentId: string,
    request: CapabilityRequest,
  ): { allowed: boolean; reason?: string; capability?: Capability } {
    const profile = this.profiles.get(agentId);

    if (!profile) {
      return {
        allowed: false,
        reason: 'Agent profile not found'
      };
    }

    const context = request.context ?? {};

    const candidates = profile.capabilities.filter(
      capability =>
        capability.resource === request.resource &&
        capability.action === request.action &&
        capability.scope === request.scope
    );

    if (candidates.length === 0) {
      return {
        allowed: false,
        reason:
          `Capability ${request.resource}:${request.action}` +
          ` with scope ${request.scope} not granted`
      };
    }

    for (const capability of candidates) {
      const result = this.checkConstraints(
        capability,
        request,
        context,
      );

      if (result.allowed) {
        return {
          allowed: true,
          capability
        };
      }
    }

    const reasons = candidates
      .map(capability =>
        this.constraintFailureReason(capability, request, context)
      )
      .filter(Boolean);

    return {
      allowed: false,
      reason: reasons[0] ?? 'Capability constraints rejected request'
    };
  }

  checkCapability(
    agentId: string,
    resource: string,
    action: string,
  ): boolean {
    const profile = this.profiles.get(agentId);
    if (!profile) return false;

    return profile.capabilities.some(
      capability =>
        capability.resource === resource &&
        capability.action === action
    );
  }

  checkCapabilityWithConstraints(
    agentId: string,
    resource: string,
    action: string,
    context: Record<string, unknown>,
  ): { allowed: boolean; reason?: string } {
    const profile = this.profiles.get(agentId);
    if (!profile) {
      return {
        allowed: false,
        reason: 'Agent profile not found'
      };
    }

    const capability = profile.capabilities.find(
      item =>
        item.resource === resource &&
        item.action === action
    );

    if (!capability) {
      return {
        allowed: false,
        reason:
          `Capability ${resource}:${action} not granted`
      };
    }

    const request: CapabilityRequest = {
      resource,
      action,
      scope: capability.scope,
      context
    };

    return this.checkConstraints(
      capability,
      request,
      context
    );
  }

  getProfile(agentId: string): AgentProfile | undefined {
    return this.profiles.get(agentId);
  }

  revokeCapability(agentId: string, capabilityId: string): void {
    const profile = this.profiles.get(agentId);
    if (!profile) return;

    profile.capabilities = profile.capabilities.filter(
      capability => capability.id !== capabilityId
    );
  }

  private checkConstraints(
    capability: Capability,
    request: CapabilityRequest,
    context: Record<string, unknown>,
  ): { allowed: boolean; reason?: string } {
    const constraints = capability.constraints;

    if (
      request.executor !== undefined
    ) {
      const executors = constraints.executors;

      if (!Array.isArray(executors)) {
        return {
          allowed: false,
          reason:
            `Capability ${capability.id} is not bound to an executor`
        };
      }

      if (
        !executors.some(
          executor =>
            typeof executor === 'string' &&
            executor === request.executor
        )
      ) {
        return {
          allowed: false,
          reason:
            `Executor ${request.executor} is not allowed by capability ${capability.id}`
        };
      }
    }

    const maxSize = constraints.max_size;

    if (
      typeof maxSize === 'number' &&
      typeof context.size === 'number' &&
      context.size > maxSize
    ) {
      return {
        allowed: false,
        reason:
          `Size ${context.size} exceeds max ${maxSize}`
      };
    }

    const allowedPaths = constraints.allowed_paths;

    if (Array.isArray(allowedPaths) && context.path !== undefined) {
      if (typeof context.path !== 'string') {
        return {
          allowed: false,
          reason: 'Path constraint requires a string path'
        };
      }

      const allowed = allowedPaths.some(
        root =>
          typeof root === 'string' &&
          this.isPathWithinRoot(context.path as string, root)
      );

      if (!allowed) {
        return {
          allowed: false,
          reason:
            `Path ${context.path} is not within an allowed path`
        };
      }
    }

    return { allowed: true };
  }

  private constraintFailureReason(
    capability: Capability,
    request: CapabilityRequest,
    context: Record<string, unknown>,
  ): string {
    return (
      this.checkConstraints(capability, request, context).reason ??
      `Capability ${capability.id} rejected request`
    );
  }

  private isPathWithinRoot(
    candidate: string,
    root: string,
  ): boolean {
    const path = require('node:path') as typeof import('node:path');

    const resolvedRoot = path.resolve(root);
    const resolvedCandidate = path.resolve(candidate);
    const relative = path.relative(
      resolvedRoot,
      resolvedCandidate,
    );

    return (
      relative === '' ||
      (
        !relative.startsWith('..') &&
        !path.isAbsolute(relative)
      )
    );
  }
}
