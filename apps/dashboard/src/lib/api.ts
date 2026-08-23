/**
 * Agent-OS API Client
 * Standalone module — import into any component. Does not modify your UI.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const secret = localStorage.getItem('dashboard_secret');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      ...(options?.headers || {}),
    } as Record<string, string>,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
  db: string;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  agent_version: string;
  status: 'COMPLETED' | 'FAILED' | 'RUNNING' | 'RESUMING';
  input_json: string;
  output_json: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  correlation_id: string;
  started_at: number;
  completed_at: number | null;
  created_at: number;
}

export interface AgentEvent {
  id: string;
  run_id: string;
  agent_id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface Deployment {
  id: string;
  agent_id: string;
  version: string;
  status: 'ACTIVE' | 'INACTIVE' | 'FAILED' | 'ROLLED_BACK';
  target: string;
  config_json: string;
  deployed_by: string;
  deployed_at: number;
  created_at: number;
}

export interface ApprovalRequest {
  id: string;
  execution_id: string;
  pipeline_run_id: string;
  step_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  payload_json: string;
  prompt_json: string;
  expires_at: number;
  created_at: number;
  resolved_at: number | null;
  resolved_by: string | null;
  resolution_note: string | null;
}

export interface DashboardStats {
  runs: { total: number; byStatus: Array<{ status: string; count: number }> };
  tokens: { total: number };
  events: { lastHour: number };
  checkpoints: { total: number };
  approvals: { pending: number };
  deployments: { active: number };
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const api = {
  /** GET /api/health — Backend health check */
  health: () => apiFetch<HealthResponse>('/api/health'),

  /** GET /api/agents — List all agents */
  getAgents: () => apiFetch<any[]>('/api/agents'),

  /** GET /api/agents/:id/runs — Runs for a specific agent */
  getAgentRuns: (id: string, limit = 50) =>
    apiFetch<AgentRun[]>(`/api/agents/${id}/runs?limit=${limit}`),

  /** GET /api/runs — List all runs */
  getRuns: (limit = 50) => apiFetch<AgentRun[]>(`/api/runs?limit=${limit}`),

  /** GET /api/runs/:id — Single run details */
  getRun: (id: string) => apiFetch<AgentRun>(`/api/runs/${id}`),

  /** GET /api/runs/:id/events — Events for a run */
  getRunEvents: (id: string, limit = 500, cursor?: string) =>
    apiFetch<AgentEvent[]>(`/api/runs/${id}/events?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),

  /** GET /api/runs/:id/checkpoints — Checkpoints for a run */
  getRunCheckpoints: (id: string) =>
    apiFetch<any[]>(`/api/runs/${id}/checkpoints`),

  /** GET /api/pipelines — List pipelines */
  getPipelines: () => apiFetch<any[]>('/api/pipelines'),

  /** GET /api/deployments — List deployments */
  getDeployments: () => apiFetch<Deployment[]>('/api/deployments'),

  /** POST /api/deployments/:id/rollback — Rollback a deployment */
  rollbackDeployment: (id: string) =>
    apiFetch<{ rollbackDeploymentId: string; status: string; originalId: string }>(
      `/api/deployments/${id}/rollback`, { method: 'POST' }
    ),

  /** GET /api/approvals — List approval requests */
  getApprovals: () => apiFetch<ApprovalRequest[]>('/api/approvals'),

  /** POST /api/approvals/:id/resolve — Approve or reject */
  resolveApproval: (id: string, decision: 'APPROVED' | 'REJECTED', note?: string, resolvedBy?: string) =>
    apiFetch<{ id: string; status: string; resolvedAt: string }>(
      `/api/approvals/${id}/resolve`,
      { method: 'POST', body: JSON.stringify({ decision, note, resolvedBy }) }
    ),

  /** GET /api/events — Recent events */
  getEvents: (limit = 100) => apiFetch<AgentEvent[]>(`/api/events?limit=${limit}`),

  /** GET /api/stats — Dashboard statistics */
  getStats: () => apiFetch<DashboardStats>('/api/stats'),

  /** POST /api/runs/demo — Create a demo run */
  createDemoRun: () => apiFetch<{ runId: string; status: string }>('/api/runs/demo', { method: 'POST' }),

  /** POST /api/approvals/demo — Create a demo approval */
  createDemoApproval: () => apiFetch<{ id: string; executionId: string; status: string }>('/api/approvals/demo', { method: 'POST' }),

  /** POST /api/deployments/demo — Create a demo deployment */
  createDemoDeployment: () => apiFetch<{ id: string; agentId: string; status: string; target: string }>('/api/deployments/demo', { method: 'POST' }),

  /** POST /api/run — Execute a real agent run */
  runAgent: (body: {
    agentId?: string;
    input?: Record<string, unknown>;
    systemPrompt?: string;
    tokenBudget?: { maxTotalTokens: number; onBudgetExceeded: 'hard_stop' | 'warn' | 'graceful_finish' };
  }) => apiFetch<{ runId: string; status: string; message: string }>('/api/run', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
};

export default api;
