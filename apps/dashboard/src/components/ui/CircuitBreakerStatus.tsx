import React from 'react';

interface CircuitBreakerStatusProps {
  state: 'closed' | 'open' | 'half-open';
  compact?: boolean;
}

export const CircuitBreakerStatus: React.FC<CircuitBreakerStatusProps> = ({ state, compact = false }) => {
  const config = {
    closed: { color: 'var(--color-success)', label: 'CLOSED', icon: '✓' },
    open: { color: 'var(--color-error)', label: 'OPEN', icon: '✕' },
    'half-open': { color: 'var(--color-warning)', label: 'HALF-OPEN', icon: '◐' }
  };

  const { color, label, icon } = config[state] || config.closed;

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--gutter-sm)',
          padding: 'var(--gutter-sm) var(--gutter-md)',
          background: 'var(--glass-100)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-200)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <span style={{ color, fontWeight: 'bold', fontSize: 'var(--font-lg)' }}>{icon}</span>
        <div>
          <p style={{ margin: 0, fontSize: 'var(--font-sm)', fontWeight: 'bold', color: 'var(--color-text)' }}>
            Circuit Breaker
          </p>
          <p style={{ margin: 0, fontSize: 'var(--font-xs)', color }}>
            {label}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 'var(--gutter-md)',
        background: 'var(--glass-100)',
        backdropFilter: 'blur(16px)',
        border: `2px solid ${color}`,
        borderRadius: 'var(--radius-md)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gutter-md)' }}>
        <span style={{ fontSize: 'var(--font-2xl)', color }}>{icon}</span>
        <div>
          <p style={{ margin: 0, fontSize: 'var(--font-lg)', fontWeight: 'bold', color: 'var(--color-text)' }}>
            Circuit Breaker: {label}
          </p>
          <p style={{ margin: 'var(--gutter-xs) 0 0 0', fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>
            {state === 'open' 
              ? 'Deployments are halted. Manual reset required.' 
              : state === 'half-open'
                ? 'Testing system recovery...'
                : 'System operating normally.'}
          </p>
        </div>
      </div>
    </div>
  );
};