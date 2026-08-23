import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';

/**
 * Hook for fetching runs with automatic refetching
 */
export function useRuns(filters?: { status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['runs', filters],
    queryFn: () => apiClient.listRuns(filters),
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 2000,
  });
}

/**
 * Hook for fetching a single run
 */
export function useRun(runId: string | null) {
  return useQuery({
    queryKey: ['run', runId],
    queryFn: () => (runId ? apiClient.getRun(runId) : null),
    enabled: !!runId,
    refetchInterval: 3000,
    staleTime: 1000,
  });
}

/**
 * Hook for creating a new run
 */
export function useCreateRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agent: string) => apiClient.createRun(agent),
    onSuccess: () => {
      // Invalidate runs cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
  });
}

/**
 * Hook for updating run status
 */
export function useUpdateRunStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, status }: { runId: string; status: string }) =>
      apiClient.updateRunStatus(runId, status),
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: ['run', runId] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
  });
}

/**
 * Hook for dispatching commands
 */
export function useDispatchCommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      runId,
      command,
      args,
    }: {
      runId: string;
      command: string;
      args?: Record<string, any>;
    }) => apiClient.dispatchCommand(runId, command, args),
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: ['run', runId] });
    },
  });
}

/**
 * Hook for RBAC roles
 */
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => apiClient.getRoles(),
    staleTime: 60000, // Cache for 1 minute
  });
}

/**
 * Hook for RBAC policies
 */
export function usePolicies() {
  return useQuery({
    queryKey: ['policies'],
    queryFn: () => apiClient.getPolicies(),
    staleTime: 60000,
  });
}

/**
 * Hook for health check
 */
export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.health(),
    refetchInterval: 10000, // Check every 10 seconds
    staleTime: 5000,
  });
}
