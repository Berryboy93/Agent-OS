/**
 * Capability Types - What agents can do
 */

import type { UUID, Identifiable } from '@agi-ecosystem/shared';

export type CapabilityType = 
  | 'compute' 
  | 'memory_access' 
  | 'tool_use' 
  | 'communication' 
  | 'observation';

export interface Capability extends Identifiable {
  name: string;
  type: CapabilityType;
  description: string;
  version: string;
  parameters: ParameterSchema[];
  requiredPermissions: string[];
  handler: string;
  maxExecutionTimeMs: number;
  idempotent: boolean;
}

export interface ParameterSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  validation?: string;
}

export interface CapabilityInvocation {
  capabilityId: UUID;
  agentId: UUID;
  parameters: Record<string, unknown>;
  traceId: UUID;
  timeoutMs: number;
}

export interface CapabilityResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTimeMs: number;
  traceId: UUID;
}
