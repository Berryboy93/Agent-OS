import React from 'react';

export function SettingsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header entry-animate"><h1>Settings</h1><p>System configuration and preferences</p></div>
      <div className="glass-lg entry-animate" style={{ padding: 20 }}>
        <p style={{ color: 'var(--text-muted)' }}>System settings</p>
      </div>
    </div>
  );
}
