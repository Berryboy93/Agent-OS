# Agent-OS Design System Specification

**Scope:** Agent-OS project only  
**Not applicable to:** Stable/R3v4 (separate monorepo)  
**Version:** 1.0  
**Status:** Active  

---

## 1. Feature Set & Triggers

| Feature | Trigger/Behavior |
|---------|------------------|
| **⌘K Command Palette** | Press `⌘+K` anywhere to search and jump to any page |
| **Health Score Card** | Dynamic circular progress indicator in metric grid |
| **Predictive Alerts** | Auto-detects error patterns and shows amber banners before failures happen |
| **Circuit Breakers** | Auto-halts deployments when run failures spike |
| **Mouse Glow** | Hover metric cards — radial glow follows your cursor |
| **Smooth Tab Transitions** | Pages slide in directionally when switching tabs |
| **Progress Toasts** | Toast notifications with live countdown bars |

---

## 2. Implementation Roadmap

### Round 1: Foundation
**Files:** `styles/tokens.css`, `styles/globals.css`

Semantic design tokens (`glass-50` to `glass-600`), typography scale, layout tokens, enhanced color system, animation tokens

**Key Changes:**
- Token system
- Typography scale
- Spacing grid
- Color semanticization

### Round 2: Components
**Files:** `components/ui/*.tsx`

- MiniAreaChart
- CommandPalette (⌘K)
- HealthScoreCard
- PredictionPanel
- ActivitySpark
- PageTransition
- ToastItem with progress bars
- EnhancedStatusBadge with pulse

**Key Changes:**
- Spring physics
- Staggered entrances
- Mouse-tracking glow
- Smooth tab transitions

### Round 3: Agent System & Data Viz
**Files:** `services/errorPredictor.ts`, `services/remediationAgent.ts`

- ErrorPredictor with 8 signatures + compound patterns
- RemediationAgent with circuit breakers, auto-healing, escalation
- Area charts
- Command palette
- Animated status badges
- Activity sparks
- Health scores

---

## 3. Agent System Architecture

### Component Pipeline

| Component | Purpose | Trigger |
|-----------|---------|---------|
| **Observer** | Collects all events, maintains sliding window history | Every API poll (5s) |
| **Predictor** | Pattern matches against error signatures, calculates confidence | Post-observe |
| **Remediator** | Executes auto-fixes or queues human approvals | Confidence > 70% |
| **Circuit Breaker** | Prevents cascade failures | Compound pattern detection |

### Data Flow
```
Event Stream (5s poll)
    ↓
Observer (window history)
    ↓
Predictor (8 signatures + compound patterns)
    ↓
Confidence > 70% ?
    ├─ YES → Remediator (auto-fix or escalate)
    └─ NO  → Log & monitor
    ↓
Circuit Breaker (detect cascade)
    ├─ Triggered → Halt deployments
    └─ Clear   → Resume
```

---

## 4. Design Token System

### Problem → Solution Matrix

#### Font Sizing
**Current:** Mix of px values (10px, 11px, 12px, 13px) with no scale system  
**Fix:** Implement strict 4px modular scale

```css
--font-xs:   10px;    /* xs */
--font-sm:   12px;    /* sm */
--font-base: 14px;    /* base */
--font-lg:   16px;    /* lg */
--font-xl:   20px;    /* xl */
--font-2xl:  24px;    /* 2xl */
```

#### Line Heights
**Current:** Inconsistent `line-height: 1`, `1.2`, `1.5`  
**Fix:** Standardize by semantic category

```css
--line-height-tight:   1.2;  /* headings */
--line-height-normal:  1.5;  /* body */
--line-height-compact: 1;    /* UI labels */
```

#### Color Opacity System
**Current:** `rgba(255,255,255,0.025)` scattered everywhere  
**Fix:** Create semantic glass tokens

