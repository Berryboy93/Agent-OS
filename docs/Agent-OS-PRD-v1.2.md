# Agent-OS: Product Requirements Document

**Version:** 1.2 (Revised & Polished)
**Status:** Active Development — Phase 2 Complete · Phase 3 Next Up
**Last Updated:** June 2026
**Author:** Ty (Solo Founder)

---

## Confidence Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Confirmed — verified by project history |
| 📋 | Proposed / illustrative — draft target; validate against codebase before using |
| 🔜 | Not started — planned next milestone |
| 🚧 | In progress |
| ❓ | Unconfirmed — must verify before proceeding |
| 🔮 | Speculative / future — not on the current roadmap |

> **Rule:** Build only on ✅ items. Validate 📋 and ❓ items against the actual codebase before treating them as ground truth. Never hard-code assumptions from 📋 sections into application logic or frontend data contracts.

---

## Executive Summary

**Agent-OS** ✅ is a standalone agent orchestration platform built as a pnpm monorepo. It provides a tool registry, an agent lifecycle state machine, an Express API server, and a dashboard UI.

### Confirmed State (June 2026)

- ✅ Tool registry API built and seeded (4 built-in tools)
- ✅ `@agent-os/lifecycle` — 9-state machine implemented and wired into dashboard server
- ✅ Dashboard frontend: `AgentsPage`, `DeploymentsPage`, `ApprovalsPage` wired in `App.tsx`
- ✅ All API endpoints returning real SQLite data — no placeholder or in-memory data
- ✅ TanStack Query v5 hooks throughout with typed interfaces
- ✅ SSE streaming active with `clientId` handshake
- ✅ Error Predictor running on port 5001 (confidence scoring + compound pattern detection)
- ✅ Critical bugs resolved: `agentId` vs `agent_id` column mismatch; four endpoint mismatches between frontend router and backend patched
- 🔜 Phase 3 (Health Checks & Observability) — not started; this is the next milestone

### Product Direction

Agent-OS currently serves as internal infrastructure and the execution bridge between Agi-Suite and R3 v4. Whether to pursue it as an external developer platform is an **open, unresolved decision** — do not treat ecosystem or marketplace goals as committed until explicitly decided.

---

## Vision & Goals

> 📋 This section is a proposed direction, not a confirmed commitment. Validate before using it to drive real prioritization.

### Primary Vision (proposed)

An agent orchestration platform that abstracts reliability, state management, and tooling infrastructure — so agent logic is the only hard part left.

### Strategic Goals (proposed, 12-month horizon)

1. **Reliability** — high task completion via retry logic, error handling, and graceful degradation
2. **Observability** — real-time visibility into agent state, tool execution, and failure modes
3. **Scalability** — many concurrent agents with low orchestration overhead
4. **Developer Experience** — low-friction agent setup and tool registration
5. **Ecosystem** *(only if external-product direction is chosen)* — third-party tools and agent templates

### Success Metrics (proposed)

- Phase 3 health checks shipped within the current integration sprint
- Zero TypeScript errors; WIRE protocol compliance on every change
- Meaningful test coverage on all critical paths
- **Frontend integrity:** every page wired to a live backend endpoint; all mutations reflected in UI immediately; no stale data after upgrades or schema changes

---

## Product Scope

### Core Capabilities

---

#### 1. Tool Registry & Management — ✅ Built (M0 Bootstrap)

**Purpose:** centralized catalog of capabilities agents can invoke.

**Confirmed implementation:**
- REST routes: `GET /api/tools`, `POST /api/tools`, `DELETE /api/tools/:id`
- `tools` table DDL applied
- Seed script: 4 built-in tools loaded at startup

**Build note:** built via `agent-os-m0-bootstrap.sh`. The bootstrap required multiple fix rounds — unsafe counter increments under `set -e`; `node --input-type=module` stdin invocation replaced with a `mktemp`-based `.mjs` approach; anchor-ambiguity errors in route-injection patches. Complete regardless of phase label.

