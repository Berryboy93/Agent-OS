r3v@penguin:~/Agi-Suite$ cat ~/Agi-Suite/docs/PRD_v3.md
# Agi-Suite — Product Requirements Document (v3.0)

**Codename:** Autonomous Engineering System  
**Version:** 3.0  
**Date:** 2026-04-18  
**Supersedes:** PRD v2.0  
**Status:** Active — forward-looking specification

---

## Audit of Source Material (agi_suite_upgrade.txt)

Before proceeding: the uploaded v3–v5 vision document was triple-checked. 23 bugs and gaps were identified and resolved in this PRD. Key issues corrected:

| Category            | Problem                                                              | Resolution                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version numbering   | Jumps v2→v3→v4(AGI-CMD)→v5, no v4 PRD                                | Linear v2→v3 with clear phase names                                                                                                                 |
| Current state       | Marks multi-agent/evolution/meta-evolution ✅ DONE                   | Correctly mapped: none of these are built                                                                                                           |
| Ephemeral state ×4  | StrategyStore, KnowledgeBase, Reputation, MetaRegistry all in-memory | All persisted to PostgreSQL                                                                                                                         |
| Divide by zero      | `stats.success / stats.total` when total===0                         | Guard: `total === 0 ? 0 : success / total`                                                                                                          |
| Selector edge case  | `baselineScore * 1.1` fails when baselineScore===0                   | Floor: `Math.max(baselineScore * 1.1, MIN_ADOPTION_SCORE)`                                                                                          |
| Undefined functions | `generatePatch`, `ctx.runWithConfig`, `ctx.sampleTask`               | Specified in FR-029 (Planning Engine), FR-031 (Simulation Engine), FR-037 (Meta-Evolution — sample task defined as most recent evolution log entry) |
| Execution counter   | `executionCount % 20` never defined or persisted                     | Persisted to `system_state` table                                                                                                                   |
| Policy context type | `condition: (context) => boolean` untyped                            | `PolicyContext` fully typed in FR-027                                                                                                               |
| Trust escalation    | L0–L5 with no escalation mechanism                                   | Explicit escalation protocol in FR-028                                                                                                              |
| Simulation engine   | "Apply in memory" undefined for filesystem patches                   | Defined as in-process string diff + test runner                                                                                                     |
| Drizzle string ref  | `db.select().from("evolution_logs")` is a TS error                   | All tables use typed Drizzle schema references                                                                                                      |
| Governance type     | `metaChange.affects` untyped                                         | `MetaChange` type fully defined in FR-037                                                                                                           |
| No sync transport   | push/pull with no protocol                                           | HTTP REST + ed25519 node identity in FR-040                                                                                                         |
| No node auth        | Any node can poison knowledge base                                   | Signed payloads + reputation filtering in FR-041                                                                                                    |
| No DB schema        | `evolution_logs` has no schema                                       | Full Drizzle schema in Section 12                                                                                                                   |
| System conflation   | AGI-CMD and Agi-Suite treated as same                                | Separated: Agi-Suite is the platform; AGI-CMD is one subsystem                                                                                      |
| Multi-agent unspec. | Roles named, communication undefined                                 | Typed `AgentMessage` in-process bus in FR-030                                                                                                       |
| Validator gap       | Only checks `length===0`, no swing detection                         | Delta threshold enforcement in FR-035                                                                                                               |

---

## Table of Contents

