import { useDeployments } from '../hooks/useApi';
import type { Deployment } from '../lib/api';

/**
 * DeploymentsList — Shows active deployments
 * Usage: <DeploymentsList />
 */
export function DeploymentsList() {
  const { data: deployments, isLoading, error } = useDeployments();

  if (isLoading) return <div className="p-4 text-gray-500">Loading deployments...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;
  if (!deployments?.length) return <div className="p-4 text-gray-400">No deployments.</div>;

  const statusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'ROLLED_BACK': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3">Deployments</h3>
      <div className="space-y-2">
        {deployments.map((dep: Deployment) => (
          <div key={dep.id} className="bg-white rounded-lg shadow p-3 border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded text-xs ${statusColor(dep.status)}`}>
                {dep.status}
              </span>
              <span className="font-medium">{dep.agent_id}</span>
              <span className="text-gray-500 text-sm">v{dep.version}</span>
            </div>
            <span className="text-sm text-gray-400">{dep.target}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
