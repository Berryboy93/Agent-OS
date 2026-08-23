# Agent-OS Documentation Index

**Version:** 1.0  
**Last Updated:** 2026-06-10  
**Scope:** Agent-OS monorepo only (not Stable/R3v4)

---

## Core Components

### 1. Design System
**File:** `AGENT-OS-DESIGN-SYSTEM.md` (v1.0)

Full specification for Agent-OS visual design and component architecture.

**Includes:**
- Feature set & triggers (Command Palette, Health Score, Predictive Alerts, Circuit Breakers)
- Implementation roadmap (3 rounds: Foundation → Components → Agent System)
- Design token system with problem-solution matrix
- File structure & separation from Stable/R3v4

**Key Sections:**
- Typography scale, spacing grid, color semantics
- Glass opacity system (`glass-50` to `glass-600`)
- Animation tokens (spring physics, transitions)
- Barrier systems (cryptographic, vault isolation, sandbox execution)

**Status:** Ready for Round 1 implementation

---

### 2. Design Tokens
**File:** `AGENT-OS-TOKENS.css` (v1.0)

Canonical CSS variable definitions for Agent-OS.

**Includes:**
- Typography (10px–24px scale)
- Spacing (4px base unit grid)
- Border radius (2px–9999px)
- Glass opacity (5%–60% white)
- Colors (primary, success, warning, error, info)
- Motion (fast/normal/slow/slower + spring physics)
- Shadows & z-index system

**Implementation:** Copy to `src/styles/tokens.css`, import in globals

**Status:** Production-ready

---

### 3. Quick Reference
**File:** `AGENT-OS-QUICK-REFERENCE.md` (v1.0)

Condensed guide for developers integrating design tokens.

**Includes:**
- Token categories with usage examples
- Component quick-start (Button, Card, Badge, Toast)
- Design system rounds (progress checklist)
- File checklist
- Agent system pipeline diagram
- Common patterns & responsive approach

**Audience:** Developers, not designers

**Status:** Reference material (read when implementing)

---

### 4. Error Prediction Service
**File:** `AGENT-OS-ERROR-PREDICTOR.ts` (v1.0)

TypeScript service for detecting error patterns + predictive remediation.

**Classes:**
- `Observer` — collects events in sliding window (100 max, 5s poll)
- `Predictor` — matches 8 error signatures + compound patterns
- `CircuitBreaker` — halts deployments on cascade detection

**Error Signatures (8):**
1. Request Timeout
2. Connection Refused
3. Memory Pressure (heap/OOM)
4. Rate Limit Exceeded
5. Authentication Failure (401)
6. Schema Validation Error
7. Cascade Failure Detection
8. Unknown Error (fallback)

**Confidence Calculation:** Base 50% + severity boost + repetition boost

**Compound Patterns:**
- `cascade-failure` — multiple services failing
- `repeated-pattern` — same error type 3+ times
- `auth-cascade` — 5+ 401s in 5 min window

**Status:** Production-ready, integrated into `/api/errors/*` endpoints

---

### 5. Mythos Security Governance
**File:** `mythos_governance_v5_1.pdf` (v5.1)

Deterministic CI/CD governance engine with barrier-based deployment control.

**Core Concepts:**
- Barrier > Friction (only hard controls = security boundaries)
- Blast Radius Matrix (Surface × Action Type → Blast Level)
- Mythos-Class Re-pricing (adversarial analysis)
- Anchoring Protection (advisory vs. re-price divergence detection)
- Defer Policy (structured manual reviews)

**Surfaces:**
- `runtime` — production execution
- `dev-build-attacker-input` — untrusted build input
- `dev-build-supply-chain` — external dependencies
- `dev-build-isolated` — sandboxed build
- `dev-build-credential-exposure` — hard-blocked

**Blast Levels:** low, medium, high, critical

**Decision Outcomes:** ALLOW_RUNTIME, ALLOW_STAGING, ALLOW_SANDBOX, DEFER, BLOCK

**Invariants:**
1. Credential systems never modified via CI
2. Critical blast radius never reaches runtime
3. Advisory severity never overrides re-price
4. All deferrals must be structurally valid
5. Friction never substitutes for barriers

**Status:** Governance framework (applies to all three repos)

---

## Dashboard Integration

### 1. Custom Hook
**File:** `useErrorPrediction.ts` (v1.0)

React hook for polling error prediction data.

**Interface:**
- `fetch(/api/errors/recent)` every 5s
- `fetch(/api/errors/patterns)` every 10s
- Returns: `{ recentErrors, patterns, loading, error, severityCount, refetch }`

**Usage:**
```tsx
const { patterns, loading, error } = useErrorPrediction('http://localhost:5000', 5000);
```

---

### 2. PredictionPanel Component
**File:** `PredictionPanel.tsx` (v1.0)

Displays active error patterns with confidence, severity, circuit breaker state.

**Props:**
- `patterns: PatternData | null`
- `loading: boolean`
- `error: string | null`

**Features:**
- Circuit breaker status (closed/open/half-open)
- Pattern list with occurrence counts
- Severity statistics (critical/warning/info)
- Event window indicator

---

### 3. CircuitBreakerStatus Component
**File:** `CircuitBreakerStatus.tsx` (v1.0)

Real-time circuit breaker state indicator (compact + expanded).

**Props:**
- `state: 'closed' | 'open' | 'half-open'`
- `compact?: boolean` (true = badge, false = expanded)

**Color Coding:**
- Closed: green (`var(--color-success)`)
- Open: red (`var(--color-error)`)
- Half-open: yellow (`var(--color-warning)`)

---

## Implementation Guides