---

#### 2. Agent Lifecycle Management — ✅ Built (Phase 2)

**Purpose:** track and manage agent state from creation through termination.

**States:** `@agent-os/lifecycle` implements a **9-state machine**. Confirmed named states: `Initialization`, `Active`, `Paused`, `Terminated`. The remaining 5 states are **not enumerated here** — check `@agent-os/lifecycle` source directly. Do not hard-code the full state list without first verifying it against the package.

**Confirmed implementation:**
- `@agent-os/lifecycle` package wired into the dashboard server
- Persistence via Drizzle ORM

**Not independently confirmed (📋):** specific `agents` and `agent_events` table schemas; agent CRUD REST endpoints. Treat the Data Model and API sections below as a proposed target design. Verify all field names against the actual Drizzle schema before writing any query or API handler.

---

#### 3. Dashboard & Admin Interface — ✅ Partially Confirmed

**Purpose:** operator visibility and control over agents, deployments, and approvals.

**Confirmed:**
- Frontend pages: `AgentsPage`, `DeploymentsPage`, `ApprovalsPage` — all wired in `App.tsx`
- TanStack Query v5 hooks with typed interfaces
- All endpoints returning real SQLite data via Drizzle ORM — no mock data
- SSE streaming active with `clientId` handshake
- Custom CSS: glass / deep-space aesthetic (previously debugged for `@import` ordering and overly broad rules)
- `agentId` vs `agent_id` column name mismatch — resolved
- Four endpoint mismatches between frontend and backend router — resolved
- Two parallel approval systems: `approval_requests` (runtime flow) vs `approvals` (CLI flow) — both intentional

**Frontend wiring requirements — non-negotiable for all current and future work:**
- Every page must be wired to a real, live backend endpoint — never mock or in-memory data in production code
- Every mutation (create, update, delete) must trigger a TanStack Query invalidation so the UI reflects the new state immediately — no manual refresh required by the user
- Every future backend upgrade or schema change must be accompanied by a matching frontend update — shipping a backend change without updating the corresponding UI is a bug
- Triple-check the frontend ↔ backend contract on every new endpoint: HTTP method, path, request body shape, response shape, and field name casing (snake_case DB vs camelCase frontend — this mismatch has caused bugs before)
- All pages must be regression-tested after any upgrade — no silent breakage

**Unconfirmed (❓):** frontend framework. Custom CSS is confirmed. Whether the client uses React, plain HTML, or another framework has not been independently verified for Agent-OS. Do not assume the R3 v4 stack (React / Vite / Wouter / Zustand / tRPC) applies here without verifying the `dashboard` package source.

**API style:** REST confirmed for the tools API. tRPC is **not confirmed** for Agent-OS.

---

#### 4. Error Predictor — ✅ Running

- **Port:** 5001
- **Capabilities:** confidence scoring, compound pattern detection
- **Status:** operational

---

#### 5. Health Checks & Observability — 🔜 Not Started (Phase 3, Next Up)

**Purpose:** real-time monitoring of platform and agent health.

**Planned scope (nothing built yet):**
- Database health: connection test, query latency baseline
- Runtime health: active agent count, task completion time
- Tool health: execution success rate, latency percentiles per tool
- Agent health: state consistency, stuck-agent detection

**Design constraints — apply from day one:**
- Health-check thresholds must be **configurable** — do not hard-code magic numbers in source
- The Phase 3 dashboard UI component is part of the acceptance criteria — `GET /health` alone does not complete Phase 3

---

### What Agent-OS Does NOT Do (Out of Scope, Phases 1–3)

- **Authentication** — API routes are currently unauthenticated. Earlier drafts incorrectly marked JWT auth as complete — that was R3 v4 work. Auth is Phase 4+ scope.
- **LLM Integration** — no built-in model integration; agents bring their own LLM logic
- **Distributed Execution** — single-process only through Phase 3; multi-node is Phase 4+
- **Persistent Agent Memory** — no vector DB or long-term memory layer
- **Agent-to-Agent Communication** — no inter-agent messaging yet
- **Sandboxing** — assumes trusted tool implementations; no subprocess isolation yet

