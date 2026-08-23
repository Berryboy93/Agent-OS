import { GlassPanel } from '../ui/GlassPanel';

export function Timeline({ items }: { items: Array<{ id: string; label: string; time?: string | number }> }) {
  return (
    <GlassPanel>
      <div style={{ padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Timeline</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((item) => (
            <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--purple)' }} />
              <div>
                <div style={{ fontWeight: 600 }}>{item.label}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{item.time ? new Date(item.time).toLocaleString() : '—'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}
