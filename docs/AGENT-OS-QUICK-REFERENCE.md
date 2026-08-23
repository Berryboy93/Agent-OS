# Agent-OS Design System — Quick Reference

**Scope:** Agent-OS only | **Not for Stable/R3v4**

---

## 1. Token Categories

### Typography
```
--font-xs:   10px   (badges, captions)
--font-sm:   12px   (labels)
--font-base: 14px   (body)
--font-lg:   16px   (subheadings)
--font-xl:   20px   (headings)
--font-2xl:  24px   (page titles)
```

### Spacing (4px base unit)
```
--gutter-xs:  4px    (tight padding)
--gutter-sm:  8px    (small cards)
--gutter-md:  16px   (normal padding)
--gutter-lg:  24px   (large sections)
--gutter-xl:  32px   (page margins)
```

### Border Radius
```
--radius-xs:   2px     (subtle)
--radius-sm:   4px     (button-like)
--radius-md:   8px     (cards)
--radius-lg:   12px    (modal)
--radius-full: 9999px  (pills)
```

### Glass Opacity (Semantic)
```
--glass-50:   5% white    (barely visible)
--glass-100:  10% white   (subtle backdrop)
--glass-200:  20% white   (medium)
--glass-300:  30% white   (strong)
--glass-400:  40% white   (opaque)
--glass-500:  50% white   (semi-opaque)
--glass-600:  60% white   (mostly opaque)
```

### Colors
```
Primary:   #a3e635 (lime-green, accent)
Success:   #22c55e (green-500)
Warning:   #eab308 (yellow-400)
Error:     #ef4444 (red-500)
Info:      #3b82f6 (blue-500)
```

### Motion
```
Fast:      150ms   (micro-interactions)
Normal:    300ms   (standard transitions)
Slow:      500ms   (important state changes)
Slower:    800ms   (animated tours)

Spring:    cubic-bezier(0.34, 1.56, 0.64, 1)
Smooth:    cubic-bezier(0.25, 0.46, 0.45, 0.94)
```

---

## 2. No Hardcoded Values

### ❌ DON'T
```css
/* Bad - hardcoded */
.card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 14px;
}
```

### ✅ DO
```css
/* Good - uses tokens */
.card {
  padding: var(--gutter-md);
  background: var(--glass-100);
  border-radius: var(--radius-md);
  font-size: var(--font-base);
}
```

---

## 3. Component Quick-Start

### Button
```tsx
<button className="text-sm transition-normal hover:glow-pulse">
  Click me
</button>
```

### Card (Glass)
```tsx
<div className="glass-md p-[var(--gutter-md)] rounded-[var(--radius-md)]">
  Content
</div>
```

### Status Badge
```tsx
<span className="status-success text-xs font-bold px-2 py-1 rounded-full">
  Active
</span>
```

### Toast with Progress
```tsx
<div className="spring-in bg-[var(--color-warning)] text-[var(--font-sm)]">
  <div className="progress-stroke" />
</div>
```

### Glow Effect on Hover
```tsx
<div 
  className="transition-normal hover:shadow-glow cursor-pointer"
  onMouseMove={(e) => {/* mouse tracking */}}
>
  Metric Card
</div>
```

---

## 4. Design System Rounds

### Round 1: Foundation
- ✅ Copy `AGENT-OS-TOKENS.css` → `src/styles/tokens.css`
- ✅ Import in global stylesheet
- ✅ Remove all hardcoded px/colors/sizes
- ⏳ Create color palette documentation

### Round 2: Components
- ⏳ Build component library with tokens
- ⏳ Implement animations (spring physics)
- ⏳ Add mouse glow tracking
- ⏳ Smooth tab transitions

### Round 3: Agent System
- ⏳ ErrorPredictor service (8 signatures)
- ⏳ RemediationAgent with auto-fixes
- ⏳ Circuit breaker (cascade prevention)
- ⏳ Dashboard integration

---

## 5. File Checklist

### Tokens & Styles
- [ ] `src/styles/tokens.css` ← Copy AGENT-OS-TOKENS.css
- [ ] `src/styles/globals.css` ← Import tokens, set baseline
- [ ] `src/styles/animations.css` ← Spring physics (optional separate file)

### Components
- [ ] `src/components/ui/MiniAreaChart.tsx`
- [ ] `src/components/ui/CommandPalette.tsx`
- [ ] `src/components/ui/HealthScoreCard.tsx`
- [ ] `src/components/ui/PredictionPanel.tsx`
- [ ] `src/components/ui/ActivitySpark.tsx`
- [ ] `src/components/ui/PageTransition.tsx`
- [ ] `src/components/ui/ToastItem.tsx`
- [ ] `src/components/ui/EnhancedStatusBadge.tsx`

### Services
- [ ] `src/services/errorPredictor.ts`
- [ ] `src/services/remediationAgent.ts`
- [ ] `src/services/circuitBreaker.ts`

---

## 6. Agent System Pipeline

```
Event → Observer (5s poll)
         ↓
      Predictor (8 signatures)
         ↓
      Confidence > 70% ?
       / \
     YES  NO
     /     \
Remediator  Monitor
   ↓
Circuit Breaker (cascade detect)
   ├─ Triggered → HALT
   └─ Clear → RESUME
```

---

## 7. Common Patterns

### Glass Card with Border
```css
.card {
  background: var(--glass-200);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-300);
  border-radius: var(--radius-md);
}
```

### Text Hierarchy
```
Heading:  var(--font-xl)   line-height: var(--line-height-tight)
Body:     var(--font-base) line-height: var(--line-height-normal)
Label:    var(--font-sm)   line-height: var(--line-height-compact)
```

### Responsive Padding
```css
/* Use gutter tokens instead of specific breakpoints */
.container {
  padding: var(--gutter-lg); /* 24px */
}

@media (max-width: 640px) {
  .container {
    padding: var(--gutter-md); /* 16px on mobile */
  }
}
```

### Alert Banner
```tsx
<div className="status-warning spring-in p-[var(--gutter-md)]">
  <p className="text-sm font-bold">Predictive Alert</p>
  <p className="text-xs text-[var(--color-text-muted)] mt-[var(--gutter-xs)]">
    Error pattern detected
  </p>
</div>
```

---

## 8. ⚠️ Important Notes

### Scope Isolation
- **Apply only to Agent-OS** — not Stable/R3v4
- Keep separate monorepos independent
- Use pnpm workspaces to isolate dependencies

### Color System
- Primary accent: `#a3e635` (lime-green)
- All UI uses dark slate background (`#0f172a`)
- High contrast for accessibility

### Motion
- Prefer spring physics for interactive elements
- Use linear easing for loading indicators
- Keep animations under 500ms for responsiveness

### Migration Path
- Do NOT apply to existing Stable code
- Plan Stable design refresh separately if needed
- Agent-OS is the pilot for this system

---

## 9. Links & References

- Design System Spec: `AGENT-OS-DESIGN-SYSTEM.md`
- Tokens CSS: `AGENT-OS-TOKENS.css`
- Mythos Security: `MYTHOS_COMPLETION_SUMMARY.md`

---

**Version:** 1.0  
**Last Updated:** 2026-06-05  
**Maintainer:** Agent-OS Team
