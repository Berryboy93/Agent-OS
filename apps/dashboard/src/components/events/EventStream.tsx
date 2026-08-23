import { GlassPanel } from '../ui/GlassPanel';

type StreamEvent = {
  id: string;
  type: string;
  severity?: string;
  timestamp?: string | number;
  payload?: Record<string, unknown>;
};

export function EventStream({ events }: { events: StreamEvent[] }) {
  return (
    <GlassPanel>
      <div style={{ padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Event Stream</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {events.map((event) => (
            <div key={event.id} style={{ padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ fontWeight: 600 }}>{event.type}</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>
                {event.severity ?? 'info'} • {event.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}
