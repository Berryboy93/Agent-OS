import React from 'react';

export function AlertsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header entry-animate"><h1>Alerts</h1><p>Alert rules and notifications</p></div>
      <div className="glass-lg entry-animate" style={{ padding: 20 }}>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 20px' }}>No active alerts</p>
      </div>
    </div>
  );
}
