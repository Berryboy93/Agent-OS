import { ReactNode } from 'react'

interface SidebarProps {
  children?: ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-border bg-panel">
      <div className="p-6">
        <h1 className="text-xl font-bold">
          Agent-OS
        </h1>
      </div>
      {children && (
        <nav className="px-4 py-6">
          {children}
        </nav>
      )}
    </aside>
  )
}
