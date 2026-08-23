import { useRuns } from '../hooks/useApi';
import type { AgentRun } from '../lib/api';

/**
 * RunsList — Shows recent agent runs in a table
 * Usage: <RunsList limit={10} />
 */
export function RunsList({ limit = 10 }: { limit?: number }) {
  const { data: runs, isLoading, error } = useRuns(limit);

  if (isLoading) return <div className="p-4 text-gray-500">Loading runs...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;
  if (!runs?.length) return <div className="p-4 text-gray-400">No runs yet.</div>;

  const statusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'RUNNING': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-x-auto p-4">
      <h3 className="text-lg font-semibold mb-3">Recent Runs</h3>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Agent</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Tokens</th>
            <th className="px-3 py-2 text-left">Started</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run: AgentRun) => (
            <tr key={run.id} className="border-t">
              <td className="px-3 py-2">{run.agent_id}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded text-xs ${statusColor(run.status)}`}>
                  {run.status}
                </span>
              </td>
              <td className="px-3 py-2 text-right">{run.total_tokens.toLocaleString()}</td>
              <td className="px-3 py-2 text-gray-500">
                {new Date(run.started_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
