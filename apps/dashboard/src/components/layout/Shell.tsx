import { ReactNode } from 'react'

import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface ShellProps {
  children: ReactNode
  sidebarContent?: ReactNode
  headerTitle?: string
  headerActions?: ReactNode
}

export function Shell({
  children,
  sidebarContent,
  headerTitle = 'Runtime Dashboard',
  headerActions,
}: ShellProps) {
  return (
    <div className="flex h-full">
      <Sidebar>{sidebarContent}</Sidebar>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={headerTitle} actions={headerActions} />

        <main className="flex-1 overflow-auto bg-bg p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
