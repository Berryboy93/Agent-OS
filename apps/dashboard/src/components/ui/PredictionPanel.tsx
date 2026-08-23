import React from 'react';

interface Pattern {
  pattern: string;
  count: number;
  avg_confidence: number;
  max_confidence: number;
  severity: string;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  threshold: number;
  canProceed: boolean;
}

interface PatternData {
  patterns: Pattern[];
  compoundPatterns: string[];
  circuitBreakerState: string;
  circuitBreaker: CircuitBreakerState;
  severityCount: {
    critical: number;
    warning: number;
    info: number;
  };
  windowSize: number;
}

interface PredictionPanelProps {
  patterns: PatternData | null;
  loading: boolean;
  error: string | null;
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({ patterns, loading, error }) => {
  if (loading) {
    return (
      <div style={{ padding: 'var(--gutter-md)', color: 'var(--color-text-muted)' }}>
        Loading predictions...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 'var(--gutter-md)', color: 'var(--color-error)' }}>
        Error: {error}
      </div>
    );
  }

  if (!patterns || patterns.patterns.length === 0) {
    return (
      <div style={{ padding: 'var(--gutter-md)', color: 'var(--color-text-muted)' }}>
        No active error patterns detected.
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'var(--color-error)';
      case 'warning': return 'var(--color-warning)';
      case 'info': return 'var(--color-info)';
      default: return 'var(--color-text-muted)';
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return { bg: 'var(--color-error)', text: '#fff' };
    if (confidence >= 60) return { bg: 'var(--color-warning)', text: '#000' };
    return { bg: 'var(--color-info)', text: '#fff' };
  };

  return (
    <div
      style={{
        background: 'var(--glass-100)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-200)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--gutter-md)'
      }}
    >
      {/* Circuit Breaker Status */}
      <div style={{ marginBottom: 'var(--gutter-md)', display: 'flex', alignItems: 'center', gap: 'var(--gutter-sm)' }}>
        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>Circuit Breaker:</span>
        <span
          style={{
            fontSize: 'var(--font-sm)',
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: patterns.circuitBreaker.state === 'open' ? 'var(--color-error)' : 
                       patterns.circuitBreaker.state === 'half-open' ? 'var(--color-warning)' : 'var(--color-success)',
            color: patterns.circuitBreaker.state === 'half-open' ? '#000' : '#fff'
          }}
        >
          {patterns.circuitBreaker.state.toUpperCase()}
        </span>
        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)' }}>
          ({patterns.circuitBreaker.failureCount}/{patterns.circuitBreaker.threshold} failures)
        </span>
      </div>

      {/* Compound Patterns */}
      {patterns.compoundPatterns.length > 0 && (
        <div style={{ marginBottom: 'var(--gutter-md)' }}>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-error)', fontWeight: 'bold', margin: '0 0 var(--gutter-xs) 0' }}>
            ⚠️ Compound Patterns Detected
          </p>
          {patterns.compoundPatterns.map((cp, i) => (
            <span
              key={i}
              style={{
                fontSize: 'var(--font-xs)',
                background: 'var(--color-error)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                marginRight: 'var(--gutter-xs)'
              }}
            >
              {cp}
            </span>
          ))}
        </div>
      )}

      {/* Active Patterns */}
      <p style={{ fontSize: 'var(--font-sm)', fontWeight: 'bold', color: 'var(--color-text)', margin: '0 0 var(--gutter-sm) 0' }}>
        Active Patterns ({patterns.patterns.length})
      </p>

      {patterns.patterns.map((p, idx) => {
        const badge = getConfidenceBadge(p.max_confidence);
        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--gutter-sm) var(--gutter-md)',
              borderBottom: idx < patterns.patterns.length - 1 ? '1px solid var(--glass-200)' : 'none',
              borderRadius: idx === 0 ? 'var(--radius-sm) var(--radius-sm) 0 0' : 
                           idx === patterns.patterns.length - 1 ? '0 0 var(--radius-sm) var(--radius-sm)' : '0'
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 'var(--font-sm)', fontWeight: 500, color: 'var(--color-text)' }}>
                {p.pattern}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)' }}>
                {p.count} occurrence{p.count !== 1 ? 's' : ''} • avg {Math.round(p.avg_confidence)}%
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gutter-sm)' }}>
              <span
                style={{
                  fontSize: 'var(--font-xs)',
                  color: getSeverityColor(p.severity),
                  fontWeight: 'bold'
                }}
              >
                {p.severity}
              </span>
              <span
                style={{
                  fontSize: 'var(--font-xs)',
                  fontWeight: 'bold',
                  background: badge.bg,
                  color: badge.text,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                {Math.round(p.max_confidence)}%
              </span>
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)', margin: 'var(--gutter-sm) 0 0 0' }}>
        Window size: {patterns.windowSize} events
      </p>
    </div>
  );
};