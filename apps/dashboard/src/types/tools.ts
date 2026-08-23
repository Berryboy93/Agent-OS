export interface ToolParameter {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  enum?: string[];
  default?: unknown;
  defaultValue?: unknown;
}

export interface Tool {
  id: string;
  name: string;
  description?: string;
  version?: string;
  registeredAt?: string;
  status: 'active' | 'deprecated' | 'experimental' | 'error';
  category: string;
  endpoint: string;
  method: string;
  parameters?: ToolParameter[];
  tags: string[];
  executionCount: number;
  avgLatency: number;
  errorRate: number;
}

export interface ToolExecution {
  id: string;
  toolId: string;
  toolName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  correlationId: string;
  startedAt: string;
  duration: number;
  triggeredBy: string;
  result?: unknown;
  error?: string;
}

export interface ToolStats {
  totalTools: number;
  activeTools: number;
  totalExecutions: number;
  successRate: number;
  avgLatency: number;
  topTools: Array<{ toolId: string; name: string; count: number }>;
  executionsByDay: Array<{ date: string; count: number; errors?: number }>;
}

export interface ToolFilter {
  search?: string;
  status?: string;
  category?: string;
  tags?: string[];
}
