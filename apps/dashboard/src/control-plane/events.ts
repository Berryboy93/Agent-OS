export type ControlEvent =
  | { type: 'run.started'; runId: string }
  | { type: 'run.updated'; runId: string }
  | { type: 'run.completed'; runId: string }
  | { type: 'agent.updated'; agentId: string }
  | { type: 'system.health'; status: string }
  | { type: 'approval.updated'; approvalId: string }
  | { type: 'deployment.updated'; deploymentId: string };