```css
--glass-50:   rgba(255, 255, 255, 0.05);
--glass-100:  rgba(255, 255, 255, 0.10);
--glass-200:  rgba(255, 255, 255, 0.20);
--glass-300:  rgba(255, 255, 255, 0.30);
--glass-400:  rgba(255, 255, 255, 0.40);
--glass-500:  rgba(255, 255, 255, 0.50);
--glass-600:  rgba(255, 255, 255, 0.60);
```

#### Layout Magic Numbers
**Current:** `240px` sidebar, `56px` topbar hardcoded  
**Fix:** CSS custom properties

```css
--sidebar-width:   240px;
--topbar-height:   56px;
--gutter-xs:       4px;
--gutter-sm:       8px;
--gutter-md:       16px;
--gutter-lg:       24px;
--gutter-xl:       32px;
```

#### Border Radii
**Current:** Mix of `radius-sm`, `radius-md`, manual `8px`  
**Fix:** Strict token enforcement

```css
--radius-xs:  2px;
--radius-sm:  4px;
--radius-md:  8px;
--radius-lg:  12px;
--radius-xl:  16px;
--radius-full: 9999px;
```

---

## 5. Implementation Checklist

### Phase 1: Foundation (Round 1)
- [ ] Create `styles/tokens.css` with all token definitions
- [ ] Update `styles/globals.css` with standardized typography
- [ ] Add animation tokens (spring physics, transitions)
- [ ] Document token naming conventions
- [ ] Validate all CSS properties use tokens (no hardcoded values)

### Phase 2: Components (Round 2)
- [ ] Implement MiniAreaChart component
- [ ] Build CommandPalette (⌘K shortcuts)
- [ ] Create HealthScoreCard with circular progress
- [ ] Build PredictionPanel for alerts
- [ ] Add ActivitySpark visualization
- [ ] Implement PageTransition with direction awareness
- [ ] Build ToastItem with progress bars
- [ ] Add EnhancedStatusBadge with pulse animation

### Phase 3: Agent System (Round 3)
- [ ] Implement Observer service (event collection, sliding window)
- [ ] Build Predictor with 8 error signatures
- [ ] Add compound pattern detection
- [ ] Implement Remediator with auto-fix logic
- [ ] Build Circuit Breaker mechanism
- [ ] Add escalation queue for human approval
- [ ] Integrate error prediction into dashboard

### Validation
- [ ] No hardcoded colors, sizes, or spacing values
- [ ] All animations use spring physics tokens
- [ ] Command palette functional with ⌘K
- [ ] Mouse glow effect on hover
- [ ] Predictor accuracy > 70%
- [ ] Circuit breaker prevents cascade failures

---

## 6. File Structure

```
Agent-OS/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── MiniAreaChart.tsx
│   │   │   ├── CommandPalette.tsx
│   │   │   ├── HealthScoreCard.tsx
│   │   │   ├── PredictionPanel.tsx
│   │   │   ├── ActivitySpark.tsx
│   │   │   ├── PageTransition.tsx
│   │   │   ├── ToastItem.tsx
│   │   │   └── EnhancedStatusBadge.tsx
│   ├── services/
│   │   ├── errorPredictor.ts
│   │   ├── remediationAgent.ts
│   │   └── circuitBreaker.ts
│   └── styles/
│       ├── tokens.css          ← All design tokens
│       ├── globals.css         ← Global styles
│       └── animations.css      ← Spring physics
```

---

## 7. Separation of Concerns

### Agent-OS (This Spec)
✅ Dashboard UI with design tokens  
✅ Predictive agent system  
✅ Error remediation  
✅ Circuit breakers  

### Stable/R3v4 (Separate)
❌ Not included in this spec  
❌ Maintain separate design system  
❌ Use pnpm workspace isolation  

**Do not apply these design tokens to Stable/R3v4.**

---

## 8. Related Documents

- `MYTHOS_COMPLETION_SUMMARY.md` — Security audit completion (applies to both)
- `packages/mythos-policy-engine/` — Policy engine (Agent-OS specific)
- `packages/rbac/` — Role-based access control (Agent-OS specific)

---

**Status:** Ready for Round 1 implementation  
**Last Updated:** 2026-06-05
