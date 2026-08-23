import type { StoredEvent } from '../../event-store/types';

export type RunState = {
  runId: string;
  status: 'running' | 'completed' | 'failed' | 'unknown';
  agentId?: string;
  steps: Array<{
    type: string;
    timestamp: number;
    payload: any;
  }>;
};

export function reduceRunState(
  events: StoredEvent[],
  runId: string
): RunState {
  const state: RunState = {
    runId,
    status: 'unknown',
    steps: [],
  };

  for (const e of events) {
    if (e.runId !== runId) continue;

    state.steps.push({
      type: e.type,
      timestamp: e.timestamp,
      payload: e.payload,
    });

    switch (e.type) {
      case 'run.started':
        state.status = 'running';
        break;

      case 'run.completed':
        state.status = 'completed';
        break;

      case 'run.failed':
        state.status = 'failed';
        break;
    }

    if (e.agentId && !state.agentId) {
      state.agentId = e.agentId;
    }
  }

  return state;
}
