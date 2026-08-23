import { ReactNode } from 'react';
import { GlassPanel } from '../ui/GlassPanel';

interface MetricCardProps {
  /** Preferred label prop (original API) */
  label?: string;
  /** Alias for label (Tools.tsx API) */
  title?: string;
  value: ReactNode;
  detail?: ReactNode;
  sparkline?: ReactNode;
  icon?: ReactNode;
  trend?: number;
  trendLabel?: string;
  trendUp?: boolean;
}

export function MetricCard({
  label,
  title,
  value,
  detail,
  sparkline,
  icon,
  trend,
  trendLabel,
  trendUp,
}: MetricCardProps) {
  const heading = label ?? title;
  const trendColor = trendUp === false ? '#f43f5e' : '#34d399';

  return (
    <GlassPanel>
      <div style={{ minHeight: 128, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ opacity: 0.7, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
          {heading}
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
        {trend !== undefined && (
          <div style={{ fontSize: 12, color: trendColor }}>
            {trend}{trendLabel ? ` ${trendLabel}` : ''}
          </div>
        )}
        {detail && <div style={{ opacity: 0.75, fontSize: 12 }}>{detail}</div>}
        {sparkline && <div style={{ marginTop: 'auto' }}>{sparkline}</div>}
      </div>
    </GlassPanel>
  );
}
