import { ReactNode } from 'react'

interface PanelProps {
  title?: string
  children: ReactNode
  className?: string
}

export function Panel({
  title,
  children,
  className = '',
}: PanelProps) {
  return (
    <section className={`rounded-panel border border-border bg-panel shadow-panel ${className}`}>
      {title && (
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            {title}
          </h2>
        </header>
      )}

      <div className="p-5">
        {children}
      </div>
    </section>
  )
}
