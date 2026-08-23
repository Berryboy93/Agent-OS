import { api } from './api';
import type { Tool, ToolExecution, ToolStats, ToolFilter } from '../types/tools';

export const toolsApi = {
  // Tool Registry
  listTools: (filters?: ToolFilter) => 
    api.get<Tool[]>('/tools', { params: filters }),
  
  getTool: (id: string) => 
    api.get<Tool>(`/tools/${id}`),
  
  createTool: (tool: Omit<Tool, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'avgLatency' | 'errorRate'>) => 
    api.post<Tool>('/tools', tool),
  
  updateTool: (id: string, updates: Partial<Tool>) => 
    api.put<Tool>(`/tools/${id}`, updates),
  
  deleteTool: (id: string) => 
    api.delete(`/tools/${id}`),
  
  // Executions
  executeTool: (id: string, parameters: Record<string, unknown>) => 
    api.post<ToolExecution>(`/tools/${id}/execute`, { parameters }),
  
  getExecutions: (toolId?: string, limit = 50) => 
    api.get<ToolExecution[]>(`/tools/executions`, { params: { toolId, limit } }),
  
  getExecution: (executionId: string) => 
    api.get<ToolExecution>(`/tools/executions/${executionId}`),
  
  cancelExecution: (executionId: string) => 
    api.post(`/tools/executions/${executionId}/cancel`),
  
  // Stats
  getStats: () => 
    api.get<ToolStats>('/tools/stats'),
  
  // Health check
  healthCheck: (id: string) => 
    api.get<{ healthy: boolean; latency: number; message: string }>(`/tools/${id}/health`),
};