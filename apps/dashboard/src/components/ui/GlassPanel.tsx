import { ReactNode, HTMLAttributes } from 'react';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  as?: string; // accepted, always renders as div (polymorphic hint)
}

export function GlassPanel({ children, className = '', as: _as, style, ...rest }: GlassPanelProps) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 16,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
