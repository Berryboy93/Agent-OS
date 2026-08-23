import { useStats } from '../hooks/useApi';

/**
 * StatsOverview — Shows key dashboard metrics
 * Usage: <StatsOverview />
 */
export function StatsOverview() {
  const { data: stats, isLoading, error } = useStats();

  if (isLoading) return <div className="p-4 text-gray-500">Loading stats...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;
  if (!stats) return null;

  const cards = [
    { label: 'Total Runs', value: stats.runs.total },
    { label: 'Tokens Used', value: stats.tokens.total.toLocaleString() },
    { label: 'Pending Approvals', value: stats.approvals.pending },
    { label: 'Active Deployments', value: stats.deployments.active },
    { label: 'Events (1h)', value: stats.events.lastHour },
    { label: 'Checkpoints', value: stats.checkpoints.total },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow p-4 border">
          <div className="text-sm text-gray-500">{card.label}</div>
          <div className="text-2xl font-bold">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
