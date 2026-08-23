import { apiFetch } from './api';
import type { Tool, ToolExecution, ToolStats, ToolFilter } from '../types/tools';

export type { Tool, ToolExecution, ToolStats, ToolFilter };

export const toolsApi = {
  listTools: (filters?: ToolFilter) =>
    apiFetch<Tool[]>('/api/tools', {
      method: 'GET',
      body: filters ? JSON.stringify(filters) : undefined,
    }),

  getTool: (id: string) =>
    apiFetch<Tool>(`/api/tools/${id}`),

  createTool: (tool: Omit<Tool, 'id' | 'registeredAt' | 'status'>) =>
    apiFetch<Tool>('/api/tools/register', {
      method: 'POST',
      body: JSON.stringify(tool),
    }),

  updateTool: (id: string, updates: Partial<Tool>) =>
    apiFetch<Tool>(`/api/tools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteTool: (id: string) =>
    apiFetch(`/api/tools/${id}`, { method: 'DELETE' }),

  executeTool: (id: string, parameters: Record<string, unknown>) =>
    apiFetch<ToolExecution>(`/api/tools/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ parameters }),
    }),

  getExecutions: (toolId?: string, limit = 50) =>
    apiFetch<ToolExecution[]>('/api/tools/executions', {
      method: 'GET',
      body: JSON.stringify({ toolId, limit }),
    }),

  getExecution: (executionId: string) =>
    apiFetch<ToolExecution>(`/api/tools/executions/${executionId}`),

  cancelExecution: (executionId: string) =>
    apiFetch(`/api/tools/executions/${executionId}/cancel`, { method: 'POST' }),

  getStats: () =>
    apiFetch<ToolStats>('/api/tools/stats'),

  healthCheck: (id: string) =>
    apiFetch<{ healthy: boolean; latency: number; message: string }>(`/api/tools/${id}/health`),
};

export default toolsApi;
