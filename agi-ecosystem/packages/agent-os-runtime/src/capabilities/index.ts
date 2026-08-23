import { z } from 'zod';

export const Capability = z.object({
  id: z.string(),
  resource: z.string(), // e.g., "memory", "network", "file_system"
  action: z.string(),   // e.g., "read", "write", "execute"
  scope: z.string(),    // e.g., "sandbox", "global", "isolated"
  constraints: z.record(z.any()).default({})
});
export type Capability = z.infer<typeof Capability>;

export const AgentProfile = z.object({
  id: z.string().uuid(),
  name: z.string(),
  capabilities: z.array(Capability),
  max_concurrent_tasks: z.number().int().positive().default(1),
  trust_level: z.number().min(0).max(1).default(0.5)
});
export type AgentProfile = z.infer<typeof AgentProfile>;

export class CapabilityManager {
  private profiles = new Map<string, AgentProfile>();

  registerProfile(profile: AgentProfile): void {
    this.profiles.set(profile.id, profile);
  }

  checkCapability(agentId: string, resource: string, action: string): boolean {
    const profile = this.profiles.get(agentId);
    if (!profile) return false;

    return profile.capabilities.some(cap => 
      cap.resource === resource && cap.action === action
    );
  }

  checkCapabilityWithConstraints(
    agentId: string, 
    resource: string, 
    action: string,
    context: Record<string, any>
  ): { allowed: boolean; reason?: string } {
    const profile = this.profiles.get(agentId);
    if (!profile) return { allowed: false, reason: 'Agent profile not found' };

    const cap = profile.capabilities.find(c => 
      c.resource === resource && c.action === action
    );
    if (!cap) return { allowed: false, reason: `Capability ${resource}:${action} not granted` };

    // Check constraints
    if (cap.constraints.max_size && context.size > cap.constraints.max_size) {
      return { allowed: false, reason: `Size ${context.size} exceeds max ${cap.constraints.max_size}` };
    }
    if (cap.constraints.allowed_paths && context.path) {
      const allowed = cap.constraints.allowed_paths.some((p: string) => 
        context.path.startsWith(p)
      );
      if (!allowed) return { allowed: false, reason: `Path ${context.path} not in allowed paths` };
    }

    return { allowed: true };
  }

  getProfile(agentId: string): AgentProfile | undefined {
    return this.profiles.get(agentId);
  }

  revokeCapability(agentId: string, capabilityId: string): void {
    const profile = this.profiles.get(agentId);
    if (profile) {
      profile.capabilities = profile.capabilities.filter(c => c.id !== capabilityId);
    }
  }
}
