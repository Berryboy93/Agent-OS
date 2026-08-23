# Agent-OS Integration Suite v1.0

**Release Date:** 2026-06-10  
**Status:** Ready for deployment  
**Scope:** Agent-OS monorepo (design system + error prediction + dashboard integration)

---

## What's Included

This suite provides everything needed to integrate the **ErrorPredictor System** into the **Agent-OS Dashboard** with comprehensive design tokens and security governance.

### Documentation (Read These First)
1. **DOCUMENTATION-INDEX.md** — Master reference for all files and structure
2. **AGENT-OS-DESIGN-SYSTEM.md** — Full design specification + roadmap
3. **AGENT-OS-QUICK-REFERENCE.md** — Developer quick-start guide
4. **MYTHOS-GOVERNANCE.pdf** — Security framework (v5.1)

### Implementation Files (Copy These to Your Repo)

#### Services & Routes
- `errorPredictor-service.ts` → `~/Agent-OS/apps/dashboard/src/services/errorPredictor.ts`
- `routes-patch-script.sh` → Run this to patch `agent-os-routes.ts`

#### Design System
- `AGENT-OS-TOKENS.css` → `~/Agent-OS/apps/dashboard/src/styles/tokens.css`

#### Dashboard Components
- `useErrorPrediction.ts` → `~/Agent-OS/apps/dashboard/src/hooks/useErrorPrediction.ts`
- `PredictionPanel.tsx` → `~/Agent-OS/apps/dashboard/src/components/ui/PredictionPanel.tsx`
- `CircuitBreakerStatus.tsx` → `~/Agent-OS/apps/dashboard/src/components/ui/CircuitBreakerStatus.tsx`

#### Integration Guides
- `SMOKE-TEST.md` — Full three-repo validation checklist
- `DASHBOARD-INTEGRATION.md` — Step-by-step dashboard wiring

---

## Quick Start (5 Steps)

### 1. Apply Routes Patch (Penguin)
```bash
bash routes-patch-script.sh
```
Adds 4 new ErrorPredictor endpoints to `agent-os-routes.ts`.

### 2. Copy ErrorPredictor Service (Penguin)
```bash
mkdir -p ~/Agent-OS/apps/dashboard/src/services
cp errorPredictor-service.ts ~/Agent-OS/apps/dashboard/src/services/errorPredictor.ts
```

### 3. Copy Design Tokens (Penguin)
```bash
mkdir -p ~/Agent-OS/apps/dashboard/src/styles
cp AGENT-OS-TOKENS.css ~/Agent-OS/apps/dashboard/src/styles/tokens.css
```
Then add to `src/styles/globals.css`:
```css
@import './tokens.css';
```

### 4. Copy Dashboard Components (Penguin)
```bash
mkdir -p ~/Agent-OS/apps/dashboard/src/hooks
mkdir -p ~/Agent-OS/apps/dashboard/src/components/ui

cp useErrorPrediction.ts ~/Agent-OS/apps/dashboard/src/hooks/
cp PredictionPanel.tsx ~/Agent-OS/apps/dashboard/src/components/ui/
cp CircuitBreakerStatus.tsx ~/Agent-OS/apps/dashboard/src/components/ui/
```

### 5. Wire into Dashboard (Penguin)
Follow **DASHBOARD-INTEGRATION.md** to add components to your Dashboard/App component.

**Expected result:** Live error prediction panel with circuit breaker status.

---

## Validation

### TypeScript Check
```bash
cd ~/Agent-OS/apps/dashboard
pnpm tsc --noEmit
```
Should return **zero errors**.

### Full Smoke Test
Follow **SMOKE-TEST.md** for complete three-repo validation:
- Agent-OS API endpoints reachable
- Agi-Suite PostgreSQL working
- Stable dev server running
- All components communicating

**Expected duration:** 10–15 minutes

---

## Architecture Overview

```
Agent-OS Dashboard (React + Vite)
    ↓
useErrorPrediction Hook (custom hook, polls every 5s)
    ↓
/api/errors/recent, /api/errors/patterns (Agent-OS API)
    ↓
ErrorPredictor Service (Observer → Predictor → CircuitBreaker)
    ↓
UI Components (PredictionPanel + CircuitBreakerStatus)
    ↓
Design Tokens (AGENT-OS-TOKENS.css, glass morphism style)
```

### Error Prediction Pipeline
```
Event Stream (5s poll)
    ↓
Observer (sliding window, 100 max events)
    ↓
Predictor (8 error signatures + compound patterns)
    ↓
Confidence > 70% ?
    ├─ YES → requires approval (dashboard shows alert)
    └─ NO → log & monitor
    ↓
CircuitBreaker (cascade detection)
    ├─ Triggered → HALT deployments
    └─ Clear → RESUME
```

---

## Key Features

### Design System
- **Semantic Tokens:** Glass opacity, typography scale, spacing grid
- **Glass Morphism:** 7 opacity levels (`glass-50` to `glass-600`)
- **Spring Physics:** Smooth, bouncy animations
- **Color Semantics:** Success (green), warning (yellow), error (red), info (blue), primary (lime)

### Error Prediction
- **8 Error Signatures:** Timeout, connection refused, memory, rate limit, auth, schema, cascade, unknown
- **Compound Patterns:** Cascade failure, repeated errors, auth cascades
- **Confidence Calculation:** Base 50% + severity boost + repetition boost
- **Circuit Breaker:** Halts deployments on cascade detection

