import { AGENT_OS_VERSION } from '@agent-os/core';
const API_BASE = process.env['AGENT_OS_API_URL'] ?? 'http://localhost:5000';
const API_SECRET = process.env['DASHBOARD_SECRET'];
async function api(path, options) {
    const url = `${API_BASE}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': `agos/${AGENT_OS_VERSION}`,
    };
    if (API_SECRET)
        headers['Authorization'] = `Bearer ${API_SECRET}`;
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json();
}
export const client = {
    getAgents: () => api('/api/agents'),
    getRuns: () => api('/api/runs'),
    getRun: (id) => api(`/api/runs/${id}`),
    getRunEvents: (id) => api(`/api/runs/${id}/events`),
    getStats: () => api('/api/stats'),
    getApprovals: () => api('/api/approvals'),
    resolveApproval: (id, decision, note) => api(`/api/approvals/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ decision, note }),
    }),
    runAgent: (agentId, input, systemPrompt) => api('/api/run', {
        method: 'POST',
        body: JSON.stringify({ agentId, input, systemPrompt }),
    }),
    getDeployments: () => api('/api/deployments'),
    rollbackDeployment: (id) => api(`/api/deployments/${id}/rollback`, { method: 'POST' }),
};
//# sourceMappingURL=api-client.js.map