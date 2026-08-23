export const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#22c55e',
  FAILED: '#ef4444',
  RUNNING: '#f59e0b',
  PENDING: '#6366f1',
  QUEUED: '#8b5cf6',
  CREATED: '#64748b',
  SCHEDULED: '#0ea5e9',
  WAITING_APPROVAL: '#f59e0b',
  WAITING_DELAY: '#94a3b8',
  RESUMING: '#06b6d4',
  CANCELLED: '#8888aa',
  ACTIVE: '#22c55e',
  INACTIVE: '#64748b',
};

export const EVENT_COLOR: Record<string, string> = {
  'run.started': '#6366f1',
  'run.completed': '#22c55e',
  'run.failed': '#ef4444',
  'tool.called': '#f59e0b',
  'tool.result': '#22c55e',
};

export const getStatusColor = (status: string): string => {
  return STATUS_COLOR[status] ?? '#888888';
};

export const getEventColor = (eventType: string): string => {
  return EVENT_COLOR[eventType] ?? '#94a3b8';
};
