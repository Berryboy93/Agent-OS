# Agent-OS Dashboard Enterprise Migration Guide

## Quick Start

```bash
# Make the script executable
chmod +x agent-os-enterprise-refactor.sh

# Run from your dashboard directory
cd ~/Agent-OS/apps/dashboard
~/agent-os-enterprise-refactor.sh

# Or run it from anywhere, specifying the dashboard path
~/agent-os-enterprise-refactor.sh ~/Agent-OS/apps/dashboard
```

## What This Script Does (v2.1.0)

### ✅ Safe Operations

- **Preserves existing App.tsx** - Appends migration notes instead of replacing
- **Backs up everything** - Creates timestamped backup directory with all original files
- **Detects existing providers** - Won't overwrite main.tsx if it has custom setup
- **Smart config handling** - Backs up tailwind.config.js before overwriting
- **Handles both monorepo and non-monorepo** - Intelligently falls back if workspace filter fails
- **Creates ESLint config** - With proper React hooks rules

### 🏗️ Creates Architecture

```
src/
├── components/
│   ├── layout/           (Shell, Sidebar, Header)
│   ├── ui/               (Badge, Panel, Stat)
│   ├── dashboard/        (Ready for your widgets)
│   └── charts/           (Ready for graphs)
├── pages/                (Overview template)
├── hooks/                (useSSE with reconnection)
├── lib/
│   └── theme.ts          (Centralized colors)
├── types/
│   └── runtime.ts        (Shared interfaces)
├── providers/            (React Query setup)
├── styles/               (For custom CSS)
├── utils/                (Helpers)
└── constants/            (App constants)
```

### 📦 Installs Dependencies

```
Runtime:
  • react-router-dom     (Routing foundation)
  • @tanstack/react-query (Data fetching)
  • recharts             (Charts/graphs)
  • framer-motion        (Animations)
  • lucide-react         (Icons)

Dev:
  • tailwindcss@latest   (Styling)
  • postcss              (CSS processing)
  • autoprefixer         (Browser compatibility)
  • eslint               (Code quality)
  • eslint-plugin-react-hooks
  • eslint-plugin-react-refresh
```

## Key Improvements in v2.1.0

### Critical Fixes

| Issue | Solution |
|-------|----------|
| **Destructive main.tsx overwrite** | Detects existing providers, skips if custom setup found |
| **Lost Tailwind config** | Backs up existing config before creating new one |
| **Monorepo failures** | Falls back to non-filtered install if workspace fails |
| **No ESLint config** | Creates complete .eslintrc.json with rules |
| **Vite integration unclear** | Checks and warns about CSS configuration |

### Better Error Handling

```bash
# Each major step has error checking
- Directory and file validation
- Readable file checks
- Dependency installation with fallbacks
- Build validation before completing
```

## Backup Structure

After running, you'll have:

```
.migration-backup-20250525-143022/
├── src/                 (Original source code)
├── package.json         (Original dependencies)
├── tsconfig.json        (Original TS config)
├── vite.config.ts       (Original Vite config)
├── index.html           (Original HTML)
├── tailwind.config.js   (If existed)
├── postcss.config.js    (If existed)
├── .eslintrc.json       (If existed)
└── src/main.tsx         (If existed)
```

## Migration Workflow

### Phase 1: Review
```bash
# Check what was backed up
ls -la .migration-backup-*/src/

# Keep your original App.tsx open
cat src/App.original.tsx

# Check created architecture
tree src/
```

### Phase 2: Incremental Integration

**Step 1: Use UI primitives**
```tsx
// In your existing App.tsx or components
import { Badge } from './components/ui/Badge'
import { Panel } from './components/ui/Panel'
import { Stat } from './components/ui/Stat'

// Start using them
<Panel title="My Widget">
  <Stat label="Count" value={42} />
</Panel>
```

**Step 2: Add layout structure** (when ready)
```tsx
import { Shell } from './components/layout/Shell'

export default function App() {
  return (
    <Shell headerTitle="My Dashboard">
      {/* Your existing content */}
    </Shell>
  )
}
```

**Step 3: Use React Query** (for data fetching)
```tsx
import { useQuery } from '@tanstack/react-query'

function MyComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: async () => {
      const res = await fetch('/api/runs')
      return res.json()
    },
  })
  
  // Your component code
}
```

