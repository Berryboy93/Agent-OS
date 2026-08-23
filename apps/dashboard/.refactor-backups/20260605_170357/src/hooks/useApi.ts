/**
 * Pre-wired React Query hooks for Agent-OS API
 * Auto-refresh, caching, and error handling built-in.
 * Import these into YOUR existing components.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// ─── Read Queries (auto-refresh every 10s) ────────────────────────────────────

/** Backend health — refreshes every 5s */
export const useHealth = () =>
  useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 5000 });

/** Dashboard stats — enabled only after health passes */
export const useStats = () => {
  const { data: health } = useHealth();
  return useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    enabled: !!health,
    refetchInterval: 10000,
  });
};

/** List all agents */
export const useAgents = () =>
  useQuery({ queryKey: ['agents'], queryFn: api.getAgents, refetchInterval: 10000 });

/** List runs (default 50) */
export const useRuns = (limit = 50) =>
  useQuery({ queryKey: ['runs', limit], queryFn: () => api.getRuns(limit), refetchInterval: 10000 });

/** List deployments */
export const useDeployments = () =>
  useQuery({ queryKey: ['deployments'], queryFn: api.getDeployments, refetchInterval: 10000 });

/** List approval requests */
export const useApprovals = () =>
  useQuery({ queryKey: ['approvals'], queryFn: api.getApprovals, refetchInterval: 10000 });

/** List recent events */
export const useEvents = (limit = 100) =>
  useQuery({ queryKey: ['events', limit], queryFn: () => api.getEvents(limit), refetchInterval: 10000 });

// ─── Write Mutations (auto-invalidate related queries) ────────────────────────

/** Create a demo run — invalidates 'runs' cache on success */
export const useCreateDemoRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createDemoRun,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['runs'] }),
  });
};

/** Create a demo approval — invalidates 'approvals' cache */
export const useCreateDemoApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createDemoApproval,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
};

/** Create a demo deployment — invalidates 'deployments' cache */
export const useCreateDemoDeployment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createDemoDeployment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deployments'] }),
  });
};

/** Resolve an approval — invalidates 'approvals' cache */
export const useResolveApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) =>
      api.resolveApproval(id, decision),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
};

/** Rollback a deployment — invalidates 'deployments' cache */
export const useRollbackDeployment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.rollbackDeployment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deployments'] }),
  });
};

/** Run a real agent — invalidates 'runs' cache */
export const useRunAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.runAgent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['runs'] }),
  });
};
