import { ReactNode } from 'react'

interface HeaderProps {
  title: string
  actions?: ReactNode
}

export function Header({ title, actions }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-panel px-6">
      <h1 className="text-lg font-semibold">
        {title}
      </h1>
      {actions && (
        <div className="flex gap-3">
          {actions}
        </div>
      )}
    </header>
  )
}