**Step 4: Add routing** (when App has multiple pages)
```tsx
import { Routes, Route } from 'react-router-dom'
import Overview from './pages/Overview'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      {/* Add more routes */}
    </Routes>
  )
}
```

### Phase 3: Cleanup

Once everything is working with the new architecture:

```bash
# Remove old App.tsx after integration complete
rm src/App.original.tsx

# Remove the TODO comment from App.tsx
# (marks migration complete)

# Clean up backups after verification
rm -rf .migration-backup-*/
```

## Special Situations

### If you have custom main.tsx

The script detects this automatically:
```
[WARN] Existing providers detected in main.tsx
  → Manual integration required
  → Reference implementation available
  → Backup: src/main.tsx.backup
```

**Solution:**
1. Open your src/main.tsx
2. Wrap your existing providers with:
   ```tsx
   <QueryProvider>
     <BrowserRouter>
       {/* Your providers */}
     </BrowserRouter>
   </QueryProvider>
   ```
3. Add imports:
   ```tsx
   import { BrowserRouter } from 'react-router-dom'
   import { QueryProvider } from './providers/QueryProvider'
   ```

### If you have custom Tailwind config

The script backs it up:
```
[WARN] Existing tailwind.config.js found
  → Backing up to: tailwind.config.js.backup
```

**Solution:**
1. Review both versions
2. Merge custom colors/plugins from backup
3. Keep the new structure but add your customizations

### If build fails

```bash
# Check the issues
pnpm run typecheck

# Review error messages
pnpm run build

# Most common: TypeScript errors in new files
# Fix import paths or type definitions
```

## Available Commands After Setup

```bash
# Type checking
pnpm run typecheck

# Development server
pnpm run dev

# Production build
pnpm run build

# Linting (if ESLint is in package.json)
pnpm run lint

# Preview production build
pnpm run preview
```

## New Components Reference

### Badge
```tsx
<Badge status="RUNNING" variant="solid" />
<Badge status="COMPLETED" variant="outline" />
```

### Panel
```tsx
<Panel title="Section Title">
  Content goes here
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

### useSSE Hook
```tsx
import { useSSE } from './hooks/useSSE'

function Component() {
  useSSE(
    '/api/events/stream',
    (event) => {
      const data = JSON.parse(event.data)
      // Handle event
    },
    (error) => console.error('SSE error:', error),
    {
      reconnectInterval: 3000,
      maxRetries: -1, // unlimited
    }
  )
  
  return <div>Listening to events...</div>
}
```

## Troubleshooting

### pnpm command not found
```bash
npm install -g pnpm
```

### TypeScript errors in new files
```bash
# Check specific file
npx tsc src/components/ui/Badge.tsx --noEmit

# Most common: Import path issues
# Solution: Use relative paths from file location
```

### Build fails with CSS issues
```bash
# Ensure vite.config.ts has CSS handling
cat vite.config.ts | grep -A 10 "css:"

# If missing, add to your Vite config:
# css: {
#   postcss: './postcss.config.js'
# }
```

### React Router warnings
```
Warning: useRouteLoaderData must be used within a data router

Solution: You wrapped BrowserRouter but haven't added Routes yet
Fix: Add <Routes><Route path="/" element={<App />} /></Routes>
```

## Reverting Changes

If something goes wrong, revert everything:

```bash
# Find your backup
ls -la .migration-backup-*/

# Restore from backup
BACKUP_DIR=".migration-backup-20250525-143022"
cp -r $BACKUP_DIR/src ./src
cp $BACKUP_DIR/package.json ./
cp $BACKUP_DIR/tsconfig.json ./
# etc for other files

# Reinstall dependencies
pnpm install

# You're back to original state
```

## Questions?

Check the following files for implementation details:
- **New UI components**: `src/components/ui/*.tsx`
- **Layout system**: `src/components/layout/Shell.tsx`
- **React Query setup**: `src/providers/QueryProvider.tsx`
- **SSE handling**: `src/hooks/useSSE.ts`
- **Theme system**: `src/lib/theme.ts`
- **Type definitions**: `src/types/runtime.ts`

Each file has clear, documented code ready for extension.
