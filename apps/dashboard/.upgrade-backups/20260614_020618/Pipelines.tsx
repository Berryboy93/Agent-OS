import React, { useState, useEffect } from 'react';

export function PipelinesPage() {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pipelines')
      .then(r => r.json())
      .then(data => {
        setPipelines(Array.isArray(data) ? data : data.pipelines || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading pipelines...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header entry-animate"><h1>Pipelines</h1><p>Workflow definitions and executions</p></div>
      <div className="glass-lg entry-animate" style={{ padding: 20 }}>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 20px' }}>
          {pipelines.length === 0 ? 'No pipelines defined yet' : `${pipelines.length} pipelines`}
        </p>
      </div>
    </div>
  );
}
