import { ReactNode } from 'react';

export function MetricGrid({ children, columns = 4 }: { children: ReactNode; columns?: number }) {
  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 16,
      }}
    >
      {children}
    </section>
  );
}