### Dashboard
- **Live Polling:** Real-time error data every 5 seconds
- **Reactive Components:** Severity color-coding, circuit breaker state
- **Glass Cards:** Design tokens applied to all UI elements
- **Responsive:** Mobile-friendly glass morphism design

---

## File Structure (Recommended)

```
Agent-OS/
├── src/
│   ├── styles/
│   │   ├── globals.css
│   │   ├── tokens.css              ← Copy AGENT-OS-TOKENS.css here
│   │   └── animations.css
│   ├── services/
│   │   └── errorPredictor.ts       ← Copy errorPredictor-service.ts here
│   ├── hooks/
│   │   └── useErrorPrediction.ts   ← Copy useErrorPrediction.ts here
│   ├── components/
│   │   └── ui/
│   │       ├── PredictionPanel.tsx ← Copy PredictionPanel.tsx here
│   │       └── CircuitBreakerStatus.tsx ← Copy CircuitBreakerStatus.tsx here
│   ├── pages/
│   │   ├── Dashboard.tsx           ← Wire components here
│   │   ├── Agents.tsx
│   │   └── Analytics.tsx
│   └── App.tsx
├── server/
│   └── agent-os-routes.ts          ← Patch with routes-patch-script.sh
└── docs/
    ├── DOCUMENTATION-INDEX.md
    ├── DESIGN-SYSTEM.md
    ├── QUICK-REFERENCE.md
    ├── SMOKE-TEST.md
    ├── DASHBOARD-INTEGRATION.md
    └── MYTHOS-GOVERNANCE.pdf
```

---

## Dependencies

### Required
- Node 20+ (on Penguin)
- React 18
- Vite 6.4.2
- pnpm workspace
- PostgreSQL (on Kali, for Agi-Suite)

### Optional
- Lucide icons (already in Agent-OS)
- @types/node, typescript

### Install All
```bash
cd ~/Agent-OS/apps/dashboard
pnpm install
```

---

## Security & Governance

This suite integrates **Mythos Governance v5.1**, a deterministic CI/CD framework:

- **Barrier-Based Control:** Only cryptographic, vault, and sandbox isolation count as security boundaries
- **Blast Radius Matrix:** Surface × Action Type → Blast Level (low, medium, high, critical)
- **Mythos-Class Re-pricing:** Adversarial analysis of all changes
- **Anchoring Protection:** Detects divergence between advisory and re-priced severity
- **Defer Policy:** Structured manual review with trigger conditions

See **MYTHOS-GOVERNANCE.pdf** for full specification.

---

## Troubleshooting

### Routes Patch Failed
```bash
# Restore from backup
cp ~/Agent-OS/apps/dashboard/server/agent-os-routes.ts.*.bak \
   ~/Agent-OS/apps/dashboard/server/agent-os-routes.ts
```

### Type Errors After Integration
```bash
cd ~/Agent-OS/apps/dashboard
pnpm install
pnpm tsc --noEmit
```

### API Endpoints Returning 404
- Verify Agent-OS API running on port 5000: `lsof -i :5000`
- Check `/api/errors/recent` reachable: `curl http://localhost:5000/api/errors/recent`

### OOM on Crostini
```bash
# Use API server filter only (no frontend)
pnpm --filter @workspace/api-server dev
```

### No Data Showing in Dashboard
- Check browser DevTools → Network tab
- Verify API calls every 5s (`/api/errors/recent`, `/api/errors/patterns`)
- Check browser console for fetch errors

---

## Version History

### v1.0 (2026-06-10)
**Initial Release**
- Design System (Round 1 Foundation)
- ErrorPredictor Service (8 signatures, compound patterns, circuit breaker)
- Dashboard Integration (3 components, custom hook)
- Design Tokens (CSS variable system, glass morphism)
- Smoke Test Checklist
- Mythos Governance Framework (v5.1)
- Full Documentation Suite

**Status:** Production-ready

---

## Next Steps (Post-Integration)

### Round 2: Enhanced Components
- [ ] MiniAreaChart (sparklines for error trends)
- [ ] CommandPalette (⌘K shortcuts)
- [ ] HealthScoreCard (circular progress)
- [ ] ActivitySpark (animated activity indicator)
- [ ] PageTransition (directional slide-in animations)
- [ ] ToastItem (notifications with progress bars)
- [ ] EnhancedStatusBadge (pulse animations)

### Round 3: Agent System Expansion
- [ ] RemediationAgent (auto-fix execution)
- [ ] Advanced escalation queue
- [ ] Multi-service coordination
- [ ] Historical trend analysis
- [ ] Predictive alerting (before failure occurs)

---

## Support

**Questions about:**
- **Design System** → Read AGENT-OS-DESIGN-SYSTEM.md
- **Tokens Usage** → Read AGENT-OS-QUICK-REFERENCE.md
- **Error Prediction** → Read errorPredictor-service.ts + comments
- **Integration Steps** → Read DASHBOARD-INTEGRATION.md
- **Security** → Read MYTHOS-GOVERNANCE.pdf

**Issues:**
- Routes patch → Check routes-patch-script.sh error output
- Type errors → Run `pnpm install` + `pnpm tsc --noEmit`
- API failures → Check smoke test Network tab

---

## License & Scope

**Scope:** Agent-OS only  
**Do NOT apply to:** Stable/R3v4 (separate design system pending)

This suite is part of the Agent-OS monorepo asset sale preparation.

---

**Suite Version:** 1.0  
**Release Date:** 2026-06-10  
**Maintained By:** Agent-OS Team  
**Next Review:** 2026-07-10
