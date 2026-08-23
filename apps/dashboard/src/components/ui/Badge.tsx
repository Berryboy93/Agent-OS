import { ReactNode } from 'react';
import { STATUS_COLOR } from '../../lib/theme';

const TAILWIND_HEX: Record<string, string> = {
  emerald: '#10b981',
  amber:   '#f59e0b',
  rose:    '#f43f5e',
  purple:  '#8b5cf6',
  blue:    '#3b82f6',
  slate:   '#64748b',
  red:     '#ef4444',
  green:   '#22c55e',
  yellow:  '#eab308',
};

interface BadgeProps {
  status?: string;
  variant?: string;        // 'solid' | 'outline' | tailwind color name
  className?: string;
  children?: ReactNode;
}

export function Badge({ status, variant = 'solid', className = '', children }: BadgeProps) {
  let color = '#888888';
  if (status) {
    color = STATUS_COLOR[status] ?? '#888888';
  } else if (variant && TAILWIND_HEX[variant]) {
    color = TAILWIND_HEX[variant];
  }

  const isOutline = variant === 'outline';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${className}`}
      style={{
        color,
        backgroundColor: isOutline ? 'transparent' : `${color}22`,
        border: isOutline ? `1px solid ${color}` : undefined,
      }}
    >
      {children ?? status}
    </span>
  );
}
