/**
 * ConnectedApp — Wraps your existing App with connection layer
 * 
 * USAGE: In main.tsx, change:
 *   import App from './App'
 * to:
 *   import { ConnectedApp } from './ConnectedApp'
 * 
 * Then use <ConnectedApp /> instead of <App />
 */

import App from './App';
import { useHealth, useStats } from './hooks/useApi';
import { useSSE } from './hooks/useSSE';

function ConnectionBanner() {
  const { data: health, isLoading } = useHealth();
  const { data: stats } = useStats();
  const { connected } = useSSE('/events');

  if (isLoading) {
    return (
      <div style={{
        padding: '6px 16px',
        background: '#f3f4f6',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '12px',
        color: '#6b7280',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span>Connecting to Agent-OS backend...</span>
      </div>
    );
  }

  if (!health) {
    return (
      <div style={{
        padding: '6px 16px',
        background: '#fef2f2',
        borderBottom: '1px solid #fecaca',
        fontSize: '12px',
        color: '#dc2626',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span>Backend unreachable</span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '6px 16px',
      background: '#f0fdf4',
      borderBottom: '1px solid #bbf7d0',
      fontSize: '12px',
      color: '#166534',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <span>Agent-OS v{health.version}</span>
      <span style={{ color: '#9ca3af' }}>|</span>
      <span>{stats?.runs.total ?? 0} runs</span>
      <span style={{ color: '#9ca3af' }}>|</span>
      <span>{stats?.approvals.pending ?? 0} pending</span>
      <span style={{ color: '#9ca3af' }}>|</span>
      <span style={{ color: connected ? '#16a34a' : '#dc2626' }}>
        {connected ? 'SSE Live' : 'SSE Offline'}
      </span>
    </div>
  );
}

export function ConnectedApp() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ConnectionBanner />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <App />
      </div>
    </div>
  );
}
