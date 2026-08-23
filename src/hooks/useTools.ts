import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toolsApi } from '../lib/toolsApi';
import type { ToolFilter, Tool, ToolExecution } from '../types/tools';

const TOOLS_KEY = 'tools';
const EXECUTIONS_KEY = 'tool-executions';
const STATS_KEY = 'tool-stats';

export function useTools(filters?: ToolFilter) {
  return useQuery({
    queryKey: [TOOLS_KEY, filters],
    queryFn: () => toolsApi.listTools(filters),
    staleTime: 30000,
  });
}

export function useTool(id: string) {
  return useQuery({
    queryKey: [TOOLS_KEY, id],
    queryFn: () => toolsApi.getTool(id),
    enabled: !!id,
  });
}

export function useToolStats() {
  return useQuery({
    queryKey: [STATS_KEY],
    queryFn: () => toolsApi.getStats(),
    refetchInterval: 30000,
  });
}

export function useToolExecutions(toolId?: string, limit = 50) {
  return useQuery({
    queryKey: [EXECUTIONS_KEY, toolId, limit],
    queryFn: () => toolsApi.getExecutions(toolId, limit),
    refetchInterval: 5000,
  });
}

export function useExecuteTool() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, parameters }: { id: string; parameters: Record<string, unknown> }) => 
      toolsApi.executeTool(id, parameters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXECUTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_KEY] });
      queryClient.invalidateQueries({ queryKey: [TOOLS_KEY] });
    },
  });
}

export function useCreateTool() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (tool: Omit<Tool, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'avgLatency' | 'errorRate'>) => 
      toolsApi.createTool(tool),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TOOLS_KEY] });
    },
  });
}

export function useUpdateTool() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Tool> }) => 
      toolsApi.updateTool(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TOOLS_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [TOOLS_KEY] });
    },
  });
}

export function useDeleteTool() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => toolsApi.deleteTool(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TOOLS_KEY] });
    },
  });
}