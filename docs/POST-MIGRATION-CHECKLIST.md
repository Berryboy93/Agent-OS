# ✅ Agent-OS Dashboard - Post-Migration Checklist

## 🎯 Immediate (Next 5 Minutes)

- [ ] **Verify setup**
  ```bash
  chmod +x verify-migration.sh
  ./verify-migration.sh
  ```

- [ ] **Start dev server**
  ```bash
  pnpm run dev
  ```

- [ ] **Open in browser**
  - Navigate to: http://localhost:5173
  - Check browser console for errors (F12)

- [ ] **Review what was created**
  ```bash
  ls -la src/components/ui/
  ls -la src/components/layout/
  ls -la src/hooks/
  ls -la src/providers/
  ```

---

## 🔍 Next (Next 15 Minutes)

### 1. Check Your Original App
```bash
# See what you had before
cat src/App.original.tsx
```

### 2. Understand What Changed
```bash
# View new main.tsx
cat src/main.tsx

# View new Tailwind config
cat tailwind.config.js

# View ESLint setup
cat .eslintrc.json
```

### 3. Check Backup
```bash
# Location: .migration-backup-20260525-191427/
# Contains: Original src/, package.json, tsconfig.json, etc.
ls -la .migration-backup-*/
```

---

## 🚀 Building Your New Dashboard (Next 30 Minutes)

### Phase 1: Use New UI Components (No Breaking Changes)

Add to your existing App.tsx:

```tsx
// At the top
import { Panel } from './components/ui/Panel'
import { Stat } from './components/ui/Stat'
import { Badge } from './components/ui/Badge'

// Inside your render
<Panel title="My First Widget">
  <div className="space-y-4">
    <Stat label="Status" value="Healthy" />
    <Stat label="Runs" value={382} />
  </div>
</Panel>
```

✅ **This works alongside your existing code**

### Phase 2: Use Tailwind Classes

```tsx
// Before
<div style={{ color: '#6366f1', padding: '20px' }}>
  My widget
</div>

// After - using Tailwind
<div className="text-accent p-5">
  My widget
</div>
```

Colors available:
- `text-accent` - Primary blue
- `text-success` - Green
- `text-danger` - Red
- `text-warning` - Orange
- `bg-panel` - Panel background
- `border-border` - Border color

### Phase 3: Use React Query (When Ready for Data Fetching)

```tsx
import { useQuery } from '@tanstack/react-query'

export function MyComponent() {
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
    <Panel title="Runs">
      {data.map(run => (
        <div key={run.id}>
          {run.id} - <Badge status={run.status} />
        </div>
      ))}
    </Panel>
  )
}
```

### Phase 4: Add Shell Layout (When Ready)

```tsx
import { Shell } from './components/layout/Shell'

export default function App() {
  return (
    <Shell 
      headerTitle="My Dashboard"
      sidebarContent={<nav>...</nav>}
    >
      {/* Your content */}
    </Shell>
  )
}
```

### Phase 5: Add Routes (When App Has Multiple Pages)

```tsx
import { Routes, Route } from 'react-router-dom'
import Overview from './pages/Overview'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/agents" element={<Agents />} />
      <Route path="/runs" element={<Runs />} />
    </Routes>
  )
}
```

---

## 🔧 Build & Deploy Checklist

### Before Pushing to Production

- [ ] Run TypeScript check
  ```bash
  pnpm run typecheck
  ```

- [ ] Run ESLint
  ```bash
  pnpm run lint
  ```

- [ ] Test in browser
  ```bash
  pnpm run dev
  # Open http://localhost:5173
  # Test all pages/features
  # Check console for errors
  ```

- [ ] Production build
  ```bash
  pnpm run build
  # Should output to dist/
  ```

- [ ] Preview production build
  ```bash
  pnpm run preview
  # Open and test
  ```

---

## 🐛 Troubleshooting

### Build Fails with CSS Errors
```bash
# Check Vite config
cat vite.config.ts

# Ensure it has CSS processing:
# css: {
#   postcss: './postcss.config.js'
# }
```

**Fix:** Update vite.config.ts to include CSS configuration

### Components Can't Be Imported
```bash
# Make sure paths are correct from your file location
import { Badge } from '../../components/ui/Badge'
# (adjust ../ based on where your component is)
```

### Tailwind Classes Not Applying
```bash
# Check if Tailwind is being imported in index.css
grep "@tailwind" src/index.css

# Make sure index.css is imported in main.tsx
grep "index.css" src/main.tsx
```

### main.tsx Has Errors
```bash
# Your custom providers may need integration
# See MIGRATION-GUIDE.md for "If you have custom main.tsx"
```

---

## 📚 Learn More

### Architecture Overview
```
src/
├── components/ui/       ← Reusable UI components
├── components/layout/   ← Layout components (Shell, Sidebar)
├── pages/              ← Page components
├── hooks/              ← Custom React hooks (useSSE)
├── providers/          ← Context providers (React Query)
├── lib/               ← Utilities (theme, colors)
├── types/             ← TypeScript definitions
├── styles/            ← Global styles
└── App.tsx            ← Main app component
```

### Key Files to Review
- `MIGRATION-GUIDE.md` - Complete step-by-step guide
- `CHANGELOG-v2.0.0-to-v2.1.0.md` - What changed and why
- `src/lib/theme.ts` - Color system and theme
- `tailwind.config.js` - Tailwind customization

---

## ✨ Optional Improvements

### Add TypeScript Path Aliases
```json
// In tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*": ["src/hooks/*"]
    }
  }
}
```

Then import like:
```tsx
import { Panel } from '@components/ui/Panel'
import { useSSE } from '@hooks/useSSE'
```

### Add Git to Tracking
```bash
# If using git, add new files
git add src/ tailwind.config.js postcss.config.js .eslintrc.json

# Create migration commit
git commit -m "feat: enterprise frontend architecture migration

- Add Tailwind CSS
- Add React Router foundation
- Add React Query foundation
- Create UI component library
- Extract runtime types
- Setup ESLint rules"

# Create backup commit
git add .migration-backup-*/
git commit -m "chore: migration backup snapshot"
```

---

## 🎯 Success Criteria

✅ You know you're successful when:

- [ ] Dev server starts without errors
- [ ] App loads in browser (http://localhost:5173)
- [ ] Browser console has no critical errors
- [ ] You can import components from `src/components/`
- [ ] Tailwind classes apply (colors, spacing work)
- [ ] Production build runs without errors
- [ ] You understand where each new piece fits

---

## 📞 Need Help?

1. **TypeScript errors?**
   - Run: `pnpm run typecheck`
   - Fix paths in import statements

2. **Build fails?**
   - Check: `pnpm run build 2>&1`
   - Review Vite config CSS handling

3. **Component not found?**
   - Check file path matches import
   - Verify file exists: `ls src/components/ui/Badge.tsx`

4. **Lost data/backups?**
   - Your backup is at: `.migration-backup-TIMESTAMP/`
   - Original App.tsx at: `src/App.original.tsx`

---

**Status: 🟢 Your dashboard is ready for incremental migration!**

Start with Phase 1 above, test, then move to Phase 2, etc.

Good luck! 🚀
