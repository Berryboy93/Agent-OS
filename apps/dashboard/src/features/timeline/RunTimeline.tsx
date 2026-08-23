import React, { useMemo } from 'react';
import { useRunTimeline } from './useRunTimeline';

export function RunTimeline({ runId }: { runId: string }) {
  const events = useRunTimeline(runId);

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.timestamp - b.timestamp),
    [events]
  );

  return (
    <div style={{ padding: 12 }}>
      <h3>Run Timeline: {runId}</h3>

      <div style={{ fontFamily: 'monospace' }}>
        {sorted.map(e => (
          <div key={e.id}>
            <strong>{e.type}</strong> — {new Date(e.timestamp).toLocaleTimeString()}
          </div>
        ))}
      </div>
    </div>
  );
}
