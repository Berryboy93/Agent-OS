import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface Approval {
  id: number;
  title: string;
  requester: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/approvals')
      .then(r => r.json())
      .then(data => {
        setApprovals(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch approvals:', err);
        setLoading(false);
      });
  }, []);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'APPROVED': return <CheckCircle size={16} style={{color: 'var(--green)'}} />;
      case 'REJECTED': return <XCircle size={16} style={{color: 'var(--red)'}} />;
      case 'PENDING': return <Clock size={16} style={{color: 'var(--yellow)'}} />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading approvals...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      <div className="page-header entry-animate">
        <h1>Approvals</h1>
        <p>Pending and resolved approval requests — {approvals.filter(a => a.status === 'PENDING').length} pending</p>
      </div>
      <div className="glass-lg entry-animate" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {approvals.filter(a => a.status === 'PENDING').length} pending · {approvals.length} total
          </span>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table className="table-glass">
            <thead>
              <tr>
                <th>Title</th>
                <th>Requester</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((approval, i) => (
                <tr key={approval.id} className="entry-animate" style={{ animationDelay: `${i * 0.03}s` }}>
                  <td><span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>{approval.title}</span></td>
                  <td><span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{approval.requester}</span></td>
                  <td style={{display: 'flex', alignItems: 'center', gap: 6}}>
                    {getStatusIcon(approval.status)}
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{approval.status}</span>
                  </td>
                  <td><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(approval.created_at).toLocaleDateString()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
