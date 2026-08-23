import { useApprovals, useResolveApproval } from '../hooks/useApi';
import type { ApprovalRequest } from '../lib/api';

/**
 * ApprovalsPanel — Shows pending approvals with Approve/Reject buttons
 * Usage: <ApprovalsPanel />
 */
export function ApprovalsPanel() {
  const { data: approvals, isLoading } = useApprovals();
  const resolve = useResolveApproval();

  if (isLoading) return <div className="p-4 text-gray-500">Loading approvals...</div>;

  const pending = approvals?.filter((a: ApprovalRequest) => a.status === 'PENDING') ?? [];

  if (!pending.length) {
    return <div className="p-4 text-gray-400">No pending approvals.</div>;
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3">Pending Approvals ({pending.length})</h3>
      <div className="space-y-3">
        {pending.map((approval: ApprovalRequest) => (
          <div key={approval.id} className="bg-white rounded-lg shadow p-4 border flex items-center justify-between">
            <div>
              <p className="font-medium">{approval.reason}</p>
              <p className="text-xs text-gray-500">
                Expires: {new Date(approval.expires_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => resolve.mutate({ id: approval.id, decision: 'APPROVED' })}
                disabled={resolve.isPending}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => resolve.mutate({ id: approval.id, decision: 'REJECTED' })}
                disabled={resolve.isPending}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
