import React, { useMemo, useState } from 'react';
import { eventStore } from '../../event-store';
import { reduceRunState } from './reduceRunState';

export function RunReplayTimeline({ runId }: { runId: string }) {
  const [cursor, setCursor] = useState<number>(Date.now());
  const [events, setEvents] = useState<any[]>([]);

  React.useEffect(() => {
    let alive = true;

    async function load() {
      const result = await eventStore.query({ runId });
      if (alive) setEvents(result);
    }

    load();
    const interval = setInterval(load, 2000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [runId]);

  const filteredState = useMemo(() => {
    const filtered = events.filter(e => e.timestamp <= cursor);
    return reduceRunState(filtered, runId);
  }, [events, cursor, runId]);

  return (
    <div style={{ padding: 12 }}>
      <h3>Run Replay Timeline</h3>

      <input
        type="range"
        min={events[0]?.timestamp || 0}
        max={events[events.length - 1]?.timestamp || Date.now()}
        value={cursor}
        onChange={(e) => setCursor(Number(e.target.value))}
      />

      <div style={{ marginTop: 12 }}>
        <strong>Status:</strong> {filteredState.status}
      </div>

      <div>
        <strong>Agent:</strong> {filteredState.agentId || 'unknown'}
      </div>

      <div style={{ marginTop: 12 }}>
        <h4>Events (up to cursor)</h4>
        {filteredState.steps.map((s, i) => (
          <div key={i}>
            {s.type} — {new Date(s.timestamp).toLocaleTimeString()}
          </div>
        ))}
      </div>
    </div>
  );
}
