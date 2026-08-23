export interface Run {
  id: string;
  agent_id: string;
  agent_version: string | null;
  status: string;
  input_json: string;
  output_json: string | null;
  error_message: string | null;
  total_tokens: number;
  correlation_id: string | null;
  pipeline_run_id: string | null;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
}

export interface AgentEvent {
  id: string;
  run_id: string;
  agent_id: string;
  type: string;
  data_json: string;
  timestamp: number;
  sequence_number: number;
}

export interface Deployment {
  id: string;
  agent_id: string;
  version: string;
  status: string;
  target: string;
  rollback_of: string | null;
  deployed_by: string | null;
  deployed_at: number | null;
  created_at: number;
}

export interface Stats {
  runs: {
    total: number;
    byStatus: Array<{
      status: string;
      count: number;
    }>;
  };

  tokens: {
    total: number;
  };

  events: {
    lastHour: number;
  };
}

export type RunStatus = 
  | 'COMPLETED'
  | 'FAILED'
  | 'RUNNING'
  | 'PENDING'
  | 'QUEUED'
  | 'CREATED'
  | 'SCHEDULED'
  | 'WAITING_APPROVAL'
  | 'WAITING_DELAY'
  | 'RESUMING'
  | 'CANCELLED'
  | 'ACTIVE'
  | 'INACTIVE';