---

## Technical Architecture

### System Overview

```
Admin Dashboard (UI)       ──┐
Tool Registry              ──┤──► Dashboard Server (Express / TypeScript / tsx)
Agent Runtime              ──┘           │
Error Predictor (port 5001)              │
                                         ▼
                           @agent-os/lifecycle (9-state machine + events)
                                         │
                                         ▼
                                Database Layer (Drizzle ORM)
                          tools ✅   agents 📋   agent_events 📋
                          health_checks 🔜   tool_executions 🔜
                                         │
                                         ▼
                            better-sqlite3 ✅  (dev / current)
                            PostgreSQL    📋   (proposed for production — not built)
```

### Port Map

| Service | Port | Status |
|---------|------|--------|
| Vite frontend (dev) | 5173 | ✅ Active — proxies to port 5000 |
| Express API server | 5000 | ✅ Active |
| Error Predictor | 5001 | ✅ Active |

### Database Singleton — Critical Pattern

Always use `@agent-os/db` → `createDb()` as the shared DB singleton. Never instantiate `better-sqlite3` directly in other packages — doing so creates duplicate WAL connections and risks database corruption.

```typescript
// CORRECT
import { createDb } from '@agent-os/db';
const db = createDb();

// WRONG — never do this in dashboard or runtime packages
import Database from 'better-sqlite3';
const db = new Database('./dev.db');
```

### pnpm Workspace Structure

> Package names are confirmed. Internal file layouts are illustrative — verify against actual source.

```
Agent-OS/
├── pnpm-workspace.yaml
├── package.json (root)
├── packages/
│   ├── dag-compiler/          # build script STUBBED (see Known Issues)
│   ├── agent-os-runtime/      # core runtime engine
│   ├── @agent-os/db/          # shared DB singleton (createDb)
│   ├── @agent-os/lifecycle/   # 9-state lifecycle state machine + events
│   └── dashboard/             # Express server + client UI
└── migrations/                # Drizzle migration files
```

### Technology Stack

| Layer | Status | Notes |
|-------|--------|-------|
| Backend | ✅ Express, TypeScript, tsx | Hot-reload via tsx |
| Database (current) | ✅ Drizzle ORM, better-sqlite3 | Singleton via `@agent-os/db` → `createDb()` |
| Database (production) | 📋 PostgreSQL proposed | Not implemented |
| Runtime / tooling | ✅ Node.js v22, pnpm v11 | ChromeOS Penguin container (dev) |
| Frontend framework | ❓ Unconfirmed for Agent-OS | Custom CSS confirmed; React/Vite or other — verify in dashboard source |
| Query layer (frontend) | ✅ TanStack Query v5 | Typed; query invalidation on every mutation required |
| Streaming | ✅ SSE | `clientId` handshake confirmed |
| API style | ✅ REST (tools API) | tRPC not confirmed for Agent-OS |

---

## Roadmap

### M0: Tool Registry Bootstrap — ✅ Complete

- ✅ `GET /api/tools`, `POST /api/tools`, `DELETE /api/tools/:id`
- ✅ `tools` table DDL
- ✅ Seed script (4 built-in tools)

### Phase 0: Preflight — ✅ Complete

- ✅ Resolved `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`
- ✅ Fixed `pnpm-workspace.yaml` (literal string values, corrected exclusions)
- ✅ Patched `package.json` files for workspace dependencies
- ✅ Stubbed `dag-compiler` build script to prevent poisoning recursive builds

### Phase 1: Database & Migrations — ✅ Complete

- ✅ Drizzle ORM / migrations scaffold set up
- ✅ `better-sqlite3` wired via shared `createDb()` singleton

### Phase 2: Lifecycle Wiring — ✅ Complete

