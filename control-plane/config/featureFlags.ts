export type FeatureFlags = {
  realtimeStreaming: boolean;
  newDashboardLayout: boolean;
  agentAutoHealing: boolean;
  debugEventOverlay: boolean;
  killAllAgents: boolean;
};

export const featureFlags: FeatureFlags = {
  realtimeStreaming: true,
  newDashboardLayout: false,
  agentAutoHealing: true,
  debugEventOverlay: false,
  killAllAgents: false,
};
