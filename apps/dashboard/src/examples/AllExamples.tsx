import {
  ConnectionStatus,
  StatsOverview,
  RunsList,
  ApprovalsPanel,
  DeploymentsList,
  LiveEvents,
  DemoActions,
} from './index';

/**
 * AllExamples — Demo page showing every connected component
 * Usage: <AllExamples />
 * 
 * This is a REFERENCE. Copy patterns from these components into YOUR own UI.
 */
export function AllExamples() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Agent-OS Dashboard</h1>
        <ConnectionStatus />
      </header>

      <main className="max-w-6xl mx-auto space-y-6 py-6">
        <DemoActions />
        <StatsOverview />
        <div className="grid md:grid-cols-2 gap-6">
          <RunsList limit={5} />
          <LiveEvents />
        </div>
        <ApprovalsPanel />
        <DeploymentsList />
      </main>
    </div>
  );
}