- ✅ `@agent-os/lifecycle` (9-state machine) implemented and wired
- ✅ Dashboard frontend pages wired to real API endpoints via TanStack Query v5
- ✅ SSE streaming active with `clientId` handshake
- ✅ `agentId` / `agent_id` schema mismatch resolved
- ✅ Four endpoint mismatches resolved
- 📋 Agent CRUD endpoints and `agent_events` table — reasonable next steps but not independently confirmed as already built; verify against actual source before assuming they exist

### Phase 3: Health Checks & Observability — 🔜 Not Started (Next Up)

**Acceptance criteria (none completed yet):**
- ⬜ Define health check metrics (database, runtime, tools, agents)
- ⬜ Create `health_checks` table via Drizzle migration
- ⬜ Implement `GET /health` returning structured JSON
- ⬜ Health aggregation logic (latency percentiles per tool; configurable thresholds)
- ⬜ Dashboard UI component displaying health metrics in real time
- ⬜ Alert on threshold breach (configurable thresholds — never hard-coded)
- ⬜ E2E test: health checks update on interval; alerts fire correctly
- ⬜ Frontend wiring verified: health data appears in UI without manual refresh

### Phase 4: Distributed Orchestration — 🔮 Future (proposed scope)

- Multi-node deployment (Kubernetes / Docker)
- Agent-to-agent messaging (message bus)
- Distributed health check aggregation
- Tool execution tracing
- Persistent agent memory
- Authentication & RBAC

---

## Data Model

### `tools` — ✅ Confirmed

```sql
id           TEXT PRIMARY KEY
name         TEXT NOT NULL
description  TEXT NOT NULL
input_schema JSON
output_schema JSON
created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### `agents` — 📋 Proposed (not independently confirmed as built)

> Verify actual column names in the Drizzle schema before writing any query against this table.

```sql
id            TEXT PRIMARY KEY
name          TEXT NOT NULL
config        JSON
state         TEXT  -- one of the 9 lifecycle states; verify exact values in @agent-os/lifecycle
created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
last_activity TIMESTAMP
```

### `agent_events` — 📋 Proposed

```sql
id         TEXT PRIMARY KEY
agent_id   TEXT NOT NULL REFERENCES agents(id)
event_type TEXT NOT NULL
details    JSON
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### `health_checks` — 🔜 Phase 3 (not built)

```sql
id         TEXT PRIMARY KEY
checked_at TIMESTAMP NOT NULL        -- when the health check actually ran
check_name TEXT NOT NULL
status     TEXT NOT NULL             -- 'pass' | 'fail' | 'warn'
details    JSON
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- when the row was inserted
```

> `checked_at` and `created_at` are intentionally separate: `checked_at` is the timestamp of the health check run (may be backfilled or batched); `created_at` is the DB insert time. Using a single `timestamp` column caused ambiguity — the rename makes the intent explicit.

### `tool_executions` — 🔜 Phase 3+ (not built)

> ⚠️ **Build order dependency:** `tool_executions` has a FK reference to `agents(id)`. The `agents` table is itself 📋 unconfirmed as built. Do not create this table or its migration until `agents` is confirmed and its migration has been applied — otherwise the FK constraint will fail at migration time.

