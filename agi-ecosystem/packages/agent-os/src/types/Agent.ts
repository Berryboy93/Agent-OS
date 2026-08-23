/**
 * Agent Types - Core identity and metadata
 */

import type { UUID, Identifiable, Versioned } from '@agi-ecosystem/shared';

export type AgentState = 
  | 'idle' 
  | 'initializing' 
  | 'active' 
  | 'paused' 
  | 'terminated' 
  | 'error';

export interface Agent extends Identifiable, Versioned {
  name: string;
  state: AgentState;
  capabilities: UUID[];
  permissions: Permission[];
  sandboxConfig: SandboxConfig;
  maxConcurrentTasks: number;
  currentTasks: number;
  metadata: {
    owner: string;
    domain: string;
    classification: 'internal' | 'external' | 'privileged';
    trustScore: number;
  };
}

export interface Permission {
  resource: string;
  action: 'read' | 'write' | 'execute' | 'admin';
  conditions?: string[];
}

export interface SandboxConfig {
  timeoutMs: number;
  memoryLimitMB: number;
  cpuLimitPercent: number;
  networkAccess: boolean;
  filesystemAccess: boolean;
  allowedModules: string[];
  blockedModules: string[];
}

export interface AgentRegistration {
  name: string;
  capabilities: string[];
  requestedPermissions: Permission[];
  sandboxConfig?: Partial<SandboxConfig>;
}
