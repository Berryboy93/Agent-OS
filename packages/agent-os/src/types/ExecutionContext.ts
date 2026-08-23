/**
 * Execution Context - Runtime state for a single task execution
 */

import type { UUID } from '@agi-ecosystem/shared';

export interface ExecutionContext {
  traceId: UUID;
  spanId: UUID;
  parentSpanId?: UUID;
  agentId: UUID;
  dagNodeId?: UUID;
  dagId?: UUID;
  startTime: number;
  deadline: number;
  permissions: string[];
  memory: Map<string, unknown>;
  events: ExecutionEvent[];
  state: 'running' | 'completed' | 'failed' | 'cancelled';
}

export interface ExecutionEvent {
  timestamp: number;
  type: 'start' | 'checkpoint' | 'capability_invoke' | 'capability_result' | 'error' | 'complete';
  data: Record<string, unknown>;
}

export interface ExecutionResult {
  traceId: UUID;
  agentId: UUID;
  success: boolean;
  output?: unknown;
  error?: string;
  executionTimeMs: number;
  eventsEmitted: number;
  capabilitiesInvoked: number;
}
