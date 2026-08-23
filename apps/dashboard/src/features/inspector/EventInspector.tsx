import React, { useState } from 'react';
import { useEventInspector } from './useEventInspector';

export function EventInspector() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [runId, setRunId] = useState('');

  const events = useEventInspector({ search, type, runId });

  return (
    <div style={{ padding: 12 }}>
      <h3>Event Inspector</h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          placeholder="search events..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <input
          placeholder="type filter"
          value={type}
          onChange={e => setType(e.target.value)}
        />

        <input
          placeholder="runId filter"
          value={runId}
          onChange={e => setRunId(e.target.value)}
        />
      </div>

      <div style={{ fontFamily: 'monospace' }}>
        {events.map(e => (
          <details key={e.id} style={{ marginBottom: 8 }}>
            <summary>
              {e.type} — {new Date(e.timestamp).toLocaleTimeString()}
            </summary>

            <pre style={{ fontSize: 12 }}>
              {JSON.stringify(e, null, 2)}
            </pre>
          </details>
        ))}
      </div>
    </div>
  );
}