1. [What Changed (v2 → v3)](#1-what-changed)
2. [Product Vision](#2-product-vision)
3. [Closed-Loop Engineering Principle](#3-closed-loop-engineering-principle)
4. [System Architecture — Five Tiers](#4-system-architecture--five-tiers)
5. [Current State — Honest Baseline](#5-current-state--honest-baseline)
6. [Feature Requirements — Phase 2 (Hardening)](#6-feature-requirements--phase-2-hardening)
7. [Feature Requirements — Phase 3 (Intelligence)](#7-feature-requirements--phase-3-intelligence)
8. [Feature Requirements — Phase 4 (Autonomy)](#8-feature-requirements--phase-4-autonomy)
9. [Feature Requirements — Phase 5 (Self-Evolution)](#9-feature-requirements--phase-5-self-evolution)
10. [Feature Requirements — Phase 6 (Distributed)](#10-feature-requirements--phase-6-distributed)
11. [Technical Requirements](#11-technical-requirements)
12. [Data Model](#12-data-model)
13. [Security Model](#13-security-model)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [Success Metrics](#15-success-metrics)
16. [Release Phases](#16-release-phases)
17. [Decisions Log](#17-decisions-log)

---

## 1. What Changed

This is a category upgrade, not an iteration. v2.0 described a well-built engineering dashboard with an embedded AI chat panel. v3.0 specifies the path from that dashboard to a self-operating engineering system.

| Dimension     | v2.0                           | v3.0                                                                                     |
| ------------- | ------------------------------ | ---------------------------------------------------------------------------------------- |
| System role   | Dashboard + AI chat            | Closed-loop autonomous engineering system                                                |
| AI capability | Streaming chat                 | State-aware agent with tool use, planning, and authority layers                          |
| QA model      | Manual checklist + verify view | Continuous verification engine (always-on)                                               |
| Dev loop      | Human-driven                   | Progressively autonomous with governed execution gates                                   |
| Metrics       | Observability display          | Decision-driving intelligence: health score, drift detection, anomaly alerts             |
| Safety        | Documented rules               | Formalized Policy Engine with typed context and execution gates                          |
| Architecture  | Two-service monorepo           | Five-tier system: Infrastructure → Observability → Execution → Intelligence → Governance |

---

## 2. Product Vision

**v2.0:** "The only interface needed to develop, operate, and evolve R3 v4 — from writing code to shipping deploys, all from a single browser-based dashboard with an AI co-pilot."

**v3.0 extension:** Agi-Suite becomes a self-operating engineering system that can observe itself, diagnose issues, propose and execute fixes, verify outcomes, and improve its own decision-making — all within governed safety boundaries. The developer's role shifts from executing tasks to approving decisions.

**The critical distinction:** This is not AGI. It is a bounded, self-improving engineering system — controlled adaptive optimization with hard containment walls. The system proposes; humans gate high-risk actions. Every change is logged, reversible, and diagnosable. Going beyond these bounds does not mean more power — it means more risk, more unpredictability, and harder debugging.

---

## 3. Closed-Loop Engineering Principle

**v2.0 model (human-driven loop):**

```
Human: observe → think → act → verify → repeat
```

**v3.0 model (system-driven, human-gated on risk):**

```
SYSTEM LOOP (continuous)

  observe → analyze → plan → [gate: human?] → execute → verify → record → update model
     ↑                             ↓ deny                                        |
     └─────────────────────────────────────────────────────────────────────────┘

Gate behavior by action risk:
  Safe tools      → auto-execute (no gate)
  Controlled tools → policy check (auto if passes)
  Restricted tools → human confirmation always required
```

The loop is a first-class system component. The developer's role at each risk tier:

- **Safe:** Observer — system acts, developer reviews asynchronously
- **Controlled:** Approver — system shows plan, developer approves before execution
- **Restricted:** Authorizer — developer explicitly triggers with full diff preview

---

## 4. System Architecture — Five Tiers

```
┌──────────────────────────────────────────────────────────────────────────┐
│  L5 — AUTONOMOUS GOVERNANCE LAYER                                         │
│  PolicyEngine · ExecutionGate · TrustAuthority · AuditLog                │
├──────────────────────────────────────────────────────────────────────────┤
│  L4 — AGENT INTELLIGENCE LAYER                                            │
│  PlanningEngine · MultiAgentSystem · EvolutionCycle · MetaEvolution      │
├──────────────────────────────────────────────────────────────────────────┤
│  L3 — EXECUTION & TOOLING LAYER                                           │
│  SafeTools · ControlledTools · RestrictedTools · SimulationEngine        │
├──────────────────────────────────────────────────────────────────────────┤
│  L2 — OBSERVABILITY LAYER                                                 │
│  HealthScore · DriftDetection · AnomalyDetection · MetricsHistory        │
├──────────────────────────────────────────────────────────────────────────┤
│  L1 — INFRASTRUCTURE LAYER                                                │
│  Express API · PostgreSQL · Vite Frontend · Railway · pnpm Workspace     │
└──────────────────────────────────────────────────────────────────────────┘
```

L1 is fully built. L2–L5 are the v3.0 build-out, sequenced across Phases 2–6.

---

## 5. Current State — Honest Baseline

As of v2.0 (2026-04-18), the following is confirmed built and verified:

| Capability                    | Status       | Notes                                      |
| ----------------------------- | ------------ | ------------------------------------------ |
| Dashboard UI (12 views)       | ✅ Built     | All views rendered, typecheck clean        |
| SSE metrics stream            | ✅ Built     | Active users, subscriber count             |
| Agent chat (streaming)        | ✅ Built     | Single-turn and multi-turn                 |
| Agent abort handling          | ✅ Built     | `stream.on("abort")` — confirmed in source |
| tsx watch hot reload          | ✅ Built     | Sub-500ms restart                          |
| Git hooks                     | ✅ Built     | Pre-commit prettier, pre-push typecheck    |
| DB migrate/generate scripts   | ✅ Built     | Drizzle migration workflow                 |
| Vitest workspace              | ✅ Built     | Runner configured, zero test files yet     |
| Agent tool use                | ❌ Not built | FR-014 — Phase 3                           |
| Request authentication        | ❌ Not built | FR-016 — Phase 2                           |
| Conversation persistence      | ❌ Not built | FR-015 — Phase 2                           |
| System health score           | ❌ Not built | FR-023 — Phase 3                           |
| Drift detection               | ❌ Not built | FR-024 — Phase 3                           |
| Planning engine               | ❌ Not built | FR-029 — Phase 4                           |
| Multi-agent system            | ❌ Not built | FR-030 — Phase 4                           |
| Policy Engine (L5 governance) | ❌ Not built | FR-027 — Phase 4                           |
| Self-evolution                | ❌ Not built | FR-034 — Phase 5                           |
| Meta-evolution                | ❌ Not built | FR-037 — Phase 5                           |
| Distributed intelligence      | ❌ Not built | FR-039 — Phase 6                           |

---

## 6. Feature Requirements — Phase 2 (Hardening)

_Target: 4 weeks. Prerequisite gate for all subsequent phases._

### FR-016: Request Authentication

Bearer token middleware on all routes except `/api/healthz`. `API_SECRET` env var on Railway. `VITE_API_SECRET` in Vite env config, injected into the custom fetch wrapper in `lib/api-client-react`. SSE connections pass token as `Authorization` header on the initial request. `401` responses handled by frontend as error state.

### FR-015: Conversation Persistence (Phase 1 — localStorage)

localStorage-backed conversation history. Restores on page reload. Capped at 50 messages with graceful truncation. Clear button empties both Zustand store and localStorage. Required before agent tool use — tool results must persist in history for correct follow-up reasoning.

### FR-017: Streaming Cancel

`AbortController` per request in `AgentSuitePanel`. Cancel button visible only during active streaming. Partial response preserved in chat history on cancel. No server changes needed — server already handles `req.on("close")` correctly.

### FR-018: ESLint

Flat config (`eslint.config.js`) at workspace root. Plugins: `@typescript-eslint/eslint-plugin`, `eslint-plugin-react-hooks`, `eslint-config-prettier`. Zero lint errors on current codebase before enabling. `"lint": "eslint ."` added to root scripts. `pre-push` hook updated: `pnpm typecheck && pnpm lint`.

### FR-019: Test Coverage — `lib/api-zod`

Unit tests for every Zod schema. Parse valid inputs, reject invalid inputs, verify error messages. 80% line coverage threshold enforced in `vitest.config.ts`. Tests colocated with source: `schema.test.ts` beside `schema.ts`.

### FR-020: CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec prettier --check .
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

Target: under 3 minutes. All six checks must pass for green CI.

### FR-021: Metrics Persistence to PostgreSQL

`metrics_kv` table. Upsert on every increment (async, non-blocking). DB write failure does not block heartbeat response. Eliminates the `/tmp/r3-metrics.json` reset-on-deploy issue.

### FR-022: Structured Error Responses

All routes return `{ error: string; code?: string; requestId?: string }`. Global error handler added to `app.ts`. Type defined in `lib/api-spec/openapi.yaml` and regenerated downstream. No route returns HTML for any error condition.

---

## 7. Feature Requirements — Phase 3 (Intelligence)

_Target: 8 weeks. Requires Phase 2 complete and CI green._

### FR-014: Agent Tool Use

Server-side tool execution via Anthropic tool_use API. Three risk tiers with clear trust requirements.

**Safe Tools — auto-execute at L2 (default trust):**

| Tool             | Implementation            | Constraint                  |
| ---------------- | ------------------------- | --------------------------- |
| `read_file`      | `fs.readFile`             | Sandboxed to workspace root |
| `list_directory` | `fs.readdir` recursive    | Sandboxed to workspace root |
| `get_metrics`    | In-memory metrics state   | No I/O                      |
| `list_routes`    | Introspect Express router | No I/O                      |

**Sandbox enforcement (applies to all file tools):**

```typescript
function assertSandboxed(requestedPath: string, root: string): void {
  const resolved = path.resolve(requestedPath);
  if (!resolved.startsWith(root)) {
    throw new Error(`Path escape blocked: ${requestedPath}`);
  }
}
```

**Controlled Tools — require L3 trust or inline confirmation:**

| Tool            | Implementation                                                     | Timeout |
| --------------- | ------------------------------------------------------------------ | ------- |
| `run_typecheck` | `child_process.exec('pnpm typecheck')`, stdout returned            | 60s     |
| `run_tests`     | `child_process.exec('pnpm test --run')`, parsed Vitest JSON output | 120s    |
| `query_db`      | Drizzle raw query inside `SET TRANSACTION READ ONLY`               | 10s     |

**Phase 3 confirmation mechanism (pre-Planning Engine):** Before any controlled tool executes, the agent emits a `confirm_required` SSE event to the frontend with the tool name and arguments. The `AgentSuitePanel` renders a confirmation prompt inline in the chat. The tool does not execute until the user clicks "Confirm" or "Cancel". The full Planning Engine (FR-029) replaces this with a richer step-by-step plan UI in Phase 4.

`query_db` DDL guard:

```typescript
const FORBIDDEN = /^\s*(DROP|CREATE|ALTER|TRUNCATE|INSERT|UPDATE|DELETE)/i;
if (FORBIDDEN.test(sql)) throw new Error("DDL and write queries are forbidden");
```

**Restricted Tools — require L4 trust + human confirmation (Phase 4+):**
`write_file`, `apply_patch`, `run_migration`, `trigger_deploy`

**Tool result streaming:** `tool_use` and `tool_result` SSE events emitted inline alongside `text_delta`. Frontend renders tool call blocks as distinct UI elements in chat.

### FR-023: System Health Score

Composite 0–100 score. Computed on-demand, cached 60 seconds. Triggered by: deploy, agent action, manual request. Never computed on a background interval — compute is triggered, not polling.

```typescript
interface HealthScore {
  score: number; // 0–100 weighted composite
  components: {
    typecheck: number; // 0 or 100
    testPassRate: number | null; // 0–100, null if no test files exist yet
    buildSuccess: number; // 0 or 100
    errorRate: number; // 0–100 (inverted: 0 errors = 100)
    agentSuccessRate: number | null; // 0–100, null until Phase 4 agent actions exist
  };
  trend: "improving" | "stable" | "degrading";
  computedAt: string;
}
```

Surfaced in `OverviewView` as a prominent score with component breakdown.

### FR-024: Drift Detection

Rolling 24-hour window. Alerts on:

- Error rate increases > 50% vs. prior period
- Build time increases > 100% vs. 7-day average
- Test pass rate drops > 10 percentage points

Alerts are non-blocking warnings in `OverviewView`. No automated action — human decides response. Stored in `system_health_snapshots` for trend history.

### FR-025: Metrics History

`metrics_events` time-series table. `GET /api/metrics/history?period=7d`. Line chart in `OverviewView` using recharts.

### FR-026: Conversation Persistence (Phase 2 — Database)

`conversations` and `messages` tables. POST each conversation turn to `/api/agent/conversations`. Load history on mount from `/api/agent/conversations/:id`. Required before multi-agent (Phase 4) — agents need shared conversation context.

---

## 8. Feature Requirements — Phase 4 (Autonomy)

_Target: 12 weeks. Requires Phase 3 stable in production for 14 days._

### FR-027: Policy Engine (L5 Governance)

Every agent action passes through the Policy Engine before execution. The engine is typed, testable, and cannot be modified by agent actions.

```typescript
interface PolicyContext {
  action: AgentAction;
  trust: TrustLevel;
  systemHealthScore: number;
  testPassRate: number | null;
  lastDeployStatus: "success" | "failure" | "unknown";
  pendingMigrations: number;
  agentSuccessRate7d: number | null;
  openPolicyViolations: number;
}

type PolicyVerdict = "allow" | "deny" | "require_confirmation";

interface Policy {
  id: string;
  description: string;
  condition: (ctx: PolicyContext) => boolean;
  verdict: PolicyVerdict;
  reason: string;
}
```

**Default policies (non-negotiable, not configurable at runtime):**

```typescript
const DEFAULT_POLICIES: Policy[] = [
  {
    id: "no-deploy-low-tests",
    description: "Block deploy if test pass rate < 95%",
    condition: (ctx) =>
      ctx.action.type === "trigger_deploy" && (ctx.testPassRate ?? 0) < 95,
    verdict: "deny",
    reason: "Test pass rate below 95% threshold",
    // NOTE: when testPassRate is null (no test files exist yet), null ?? 0 = 0 < 95 = true.
    // This intentionally blocks all deploys until a test suite exists.
    // Acceptance: first deploy after FR-019 is complete.
  },
  {
    id: "no-migration-without-confirmation",
    description: "All migrations require explicit confirmation",
    condition: (ctx) => ctx.action.type === "run_migration",
    verdict: "require_confirmation",
    reason: "Migrations are irreversible — explicit approval required",
  },
  {
    id: "no-write-degrading-health",
    description: "Block file writes when system health < 60",
    condition: (ctx) =>
      ctx.action.type === "write_file" && ctx.systemHealthScore < 60,
    verdict: "deny",
    reason: "System health too low for write operations",
  },
  {
    id: "no-deploy-degrading-trend",
    description: "Require confirmation for deploy when health degrading",
    condition: (ctx) =>
      ctx.action.type === "trigger_deploy" && ctx.systemHealthScore < 70,
    verdict: "require_confirmation",
    reason:
      "System health degrading — explicit approval required before deploy",
  },
];
```

**Execution Gate flow:**

```
Agent → proposed AgentAction
  → PolicyEngine.evaluate(action, context) → verdict
    "allow"               → execute immediately, log to audit_log
    "require_confirmation" → surface to UI, await typed acknowledgment, log
    "deny"                → reject with reason, log to audit_log, no execution
```

All verdicts are logged to `audit_log`. The audit log is append-only.

### FR-028: Trust Authority Model

Trust levels are not granted automatically. Escalation requires explicit operator action.

```typescript
type TrustLevel = "L0" | "L1" | "L2" | "L3" | "L4";
// L0: Read-only (no file content, no metrics writes)
// L1: Suggest actions only — no tool execution
// L2: Execute safe tools automatically (DEFAULT)
// L3: Execute controlled tools subject to policy check
// L4: Execute restricted tools with human confirmation gate
```

**Escalation protocol:**

- L2 is the default. Set by omitting `AGENT_TRUST_LEVEL` env var.
- L3: Set `AGENT_TRUST_LEVEL=L3`. Restart server. No other steps.
- L4: Set `AGENT_TRUST_LEVEL=L4` AND `AGENT_DEPLOY_CONFIRMED=true`. Restart server.
- No runtime escalation — prevents prompt injection attacks from elevating trust within a session.
- Trust level is read once at startup and never changed until next restart.

### FR-029: Planning Engine

Before executing any multi-step or controlled/restricted action, the agent creates a structured plan. The plan is shown to the developer before any tool calls are made.

```typescript
interface AgentPlan {
  id: string;
  goal: string;
  steps: PlanStep[];
  estimatedRisk: "low" | "medium" | "high";
  requiresConfirmation: boolean;
  status: "pending" | "approved" | "running" | "complete" | "rejected";
  createdAt: string;
  approvedAt: string | null;
}

interface PlanStep {
  index: number;
  description: string;
  tool: string | null;
  toolArgs: Record<string, unknown> | null;
  riskLevel: "safe" | "controlled" | "restricted";
  status: "pending" | "running" | "complete" | "failed" | "skipped";
}
```

`AgentSuitePanel` renders the plan as an interactive step list before execution. User can: approve entire plan, reject, or reject individual steps. Approved plan is persisted to `agent_plans` table. Rejected plans are logged but not executed.

### FR-030: Multi-Agent System

Four specialized roles communicating via an in-process typed message bus. All roles run in the same Node process. No separate services. Opt-in via `MULTI_AGENT_MODE=true` env var — defaults to single-agent mode.

```typescript
type AgentRole = "Builder" | "Auditor" | "Operator" | "Analyst";

interface AgentMessage {
  id: string;
  from: AgentRole;
  to: AgentRole | "broadcast";
  type: "task" | "result" | "critique" | "decision" | "status";
  payload: unknown;
  timestamp: string;
}
```

**Role definitions:**

| Agent    | Responsibility                                               | Tool access                                                               |
| -------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Analyst  | Reads system state, computes health, surfaces anomalies      | `get_metrics`, `list_routes`, `query_db`(read)                            |
| Builder  | Generates solution strategies from the strategy store        | `read_file`, `list_directory`                                             |
| Auditor  | Critiques Builder output for correctness, risk, side-effects | `read_file`, `run_typecheck`                                              |
| Operator | Executes the approved plan, handles deploy                   | `run_tests`, `apply_patch`(L4), `run_migration`(L4), `trigger_deploy`(L4) |

**Coordination flow:**

```
User request
  → Analyst: assess system state, compute context
  → Builder: generate N solution strategies (using strategy store weights)
  → Auditor: score each strategy for correctness, risk, side-effects
  → PolicyEngine: gate execution based on scores and context
  → [Human confirmation if required_confirmation]
  → Operator: execute approved plan step by step
  → Analyst: verify outcome, update health score
  → EvolutionTracker: record result
```

### FR-031: Simulation Engine

Before any restricted tool executes, a simulation pass runs first. "Simulation" is defined concretely for each tool type:

| Tool                         | Simulation                                                                    | Accept condition           |
| ---------------------------- | ----------------------------------------------------------------------------- | -------------------------- |
| `write_file` / `apply_patch` | Apply changes in a temp copy of the file, run `pnpm typecheck --noEmit` on it | Zero new TypeScript errors |
| `run_migration`              | Run `drizzle-kit generate --check` to verify migration is valid               | No generation errors       |
| `trigger_deploy`             | Run `pnpm build` against current source                                       | Build succeeds             |

Simulation failures block execution and surface the failure reason in the plan UI. The original file is never touched during simulation.

### FR-032: Rollback System

Every restricted tool execution records a rollback snapshot before acting. `apply_patch` captures the original file content. `run_migration` records the migration version before applying. On failure, the Operator agent calls `rollback(planId)` which restores the pre-action state. Rollback records are stored in `audit_log` alongside the original action. Rollback is always available for 72 hours after execution.

### FR-033: Agent Action History View

New dashboard view (`ActionHistoryView`) showing a filterable, paginated log of all agent actions pulled from `audit_log`. Columns: timestamp, agent role, action type, tool, policy verdict, outcome. Clicking any row expands to show full payload and result. Replaces the need to query the DB directly for audit information. Added to sidebar nav alongside existing views.

---

## 9. Feature Requirements — Phase 5 (Self-Evolution)

_Target: 20 weeks. Requires Phase 4 stable in production for 30 days._

### FR-034: Evolution Tracker

Records every agent action outcome. Persisted to PostgreSQL. This is the ground truth for all strategy optimization.

```typescript
// lib/db/src/schema/index.ts
export const evolutionLogs = pgTable("evolution_logs", {
  id: serial("id").primaryKey(),
  strategy: varchar("strategy", { length: 128 }).notNull(),
  input: text("input").notNull(),
  success: boolean("success").notNull(),
  score: numeric("score", { precision: 5, scale: 4 }).notNull(),
  durationMs: integer("duration_ms").notNull(),
  rollback: boolean("rollback").notNull().default(false),
  agentRole: varchar("agent_role", { length: 32 }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow(),
});
```

### FR-035: Strategy Store + Evolution Cycle

Strategy weights persisted to PostgreSQL. Updated via evolution cycles. The cycle runs every N agent executions (default N=20, persisted to `system_state`).

```typescript
export const strategyWeights = pgTable("strategy_weights", {
  strategy: varchar("strategy", { length: 128 }).primaryKey(),
  weight: numeric("weight", { precision: 5, scale: 4 }).notNull(),
  sampleSize: integer("sample_size").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const systemState = pgTable("system_state", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: jsonb("value").notNull(),
  // key: "execution_count" → { count: number }
  // key: "last_evolution"  → { at: string, strategiesUpdated: number }
});
```

**Performance analysis — divide-by-zero guarded:**

```typescript
function analyzePerformance(entries: EvolutionLog[]): StrategyAnalysis[] {
  const byStrategy = new Map<string, { success: number; total: number }>();
  for (const e of entries) {
    const s = byStrategy.get(e.strategy) ?? { success: 0, total: 0 };
    s.total++;
    if (e.success) s.success++;
    byStrategy.set(e.strategy, s);
  }
  return Array.from(byStrategy.entries()).map(([strategy, stats]) => ({
    strategy,
    successRate: stats.total === 0 ? 0 : stats.success / stats.total,
    sampleSize: stats.total,
  }));
}
```

**Winner selection — edge case fixed:**

```typescript
const MIN_SAMPLE_SIZE = 10; // never update weights with fewer than 10 observations
const MIN_DELTA_IMPROVEMENT = 0.1; // require 10%+ improvement
const MIN_ADOPTION_SCORE = 0.05; // absolute floor — fixes baselineScore===0 edge case

function selectWinner(
  evaluated: { variant: Config; score: number }[],
  baselineScore: number,
): Config | null {
  if (evaluated.length === 0) return null; // guard: no candidates to evaluate
  const best = [...evaluated].sort((a, b) => b.score - a.score)[0];
  const threshold = Math.max(
    baselineScore * (1 + MIN_DELTA_IMPROVEMENT),
    MIN_ADOPTION_SCORE,
  );
  return best.score > threshold ? best.variant : null;
}
```

**Drastic swing protection — actually implemented:**

```typescript
const MAX_DELTA_PER_CYCLE = 0.3;

function validateEvolution(
  oldWeights: Map<string, number>,
  newWeights: Map<string, number>,
): void {
  if (newWeights.size === 0) {
    throw new Error("Invalid evolution: strategy store cannot be empty");
  }
  for (const [strategy, newWeight] of newWeights) {
    const oldWeight = oldWeights.get(strategy) ?? 0.5;
    const delta = Math.abs(newWeight - oldWeight);
    if (delta > MAX_DELTA_PER_CYCLE) {
      throw new Error(
        `Strategy "${strategy}" weight changed by ${delta.toFixed(3)} ` +
          `— exceeds ${MAX_DELTA_PER_CYCLE} drastic-swing threshold. ` +
          `Evolution cycle rejected.`,
      );
    }
  }
  // Ensure at least 3 strategies retain meaningful weight
  const meaningful = [...newWeights.values()].filter((w) => w > 0.1).length;
  if (meaningful < 3) {
    throw new Error(
      "Evolution would reduce viable strategies below minimum of 3",
    );
  }
}
```

**Hard safety constraints (not configurable):**

1. Minimum `MIN_SAMPLE_SIZE` observations before updating any strategy weight
2. Maximum weight delta of `MAX_DELTA_PER_CYCLE` per evolution cycle
3. Always maintain at least 3 strategies with weight > 0.1
4. Evolution logic itself is not a valid target for agent modification
5. System cannot invent new tools — tool definitions are static at startup

### FR-036: Evolution Dashboard View

New dashboard view (`EvolutionView`) surfacing the live state of the strategy store. Shows: all active strategies with current weights as a bar chart, recent evolution cycle results (before/after weights), evolution log entries for the last 100 executions, and the next scheduled evolution cycle countdown. Read-only — no agent actions triggered from this view. Added to sidebar nav.

### FR-037: Meta-Evolution (Contained)

The system evolves prompt strategies, scoring weights, and strategy selection logic through controlled A/B experiments. It does NOT modify: execution pipeline, security rules, governance policies, tool definitions.

```typescript
// Fully typed — prevents runtime string comparison bugs
type MetaChangeTarget =
  | "prompt_strategy"
  | "scoring_weights"
  | "strategy_selection";
// NOTE: "execution_engine", "security", "governance" are NOT valid MetaChangeTarget values
// This is enforced by the TypeScript type system, not by runtime string comparison

interface MetaChange {
  affects: MetaChangeTarget;
  fromConfig: MetaConfig;
  toConfig: MetaConfig;
  experimentScore: number;
  baselineScore: number;
  sampleSize: number; // must be >= 50 before meta-evolution runs
}

// MetaRegistry persisted to DB — never in-memory
export const metaConfig = pgTable("meta_config", {
  id: serial("id").primaryKey(),
  config: jsonb("config").notNull(),
  source: varchar("source", { length: 32 }).notNull(), // "default" | "experiment"
  experimentId: varchar("experiment_id", { length: 64 }),
  adoptedAt: timestamp("adopted_at", { withTimezone: true }).defaultNow(),
});
```

**Meta-evolution runs every 20 agent executions, only if:**

- Sample size in `evolution_logs` >= 50
- No active meta-experiment already running
- System health score >= 70 (no experiments during degraded state)

**`ctx.sampleTask` definition:** The sample task used for meta-evolution experiments is the most recent entry in `evolution_logs` where `success = true`. This provides a real, representative task from actual system operation — not a synthetic benchmark. If no successful entries exist, meta-evolution is skipped for that cycle.

---

## 10. Feature Requirements — Phase 6 (Distributed)

_Target: 32+ weeks. Requires Phase 5 stable in production for 30 days AND a second operational node._

### Prerequisite gate

Phase 6 does not begin until:

1. Phase 5 single-node system is stable in production for 30 days with no P0 incidents
2. A genuine second node exists (second R3 v4 environment or sister project)
3. Operator has reviewed and accepted the security model for cross-node data sharing

Distributing an unstable single-node system creates distributed instability.

### FR-038: Node Identity Management

Before Phase 6 can begin, each node requires a permanent ed25519 identity. `AGENT_NODE_KEY` env var holds the private key (hex or PEM). On startup, the server derives the public key, computes the SHA-256 node ID, and logs it. A CLI utility (`scripts/generate-node-key.ts`) generates a keypair and prints the private key for setting as the env var. Keys are never stored in the codebase or committed to git.

### FR-039: Shared Insight Model

Nodes share validated strategy metadata — not code, not secrets, not file content.

```typescript
interface SharedInsight {
  nodeId: string; // SHA-256 of node identity public key — no PII
  strategy: string; // strategy name only — no prompt content
  successRate: number;
  sampleSize: number; // must be >= 20 to be shareable
  context: "patch" | "typecheck" | "migration" | "deploy" | "query";
  timestamp: number;
  signature: string; // ed25519 signature of the above fields
}
```

**What NEVER gets shared:**

- Raw codebase or file contents
- Secrets or environment variables
- Agent conversation history
- Database rows or query results
- Prompt text (only strategy names and success rates)
- Node identity beyond the hashed public key

### FR-040: Sync Protocol

HTTP REST between nodes. Authenticated via ed25519 node identity keys.

```
POST /api/sync/insights   — push local validated insights (signed)
GET  /api/sync/insights   — pull global top-10 insights (filtered by reputation)
GET  /api/sync/reputation — reputation scores for known nodes
```

**Node identity:** Each node has `AGENT_NODE_KEY` (ed25519 private key, env var). Public key is the node's permanent identity. All pushed insights are signed. Receiving node verifies signature before storing.

### FR-041: Reputation System

Persisted to PostgreSQL. Not in-memory.

```typescript
export const nodeReputation = pgTable("node_reputation", {
  nodeId: varchar("node_id", { length: 64 }).primaryKey(), // SHA-256 hex of public key
  score: numeric("score", { precision: 4, scale: 3 })
    .notNull()
    .default("0.500"),
  interactions: integer("interactions").notNull().default(0),
  lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow(),
});
// Signature encoding: base64url throughout (ed25519 sig = 64 bytes = 86 base64url chars + padding)
// varchar(96) provides safe margin for base64url-encoded ed25519 signatures
```

Score updates: +0.05 when an adopted strategy succeeds, -0.05 when it fails. Nodes with score < 0.7 are filtered before insights are added to the local strategy pool. Local scoring always takes precedence — global insights are a weighted prior, never an override.

### FR-042: Knowledge Base

Persisted to PostgreSQL. Insights expire after 30 days.

```typescript
export const globalInsights = pgTable("global_insights", {
  id: serial("id").primaryKey(),
  nodeId: varchar("node_id", { length: 64 }).notNull(),
  strategy: varchar("strategy", { length: 128 }).notNull(),
  successRate: numeric("success_rate", { precision: 5, scale: 4 }).notNull(),
  sampleSize: integer("sample_size").notNull(),
  context: varchar("context", { length: 32 }).notNull(),
  signature: varchar("signature", { length: 96 }).notNull(), // base64url ed25519 signature
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
```

**Conflict resolution:** When local and global strategies conflict, local scoring decides. Global insights expand the strategy pool — they never replace local strategy weights.

---

## 11. Technical Requirements

### Stack constraints (non-negotiable)

| Layer           | Technology                 | Constraint                                            |
| --------------- | -------------------------- | ----------------------------------------------------- |
| Frontend        | React 19 + Vite 7          | Fixed                                                 |
| CSS             | Tailwind CSS 4             | Fixed                                                 |
| Components      | shadcn/ui                  | Fixed                                                 |
| Backend         | Express 5                  | Fixed                                                 |
| Runtime         | Node.js 22                 | Minimum — esbuild transform requires 22+              |
| ORM             | Drizzle ORM                | Fixed — all table refs are typed, never string        |
| Database        | PostgreSQL                 | Fixed                                                 |
| AI SDK          | `@anthropic-ai/sdk`        | Fixed                                                 |
| AI model        | `claude-sonnet-4-20250514` | Default; configurable per feature                     |
| Package manager | pnpm 10                    | Fixed                                                 |
| Language        | TypeScript strict          | Fixed — no `any` without explicit suppression comment |

### Stateful components — persistence requirements

Every component driving agent decisions MUST be persisted to PostgreSQL. In-memory is never acceptable for stateful components. Complete list:

| Component         | Table                       | Phase |
| ----------------- | --------------------------- | ----- |
| Strategy weights  | `strategy_weights`          | 5     |
| Evolution logs    | `evolution_logs`            | 5     |
| Execution counter | `system_state`              | 5     |
| Meta config       | `meta_config`               | 5     |
| Agent plans       | `agent_plans`               | 4     |
| Audit log         | `audit_log`                 | 4     |
| Node reputation   | `node_reputation`           | 6     |
| Global insights   | `global_insights`           | 6     |
| Health snapshots  | `system_health_snapshots`   | 3     |
| Metrics history   | `metrics_events`            | 3     |
| Conversations     | `conversations`, `messages` | 3     |
| Tool call logs    | `agent_tool_calls`          | 3     |

### Agent execution constraints (hard rules)

- All agent file operations sandboxed to workspace root via `path.resolve` + `startsWith`
- All agent DB queries run in `READ ONLY` transaction unless `L4` trust + policy gate
- All agent subprocesses have hard timeouts (`run_typecheck`: 60s, `run_tests`: 120s)
- No agent action modifies the evolution system, governance rules, or tool definitions
- No trust escalation without process restart
- No meta-change target can be "execution_engine", "security", or "governance" — enforced by TypeScript type, not runtime string check

---

## 12. Data Model

Complete schema progression across all phases. Each phase adds tables; no existing tables are modified destructively.

### Phase 2

```typescript
// metrics_kv — totalSubscribers persistence (FR-021)
// (defined in PRD v2.0 — unchanged)
// NOTE: metrics_events (time-series history) is Phase 3 (FR-025).
// conversations and messages tables are Phase 3 (FR-026), not Phase 2.
// Phase 2 conversation persistence uses localStorage only (FR-015).
```

### Phase 3

```typescript
export const agentToolCalls = pgTable("agent_tool_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  tool: varchar("tool", { length: 64 }).notNull(),
  args: jsonb("args").notNull(),
  result: jsonb("result"),
  success: boolean("success"),
  durationMs: integer("duration_ms"),
  calledAt: timestamp("called_at", { withTimezone: true }).defaultNow(),
});

export const systemHealthSnapshots = pgTable("system_health_snapshots", {
  id: serial("id").primaryKey(),
  score: integer("score").notNull(),
  components: jsonb("components").notNull(),
  trend: varchar("trend", { length: 16 }).notNull(),
  snapAt: timestamp("snap_at", { withTimezone: true }).defaultNow(),
});
```

### Phase 4

```typescript
export const agentPlans = pgTable("agent_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  goal: text("goal").notNull(),
  steps: jsonb("steps").notNull(),
  estimatedRisk: varchar("estimated_risk", { length: 16 }).notNull(),
  requiresConfirmation: boolean("requires_confirmation").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actionType: varchar("action_type", { length: 64 }).notNull(),
  agentRole: varchar("agent_role", { length: 32 }),
  trustLevel: varchar("trust_level", { length: 4 }).notNull(),
  policyVerdict: varchar("policy_verdict", { length: 32 }).notNull(),
  policyId: varchar("policy_id", { length: 64 }),
  payload: jsonb("payload"),
  result: jsonb("result"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow(),
});
```

### Phase 5

```typescript
export const evolutionLogs = pgTable("evolution_logs", {
  /* see FR-034 */
});
export const strategyWeights = pgTable("strategy_weights", {
  /* see FR-035 */
});
export const systemState = pgTable("system_state", {
  /* see FR-035 */
});
export const metaConfig = pgTable("meta_config", {
  /* see FR-037 */
});
```

### Phase 6

```typescript
export const nodeReputation = pgTable("node_reputation", {
  /* see FR-041 */
});
export const globalInsights = pgTable("global_insights", {
  /* see FR-042 */
});
```

---

## 13. Security Model

### Zero-trust agent

The agent is treated as an external actor. No action executes without passing through the Policy Engine. Every action is logged. Every failure is diagnosable. The audit log is append-only.

### Immutable rules (cannot be modified by any agent action, at any trust level)

1. The Policy Engine and its default policies are read-only to the agent
2. Tool definitions are static — the agent cannot create new tools
3. Trust levels are static per process lifetime — no runtime escalation
4. The governance layer cannot govern itself
5. Meta-evolution cannot target the execution pipeline, security rules, or governance
6. No path traversal outside workspace root, regardless of trust level
7. No DB writes in `READ ONLY` transactions, regardless of trust level

### Trust levels and capabilities

```
L0  Observe     — no tool access, suggestions only (displayed to human)
L1  Suggest     — no tool execution, plan display only
L2  Execute     — safe tools auto-run (DEFAULT)
L3  Control     — controlled tools subject to policy check
L4  Restrict    — restricted tools with human confirmation + policy gate
```

### Distributed security (Phase 6)

- Node identity: ed25519 keypair — private key in `AGENT_NODE_KEY` env var
- All pushed insights are signed; signature verified before storage
- Nodes with reputation < 0.7 filtered by federation layer
- No remote execution — nodes share metadata, never executable code
- No shared secrets, env vars, file access, or database rows

---

## 14. Non-Functional Requirements

### Performance targets

| Metric                   | Target                     |
| ------------------------ | -------------------------- |
| Safe tool response       | < 200ms p99                |
| Controlled tool response | < 30s (bounded by timeout) |
| Health score computation | < 2s                       |
| Policy evaluation        | < 10ms                     |
| Evolution cycle          | < 10s                      |
| Agent plan generation    | < 5s                       |

### Reliability guarantees

| Guarantee                 | Mechanism                                                                 |
| ------------------------- | ------------------------------------------------------------------------- |
| No silent failures        | Every agent action logged to `audit_log`                                  |
| No unverified execution   | All actions pass PolicyEngine                                             |
| No untracked changes      | `audit_log` is append-only                                                |
| Every change reversible   | `apply_patch` requires diff preview; rollback tracked in `evolution_logs` |
| Every failure diagnosable | Structured error + `audit_log` entry + source maps                        |

### Self-healing scope

**Within scope (L2–L3 trust, subject to policy gate):**

- TypeScript errors in non-governance source files (after human confirms plan)
- Failing tests caused by stale snapshots or minor interface drift
- Metric anomalies with diagnosable root causes

**Out of scope (never autonomous):**

- Governance rules and policies
- Security configuration
- Core execution pipeline
- Database schema (requires migration + human approval)
- Deployment configuration
- Tool definitions

---

## 15. Success Metrics

### Phase 2

| Metric                    | Target             |
| ------------------------- | ------------------ |
| Server uptime             | > 99.5% / 7 days   |
| CI pass rate              | > 98% on first run |
| TypeScript errors on main | 0 at all times     |

### Phase 3

| Metric                           | Target      |
| -------------------------------- | ----------- |
| Agent tool success rate          | > 90%       |
| Health score computation latency | < 2s        |
| `lib/api-zod` test coverage      | > 80% lines |

### Phase 4

| Metric                              | Target |
| ----------------------------------- | ------ |
| Policy gate false-deny rate         | < 5%   |
| Human interventions per agent cycle | < 30%  |
| All agent actions logged            | 100%   |

### Phase 5

| Metric                                 | Target                                  |
| -------------------------------------- | --------------------------------------- |
| Strategy drastic swings                | 0 (validator enforces)                  |
| Self-healed issues (no human required) | > 40% of L2-eligible failures           |
| Agent success rate trend               | Measurably improving over 30-day window |
| Evolution cycle runtime                | < 10s                                   |

### Phase 6

| Metric                               | Target                         |
| ------------------------------------ | ------------------------------ |
| Cross-node strategy adoption success | > 70%                          |
| Node independence violations         | 0                              |
| Security incidents                   | 0                              |
| Bad strategy propagation             | 0 (reputation filter prevents) |

---

## 16. Release Phases

| Phase | Name           | Target                 | Gate to next phase                                         |
| ----- | -------------- | ---------------------- | ---------------------------------------------------------- |
| 1     | Foundation     | ✅ Complete 2026-04-18 | —                                                          |
| 2     | Hardening      | +4 weeks               | All FRs passing CI, zero P0                                |
| 3     | Intelligence   | +8 weeks               | Tool use stable, health score live for 14 days             |
| 4     | Autonomy       | +12 weeks              | Policy Engine + multi-agent stable for 14 days             |
| 5     | Self-Evolution | +20 weeks              | Phase 4 in production for 30 days, no P0                   |
| 6     | Distributed    | +32 weeks              | Phase 5 in production for 30 days, second node operational |

**Phase gate rule:** No phase begins until the prior phase is stable in production for the gated duration with zero P0 incidents.

---

## 17. Decisions Log

| Date       | Decision                                                       | Rationale                                                                                                                                                                                                             |
| ---------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-18 | All stateful AI components persisted to PostgreSQL             | StrategyStore, KnowledgeBase, Reputation, MetaRegistry cannot live in-memory. Process restarts would reset all learning. Accepted no exceptions.                                                                      |
| 2026-04-18 | Trust escalation requires server restart                       | Prevents prompt injection attacks from elevating agent trust at runtime. The attack surface is too large to allow runtime escalation.                                                                                 |
| 2026-04-18 | Multi-agent: in-process message bus, not separate services     | Current scale doesn't justify separate process overhead. One Node process per deployment. Revisit in Phase 6 if needed.                                                                                               |
| 2026-04-18 | `PolicyContext` fully typed — no `any`                         | Untyped policy conditions are unimplementable, untestable, and unsafe. Type safety is non-negotiable for governance code.                                                                                             |
| 2026-04-18 | `MetaChangeTarget` is a union type, not a runtime string check | The governance lock in the source doc used string comparison (`metaChange.affects === "execution_engine"`). This is unsafe — a typo bypasses it silently. TypeScript union type enforcement is the correct mechanism. |
| 2026-04-18 | Min 10 samples before strategy weight update                   | Prevents premature optimization from small-N noise. A strategy that succeeded 3 times is not a reliable strategy.                                                                                                     |
| 2026-04-18 | Max 0.3 weight delta per evolution cycle                       | Allows meaningful adaptation while preventing runaway optimization. Recoverable within 3–4 cycles if wrong direction.                                                                                                 |
| 2026-04-18 | MIN_ADOPTION_SCORE = 0.05 floor on selectWinner                | When baselineScore===0 (new system), `baselineScore * 1.1 = 0` means nothing ever wins. Absolute floor ensures new systems can adopt better strategies.                                                               |
| 2026-04-18 | Global insights are advisory — local scoring always primary    | Prevents bad-strategy-spreads failure mode. A poisoned or miscalibrated remote node cannot override local decision-making.                                                                                            |
| 2026-04-18 | Phase 6 gated on 30 days of stable Phase 5                     | Distributing an unstable single-node system creates distributed instability. Stability must be proven before adding coordination complexity.                                                                          |
| 2026-04-18 | System conflation from source doc rejected                     | AGI-CMD is one subsystem of Agi-Suite. Agi-Suite is the platform. Treating them as identical creates confused ownership, lifecycle management, and security boundaries.                                               |
| 2026-04-18 | Self-healing scope explicitly bounded                          | The "what NOT to automate" question is as important as what to automate. Governance, security, schema, and deployment remain human-controlled at all phases.                                                          |
r3v@penguin:~/Agi-Suite$ cat ~/Agi-Suite/docs/WIRE.txt
# WIRE.txt — Agi-Suite Engineering Protocol
# Referenced in CLAUDE.md and PRD.md. Required for all engineering tasks.
# Version: 2.0 | Updated: 2026-04-18
# Supersedes: Wire.txt v1.0 (R3 v4 general)
# Scope: Agi-Suite monorepo (artifacts/api-server, artifacts/r3-agi, lib/*)
---

## Protocol Format

Every engineering response must follow this structure:

```
FILES READ:
  - path/to/file.ts (lines read, e.g. "full file, 84 lines" or "lines 120–180")

FINDINGS:
  - What the code actually does
  - Bugs or issues found (with exact line references)
  - Constraints identified
  - SDK/library behavior that affects the fix

CHANGES:
  File: path/to/file.ts
    Root cause:      Why this is broken
    Fix rationale:   Why this specific fix is correct
    Affected surface: Which other files, routes, or packages are touched
    Regression check: What was verified after the change

REMAINING AMBIGUITIES:
  - What is still unclear
  - What needs verification before closing
  - What was deferred and why
```

No exceptions. A response that skips FILES READ and jumps to a fix has violated
this protocol regardless of whether the fix is correct.

---

## Hard Rules

### Before Every Write

1. **Read the file first** — `cat -n` for line numbers, or request the user cat it
2. **Confirm exact anchor text** before any Python replace or sed
3. **Count occurrences** — anchor must appear exactly once (`content.count(old) == 1`)
4. **State root cause** before writing the fix — not a description of the symptom,
   the actual mechanical reason the bug exists
5. **State fix rationale** — why this approach and not another
6. **State affected surface** — every file, package, and route that changes behavior
7. **Timestamped backup** before any destructive operation:
   ```bash
   cp file.ts file.ts.bak-$(date +%Y%m%d_%H%M%S)
   ```
   Or use the workspace backup system:
   ```
   ~/Agi-Suite/.patch-backups/<ISO_TIMESTAMP>/
   ```

### After Every Write

1. Run `pnpm typecheck` — must be zero errors across all packages
2. Verify the change landed: `grep -n "changed_text" file.ts`
3. If typecheck fails — read the error, find root cause, fix before proceeding
4. **Never leave a typecheck error and move on**
5. For route changes: verify with `curl` against the running dev server (see SKILLS.md §A7)
6. For SSE routes: test client disconnect behavior explicitly — do not assume abort is handled

### Patch Discipline

- Dry-run first (`python3 patch.py`), apply second (`python3 patch.py --apply`)
- Python file writes over `sed` for all multi-line replacements
- Use `assert content.count(old) == 1` before every write — no exceptions
- Verify line count after Python writes — confirm no lines were dropped
- Never use `sed` on content that may appear more than once in a file
- Backup every file before writing, even for "trivial" changes

### Backup Protocol

- Before any destructive operation: timestamped backup
- Backup naming: `filename.ext.bak-YYYYMMDD_HHMMSS`
- Backup dirs naming: `.patch-backups/YYYYMMDDTHHMMSS/`
- `.patch-backups/` is in `.gitignore` — backups are never committed
- Clean up backups after confirming the fix is stable (`rm -rf .patch-backups/`)

---

## Triple-Check Procedure

Before writing any code fix, verify three times:

1. **Read** — Does the file contain exactly the text you expect to replace?
2. **Count** — How many times does the anchor text appear? (Must be exactly 1)
3. **Consequence** — What breaks if the replacement is wrong?

If any answer is uncertain — read more of the file before proceeding.

**For SDK/library behavior:** Read the actual source before assuming behavior.
The Anthropic SDK abort/error event distinction (SKILLS.md §A1) is an example
of a case where assumptions about a library's behavior were wrong in a
process-crashing way. When a library's behavior is the root cause, fetch and
read the relevant source before writing the fix.

---

## Agi-Suite Specific Rules

### Monorepo package boundaries

- `lib/` packages do not import from `artifacts/`
- `artifacts/` packages may import from `lib/`
- No circular dependencies across packages
- When adding a new import, check both the import site AND the export site
- If a type or function is added to a `lib/` package, re-run `pnpm typecheck`
  across the full workspace — not just the package you edited

### API contract discipline

The OpenAPI spec in `lib/api-spec/openapi.yaml` is the single source of truth
for all API contracts. When adding or modifying an endpoint:

1. Update `lib/api-spec/openapi.yaml` first
2. Run the code generator to update `lib/api-zod` and `lib/api-client-react`
3. Implement the route in `artifacts/api-server/src/routes/`
4. Wire the route in `artifacts/api-server/src/routes/index.ts`
5. Verify typecheck passes across all four affected packages

**Never write a Zod schema or React Query hook by hand for an API endpoint.**
If the generator is not run, the contract will drift.

### Anthropic SDK — streaming routes

Every route that calls `client.messages.stream()` must have all three of these:

```typescript
// 1. Handle real API errors (rate limits, network failures)
stream.on("error", (err: Error) => {
  if (err.message?.includes("aborted") || err.constructor?.name === "APIUserAbortError") {
    return;
  }
  // write error SSE event
});

// 2. Handle abort event — REQUIRED, distinct from error
// Without this: _emit('abort') calls Promise.reject() → process crash on disconnect
stream.on("abort", () => {});

// 3. Clean up on client disconnect
req.on("close", () => {
  try { stream.abort(); } catch { /* ignore */ }
});
```

Omitting the `abort` listener is a **process-crashing bug**. It is not caught
by TypeScript and will not appear in any test — it only manifests when a real
client disconnects mid-stream.

See SKILLS.md §A1 for the full root cause analysis and SDK source reference.

### esbuild bundle discipline

When adding a new npm dependency to `artifacts/api-server`:

1. Is it a production dependency that will be present in `node_modules` at runtime?
   → Add it to the `external` array in `build.mjs`
2. Is it a devDependency used only during build/development?
   → Do not add to `external` — let esbuild bundle it
3. After adding to `external`, run `pnpm --filter @workspace/api-server build`
   and verify the bundle size did not increase unexpectedly

Current externalized packages include `@anthropic-ai/sdk`. Any package of
similar size that is always available at runtime should be externalized.

### pnpm catalog discipline

Before adding any dependency version to a `package.json`:

1. Check the workspace catalog: `grep -A 60 "^catalog:" pnpm-workspace.yaml`
2. If the package is in the catalog, use `"catalog:"` as the version specifier
3. If not in the catalog, add it to the catalog first, then reference `"catalog:"`
4. Never hardcode a version that differs from the catalog pin

### Database migration discipline

| Operation | Command | When |
|---|---|---|
| Local schema iteration | `pnpm --filter @workspace/db push` | Dev only |
| Create migration file | `pnpm --filter @workspace/db generate` | Before any production change |
| Apply migrations | `pnpm --filter @workspace/db migrate` | Production deploy |

**Never use `push` in production.** After every `migrate`, verify the schema:
```bash
DATABASE_URL="postgresql://..." node -e "
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL});
pool.query(\"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'\")
  .then(r => { console.log(r.rows.map(x => x.table_name)); pool.end(); });
"
```

### SSE route discipline

Every SSE route must:

1. Set all four headers before `res.flushHeaders()`:
   ```typescript
   res.setHeader("Content-Type", "text/event-stream");
   res.setHeader("Cache-Control", "no-cache");
   res.setHeader("Connection", "keep-alive");
   res.setHeader("X-Accel-Buffering", "no");
   res.flushHeaders();
   ```
2. Clean up all resources on `req.on("close")`
3. Remove clients from any tracking Set on disconnect
4. Not leave dangling `setInterval` handles after the connection closes

---

## Four-Part Change Accountability Framework

Every change entry in CHANGES must include all four parts. No exceptions.

```
Root cause:      The mechanical reason the bug exists — not a symptom description.
                 "The process crashed because APIUserAbortError was an unhandled
                  rejection" not "the server was crashing on disconnect".

Fix rationale:   Why this specific fix and not an alternative.
                 "stream.on('abort', () => {}) satisfies the SDK's listeners?.length
                  check and prevents Promise.reject() — stream.catch() does not exist
                  on MessageStream" not "added abort handler".

Affected surface: Every file, route, package, and runtime behavior that changes.
                 "artifacts/api-server/src/routes/agent.ts — agent chat route no
                  longer crashes the process on client disconnect".

Regression check: What was verified after the change.
                 "pnpm typecheck → 0 errors. curl -N POST /api/agent/chat,
                  Ctrl+C mid-stream → server continues serving subsequent requests".
```

A change entry that says "fixed the crash" without all four parts is incomplete.

---

## Common Failure Modes (Agi-Suite)

| Failure | Root Cause | Prevention |
|---|---|---|
| Server crash on client disconnect | Missing `stream.on("abort", () => {})` | See SKILLS.md §A1. Required on every stream route. |
| Bundle size unexpectedly large | Production runtime package bundled by esbuild | Externalize packages present in `node_modules` at runtime (SKILLS.md §A2) |
| pnpm install conflict | Hardcoded version conflicts with catalog pin | Always check catalog before specifying a version (SKILLS.md §A4) |
| Hooks not installed on fresh clone | `simple-git-hooks` build not approved | Run `pnpm approve-builds` once per machine (SKILLS.md §A5) |
| Prettier pre-commit blocks commit | Files not formatted | Run `pnpm exec prettier --write .` before staging |
| TSC error after patch | Didn't run `pnpm typecheck` across all packages | Always run from workspace root, not from a single package |
| SSE clients leak memory | Client removed from tracking Set only on `req.close`, not on write error | Wrap all `res.write()` calls in try/catch; remove client on any error |
| `sed` duplicates content | Pattern matched twice | Use Python with `assert content.count(old) == 1` |
| Python slice drops closing braces | Off-by-one on line indices | Verify line count in output. Use `.rstrip()` + append |
| Anchor not found | File changed since last read | Re-read file immediately before each write |
| Import added but not wired | Two separate edits required | Always check both import AND usage site |
| Export added but not imported | Forgot the consuming file | Grep for all import sites before declaring done |
| Migration appears to succeed but didn't | `drizzle-kit migrate` gives no explicit confirmation | Always verify schema after every migrate (SKILLS.md §A9) |
| `.prettierignore` doesn't stop git tracking | These are independent systems | Files needing git exclusion go in `.gitignore` too (SKILLS.md §A6) |

---

## Verification Checklist (Before Closing Any Task)

```
Core
  [ ] pnpm typecheck → zero errors (run from workspace root)
  [ ] grep -n "changed_text" file.ts → change confirmed present
  [ ] No unintended duplicate content
  [ ] No missing closing braces or type exports

API / Routes
  [ ] New or modified endpoint responds correctly to curl
  [ ] Error paths return JSON (not HTML from Express default handler)
  [ ] SSE routes clean up on client disconnect (no memory leak)
  [ ] Streaming routes have abort listener (not just error listener)

Database
  [ ] Schema changes have a generated migration file committed
  [ ] Migration verified against running DB after apply
  [ ] push was not used in production

Build
  [ ] pnpm --filter @workspace/api-server build → no warnings on bundle size
  [ ] New runtime dependencies are in the external array in build.mjs
  [ ] New packages use catalog: version specifier if in the catalog

Git
  [ ] Backup cleaned up or noted
  [ ] git add -A && git commit triggers pre-commit hook (prettier check passes)
  [ ] Pre-push hook (typecheck) passes on push
  [ ] .patch-backups/ not committed (in .gitignore)

Structural changes
  [ ] pnpm typecheck across all 9 workspace projects passes
  [ ] No circular imports introduced between packages
  [ ] API contract changes reflected in openapi.yaml + regenerated downstream
```

---

## Example Wire.txt Responses

### Example 1 — Bug fix (route crash on disconnect)

```
FILES READ:
  - artifacts/api-server/src/routes/agent.ts (full file, 68 lines)
  - node_modules/@anthropic-ai/sdk/src/lib/MessageStream.ts (lines 1–120, 280–310)

FINDINGS:
  - stream.on("error", handler) is present — handles real API errors
  - stream.on("abort", ...) is missing entirely
  - MessageStream._emit('abort') at line 290: if no abort listeners and
    #catchingPromiseCreated is false → calls Promise.reject(error) intentionally
  - This produces an unhandled rejection → Node exits with code 1
  - stream.catch() does not exist — MessageStream is not a Promise

CHANGES:
  File: artifacts/api-server/src/routes/agent.ts (line 52)
  + stream.on("abort", () => {});

  Root cause:      MessageStream._emit('abort') calls Promise.reject(error) when
                   no abort listeners are registered. This is intentional SDK
                   behavior designed to force abort handling. The error listener
                   does not cover the abort path — they are separate event types.

  Fix rationale:   stream.on("abort", () => {}) satisfies listeners?.length > 0,
                   preventing the SDK from calling Promise.reject(). One line.
                   stream.catch() was considered but does not exist on MessageStream.
                   stream.done().catch() was considered but sets #catchingPromiseCreated
                   which changes stream lifecycle behavior unnecessarily.

  Affected surface: artifacts/api-server/src/routes/agent.ts — agent chat route
                   no longer crashes the process on client disconnect. All other
                   active requests continue to be served.

  Regression check: pnpm typecheck → 0 errors.
                   curl -N -X POST /api/agent/chat with messages → streams correctly.
                   Ctrl+C mid-stream → server logs nothing, continues serving.
                   Subsequent heartbeat requests return 200 → process is alive.

REMAINING AMBIGUITIES:
  - None. Fix is complete and verified.
```

### Example 2 — New dependency added

```
FILES READ:
  - artifacts/api-server/package.json (full file, 28 lines)
  - artifacts/api-server/build.mjs (external array, lines 24–80)
  - pnpm-workspace.yaml (catalog section, lines 38–60)

FINDINGS:
  - @anthropic-ai/sdk is in package.json dependencies but NOT in build.mjs external array
  - It is not in the pnpm workspace catalog
  - Current bundle: 2.0mb (esbuild warning threshold)
  - SDK is ~1.8mb; bundling it inflates the output with no runtime benefit

CHANGES:
  File: artifacts/api-server/build.mjs (external array)
  + "@anthropic-ai/sdk",   // before "*.node"

  Root cause:      esbuild bundles all non-external imports. @anthropic-ai/sdk
                   is a production dependency — it will be in node_modules at
                   Railway runtime. There is no reason to bundle it.

  Fix rationale:   Externalizing removes ~1.8mb from the bundle. Railway installs
                   production dependencies before starting the server, so the
                   package is always available. No code changes required.

  Affected surface: artifacts/api-server/dist/index.mjs — bundle size drops
                   from ~2.0mb to ~200kb. Railway deploy time reduced. No
                   runtime behavior changes.

  Regression check: pnpm --filter @workspace/api-server build → bundle listed
                   as ~200kb, no size warning. pnpm dev → server starts, agent
                   chat endpoint responds correctly (SDK loaded from node_modules).

REMAINING AMBIGUITIES:
  - Other large production dependencies (pg, drizzle-orm) should be audited
    for the same externalization opportunity. Deferred — not blocking.
```

---

## Zero-Ambiguity Policy

If a task requires reading a file that cannot be accessed from the current
environment (e.g. files on the user's machine when working remotely), the
correct response is:

```
Cannot proceed. Need to read [file] before writing the fix.
Run: cat ~/Agi-Suite/path/to/file.ts
Paste the output and I will continue.
```

Never write a fix based on assumed file contents. Never guess at line numbers.
Never assume a library behaves as documented without reading the source when
the behavior is the root cause of a bug.

---

## Protocol Violations

The following are protocol violations. If caught, stop, re-read the file,
and restart the fix from the FILES READ step.

- Writing a fix without reading the file first
- Using `sed` on a pattern that may appear more than once
- Claiming a fix is complete without running `pnpm typecheck`
- Leaving a TypeScript error in place and continuing
- Writing a CHANGES entry without all four accountability parts
- Assuming SDK behavior without reading the source when the SDK is the root cause
- Using `push` instead of `migrate` for a production database change
- Hardcoding a dependency version that differs from the workspace catalog

---

*This protocol is the minimum bar. It does not cap thoroughness — it floors it.*
*Every session. Every file. Every fix.*
r3v@penguin:~/Agi-Suite$ cat ~/Agi-Suite/docs/ROADMAP.md
# Roadmap

This document tracks planned improvements, in rough priority order. Each item describes what it is, why it matters, and what the implementation looks like.

---

## Immediate (known gaps from current state)

### 1. Approve `simple-git-hooks` build script

**Status:** Hooks are installed and working via the `prepare` script, but pnpm flagged the build script as unapproved. Future `pnpm install` runs on a fresh clone will not re-apply hooks until this is resolved.

**Fix:**

```bash
pnpm approve-builds
# Select simple-git-hooks
```

Run once. The approval is stored in `.npmrc` or `pnpm-workspace.yaml` depending on pnpm version.

---

### 2. Persist `totalSubscribers` to PostgreSQL

**Status:** Currently persisted to `/tmp/r3-metrics.json` on the server filesystem. Resets to 147 on every Railway deploy because Railway uses an ephemeral filesystem.

**Implementation:** Add a `metrics` table to `lib/db/src/schema/index.ts` with a single-row config record. Read and write `totalSubscribers` from the DB instead of the filesystem. Use an upsert on write to keep it a single round-trip.

```typescript
// lib/db/src/schema/index.ts
export const metrics = pgTable("metrics", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: integer("value").notNull(),
});
```

```typescript
// Read on startup
const row = await db
  .select()
  .from(metrics)
  .where(eq(metrics.key, "totalSubscribers"))
  .limit(1);
let totalSubscribers = row[0]?.value ?? 147;

// Write on increment
await db
  .insert(metrics)
  .values({ key: "totalSubscribers", value: totalSubscribers })
  .onConflictDoUpdate({
    target: metrics.key,
    set: { value: totalSubscribers },
  });
```

---

### 3. Lint (ESLint)

**Status:** Not present. Prettier handles formatting but has no opinion on code correctness, unused variables, or React hook rules.

**Implementation:** Add `eslint` + `@typescript-eslint/eslint-plugin` + `eslint-plugin-react-hooks` to root devDependencies. Create a flat config `eslint.config.js` at workspace root. Add `"lint": "eslint ."` to root scripts and add it to the `pre-push` hook alongside typecheck:

```json
{
  "pre-push": "pnpm typecheck && pnpm lint"
}
```

---

## Short-term

### 4. API server watch mode without full process restart

**Status:** `tsx watch` restarts the entire Node process on any file change. For small edits deep in a route file, this is fast enough. For larger changes involving module graph updates, there is a brief moment where the server is unavailable.

**Better approach:** `tsx watch` is correct for now. Revisit if restart time becomes perceptible (>500ms). At that point, switch to esbuild `--watch` + `node --watch dist/index.mjs` for incremental rebuilds without process restart.

---

### 5. Test coverage for `lib/` packages

**Status:** Vitest is configured at the workspace root but no test files exist yet. The test runner is wired — it just has nothing to run.

**Priority order:**

1. `lib/api-zod` — unit tests for every Zod schema (parse valid, reject invalid, check error messages)
2. `lib/db` — integration tests for schema constraints and query patterns (requires a test database)
3. `lib/api-client-react` — mock-based tests for the custom fetch wrapper and error handling

**Naming convention:** `*.test.ts` colocated with the source file. Do not create a separate `__tests__` directory.

---

### 6. Agent conversation persistence

**Status:** Conversation history lives in Zustand store (`useAGI`). It is lost on page refresh.

**Implementation:** Two options depending on privacy requirements:

- **localStorage** — zero infrastructure, survives refresh, lost on clear. Appropriate for single-user local deployment.
- **Database** — add a `conversations` table, POST conversation turns to a new `/api/agent/conversations` endpoint. Required for multi-device access or audit logging.

For the current solo-developer use case, localStorage is sufficient.

---

### 7. OpenAPI spec code generation script

**Status:** `lib/api-spec/orval.config.ts` is present but there is no documented command to run the generator. Adding a new endpoint requires manually knowing the orval CLI.

**Fix:** Add a `generate` script to `lib/api-spec/package.json`:

```json
{
  "scripts": {
    "generate": "orval --config ./orval.config.ts"
  }
}
```

And document the full endpoint-addition workflow explicitly in `DEVELOPMENT.md`.

---

## Medium-term

### 8. Streaming response cancellation from UI

**Status:** The `AgentSuitePanel` sends a request and reads the SSE stream. If the user wants to stop mid-stream, there is no cancel button — they must navigate away or wait.

**Implementation:** Use the `AbortController` API on the client side. Pass the signal to the fetch request. The server already handles `req.on("close")` correctly — client abort is all that is needed.

```typescript
const abortController = new AbortController();

fetch("/api/agent/chat", {
  method: "POST",
  signal: abortController.signal,
  // ...
});

// Cancel:
abortController.abort();
```

Wire a "Stop" button in `AgentSuitePanel` to `abortController.abort()`.

---

### 9. Request authentication

**Status:** All API endpoints are unauthenticated. This is acceptable for a local-only or private Railway deployment, but is a gap if the deployment is ever public-facing.

**Implementation:** Add a simple bearer token check as Express middleware:

```typescript
// src/middleware/auth.ts
export function requireApiKey(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token !== process.env.API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
```

Apply to all routes except `/api/healthz`. Add `API_SECRET` to the Railway environment variables and the frontend's Vite env config.

---

### 10. Structured error responses

**Status:** Error responses are not consistently shaped. Some routes return `{ error: "..." }`, others fall through to Express's default error handler which returns HTML.

**Implementation:** Add a global error handler in `src/app.ts`:

```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});
```

Add the corresponding error response type to `lib/api-spec/openapi.yaml` and regenerate.

---

## Long-term

### 11. Multi-tab / multi-device session handling

**Status:** `totalSubscribers` increments per unique `sessionId`. The session ID is generated in the frontend and lives in memory — it resets on page refresh, generating a new session and incrementing the counter artificially.

**Improvement:** Move session ID generation to a `localStorage`-backed stable ID. One ID per browser, persists across refreshes and tabs.

---

### 12. Metrics dashboard view

**Status:** Metrics are consumed by `useMetrics` and presumably displayed in `OverviewView`, but there is no dedicated visualization for historical trends.

**Implementation:** Add a `/api/metrics/history` endpoint backed by a time-series table in PostgreSQL. Surface trends in a dedicated chart view using a lightweight charting library (recharts or uplot).

---

### 13. Agent tool use

**Status:** The agent chat is plain conversational — no tool calls. The Anthropic SDK supports tool use natively.

**High-value tools for this use case:**

- `read_file` — read any file in the R3 v4 workspace
- `run_typecheck` — trigger `pnpm typecheck` and return the output
- `query_db` — run a read-only SQL query against the development database
- `list_routes` — enumerate all registered Express routes

This would transform the agent from a chat interface into an actual development co-pilot with live access to the system.

---

### 14. CI pipeline

**Status:** Git hooks enforce quality locally. There is no CI check on pull requests or pushes.

**Implementation:** GitHub Actions workflow at `.github/workflows/ci.yml`:

```yaml
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec prettier --check .
      - run: pnpm typecheck
      - run: pnpm test
```

The `--frozen-lockfile` flag ensures the lockfile is never mutated in CI.

---

## Completed

| Item                  | Completed  | Description                                                                              |
| --------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| SDK abort crash fix   | 2026-04-18 | Added `stream.on("abort", () => {})` to prevent unhandled rejection on client disconnect |
| API server hot reload | 2026-04-18 | Replaced `build && start` dev script with `tsx watch`                                    |
| Bundle size reduction | 2026-04-18 | Externalized `@anthropic-ai/sdk` from esbuild bundle (~1.8mb reduction)                  |
| Git hooks             | 2026-04-18 | `simple-git-hooks` with pre-commit prettier and pre-push typecheck                       |
| Prettier              | 2026-04-18 | Formatted 153 files, `.prettierignore` configured                                        |
| Vitest workspace      | 2026-04-18 | Vitest configured at monorepo root, `test` and `test:watch` scripts added                |
| DB migrate scripts    | 2026-04-18 | Added `migrate` and `generate` scripts to `lib/db/package.json`                          |
r3v@penguin:~/Agi-Suite$ cat ~/Agi-Suite/docs/ARCHITECTURE.md
# Architecture

## Overview

Agi-Suite is a pnpm workspace monorepo composed of two runtime artifacts and a shared library layer. The architecture enforces a strict contract boundary between services through generated code — the OpenAPI spec in `lib/api-spec` is the single source of truth, and everything downstream (Zod validators, React Query hooks) is generated from it.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   r3-agi (Vite)                       │   │
│  │                                                       │   │
│  │  Sidebar → Views → Hooks → api-client-react          │   │
│  │                         → useMetrics (SSE)           │   │
│  │                         → useAGI (SSE streaming)     │   │
│  └────────────────────┬──────────────────────────────────┘  │
└───────────────────────│─────────────────────────────────────┘
                        │ HTTP / SSE
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   api-server (Express 5)                     │
│                                                              │
│  /api/healthz          → health check                        │
│  /api/metrics          → snapshot                            │
│  /api/metrics/stream   → SSE broadcast                       │
│  /api/metrics/heartbeat→ session registration                │
│  /api/agent/chat       → Anthropic SSE proxy                 │
│                                                              │
└───────────────────┬─────────────────────────────────────────┘
                    │
          ┌─────────┴──────────┐
          │                    │
          ▼                    ▼
   Anthropic API          PostgreSQL
   (claude-sonnet)        (Drizzle ORM)
```

---

## Package graph

```
lib/api-spec          ← OpenAPI YAML (source of truth)
      │
      ├── lib/api-zod           ← generated Zod validators
      │         │
      │         └── apps/api-server   ← validates request bodies
      │
      └── lib/api-client-react  ← generated React Query hooks
                │
                └── apps/r3-agi       ← consumes typed hooks
```

`lib/db` is consumed only by `apps/api-server`. The frontend never talks to the database directly.

---

## Frontend (`apps/r3-agi`)

**Stack:** React 19, Vite 7, Tailwind CSS 4, shadcn/ui, React Query, Zustand

### Layout

The app is a single-page application with a fixed three-panel layout:

```
┌──────────┬────────────────────────────┬───────────────┐
│          │                            │               │
│ Sidebar  │        Active View         │  Right Panel  │
│  (nav)   │                            │  (agent chat) │
│          │                            │               │
└──────────┴────────────────────────────┴───────────────┘
         Header (metrics bar)
```

### Views

| View               | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `OverviewView`     | System health, key metrics at a glance        |
| `IntelligenceView` | LLPTE pipeline status and telemetry           |
| `LLPTEView`        | Deep-dive into the six-package audio AI suite |
| `AGICmdView`       | Issue commands to the AGI agent layer         |
| `APIView`          | Live API inspection and testing               |
| `ASIView`          | Higher-order intelligence layer monitoring    |
| `PatchView`        | Patch tracking and application                |
| `PRDView`          | Canonical PRD rendered in-app                 |
| `ChecklistView`    | Pre-deploy QA checklist                       |
| `VerifyView`       | System verification steps                     |
| `PrioritiesView`   | Active work prioritization board              |
| `TreeView`         | Dependency/file graph visualization           |

### State management

| Store              | Responsibility                                            |
| ------------------ | --------------------------------------------------------- |
| `useAGI` (Zustand) | Agent conversation state, streaming chunks, abort control |

### Real-time data

- `useMetrics` — connects to `/api/metrics/stream` (SSE), maintains active user count and subscriber total in component state
- Heartbeat posted to `/api/metrics/heartbeat` on a 30-second interval to register session presence

### Agent panel

`AgentSuitePanel` manages a streaming conversation with Claude via `/api/agent/chat`. The SSE protocol:

```
client → POST /api/agent/chat  { messages, system?, max_tokens? }
server → text/event-stream
         data: {"type":"text_delta","text":"..."}  (repeated)
         data: [DONE]
```

Abort is handled client-side by closing the connection; the server detects `req.close` and calls `stream.abort()`.

---

## Backend (`apps/api-server`)

**Stack:** Express 5, pino, Anthropic SDK 0.39, esbuild (production build), tsx watch (development)

### Build modes

| Mode        | Command                    | Mechanism                                                        |
| ----------- | -------------------------- | ---------------------------------------------------------------- |
| Development | `pnpm dev`                 | `tsx watch src/index.ts` — instant reload on save, no build step |
| Production  | `pnpm build && pnpm start` | esbuild bundle → `node dist/index.mjs`                           |

### Logging

Structured JSON logging via pino. In development, `pino-pretty` colorizes output. In production, raw JSON for log aggregation. Request logging via `pino-http` with redacted auth headers.

### Metrics layer

The metrics system tracks active sessions without a database:

- `activeSessions: Map<sessionId, timestamp>` — in-memory, pruned on 45s TTL
- `totalSubscribers: number` — persisted to `/tmp/r3-metrics.json` across restarts
- `sseClients: Set<Response>` — active SSE connections receive broadcast on any session change
- Background interval prunes stale sessions every 15 seconds

### Agent route

The `/api/agent/chat` route is a transparent SSE proxy to the Anthropic Streaming API. Critical implementation detail: `MessageStream` in the Anthropic SDK is both an `EventEmitter` and a `Promise`-like. Both paths must be handled:

```typescript
stream.on("error", handler); // EventEmitter path — real errors
stream.on("abort", () => {}); // abort event — prevents intentional unhandled rejection
// on client disconnect
```

Without the `abort` listener, `_emit('abort')` calls `Promise.reject(error)` when no abort listeners are registered, producing an unhandled rejection that kills the process.

---

## Shared libraries (`lib/`)

### `lib/api-spec`

Contains the OpenAPI YAML definition and `orval.config.ts`. Running the code generator here produces both `lib/api-zod` and `lib/api-client-react`. This is the only place API contracts are manually authored.

### `lib/api-zod`

Auto-generated Zod schemas matching every request and response type in the OpenAPI spec. Used by `api-server` to validate incoming request bodies at the route layer.

### `lib/api-client-react`

Auto-generated React Query hooks and TypeScript types. Used by `r3-agi` for all non-SSE API calls. The custom fetch wrapper in `src/custom-fetch.ts` handles base URL configuration and shared error handling.

### `lib/db`

Drizzle ORM schema and database client. Consumed only by `api-server`. Scripts:

| Script       | Purpose                                    |
| ------------ | ------------------------------------------ |
| `push`       | Push schema directly to DB (development)   |
| `push-force` | Force push, bypassing safety checks        |
| `generate`   | Generate migration file from schema diff   |
| `migrate`    | Apply pending migration files (production) |

---

## Security posture

### Supply chain

`pnpm-workspace.yaml` enforces `minimumReleaseAge: 1440` — no package version published less than 24 hours ago can be installed. This is a critical supply-chain attack defense. The only exclusions are `@replit/*` scoped packages.

### Dependency overrides

Platform-specific binary packages for esbuild, lightningcss, rollup, and tailwindcss/oxide are pinned to `-` (excluded) for all non-linux-x64 targets. This prevents unnecessary binary downloads and reduces attack surface.

### Runtime

- Auth headers and cookies are redacted from all pino log output
- `ANTHROPIC_API_KEY` is never forwarded to the client; the agent route is a server-side proxy
- `DATABASE_URL` is server-side only

---

## Data flow: agent chat request

```
1. User types message in AgentSuitePanel
2. useAGI store dispatches → POST /api/agent/chat
3. api-server validates messages array
4. api-server opens MessageStream to Anthropic
5. stream.on("text") → writes SSE chunk to response
6. r3-agi reads SSE stream → appends text delta to store
7. UI re-renders incrementally as chunks arrive
8. stream.once("finalMessage") → writes [DONE] → res.end()
9. If user navigates away:
   - browser closes connection
   - req.on("close") fires
   - stream.abort() called
   - stream.on("abort") fires (no-op — prevents process crash)
```
r3v@penguin:~/Agi-Suite$ cat ~/Agi-Suite/docs/PRD.md
cat ~/Agi-Suite/WORKSPACE.md
cat ~/Agi-Suite/nits.md
cat ~/Agi-Suite/docs/API.md
# Agi-Suite — Product Requirements Document

**Version:** 2.0  
**Date:** 2026-04-18  
**Author:** r3v  
**Status:** Active  
**Branch:** `feature/llpte-extraction`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [User Persona](#3-user-persona)
4. [Product Vision](#4-product-vision)
5. [Current State (v1.0)](#5-current-state-v10)
6. [System Architecture](#6-system-architecture)
7. [Feature Requirements — Current](#7-feature-requirements--current)
8. [Feature Requirements — Future](#8-feature-requirements--future)
9. [Technical Requirements](#9-technical-requirements)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [API Contract](#11-api-contract)
12. [Data Model](#12-data-model)
13. [Security Requirements](#13-security-requirements)
14. [Success Metrics](#14-success-metrics)
15. [Release Phases](#15-release-phases)
16. [Known Gaps and Risks](#16-known-gaps-and-risks)
17. [Decisions Log](#17-decisions-log)

---

## 1. Executive Summary

Agi-Suite is an AI-native, browser-based engineering command center built specifically for the development and operation of R3 v4 — a browser-based AI-native Digital Audio Workstation. It consolidates system monitoring, AI-assisted development, codebase navigation, QA verification, and project management into a single, always-open interface running alongside the development environment.

The core premise is zero context-switching: every piece of information needed to build, debug, verify, and ship R3 v4 is accessible without leaving the browser tab.

---

## 2. Problem Statement

Developing a complex, AI-native platform as a solo developer across multiple technical domains (audio DSP, WebAssembly, AI pipelines, real-time WebSocket collaboration, Three.js visuals) creates a persistent overhead problem:

- **Cognitive load from tool sprawl.** Switching between terminal, browser, documentation, issue tracker, and AI chat windows fragments focus and wastes time.
- **No live system state.** There is no single view of what is running, what has changed, and what is broken.
- **Manual verification is slow and error-prone.** Pre-deploy QA is a mental checklist rather than a structured workflow.
- **AI assistance is context-free.** Generic AI chat tools have no knowledge of the specific codebase, architecture, or current state.
- **Priorities drift without a forcing function.** Without an in-environment prioritization view, feature creep and reactive work displace planned work.

Agi-Suite is the solution to all five problems in one purpose-built tool.

---

## 3. User Persona

**Primary user: r3v (solo developer)**

- Builds and maintains R3 v4 full-stack: React/Vite frontend, Express/Drizzle backend, LLPTE audio pipeline, Railway deployment
- Works in a Kali Linux VM environment (VMware)
- Expert-level TypeScript, Node.js, Python; strong systems-level understanding
- Requires direct, zero-handholding technical tooling
- High context-switching cost — any reduction in tab switches or terminal round-trips has direct productivity impact
- Deploys to Railway; monitors via Railway dashboard and logs today; wants to replace the Railway dashboard for operational monitoring

**There are no secondary users today.** Multi-user support is a future consideration only.

---

## 4. Product Vision

> Agi-Suite becomes the only interface needed to develop, operate, and evolve R3 v4 — from writing code to shipping deploys, all from a single browser-based dashboard with an AI co-pilot that has live, structured access to the entire system.

The three-horizon evolution:

| Horizon                                    | Timeframe  | State          |
| ------------------------------------------ | ---------- | -------------- |
| H1: Monitoring + AI chat                   | Now        | ✅ Shipped     |
| H2: Active control + tool-use AI           | 1–3 months | 🔨 In progress |
| H3: Autonomous agent with deploy authority | 3–6 months | 🗺 Planned     |

---

## 5. Current State (v1.0)

### What is shipped

As of 2026-04-18, Agi-Suite is a functioning two-service monorepo with the following capabilities:

**Frontend (`apps/r3-agi`)**

- Multi-panel React 19 SPA with sidebar navigation
- 12 active view panels covering all major operational domains
- Live metrics bar showing active users and total subscribers
- Embedded AI agent panel with full streaming chat (Claude Sonnet)
- Real-time SSE connection to backend metrics stream

**Backend (`apps/api-server`)**

- Express 5 API server with structured pino logging
- Anthropic SDK streaming proxy — server-side, key never exposed to client
- Session-aware metrics system with SSE broadcast
- Health endpoint for Railway deploy validation
- Hot reload in development via `tsx watch`
- Production build via esbuild with source maps

**Shared infrastructure**

- OpenAPI-first contract layer (`lib/api-spec` → `lib/api-zod` + `lib/api-client-react`)
- Drizzle ORM + PostgreSQL with migration workflow
- pnpm workspace with catalog-pinned versions and supply chain controls
- Git hooks: prettier pre-commit, typecheck pre-push
- Vitest workspace config (runner ready, test suites pending)

### What is not yet shipped

- No authentication on any endpoint
- No conversation persistence (resets on page refresh)
- No agent tool use (chat only, no system access)
- No test coverage
- No CI pipeline
- `totalSubscribers` resets on every Railway deploy (ephemeral filesystem)
- No ESLint

---

## 6. System Architecture

### Service topology

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  r3-agi  │  Sidebar + Views + AgentSuitePanel        │   │
│  │          │  useMetrics (SSE) │ useAGI (Zustand)      │   │
│  └────────────────────┬─────────────────────────────────┘   │
└───────────────────────│─────────────────────────────────────┘
                        │ HTTP + SSE
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            api-server (Express 5, Node 22)                   │
│  /api/healthz   /api/metrics   /api/metrics/stream           │
│  /api/metrics/heartbeat   /api/agent/chat                    │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
        Anthropic API              PostgreSQL (Railway)
        claude-sonnet-4            Drizzle ORM
```

### Monorepo package graph

```
lib/api-spec  ──generates──►  lib/api-zod  ──────────►  api-server
                          └──►  lib/api-client-react  ──►  r3-agi
lib/db  ─────────────────────────────────────────────►  api-server
```

### Frontend layout

```
┌─ Header (metrics bar: active users, total subscribers) ──────┐
│                                                               │
│ ┌─ Sidebar ─┐  ┌─ Active View ──────────────┐  ┌─ Panel ──┐ │
│ │           │  │                             │  │          │ │
│ │  nav      │  │  Overview / Intelligence /  │  │  Agent   │ │
│ │  links    │  │  LLPTE / AGICmd / API /     │  │  Suite   │ │
│ │           │  │  ASI / Patch / PRD /        │  │  Panel   │ │
│ │           │  │  Checklist / Verify /       │  │  (SSE    │ │
│ │           │  │  Priorities / Tree          │  │  chat)   │ │
│ │           │  │                             │  │          │ │
│ └───────────┘  └─────────────────────────────┘  └──────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## 7. Feature Requirements — Current

### FR-001: System Overview Dashboard

**Status:** Shipped  
**View:** `OverviewView`

The overview provides a real-time top-level status readout of the R3 v4 system. Displays active user count, total subscriber count, and key system health indicators. The entry point for any session — tells the developer immediately whether the system is in a good state or requires attention.

**Acceptance criteria:**

- Displays `activeUsers` and `totalSubscribers` from the metrics stream
- Updates in real time without page reload
- Visible degradation state when SSE connection is lost

---

### FR-002: LLPTE Pipeline Monitoring

**Status:** Shipped  
**Views:** `IntelligenceView`, `LLPTEView`

The LLPTE (six-package AI audio processing suite: `llpte-core`, `llpte-signal`, `llpte-ai`, `llpte-transition-graph`, `llpte-execution`, `llpte-adapters`) is the core AI engine of R3 v4. Monitoring its state is critical to understanding the health of the product.

`IntelligenceView` provides a high-level status across all six packages. `LLPTEView` provides a deep-dive into the pipeline topology, execution state, and any error conditions.

**Acceptance criteria:**

- Each of the six packages has an individual status indicator
- Pipeline execution state is visible (idle / processing / error)
- Errors surface with enough context to diagnose without switching to a terminal

---

### FR-003: AGI Command Interface

**Status:** Shipped  
**View:** `AGICmdView`

Provides a structured interface for issuing commands to the AGI agent layer of R3 v4. Distinct from the embedded chat panel — this view exposes discrete operational commands rather than open-ended conversation.

**Acceptance criteria:**

- Available commands are enumerated in the UI (no free-form input for command names)
- Command execution state is visible (pending / success / error)
- Command output is displayed inline

---

### FR-004: Live API Inspection

**Status:** Shipped  
**View:** `APIView`

Displays the live state of the R3 v4 API — registered routes, recent request logs, error rates. Eliminates the need to switch to a separate API testing tool for basic inspection.

**Acceptance criteria:**

- All registered routes are listed with their HTTP method
- Recent requests are shown with status codes and response times
- Filtering by route or status code

---

### FR-005: ASI Layer Status

**Status:** Shipped  
**View:** `ASIView`

Higher-order intelligence layer monitoring for the ASI components of R3 v4. Surfaces state and telemetry from the top of the AI decision stack.

---

### FR-006: Patch Tracking

**Status:** Shipped  
**View:** `PatchView`

Tracks applied patches, pending patches, and patch history against the R3 v4 codebase. Provides a record of what changed, when, and why — enforcing the four-part change accountability framework (root cause, fix rationale, affected surface, regression check).

**Acceptance criteria:**

- Patch list with timestamp, description, and status
- Each patch entry links to affected files/surfaces
- Pending patches are visually distinguished from applied patches

---

### FR-007: Canonical PRD Reference

**Status:** Shipped  
**View:** `PRDView`

Renders the canonical R3 v4 PRD inline within the dashboard. The PRD is the authoritative product specification — having it always accessible without switching tabs ensures development decisions are made against the correct reference.

**Acceptance criteria:**

- PRD renders in full with section navigation
- PRD version/date is visible
- Read-only — the PRD is not edited from within Agi-Suite

---

### FR-008: QA Checklist

**Status:** Shipped  
**View:** `ChecklistView`

A structured pre-deploy verification checklist derived from the 17-item QA spec in `Wire.txt`. Replaces the mental checklist with a trackable, repeatable process.

**Acceptance criteria:**

- All checklist items are enumerated with pass/fail state
- State persists within a session (does not reset on view change)
- Completion percentage is displayed
- A checklist cannot be marked complete unless all items are checked

---

### FR-009: System Verification

**Status:** Shipped  
**View:** `VerifyView`

Active verification steps that confirm system integrity — TypeScript compilation, test pass rate, build output validity, and deployment readiness. Distinct from the checklist (which is manual) — Verify runs automated checks.

**Acceptance criteria:**

- Each verification step shows last-run timestamp and result
- Failed verifications are visually prominent
- Verification can be re-triggered from the UI

---

### FR-010: Work Prioritization

**Status:** Shipped  
**View:** `PrioritiesView`

In-environment priority tracking that surfaces the active work queue without requiring a separate project management tool. Provides a forcing function against feature creep.

**Acceptance criteria:**

- Items have priority levels (P0/P1/P2 or equivalent)
- Active item (in-progress) is visually distinct
- Items can be reordered within the UI

---

### FR-011: Dependency/File Tree

**Status:** Shipped  
**View:** `TreeView`

Visual representation of the R3 v4 dependency graph or file structure. Allows navigation and understanding of the codebase topology without a separate tool.

---

### FR-012: Embedded AI Agent

**Status:** Shipped  
**Panel:** `AgentSuitePanel`  
**Backend:** `POST /api/agent/chat`

A streaming AI chat panel (Claude Sonnet) embedded permanently in the right panel of the dashboard. The agent has knowledge of R3 v4 through system prompt context. Responses stream incrementally via SSE.

**Acceptance criteria:**

- Streaming response renders token-by-token without flicker
- Client disconnect (navigation, close) gracefully aborts the Anthropic request without crashing the server
- Conversation history is maintained within a session
- Error states (API error, timeout) are surfaced in the chat UI
- Model: `claude-sonnet-4-20250514`
- Default max tokens: 1500 (configurable per request)

---

### FR-013: Real-time Metrics

**Status:** Shipped  
**Endpoints:** `GET /api/metrics/stream`, `POST /api/metrics/heartbeat`

Live session tracking displayed in the header bar. Sessions register via heartbeat and expire after 45 seconds of inactivity. The SSE stream broadcasts state changes to all connected clients.

**Acceptance criteria:**

- `activeUsers` count updates within 1 second of a session change
- `totalSubscribers` increments once per unique session (not per heartbeat)
- SSE stream auto-reconnects on connection loss
- Heartbeat interval: 30 seconds
- Session TTL: 45 seconds

---

## 8. Feature Requirements — Future

### FR-014: Agent Tool Use

**Priority:** P0  
**Horizon:** H2  
**Target:** 1–4 weeks

Transform the agent from a conversational assistant into an active co-pilot with structured access to the system. The Anthropic SDK's tool use API allows the agent to call defined functions and receive their results before completing a response.

**Tools to implement (in priority order):**

| Tool             | Description                            | Implementation                                     |
| ---------------- | -------------------------------------- | -------------------------------------------------- |
| `read_file`      | Read any file in the R3 v4 workspace   | Server reads file at path, returns content         |
| `list_directory` | List files in a directory              | `fs.readdir` with recursive option                 |
| `run_typecheck`  | Run `pnpm typecheck` and return output | `child_process.exec` with timeout                  |
| `run_tests`      | Run `pnpm test` and return results     | `child_process.exec`, parse Vitest output          |
| `query_db`       | Execute a read-only SQL query          | Drizzle raw query with `SET TRANSACTION READ ONLY` |
| `list_routes`    | Return all registered Express routes   | Introspect the Express router at runtime           |
| `get_metrics`    | Return current metrics snapshot        | Call internal metrics state directly               |

**Acceptance criteria:**

- Tool calls are visible in the chat UI (tool name + arguments displayed, then result)
- Tool execution errors surface as tool results, not as crashes
- `read_file` is sandboxed to the R3 v4 workspace root (no path traversal)
- `query_db` is strictly read-only — write operations are rejected at the middleware level
- `run_typecheck` and `run_tests` have a 60-second execution timeout

**Backend changes:**

- Update `/api/agent/chat` to pass `tools` array to Anthropic API
- Implement tool execution handlers in `src/lib/tools/`
- Stream `tool_use` and `tool_result` events through SSE alongside text deltas

---

### FR-015: Conversation Persistence

**Priority:** P0  
**Horizon:** H2  
**Target:** 2–4 weeks

Conversation history currently lives only in Zustand store memory. It is lost on page refresh, browser close, or navigation. This breaks the continuity that makes the agent useful for extended development sessions.

**Phase 1 — localStorage (immediate):**

- Persist conversation history to `localStorage` keyed by session
- Restore on page load
- Cap at last N messages to avoid localStorage quota issues (suggested: 50 messages)
- Zero infrastructure required

**Phase 2 — Database persistence (multi-device / audit):**

- Add `conversations` and `messages` tables to `lib/db`
- POST each turn to `/api/agent/conversations`
- Load conversation history on mount from the API
- Required if the dashboard is ever accessed from multiple devices

**Acceptance criteria (Phase 1):**

- Page refresh restores full conversation history
- Conversation history is capped and gracefully truncated when limit is reached
- Clear conversation button empties both UI state and localStorage

---

### FR-016: Request Authentication

**Priority:** P0  
**Horizon:** H2  
**Target:** 2–4 weeks

All API endpoints are currently unauthenticated. Acceptable for localhost-only development but a blocker for any production Railway deployment that is not behind a private network.

**Implementation:**

- Bearer token middleware applied to all routes except `/api/healthz`
- Token stored as `API_SECRET` environment variable on Railway
- Frontend reads token from Vite environment variable (`VITE_API_SECRET`)
- Token is injected into all requests via the custom fetch wrapper in `lib/api-client-react`
- SSE connections include token as query parameter or custom header

**Acceptance criteria:**

- All non-health endpoints return `401` without valid token
- Token mismatch logs a warning with the request IP (no token value in logs)
- Frontend correctly handles `401` responses (show error state, do not retry indefinitely)

---

### FR-017: Streaming Cancel

**Priority:** P1  
**Horizon:** H2  
**Target:** 1–2 weeks

Users cannot currently stop a streaming agent response mid-generation. They must wait for completion or navigate away. A cancel button is standard UX for any streaming AI interface.

**Implementation:**

- `AbortController` created per request in `AgentSuitePanel`
- Cancel button visible during active streaming
- On cancel: `abortController.abort()` → browser closes SSE connection → server `req.on("close")` fires → `stream.abort()` called
- No changes required server-side (already handles client disconnect correctly)
- UI state: button transitions from "Stop" to "Send" on cancel completion

**Acceptance criteria:**

- Cancel button appears only during active streaming
- Cancelling mid-response preserves the partial response in the chat history
- Cancelling does not produce an error message in the UI
- Server confirms no process crash or unhandled rejection on cancel

---

### FR-018: ESLint Integration

**Priority:** P1  
**Horizon:** H2  
**Target:** 1 week

Prettier handles formatting. TypeScript handles type errors. ESLint fills the gap: unused variables, React hook rule violations, exhaustive switch statements, and import ordering.

**Config:**

- `eslint.config.js` (flat config) at workspace root
- Plugins: `@typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-import`
- Rules: recommended TypeScript + strict React hooks + no unused vars
- Add `"lint": "eslint ."` to root scripts
- Add `pnpm lint` to the `pre-push` hook alongside `pnpm typecheck`

**Acceptance criteria:**

- Zero lint errors on current codebase after initial setup (fix or suppress with justification)
- Lint runs in CI and blocks merge on failure
- No rules that conflict with prettier (use `eslint-config-prettier` to disable formatting rules)

---

### FR-019: Test Coverage for `lib/` Packages

**Priority:** P1  
**Horizon:** H2  
**Target:** 2–4 weeks

Vitest is configured. No tests exist. The shared library layer (`lib/`) is the most critical surface to cover — it enforces the contract between all other packages.

**Coverage targets:**

| Package                | Test type                                                       | Priority |
| ---------------------- | --------------------------------------------------------------- | -------- |
| `lib/api-zod`          | Unit — parse valid inputs, reject invalid, check error messages | P0       |
| `lib/api-client-react` | Unit — mock fetch, test error handling, retry logic             | P1       |
| `lib/db`               | Integration — schema constraints, query correctness             | P1       |
| `apps/api-server`      | Integration — route handlers with supertest                     | P2       |

**Acceptance criteria:**

- `pnpm test` passes with zero failures before any push
- Coverage thresholds enforced in `vitest.config.ts` per package: 80% lines for `api-zod`, no threshold for others until suites are established
- Tests are colocated with source: `schema.test.ts` next to `schema.ts`

---

### FR-020: CI Pipeline

**Priority:** P1  
**Horizon:** H2  
**Target:** 2–3 weeks

Git hooks enforce quality locally. There is no CI gate on pushes or pull requests. A developer who bypasses hooks (or works on a machine where hooks are not installed) can push broken code undetected.

**GitHub Actions workflow:**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec prettier --check .
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

**Acceptance criteria:**

- All five checks must pass for a green CI
- `--frozen-lockfile` ensures the lockfile is never mutated in CI
- CI runs on every push to any branch and every PR
- Build time target: under 3 minutes

---

### FR-021: Metrics Persistence to PostgreSQL

**Priority:** P1  
**Horizon:** H2  
**Target:** 1–2 weeks

`totalSubscribers` resets to 147 on every Railway deploy due to the ephemeral filesystem. This makes the metric meaningless as a real measure of engagement.

**Schema addition:**

```sql
CREATE TABLE metrics_kv (
  key   VARCHAR(64) PRIMARY KEY,
  value INTEGER     NOT NULL
);
INSERT INTO metrics_kv (key, value) VALUES ('totalSubscribers', 147)
  ON CONFLICT DO NOTHING;
```

**Implementation:**

- Read `totalSubscribers` from DB on server startup
- Write on every increment with an upsert
- In-memory value is still the primary source during runtime (DB write is async, non-blocking)
- Generate and commit the migration file before deploying

**Acceptance criteria:**

- `totalSubscribers` survives Railway deploys
- DB write failure does not crash the server or block the heartbeat response
- Write latency has no observable impact on heartbeat response time (< 5ms added)

---

### FR-022: Structured Error Responses

**Priority:** P2  
**Horizon:** H2  
**Target:** 1 week

Error responses are not consistently shaped. Routes may return `{ error: "..." }`, Express's default HTML error page, or nothing at all depending on where the error occurs.

**Target shape:**

```typescript
interface ErrorResponse {
  error: string; // human-readable message
  code?: string; // machine-readable error code (e.g. "VALIDATION_ERROR")
  requestId?: string; // pino request ID for log correlation
}
```

**Implementation:**

- Global error handler middleware in `src/app.ts`
- All route errors use `next(err)` to propagate
- Add `ErrorResponse` type to `lib/api-spec/openapi.yaml`
- Regenerate `lib/api-zod` and `lib/api-client-react`

**Acceptance criteria:**

- No route returns HTML for error conditions
- All 4xx and 5xx responses match the `ErrorResponse` shape
- Request ID is included in error responses for log correlation

---

### FR-023: Historical Metrics and Charts

**Priority:** P2  
**Horizon:** H3  
**Target:** 4–8 weeks

Active user count and subscriber count are point-in-time metrics. Historical trends require time-series storage and visualization.

**Schema:**

```sql
CREATE TABLE metrics_events (
  id          SERIAL PRIMARY KEY,
  event_type  VARCHAR(32) NOT NULL,  -- 'session_start', 'session_end'
  session_id  VARCHAR(64) NOT NULL,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);
```

**New endpoint:** `GET /api/metrics/history?period=7d`

**Frontend:** Dedicated metrics chart view (or expanded `OverviewView`) with a line chart of active users over time. Recharts is already available in the React dependency tree.

---

### FR-024: Agent with Deploy Authority

**Priority:** P0 (H3)  
**Horizon:** H3  
**Target:** 3–6 months

The long-horizon vision for the agent is full deploy authority — the ability to not just read and advise but to take action: apply patches, run migrations, trigger Railway deploys, roll back if a health check fails.

**Prerequisite gates (must be completed first):**

1. FR-014 (tool use) — agent must be able to read and verify state
2. FR-016 (authentication) — all actions must be authenticated
3. FR-019 (test coverage) — a deploy-authority agent requires verified correctness guarantees
4. FR-020 (CI) — CI must be passing before any automated deploy

**Tools added in H3:**

| Tool              | Description                               | Risk level                                     |
| ----------------- | ----------------------------------------- | ---------------------------------------------- |
| `apply_patch`     | Apply a Python or bash patch script       | High — requires dry-run preview + confirmation |
| `run_migration`   | Run `pnpm --filter @workspace/db migrate` | High — irreversible                            |
| `trigger_deploy`  | Trigger a Railway redeploy                | High — requires health check gate              |
| `rollback_deploy` | Roll back to previous Railway deployment  | Medium                                         |
| `write_file`      | Write to a file in the workspace          | High — requires diff preview + confirmation    |

**Safety model:**

- All destructive tools require a two-step confirmation: agent proposes → user approves
- Confirmation is a typed acknowledgment, not a click (reduces accidental confirmation)
- All tool executions are logged to the DB with timestamp, tool name, arguments, and result
- A "safe mode" flag disables all write tools globally

---

## 9. Technical Requirements

### TR-001: Stack constraints (non-negotiable)

| Layer              | Technology                 | Constraint                               |
| ------------------ | -------------------------- | ---------------------------------------- |
| Frontend framework | React 19                   | Fixed — aligns with R3 v4 frontend       |
| Frontend build     | Vite 7                     | Fixed                                    |
| CSS                | Tailwind CSS 4             | Fixed                                    |
| Component library  | shadcn/ui                  | Fixed                                    |
| Backend framework  | Express 5                  | Fixed                                    |
| Backend runtime    | Node.js 22                 | Minimum version                          |
| ORM                | Drizzle ORM                | Fixed                                    |
| Database           | PostgreSQL                 | Fixed — Railway plugin                   |
| AI SDK             | `@anthropic-ai/sdk`        | Fixed — Anthropic only                   |
| AI model           | `claude-sonnet-4-20250514` | Default; may be configurable per feature |
| Package manager    | pnpm 10                    | Fixed — enforced by preinstall script    |
| Language           | TypeScript                 | Strict throughout                        |

### TR-002: Development environment

- Hot reload: `tsx watch` for api-server (< 500ms restart), Vite HMR for frontend
- Environment loading: Node `--env-file` (no dotenv package)
- All changes type-safe before commit (pre-push hook)
- All files prettier-formatted before commit (pre-commit hook)

### TR-003: Build output

- Production api-server bundle: single ESM file via esbuild
- `@anthropic-ai/sdk` externalized from bundle (installed separately at runtime)
- Source maps included for production debugging
- Target bundle size: < 300kb (excluding externals)

### TR-004: Monorepo conventions

- Shared package versions managed via pnpm catalog in `pnpm-workspace.yaml`
- All catalog-referenced packages use `"catalog:"` in `package.json`
- No circular dependencies between packages
- `lib/` packages do not import from `apps/`
- `apps/` packages may import from `lib/`

---

## 10. Non-Functional Requirements

### NFR-001: Performance

| Metric                                  | Target                   |
| --------------------------------------- | ------------------------ |
| API server cold start                   | < 2 seconds              |
| Heartbeat response time                 | < 50ms p99               |
| SSE first byte after agent request      | < 500ms                  |
| Frontend initial load (Vite prod build) | < 2 seconds on broadband |
| tsx watch restart on file change        | < 500ms                  |

### NFR-002: Reliability

- API server must not crash on client disconnect during streaming (enforced by `stream.on("abort", () => {})`)
- SSE clients must be cleaned up on disconnect (no memory leak in `sseClients` Set)
- Session map must be pruned periodically (15-second interval) to prevent unbounded growth
- DB write failures (metrics persistence) must not propagate to HTTP response errors

### NFR-003: Security

- `ANTHROPIC_API_KEY` never leaves the server process
- `DATABASE_URL` never leaves the server process
- Auth headers and cookies redacted from all log output
- Supply chain: `minimumReleaseAge: 1440` enforced globally
- No package version published < 24 hours ago installs without explicit allowlist exception

### NFR-004: Observability

- All requests logged with method, path (no query string), status, and response time
- Unhandled errors logged with full stack trace via pino
- Source maps in production for readable stack traces in logs
- Request ID propagated through log entries for correlation

### NFR-005: Developer experience

- Zero TypeScript errors at all times
- Zero prettier violations at all times
- Workspace commands documented in `DEVELOPMENT.md`
- New developer can run `pnpm install && pnpm dev` and have a working environment in < 5 minutes

---

## 11. API Contract

The canonical API contract lives in `lib/api-spec/openapi.yaml`. All downstream consumers (Zod validators, React Query hooks) are generated from this file. Never write validators or hooks by hand.

### Current endpoints

| Method | Path                     | Auth                    | Description          |
| ------ | ------------------------ | ----------------------- | -------------------- |
| `GET`  | `/api/healthz`           | None                    | Liveness check       |
| `GET`  | `/api/metrics`           | None                    | Metrics snapshot     |
| `GET`  | `/api/metrics/stream`    | None (future: required) | SSE metrics stream   |
| `POST` | `/api/metrics/heartbeat` | None (future: required) | Session heartbeat    |
| `POST` | `/api/agent/chat`        | None (future: required) | Agent streaming chat |

### Planned additions (FR-014, FR-016, FR-021)

| Method | Path                       | Auth     | Description               |
| ------ | -------------------------- | -------- | ------------------------- |
| `GET`  | `/api/metrics/history`     | Required | Time-series metrics       |
| `POST` | `/api/agent/conversations` | Required | Persist conversation turn |
| `GET`  | `/api/agent/conversations` | Required | Load conversation history |

---

## 12. Data Model

### Current schema (`lib/db/src/schema/index.ts`)

Schema contents not fully visible from current session — confirm against actual file before adding tables.

### Planned additions

**`metrics_kv`** (FR-021 — metrics persistence)

```typescript
export const metricsKv = pgTable("metrics_kv", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: integer("value").notNull(),
});
```

**`metrics_events`** (FR-023 — historical metrics)

```typescript
export const metricsEvents = pgTable("metrics_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 32 }).notNull(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow(),
});
```

**`conversations`** (FR-015 Phase 2 — conversation persistence)

```typescript
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  role: varchar("role", { length: 16 }).notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```

---

## 13. Security Requirements

### SR-001: Supply chain

- `minimumReleaseAge: 1440` enforced in `pnpm-workspace.yaml`. Do not disable.
- Exceptions to the 1440-minute rule require explicit `minimumReleaseAgeExclude` entry with justification
- All exceptions must be removed once the 24-hour window passes

### SR-002: Secrets management

- All secrets are Railway environment variables — never committed to the repository
- `.env` files are gitignored
- No secret should appear in any log output
- When FR-016 is implemented, the `API_SECRET` is added to Railway and to Vite's env config as `VITE_API_SECRET` — never hardcoded

### SR-003: Input validation (FR-014 — tool use)

- `read_file` tool: path must be resolved against the workspace root and validated to not escape it (`path.resolve` + `startsWith(ROOT)`)
- `query_db` tool: all queries run in `READ ONLY` transaction mode; DDL statements are rejected
- `run_typecheck` / `run_tests`: no arguments accepted from the agent — command is hardcoded

### SR-004: Agent safety (FR-024 — deploy authority)

- All destructive tools gated behind explicit user confirmation
- Confirmation is a typed acknowledgment string, not a boolean
- All tool executions logged to database with full audit trail
- `safe_mode` global flag disables all write tools

---

## 14. Success Metrics

### H1 Metrics (current — v1.0)

| Metric                                    | Target                      | Current state                 |
| ----------------------------------------- | --------------------------- | ----------------------------- |
| Server uptime                             | > 99% over any 7-day period | Unknown — no monitoring alert |
| Agent crash-free streaming sessions       | 100%                        | ✅ Fixed (abort handler)      |
| TypeScript errors on main branch          | 0                           | ✅ Verified                   |
| Prettier violations on commit             | 0                           | ✅ Enforced by hook           |
| Pre-deploy QA time (checklist completion) | < 5 minutes                 | Unmeasured                    |

### H2 Metrics (target)

| Metric                                | Target              |
| ------------------------------------- | ------------------- |
| Agent tool-use request success rate   | > 95%               |
| Conversation persistence restore rate | 100% on page reload |
| Test coverage (`lib/api-zod`)         | > 80% lines         |
| CI pipeline pass rate                 | > 98% on first run  |
| Heartbeat response time p99           | < 50ms              |

### H3 Metrics (target)

| Metric                                                       | Target                       |
| ------------------------------------------------------------ | ---------------------------- |
| Agent-initiated deploys with zero rollback                   | > 90%                        |
| Time from "ship decision" to deployed                        | < 5 minutes (agent-assisted) |
| Dev sessions requiring external tool (terminal, browser tab) | < 20%                        |

---

## 15. Release Phases

### Phase 1 — Foundation (Completed 2026-04-18)

- [x] Core monorepo structure with pnpm workspace
- [x] Express API server with metrics and agent endpoints
- [x] React dashboard with 12 view panels
- [x] Streaming agent chat with SSE
- [x] SDK abort crash fix
- [x] Hot reload dev environment
- [x] Git hooks (prettier + typecheck)
- [x] Vitest workspace config
- [x] DB migrate/generate scripts
- [x] Complete documentation suite

### Phase 2 — Hardening (Target: 4 weeks)

- [ ] FR-016: Authentication
- [ ] FR-017: Streaming cancel
- [ ] FR-015: Conversation persistence (Phase 1 — localStorage)
- [ ] FR-018: ESLint
- [ ] FR-019: Test coverage for `lib/api-zod`
- [ ] FR-020: CI pipeline
- [ ] FR-021: Metrics persistence to PostgreSQL
- [ ] FR-022: Structured error responses

### Phase 3 — Intelligence (Target: 8 weeks)

- [ ] FR-014: Agent tool use (read_file, list_directory, run_typecheck, run_tests, query_db)
- [ ] FR-015: Conversation persistence (Phase 2 — database)
- [ ] FR-019: Test coverage for `lib/db` and `api-server`
- [ ] FR-023: Historical metrics and charts

### Phase 4 — Autonomy (Target: 6 months)

- [ ] FR-024: Agent deploy authority
- [ ] Agent patch application with dry-run preview
- [ ] Agent migration execution with rollback gate
- [ ] Full audit log for all agent-initiated actions
- [ ] Safe mode global kill switch

---

## 16. Known Gaps and Risks

### Gap: `simple-git-hooks` build approval

**Risk level:** Low  
**Description:** `pnpm approve-builds` has not been run. On a fresh `pnpm install` (new machine or CI), git hooks will not be installed automatically.  
**Mitigation:** Run `pnpm approve-builds` and select `simple-git-hooks`. This is a one-time action.

### Gap: No authentication

**Risk level:** High if Railway service is public-facing  
**Description:** All endpoints accept unauthenticated requests. The Anthropic API key is protected server-side, but the agent endpoint could be abused by anyone with the Railway URL.  
**Mitigation:** Block the Railway service behind a private network, or implement FR-016 before any public deployment.

### Gap: Ephemeral metrics persistence

**Risk level:** Low (cosmetic)  
**Description:** `totalSubscribers` resets to 147 on every deploy.  
**Mitigation:** FR-021 resolves this.

### Risk: Agent tool-use security surface

**Risk level:** High  
**Description:** When FR-014 ships, the agent gains filesystem and database access. A prompt injection through user-provided content (e.g. a file the agent reads that contains adversarial instructions) could cause unintended tool calls.  
**Mitigation:** Path sandboxing, read-only DB transactions, no write tools in H2, human-in-the-loop confirmation for all destructive operations in H3.

### Risk: Single-process metrics broadcast

**Risk level:** Medium  
**Description:** The SSE broadcast and session map are in-process. If the API server restarts, all SSE clients disconnect and must reconnect. If the server is ever scaled to multiple Railway instances, sessions will not be shared.  
**Mitigation:** Acceptable for current single-instance deployment. If horizontal scaling is needed, move session state to Redis or PostgreSQL.

---

## 17. Decisions Log

| Date       | Decision                                                 | Rationale                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-18 | Use `stream.on("abort", () => {})` instead of `.catch()` | `MessageStream` is not a Promise. `abort` is a distinct SDK event from `error`. `Promise.reject()` is called intentionally by the SDK when no abort listener exists.                            |
| 2026-04-18 | Externalize `@anthropic-ai/sdk` from esbuild bundle      | Package exists in `node_modules` at Railway runtime. Bundling it added ~1.8mb with no benefit.                                                                                                  |
| 2026-04-18 | Use `tsx watch` for dev, esbuild for production          | `tsx watch` provides sub-500ms restart with no build step. esbuild provides optimized production output. Keeping them separate avoids compromising either.                                      |
| 2026-04-18 | `tsx` version uses `"catalog:"` not a hardcoded version  | `tsx: ^4.21.0` is pinned in `pnpm-workspace.yaml` catalog. Hardcoding a different version in `api-server/package.json` would conflict with the catalog and potentially install a duplicate.     |
| 2026-04-18 | `lib/db` uses `push` for dev, `migrate` for production   | `push` is fast for local schema iteration. `migrate` maintains a versioned history required for safe production deploys. Both are needed; neither replaces the other.                           |
| 2026-04-18 | `minimumReleaseAge: 1440` in workspace config            | Supply-chain attacks via malicious npm publishes are typically discovered and pulled within hours. A 24-hour minimum release age provides a strong defense buffer with minimal workflow impact. |
| 2026-04-18 | No `.prettierrc` — use prettier defaults                 | Reducing configuration surface area. Prettier's defaults are well-considered and widely adopted. Deviation requires justification.                                                              |
| 2026-04-18 | Authentication deferred to FR-016                        | Service is not public-facing in current deployment. The gap is documented and known. Shipping auth before other hardening would block value delivery without proportionate risk reduction.      |
# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
echo 'postgresql://r3:r3vibe@localhost:5432/r3vibe' > /tmp/dburl.txt

python3 - << 'PYEOF'
import subprocess, pathlib

url = pathlib.Path('/tmp/dburl.txt').read_text().strip()

result = subprocess.run(
['node', '-e', f'''
const {{Pool}} = require('pg');
const pool = new Pool({{connectionString: {repr(url)}}});
pool.query('SELECT 1').then(() => {{ console.log('CONNECTED'); pool.end(); }}).catch(e => {{ console.error('FAILED:', e.message); pool.end(); }});
'''],
cwd='/home/r3v/Stable',
capture_output=True, text=True
)
print(result.stdout)
print(result.stderr)
PYEOF

curl -s https://postgres-production-9ee0.up.railway.app/api/ping | head -c 100
# API Reference

Base URL (development): `http://localhost:3001/api`  
Base URL (production): `https://<railway-domain>/api`

All request bodies are JSON. All responses are JSON unless noted as SSE.

---

## Health

### `GET /api/healthz`

Liveness check. Returns immediately with no database or external dependency calls.

**Response `200`**

```json
{ "status": "ok" }
```

---

## Metrics

The metrics system tracks active browser sessions and a running total subscriber count. Sessions expire after 45 seconds without a heartbeat.

### `GET /api/metrics`

Snapshot of current metrics state.

**Response `200`**

```json
{
  "activeUsers": 1,
  "totalSubscribers": 147
}
```

| Field              | Type     | Description                                                                                                                                  |
| ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeUsers`      | `number` | Sessions active within the last 45 seconds                                                                                                   |
| `totalSubscribers` | `number` | Cumulative unique sessions since first run. Persisted across restarts in `/tmp/r3-metrics.json`. Starts at 147 if no persisted value exists. |

---

### `GET /api/metrics/stream`

Server-Sent Events stream. Emits a data event on every session change (new session, session expiry). Sends a keep-alive ping every 20 seconds.

**Response headers**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Event format**

```
data: {"activeUsers":2,"totalSubscribers":148}

: ping
```

The client should reconnect automatically on connection loss. The stream emits the current state immediately on connection before any change events.

---

### `POST /api/metrics/heartbeat`

Registers or refreshes a session. Must be called at least once every 45 seconds to keep the session active. The frontend calls this every 30 seconds.

**Request body**

```json
{ "sessionId": "uuid-v4-string" }
```

| Field       | Required | Description                                                                                   |
| ----------- | -------- | --------------------------------------------------------------------------------------------- |
| `sessionId` | yes      | Stable identifier for this browser session. Generate once on page load and persist in memory. |

**Response `200`**

```json
{
  "ok": true,
  "activeUsers": 2,
  "totalSubscribers": 148
}
```

**Response `400`** — missing or invalid `sessionId`

```json
{ "error": "sessionId required" }
```

**Side effects:** On a new `sessionId`, `totalSubscribers` is incremented and persisted. On every heartbeat (new or known), the current metrics state is broadcast to all active SSE clients.

---

## Agent

The agent endpoint is a server-side proxy to the Anthropic Streaming Messages API. The API key never leaves the server.

### `POST /api/agent/chat`

Initiates a streaming conversation turn with Claude. Returns a Server-Sent Events stream.

**Request body**

```json
{
  "messages": [
    { "role": "user", "content": "What is the LLPTE pipeline?" },
    { "role": "assistant", "content": "The LLPTE pipeline..." },
    { "role": "user", "content": "Tell me more about llpte-signal." }
  ],
  "system": "You are an expert on the R3 v4 codebase.",
  "max_tokens": 1500
}
```

| Field        | Type        | Required | Default | Description                                                                                     |
| ------------ | ----------- | -------- | ------- | ----------------------------------------------------------------------------------------------- |
| `messages`   | `Message[]` | yes      | —       | Full conversation history. Must alternate user/assistant. Final message must be `role: "user"`. |
| `system`     | `string`    | no       | —       | System prompt injected before the conversation.                                                 |
| `max_tokens` | `number`    | no       | `1500`  | Maximum tokens in the response.                                                                 |

**Message object**

```typescript
{
  role: "user" | "assistant";
  content: string;
}
```

**Response headers**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**SSE event: text delta**

```
data: {"type":"text_delta","text":"The LLPTE"}

data: {"type":"text_delta","text":" pipeline consists"}
```

Emitted for each incremental text chunk from the model. Accumulate `text` fields in order to build the full response.

**SSE event: done**

```
data: [DONE]
```

Emitted once when the model finishes. The connection closes immediately after.

**SSE event: error**

```
data: {"type":"error","message":"..."}
```

Emitted on non-abort errors (rate limit, API error, etc.). The connection closes after this event.

**Response `400`** — malformed request (before stream opens)

```json
{ "error": "messages array required" }
```

**Response `503`** — `ANTHROPIC_API_KEY` not configured on server

```json
{ "error": "ANTHROPIC_API_KEY not configured on server" }
```

**Client disconnect:** If the client closes the connection mid-stream (e.g. navigation, component unmount), the server detects the close event, calls `stream.abort()`, and terminates the Anthropic API request. No error is sent — the connection is simply closed.

**Model used:** `claude-sonnet-4-20250514`

---

## Error handling

All routes use Express 5's async error propagation. Unhandled errors fall through to the default Express error handler, which returns a generic 500 response. Route-level errors that occur before the SSE stream is opened return JSON. Errors that occur after the stream is opened are sent as SSE error events.

---

## SDK note: abort vs error events

The Anthropic `MessageStream` distinguishes two error event types:

| Event   | When                                        | How handled                                               |
| ------- | ------------------------------------------- | --------------------------------------------------------- |
| `error` | Real API errors (rate limit, network, etc.) | Written to SSE stream as `{"type":"error"}` event         |
| `abort` | Client disconnect triggers `stream.abort()` | No-op listener — prevents intentional unhandled rejection |

Both must be explicitly handled. The `abort` event is separate from the `error` event and requires its own `.on("abort", () => {})` listener to prevent the SDK from calling `Promise.reject()` and crashing the process.
r3v@penguin:~/Agi-Suite$ grep -rn --include="*.md" --include="*.txt" --include="*.ts" --include="*.tsx" \
  -e "Time Sav" -e "Auto.Level" -e "Smart.Trans" -e "MVP" -e "timeSav" \
  ~/Agi-Suite/ 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v ".patch-backups"
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:97:      "What is the current MVP queue status?",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:117:MVP QUEUE:
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:118:✅ 1. AI Auto-Leveling — 6 layers, 20 Vitest tests
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:119:✅ 2. Smart Transitions — 9 files, 22 Vitest tests
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:120:✅ 3. Time Savings Tracking — SessionChip + SessionSummaryPanel wired
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:177:  Active edges (MVP): ≤2000 (current: 847)
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:307:  7. Time Savings panel missing real data or PNG export broken → FAILURE
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:375:Server → Client: ai:suggestion, ai:levelingApplied, ai:transitionReady, llpte:metricsUpdate, session:timeSavedUpdate
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:579:  20 tests — AI Auto-Leveling (6 architectural layers)
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:580:  22 tests — Smart Transitions (9 files, Camelot wheel harmonic scoring)
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:656:    role: "Product Requirements & MVP Gates",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:662:      "List all 4 MVP items and their current status.",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:669:  ✅ AI Auto-Leveling — 6 layers, 20 Vitest tests, LLPTE wired
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:670:  ✅ Smart Transitions — 9 files, 22 Vitest tests, Camelot scoring
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:671:  ✅ Time Savings Tracking — SessionChip + SessionSummaryPanel in DAW.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:686:  🟢 P3 — MVP COMPLETION:
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx:695:      mv_user_session_averages (Time Savings baseline)
/home/r3v/Agi-Suite/apps/r3-agi/src/components/Header.tsx:198:          <span>MVP</span>
/home/r3v/Agi-Suite/apps/r3-agi/src/components/RightPanel.tsx:43:  sessions.stop                  mutate({ sessionId }) → { durationSeconds, timeSavedSeconds }
/home/r3v/Agi-Suite/apps/r3-agi/src/components/RightPanel.tsx:162:        TSC: <code>0 errors</code> · Routers: <code>11/11</code> · MVP:{" "}
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/APIView.tsx:65:        returns: "{ sessionId, durationSeconds, timeSavedSeconds }",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/IntelligenceView.tsx:88:    purpose: "Time Savings baseline calculation",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/IntelligenceView.tsx:91:    unblocks: "Time Savings % panel real data",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/LLPTEView.tsx:55:  const timeSaved = MANUAL_WORKFLOW_MS - latencyMs;
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/LLPTEView.tsx:96:          Time Savings — Manual vs AI Execution
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/LLPTEView.tsx:297:            Time Saved / Transition
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/LLPTEView.tsx:307:            {(timeSaved / 1000).toFixed(1)}s
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/OverviewView.tsx:289:    { num: 3, denom: 4, color: "var(--accent)", label: "MVP Done" },
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/PRDView.tsx:18:      section: "§8 MVP 1–2",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/PRDView.tsx:19:      claim: "Auto-Leveling (20t) · Smart Transitions (22t)",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/PRDView.tsx:24:      section: "§8 MVP 3",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/PRDView.tsx:25:      claim: "Time Savings — SessionChip + Panel",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/PRDView.tsx:30:      section: "§8 MVP 4",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/PatchView.tsx:521:            gate: "§6 AI Auto-Leveling",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/PatchView.tsx:539:            gate: "§15 MVP Checklist",
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/TreeView.tsx:25:    { text: "  ← MVP item 3 ✓" },
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/TreeView.tsx:30:    { text: "  ← MVP item 4 frontend" },
/home/r3v/Agi-Suite/apps/r3-agi/src/store/useAGI.ts:96:    title: "Mix Suggestion System — backend wiring (MVP item 4)",
/home/r3v/Agi-Suite/apps/r3-agi/src/store/useAGI.ts:106:      "mv_user_session_averages + mv_ai_acceptance_rates required for Time Savings baseline + confidence calibration.",
r3v@penguin:~/Agi-Suite$ find ~/Agi-Suite/apps/r3-agi/src -type f | sort
/home/r3v/Agi-Suite/apps/r3-agi/src/App.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/AgentSuitePanel.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/Header.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/RightPanel.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/Sidebar.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/accordion.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/alert-dialog.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/alert.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/aspect-ratio.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/avatar.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/badge.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/breadcrumb.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/button-group.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/button.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/calendar.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/Card.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/carousel.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/chart.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/checkbox.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/collapsible.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/command.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/context-menu.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/dialog.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/drawer.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/dropdown-menu.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/empty.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/field.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/form.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/hover-card.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/input-group.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/input-otp.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/input.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/item.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/kbd.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/label.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/menubar.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/navigation-menu.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/pagination.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/popover.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/progress.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/radio-group.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/resizable.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/scroll-area.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/select.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/separator.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/sheet.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/sidebar.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/skeleton.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/slider.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/sonner.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/spinner.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/switch.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/table.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/tabs.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/textarea.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/toaster.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/toast.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/toggle-group.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/toggle.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/ui/tooltip.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/AGICmdView.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/APIView.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/ASIView.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/ChecklistView.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/IntelligenceView.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/LLPTEView.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/OverviewView.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/PatchView.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/PRDView.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/PrioritiesView.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/TreeView.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/components/views/VerifyView.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/hooks/useMetrics.ts
/home/r3v/Agi-Suite/apps/r3-agi/src/hooks/use-mobile.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/hooks/use-toast.ts
/home/r3v/Agi-Suite/apps/r3-agi/src/index.css
/home/r3v/Agi-Suite/apps/r3-agi/src/lib/utils.ts
/home/r3v/Agi-Suite/apps/r3-agi/src/main.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/main.tsx.bak-20260419_013110
/home/r3v/Agi-Suite/apps/r3-agi/src/main.tsx.bak-scaffold
/home/r3v/Agi-Suite/apps/r3-agi/src/pages/not-found.tsx
/home/r3v/Agi-Suite/apps/r3-agi/src/store/useAGI.ts
r3v@penguin:~/Agi-Suite$ nano .env
r3v@penguin:~/Agi-Suite$ 