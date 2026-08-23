import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface Deployment {
  id: number;
  name: string;
  version: string;
  environment: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/deployments')
      .then(r => r.json())
      .then(data => {
        setDeployments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch deployments:', err);
        setLoading(false);
      });
  }, []);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'SUCCESS': return <CheckCircle size={16} style={{color: 'var(--green)'}} />;
      case 'FAILED': return <AlertCircle size={16} style={{color: 'var(--red)'}} />;
      case 'PENDING': return <Clock size={16} style={{color: 'var(--yellow)'}} />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading deployments...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      <div className="page-header entry-animate">
        <h1>Deployments</h1>
        <p>Track deployments across environments — {deployments.length} total</p>
      </div>
      <div className="glass-lg entry-animate" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{deployments.length} deployments</span>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table className="table-glass">
            <thead>
              <tr>
                <th>Name</th>
                <th>Version</th>
                <th>Environment</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((dep, i) => (
                <tr key={dep.id} className="entry-animate" style={{ animationDelay: `${i * 0.03}s` }}>
                  <td><span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>{dep.name}</span></td>
                  <td><span className="font-mono" style={{ color: 'var(--cyan)', fontSize: 12 }}>{dep.version}</span></td>
                  <td><span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{dep.environment}</span></td>
                  <td style={{display: 'flex', alignItems: 'center', gap: 6}}>
                    {getStatusIcon(dep.status)}
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{dep.status}</span>
                  </td>
                  <td><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(dep.updated_at).toLocaleDateString()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