```sql
id         TEXT PRIMARY KEY
agent_id   TEXT NOT NULL REFERENCES agents(id)  -- agents table must exist first
tool_id    TEXT NOT NULL REFERENCES tools(id)
input      JSON
output     JSON
error      TEXT  -- NULL on success
latency_ms INTEGER
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

---

## API Specification

> The Tools API is confirmed and built. Everything else is a proposed target design. JSON examples are illustrative, not measured data.

### Field Name Contract — Critical

The database uses `snake_case` column names. The frontend expects `camelCase`. This mismatch has caused bugs before (`agentId` vs `agent_id`). Every API response must consistently transform field names at the serialization boundary — pick one convention and enforce it in middleware or a shared serializer.

---

### Tool Registry API — ✅ Built

#### `GET /api/tools`
```json
{
  "tools": [
    {
      "id": "tool_openapi_fetch",
      "name": "OpenAPI Fetch",
      "description": "Fetch and parse OpenAPI specs",
      "inputSchema": { "type": "object" },
      "outputSchema": { "type": "object" },
      "createdAt": "2026-06-15T10:00:00Z"
    }
  ]
}
```

> ⚠️ **Field name casing:** The example above uses camelCase to match the Field Name Contract. The actual M0 implementation may return snake_case (`input_schema`, `created_at`). **Verify the live response** before building any frontend consumer — if the tools API returns snake_case, add a normalizer at the serialization boundary rather than letting the mismatch reach the UI.

#### `POST /api/tools`
Request: `{ "name": "...", "description": "...", "input_schema": {...}, "output_schema": {...} }`
Response: `201 Created` + tool object

#### `DELETE /api/tools/:id`
Response: `204 No Content` or `404 Not Found`

---

### Agent Lifecycle API — 📋 Proposed Target Design

#### `GET /api/agents`
```json
{
  "agents": [
    {
      "id": "agent_123",
      "name": "DocumentAnalyzer",
      "state": "active",
      "config": {},
      "createdAt": "2026-06-15T10:00:00Z",
      "lastActivity": "2026-06-15T10:04:00Z"
    }
  ]
}
```

#### `POST /api/agents`
Request: `{ "name": "...", "config": {...} }`
Response: `201 Created` + agent object

#### `POST /api/agents/:id/pause`
#### `POST /api/agents/:id/resume`
#### `POST /api/agents/:id/terminate`
State transitions delegated to `@agent-os/lifecycle`. Verify that the transition is valid for the agent's current state before calling — invalid transitions should return `409 Conflict`, not `500`.

---

### Health Check API — 🔜 Phase 3 (proposed)

#### `GET /health`
```json
{
  "status": "healthy",
  "timestamp": "2026-06-15T10:05:00Z",
  "checks": {
    "database": { "status": "pass", "latency_ms": 2 },
    "runtime": {
      "status": "pass",
      "details": { "active_agents": 3 }
    },
    "tools": {
      "tool_openapi_fetch": { "status": "pass", "success_rate": 0.98 }
    }
  }
}
```

All threshold values (e.g., latency budget, success rate floor) must come from configuration, not be hard-coded.

---

## Non-Functional Requirements

> 📋 All performance targets below are proposed goals, not measured results. Nothing has been benchmarked yet.

### Performance (proposed targets)

- Tool registry queries: < 50ms
- Agent state transitions: < 100ms
- Health check aggregation: < 1s
- Dashboard initial load: < 3s

### Reliability

- No data loss on migration rollback
- No orphaned agents or hanging tasks
- No corruption under concurrent tool registry reads/writes
- DB singleton pattern enforced — no duplicate WAL connections

### Scalability (proposed)

- Single-node through Phase 3; multi-node from Phase 4

### Observability

- Structured logging exists conceptually; tracing and metrics are Phase 3+/4 work

### Security — 🔜 Phase 4+ Scope

- ⬜ Authentication on API routes — not currently implemented
- ⬜ HTTPS/TLS in production
- ⬜ Tool input/output sanitization
- ⬜ RBAC for agents
- ⬜ Subprocess sandboxing for untrusted tools

---

## Known Issues & Constraints

### Active

1. **`dag-compiler` build stub:** the package's build script is stubbed to prevent it from poisoning recursive monorepo builds. No permanent fix is scheduled.
2. **Single-node only:** no distributed scheduling through Phase 3.
3. **Storage:** `better-sqlite3` only in dev/current. PostgreSQL for production is proposed, not built.
4. **No authentication:** all API routes are currently open. Do not expose to untrusted networks until Phase 4 auth is implemented.
5. **Tool execution errors lack context:** input/output truncation handling is TBD.

### Technical Debt

- No integration tests between lifecycle package and dashboard API yet — gap to close before Phase 3 ships
- Agent CRUD endpoints and `agent_events` table need to be verified or built as part of Phase 3 groundwork
- Field name casing (snake_case vs camelCase) must be consistently handled at the API serialization layer — unaddressed divergence here has caused bugs and will cause more

---

## Frontend Upgrade Protocol

This section exists because future work must never break the UI silently. Follow this checklist for every backend change:

1. **Schema change** → update Drizzle schema, run migration, verify no column name regressions in API responses
2. **New endpoint** → add corresponding TanStack Query hook with typed interface; wire it into the correct page
3. **Renamed/removed endpoint** → update all frontend query calls; remove stale hooks
4. **New page** → register in `App.tsx`; wire to a real endpoint before merging; never ship with placeholder data
5. **Any change** → run `pnpm tsc --noEmit` to zero-error gate; visually verify the affected page(s) in the browser

---

## Success Criteria

### Phase 3 Completion

- Zero TypeScript errors
- All Phase 3 acceptance criteria shipped (see Roadmap)
- E2E tests: health checks update on interval; alerts fire on threshold breach
- Health dashboard component live and displaying real data without manual refresh
- At least one real task orchestrated end-to-end on the health-monitored system

### Longer-Term (illustrative, not scheduled)

- Phase 4 planning begun after Phase 3 is stable
- Agent task dispatch latency defined, measured, and tracked
- Auth layer designed and scoped before any external exposure

---

## Appendix A: Quick Start

> 📋 Illustrative — verify exact script names against actual `package.json` before running.

```bash
cd ~/Agent-OS
pnpm install
pnpm run dev      # verify this script name in root package.json
```

### Environment Variables (illustrative)

```
DATABASE_URL=file:./dev.db
NODE_ENV=development
PORT=5000
ERROR_PREDICTOR_PORT=5001
```

### Verification Commands

```bash
pnpm tsc --noEmit                  # WIRE protocol — must return zero errors
pnpm --filter dashboard test       # adjust filter to exact package name
pnpm --filter @agent-os/lifecycle test
```

---

## Appendix B: Long-Term Speculative Vision

> **Status: Conceptual only.** None of the systems described here exist in the codebase. This is a parking lot for ideas to revisit once Phases 0–4 are built and stable.

Earlier brainstorming sessions framed Agent-OS's long-term identity as a "distributed cognitive operating system" — a kernel (scheduling, tool execution, state sync — roughly what Phases 0–4 build) with speculative layers above it:

- **Cognitive architecture layer** — planner / strategist / executor / critic / verifier loop
- **Procedural memory** — storing learned capabilities and execution patterns
- **Training infrastructure** — simulated environments and benchmark-driven evaluation
- **Meta-learning layer** — agents analyzing and rewriting their own reasoning strategies
- **Agent education tiers** — apprentice → operator → specialist → architect → autonomous researcher
- **Collective intelligence** — shared memory and skill exchange across agent instances
- **Evolution infrastructure** — population-based mutation and selection of agent reasoning style

**Why this is flagged rather than adopted as roadmap:**

1. Scope mismatch — Phase 3 of the real PRD is a health-check endpoint; the speculative "Phase 3" above is an agent training simulator with reward engines. These are not the same altitude.
2. Safety surface — autonomous architecture mutation and recursive self-improvement require a rigorous safety and containment case before any implementation.
3. Unverified infrastructure assumptions — earlier source material assumed sandbox, container execution, distributed coordination, and auth layers "already exist." Per actual project history, none of them do.

If any of these ideas are pursued, start from a scoped PRD written against the actual codebase at that time.

---

## Sign-Off

**Document Owner:** Ty
**Version:** 1.2
**Review Cycle:** Sync with code progress after each phase
**Last Reviewed:** June 2026
**Next Step:** Begin Phase 3 — design the `health_checks` Drizzle schema, implement `GET /health`, and build the dashboard health component.

---

*End of document.*
