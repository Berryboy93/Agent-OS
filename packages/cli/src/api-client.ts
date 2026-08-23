import { AGENT_OS_VERSION } from '@agent-os/core';

const API_BASE = process.env['AGENT_OS_API_URL'] ?? 'http://localhost:5000';
const API_SECRET = process.env['DASHBOARD_SECRET'];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': `agos/${AGENT_OS_VERSION}`,
  };
  if (API_SECRET) headers['Authorization'] = `Bearer ${API_SECRET}`;

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const client = {
  getAgents: () => api<Array<{ id: string; name: string; version: string; description?: string }>>('/api/agents'),
  getRuns: () => api<Array<{ id: string; agent_id: string; status: string; created_at: number }>>('/api/runs'),
  getRun: (id: string) => api<{ id: string; agent_id: string; status: string; input_json: string; output_json?: string; error_message?: string; total_tokens: number; created_at: number }>(`/api/runs/${id}`),
  getRunEvents: (id: string) => api<Array<{ type: string; data: unknown; timestamp: number }>>(`/api/runs/${id}/events`),
  getStats: () => api<{ runs: { total: number }; tokens: { total: number }; approvals: { pending: number } }>('/api/stats'),
  getApprovals: () => api<Array<{ id: string; status: string; agent_id: string; created_at: number }>>('/api/approvals'),
  resolveApproval: (id: string, decision: 'APPROVED' | 'REJECTED', note?: string) => api<{ id: string; status: string }>(`/api/approvals/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ decision, note }),
  }),
  runAgent: (agentId: string, input: Record<string, unknown>, systemPrompt?: string) => api<{ runId: string; status: string }>('/api/run', {
    method: 'POST',
    body: JSON.stringify({ agentId, input, systemPrompt }),
  }),
  getDeployments: () => api<Array<{ id: string; status: string; agent_id: string; environment: string }>>('/api/deployments'),
  rollbackDeployment: (id: string) => api<{ rollbackDeploymentId: string }>(`/api/deployments/${id}/rollback`, { method: 'POST' }),
};
