import { useQuery, useMutation } from '@tanstack/react-query';

const API = '/api';

async function apiGet(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPost(url: string, body?: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/* -------------------------
   QUERIES
-------------------------- */

export const useHealth = () =>
  useQuery({
    queryKey: ['health'],
    queryFn: () => apiGet(`${API}/health`),
    staleTime: 60000,
  });

export const useStats = () =>
  useQuery({
    queryKey: ['stats'],
    queryFn: () => apiGet(`${API}/stats`),
    staleTime: 15000,
  });

export const useRuns = (limit = 50) =>
  useQuery({
    queryKey: ['runs', limit],
    queryFn: () => apiGet(`${API}/runs?limit=${limit}`),
    staleTime: 10000,
  });

export const useAgents = () =>
  useQuery({
    queryKey: ['agents'],
    queryFn: () => apiGet(`${API}/agents`),
    staleTime: 30000,
  });

export const useEvents = (limit = 50) =>
  useQuery({
    queryKey: ['events', limit],
    queryFn: () => apiGet(`${API}/events?limit=${limit}`),
    staleTime: 5000,
  });

export const useDeployments = () =>
  useQuery({
    queryKey: ['deployments'],
    queryFn: () => apiGet(`${API}/deployments`),
  });

export const useApprovals = () =>
  useQuery({
    queryKey: ['approvals'],
    queryFn: () => apiGet(`${API}/approvals`),
  });

/* -------------------------
   MUTATIONS
-------------------------- */

export const useResolveApproval = () =>
  useMutation({
    mutationFn: ({ id, decision }: any) =>
      apiPost(`${API}/approvals/${id}/resolve`, { decision }),
  });

export const useCreateDemoRun = () =>
  useMutation({
    mutationFn: () => apiPost(`${API}/demo/run`),
  });

export const useCreateDemoApproval = () =>
  useMutation({
    mutationFn: () => apiPost(`${API}/demo/approval`),
  });

export const useCreateDemoDeployment = () =>
  useMutation({
    mutationFn: () => apiPost(`${API}/demo/deployment`),
  });