### 1. Routes Patching
**File:** `routes-patch-script.sh` (v1.0)

Bash script to safely apply ErrorPredictor routes to `agent-os-routes.ts`.

**Added Endpoints:**
- `POST /api/errors/report` — submit error event
- `GET /api/errors/recent` — fetch recent errors + predictions
- `GET /api/errors/patterns` — get active patterns + breaker state
- `POST /api/circuit-breaker/reset` — manual reset

**Safety:** Auto-backup, anchor guard, line count validation

---

### 2. Smoke Testing
**File:** `SMOKE-TEST.md` (v1.0)

Complete validation checklist for all three repos post-integration.

**Tests:**
- Routes patch application
- TypeScript compilation (zero errors)
- Agi-Suite PostgreSQL connection
- Agent-OS API endpoints (4 ErrorPredictor endpoints)
- Stable dev server (no OOM)
- Three-repo simultaneous operation

**Expected Duration:** 10–15 minutes

---

### 3. Dashboard Integration
**File:** `DASHBOARD-INTEGRATION.md` (v1.0)

Step-by-step wiring of ErrorPredictor components into dashboard.

**Steps:**
1. Copy design tokens
2. Add custom hook
3. Add UI components
4. Wire into dashboard/app
5. Validate in browser

**Checklist:** 11-item integration checklist + troubleshooting

---

## File Organization

```
Agent-OS/
├── docs/
│   ├── DESIGN-SYSTEM.md              (v1.0)
│   ├── QUICK-REFERENCE.md            (v1.0)
│   ├── ERROR-PREDICTOR-SPEC.md       (v1.0, extracted from .ts)
│   ├── MYTHOS-GOVERNANCE.md          (v5.1, PDF copy to MD)
│   ├── ROUTES-PATCHING.md            (v1.0)
│   ├── SMOKE-TEST.md                 (v1.0)
│   └── DASHBOARD-INTEGRATION.md      (v1.0)
├── src/
│   ├── styles/
│   │   └── tokens.css                (v1.0, from AGENT-OS-TOKENS.css)
│   ├── services/
│   │   └── errorPredictor.ts         (v1.0)
│   ├── hooks/
│   │   └── useErrorPrediction.ts     (v1.0)
│   └── components/ui/
│       ├── PredictionPanel.tsx       (v1.0)
│       └── CircuitBreakerStatus.tsx  (v1.0)
└── server/
    ├── agent-os-routes.ts            (patched, +80 LOC)
    └── ...
```

---

## Version History

### v1.0 (2026-06-10)
**Initial Release**

- Design System Specification (Round 1 Foundation)
- Design Tokens (CSS variable system)
- Quick Reference Guide
- Error Predictor Service (8 signatures, compound patterns, circuit breaker)
- ErrorPredictor Routes Integration (4 endpoints)
- Dashboard Components (hook, PredictionPanel, CircuitBreakerStatus)
- Smoke Test Checklist
- Integration Guides (routing, dashboard wiring)
- Mythos Governance (v5.1, security framework)

**Scope:** Agent-OS only
**Dependencies:** React 18, Vite 6.4.2, Lucide icons, pnpm workspace

---

## Integration Checklist (Master)

### Pre-Integration
- [ ] All three repos running (Penguin: Agent-OS + Agi-Suite, Kali: PostgreSQL)
- [ ] Node 20+ on Penguin, PostgreSQL on Kali
- [ ] `pnpm install` complete in all three repos

### Phase 1: Routes & Service
- [ ] Run `routes-patch-script.sh`
- [ ] Copy `errorPredictor.ts` to `src/services/`
- [ ] `pnpm tsc --noEmit` passes
- [ ] API endpoints reachable (http://localhost:5000)

### Phase 2: Dashboard Components
- [ ] Copy design tokens to `src/styles/tokens.css`
- [ ] Copy `useErrorPrediction.ts` to `src/hooks/`
- [ ] Copy `PredictionPanel.tsx` + `CircuitBreakerStatus.tsx` to `src/components/ui/`
- [ ] Wire into Dashboard component
- [ ] `pnpm tsc --noEmit` passes (no type errors)

### Phase 3: Validation
- [ ] Smoke test: all 6 tests pass
- [ ] Three repos running simultaneously
- [ ] Live polling: Network tab shows API calls every 5s
- [ ] No console errors or warnings
- [ ] Circuit breaker state visible + reactive

---

## Related Monorepos

### Stable (R3 v4)
- **Scope:** Separate design system, separate token infrastructure
- **Do NOT apply:** Agent-OS design tokens or Mythos governance (yet)
- **Shared:** Mythos governance framework (pending adaptation)

### Agi-Suite
- **Scope:** API server, PostgreSQL integration, RBAC
- **Status:** Smoke tested, PostgreSQL connection confirmed
- **Integration:** ErrorPredictor accessible via Agent-OS routes only

---

## Support & Maintenance

**Questions:**
- Design system specifics → see AGENT-OS-DESIGN-SYSTEM.md
- Token usage → see AGENT-OS-QUICK-REFERENCE.md
- Error prediction behavior → see AGENT-OS-ERROR-PREDICTOR.ts
- Security governance → see MYTHOS-GOVERNANCE.pdf

**Contributing:**
- Changes to design tokens → update AGENT-OS-TOKENS.css + docs
- New error signatures → add to ErrorPredictor service
- New routes → follow routes-patch.sh pattern with backup

**Versioning:**
- Docs follow semantic versioning (MAJOR.MINOR)
- Code changes trigger doc updates
- Each release: update version, date, changelog entry

---

**Master Index Version:** 1.0  
**Compiled:** 2026-06-10  
**Next Review:** 2026-07-10
