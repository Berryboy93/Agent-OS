# 🚀 Agent-OS Dashboard - Quick Reference Card

## Common Commands

```bash
# Start development server
pnpm run dev                 # → http://localhost:5173

# Type check
pnpm run typecheck          # Verify TypeScript

# Production build
pnpm run build              # Output to dist/

# Preview build
pnpm run preview            # Test production locally

# Lint code
pnpm run lint               # ESLint check

# Verify migration
./verify-migration.sh        # Check setup status
```

---

## Import Paths

### UI Components
```tsx
import { Badge } from './components/ui/Badge'
import { Panel } from './components/ui/Panel'
import { Stat } from './components/ui/Stat'
```

### Layout Components
```tsx
import { Shell } from './components/layout/Shell'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
```

### Hooks
```tsx
import { useSSE } from './hooks/useSSE'
import { useQuery } from '@tanstack/react-query'
```

### Theme & Types
```tsx
import { STATUS_COLOR, getStatusColor } from './lib/theme'
import type { Run, RunStatus, AgentEvent } from './types/runtime'
```

### Providers
```tsx
import { QueryProvider } from './providers/QueryProvider'
```

---

## Component Usage

### Badge
```tsx
// Solid variant (default)
<Badge status="RUNNING" />
<Badge status="COMPLETED" />
<Badge status="FAILED" />

// Outline variant
<Badge status="RUNNING" variant="outline" />
```

### Panel
```tsx
// With title
<Panel title="Section Title">
  Content here
</Panel>

// Without title
<Panel>
  Content here
</Panel>

// With custom class
<Panel title="Sidebar" className="h-96">
  Scrollable content
</Panel>
```

### Stat
```tsx
import { Activity } from 'lucide-react'

<Stat 
  label="Status"
  value="Healthy"
  subtext="All systems operational"
  icon={<Activity size={24} />}
/>
```

### Shell (Layout)
```tsx
<Shell 
  headerTitle="My Dashboard"
  sidebarContent={<nav>{/* links */}</nav>}
  headerActions={<button>Export</button>}
>
  {/* Page content */}
</Shell>
```

---

## React Query Patterns

### Fetch Data
```tsx
import { useQuery } from '@tanstack/react-query'

function Component() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['runs'],
    queryFn: async () => {
      const res = await fetch('/api/runs')
      return res.json()
    },
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
```

### With Query Options
```tsx
const { data } = useQuery({
  queryKey: ['runs', agentId],  // Include filters in key
  queryFn: async () => {
    const res = await fetch(`/api/runs?agent=${agentId}`)
    return res.json()
  },
  staleTime: 60000,              // 1 minute
  refetchInterval: 30000,        // Refetch every 30s
})
```

### With Typed Data
```tsx
import { Run } from './types/runtime'

const { data } = useQuery<Run[]>({
  queryKey: ['runs'],
  queryFn: () => fetch('/api/runs').then(r => r.json()),
})

// data is now Run[]
data?.forEach(run => {
  console.log(run.id)  // ✓ IDE autocomplete
})
```

---

## SSE Hook Pattern

### Basic Usage
```tsx
import { useSSE } from './hooks/useSSE'

function Component() {
  const [events, setEvents] = useState([])

  useSSE('/api/events', (event) => {
    const data = JSON.parse(event.data)
    setEvents(prev => [data, ...prev])
  })

  return <div>{events.map(e => e.type)}</div>
}
```

### With Error Handling
```tsx
useSSE(
  '/api/events',
  (event) => {
    const data = JSON.parse(event.data)
    setEvents(prev => [data, ...prev])
  },
  (error) => {
    console.error('SSE connection lost:', error)
    setError(error.message)
  },
  {
    reconnectInterval: 3000,  // Retry every 3s
    maxRetries: 10,            // Stop after 10 retries
  }
)
```

---

## Tailwind Classes Reference

### Colors
```tsx
// Text colors
<div className="text-accent">Blue</div>
<div className="text-success">Green</div>
<div className="text-danger">Red</div>
<div className="text-warning">Orange</div>
<div className="text-cyan">Cyan</div>
<div className="text-muted">Gray</div>

// Background colors
<div className="bg-bg">Dark background</div>
<div className="bg-panel">Panel background</div>
<div className="bg-panel2">Panel2 background</div>

// Border color
<div className="border border-border">Bordered</div>
```

### Spacing
```tsx
// Padding
<div className="p-5">      All sides</div>
<div className="px-5">     Left & right</div>
<div className="py-5">     Top & bottom</div>
<div className="pt-5">     Top only</div>

// Margin
<div className="m-5">      All sides</div>
<div className="mx-auto">  Center horizontally</div>
<div className="gap-4">    Space between flex items</div>
```

### Layout
```tsx
// Flexbox
<div className="flex items-center justify-between">
<div className="flex flex-col gap-4">
<div className="grid grid-cols-3 gap-6">

// Display
<div className="hidden">       Hidden</div>
<div className="invisible">    Invisible (takes space)</div>

// Responsive
<div className="grid-cols-1 lg:grid-cols-3">  Mobile to desktop
```

