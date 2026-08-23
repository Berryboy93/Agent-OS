import { useCreateDemoRun, useCreateDemoApproval, useCreateDemoDeployment } from '../hooks/useApi';

/**
 * DemoActions — Buttons to seed demo data for testing
 * Usage: <DemoActions />
 */
export function DemoActions() {
  const demoRun = useCreateDemoRun();
  const demoApproval = useCreateDemoApproval();
  const demoDeployment = useCreateDemoDeployment();

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3">Demo Actions</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => demoRun.mutate()}
          disabled={demoRun.isPending}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {demoRun.isPending ? 'Creating...' : 'Create Demo Run'}
        </button>
        <button
          onClick={() => demoApproval.mutate()}
          disabled={demoApproval.isPending}
          className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
        >
          {demoApproval.isPending ? 'Creating...' : 'Create Demo Approval'}
        </button>
        <button
          onClick={() => demoDeployment.mutate()}
          disabled={demoDeployment.isPending}
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
        >
          {demoDeployment.isPending ? 'Creating...' : 'Create Demo Deployment'}
        </button>
      </div>
    </div>
  );
}
