import React, { useState, useEffect } from 'react';

export function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading analytics...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header entry-animate"><h1>Analytics</h1><p>Performance metrics and insights</p></div>
      <div className="glass-lg entry-animate" style={{ padding: 20 }}>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 20px' }}>Analytics dashboard</p>
      </div>
    </div>
  );
}