### Typography
```tsx
<p className="text-xs">      Extra small</p>
<p className="text-sm">      Small</p>
<p className="text-base">    Base</p>
<p className="text-lg">      Large</p>
<p className="text-2xl">     2x large</p>

<p className="font-bold">    Bold</p>
<p className="font-semibold">Semibold</p>
<p className="font-medium">  Medium</p>

<p className="uppercase">    UPPERCASE</p>
<p className="tracking-wide"> Letter spacing</p>
```

### Effects
```tsx
<div className="rounded-panel">     Rounded 14px</div>
<div className="rounded-full">      Circle</div>
<div className="shadow-panel">      Panel shadow</div>
<div className="opacity-50">        Semi-transparent</div>
<div className="blur">              Blurred</div>
```

---

## TypeScript Patterns

### Component Props
```tsx
interface ComponentProps {
  title: string
  count: number
  children: React.ReactNode
  onClick?: () => void
}

export function MyComponent({ 
  title, 
  count, 
  children,
  onClick 
}: ComponentProps) {
  return <div onClick={onClick}>{title} {count}</div>
}
```

### Using Runtime Types
```tsx
import { Run, RunStatus } from './types/runtime'

// Type-safe status
const status: RunStatus = 'RUNNING'  // ✓ Works
const status: RunStatus = 'INVALID'  // ✗ Error

// Use in component
function RunBadge({ run }: { run: Run }) {
  return (
    <Badge status={run.status} />
  )
}
```

### Typing Callbacks
```tsx
// Function callback
function Component({ 
  onData 
}: { 
  onData: (data: Run) => void 
}) {
  return (
    <button onClick={() => onData(run)}>
      Send
    </button>
  )
}

// Event handler
function Input({ 
  onChange 
}: { 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return <input onChange={onChange} />
}
```

---

## Common Patterns

### Conditional Rendering
```tsx
// Simple if
{isLoading && <div>Loading...</div>}
{error && <div>Error: {error}</div>}
{data && <div>{data.name}</div>}

// Ternary
{data ? <Display data={data} /> : <Empty />}

// Switch
{status === 'RUNNING' && <Badge status="RUNNING" />}
{status === 'COMPLETED' && <Badge status="COMPLETED" />}
```

### Lists
```tsx
import { Badge } from './components/ui/Badge'

<div className="space-y-2">
  {runs.map(run => (
    <Panel key={run.id}>
      <div className="flex justify-between items-center">
        <span>{run.id}</span>
        <Badge status={run.status} />
      </div>
    </Panel>
  ))}
</div>
```

### Form Handling
```tsx
const [formData, setFormData] = useState({ name: '' })

return (
  <input
    value={formData.name}
    onChange={(e) => setFormData({ name: e.target.value })}
  />
)
```

---

## Debugging

### Check TypeScript
```bash
pnpm run typecheck
```

### Check Imports
```bash
# File doesn't exist?
ls -la src/components/ui/Badge.tsx

# Import path wrong?
# Use relative paths: import { Badge } from '../../components/ui/Badge'
```

### Check Console
```tsx
// Browser F12 → Console tab
console.log('data:', data)
console.error('Error:', error)
```

### Check Network
```tsx
// Browser F12 → Network tab
// Look for failed requests
// Check response data
```

---

## File Organization

```
src/
├── App.tsx                    ← Main app (edit this)
├── main.tsx                   ← Entry point (don't edit)
├── index.css                  ← Global styles (can edit)
│
├── components/                ← Reusable components
│   ├── ui/                    ← UI primitives (don't edit)
│   │   ├── Badge.tsx
│   │   ├── Panel.tsx
│   │   └── Stat.tsx
│   │
│   ├── layout/                ← Layout components (can customize)
│   │   ├── Shell.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   │
│   ├── dashboard/             ← Your widgets (create here)
│   │   └── RunsWidget.tsx     ← YOUR CODE
│   │
│   └── charts/                ← Your charts (create here)
│       └── TokensChart.tsx    ← YOUR CODE
│
├── pages/                     ← Page components (create here)
│   ├── Overview.tsx           ← Template provided
│   └── Agents.tsx             ← YOUR CODE
│
├── hooks/                     ← Custom hooks (don't edit provided)
│   └── useSSE.ts              ← Provided
│
├── lib/                       ← Utilities
│   └── theme.ts               ← Colors & theme (can customize)
│
├── types/                     ← TypeScript types (can add to)
│   └── runtime.ts             ← Provided base types
│
├── providers/                 ← Context providers (don't edit)
│   └── QueryProvider.tsx      ← Provided
│
├── styles/                    ← Additional CSS (create here)
└── utils/                     ← Helper functions (create here)
```

**Key:** 
- 🟢 Can edit or create files
- 🔵 Don't edit provided files
- 🟡 Can customize

---

## Environment Variables

If you need API URLs, create `.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

Access in code:
```tsx
const apiUrl = import.meta.env.VITE_API_URL
```

---

## Next Steps

1. **Start dev server:** `pnpm run dev`
2. **Open browser:** http://localhost:5173
3. **Follow POST-MIGRATION-CHECKLIST.md**
4. **Implement Phase 1:** Use UI components
5. **Test thoroughly:** Check console for errors
6. **Move to Phase 2:** Replace styles with Tailwind
7. **Continue incrementally:** Follow phases 3-5

---

**Bookmark this page for quick reference! 🔖**

Most of what you need is here. For detailed guides, see other docs.

Good luck building! 🚀
