export type StoredEvent<T = any> = {
  id: string;
  type: string;
  timestamp: number;

  // core identity fields for filtering
  runId?: string;
  agentId?: string;
  deploymentId?: string;
  approvalId?: string;

  // payload is always raw immutable data
  payload: T;
};

export type EventQuery = {
  runId?: string;
  agentId?: string;
  type?: string;
  from?: number;
  to?: number;
  limit?: number;
};
