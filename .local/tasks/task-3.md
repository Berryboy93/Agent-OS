---
title: M0 — Foundation Runtime
---
# M0 — Foundation Runtime

## What & Why
Restructure the existing Agent-OS codebase to match the PRD v3.0 package layout and implement all M0-required infrastructure: new package scaffolding inside `packages/agent-os/`, BullMQ + Redis scheduler, worker-thread execution model, append-only EventStore with five-stage secret redaction, full PostgreSQL/SQLite Drizzle schema, crash-recovery via checkpoints, and a baseline CI configuration. The current runtime uses `p-limit` and in-process execution — this milestone replaces it with the worker-thread + BullMQ hybrid model specified in §12.

## Done looks like
- `tsc --noEmit` from monorepo root returns zero errors
- One agent executes end-to-end; events appear in the EventStore
- Token budget enforcement terminates execution with `BUDGET_EXCEEDED` when the limit is hit
- SSE stream delivers live events to a connected client
- Checkpoints persist to the DB after each step boundary (four-phase commit)
- After a simulated process crash the runtime restores from the last checkpoint and resumes
- `SECURITY.md` is present at the project root and `agos doctor` does not flag it missing
- CI baseline (TSC, ESLint, `npm audit --audit-level=high`, secret scan) passes on a clean commit

## Out of scope
- `@agent-os/sdk` (`defineAgent`, `defineTool`, `definePipeline`) — M1
- PipelineEngine and step types — M1
- Full CLI command set beyond basic `doctor` update — M1
- Deployment targets (Railway, Docker) — M2
- OpenTelemetry instrumentation — M2
- Load / chaos tests — M3

## Steps

1. **Monorepo restructure** — Create the `packages/agent-os/` workspace root with its own `package.json`, `tsconfig.json` (`strict: true`, `noUncheckedIndexedAccess: true`, `composite: true`), and subdirectories for all v1 packages. Update `pnpm-workspace.yaml` to include `packages/agent-os/packages/*` and `packages/agent-os/apps/*`. Migrate existing package source into the new layout (rename old `packages/core` → `packages/agent-os/packages/core`, etc.).

2. **`@agent-os/core` update** — Align `packages/core/src/` to the PRD v3.0 type definitions: full `BaseAdapter` abstract class (§6.2), complete `AgentError` union (§31.1), `AgentEvent` / `AgentEventType` taxonomy (§20.2–20.3), `AgentRun`, `PipelineRun`, `AgentResult`, `StreamEvent`, `TokenBudgetPolicy`, `RetryPolicy`, `ToolDefinition` with `sideEffects` + `idempotent` fields, `ExecutionCheckpoint`, and `Deployment` interfaces.

3. **`@agent-os/adapters` expansion** — Add `OpenAIAdapter` (supports `baseURL` override for Azure/Groq/Together) and `LocalAdapter` (OpenAI-compatible endpoint, default `http://localhost:11434`) alongside the existing `AnthropicAdapter`. All three must implement `BaseAdapter.stream()` and the `supports()` feature check.

4. **`@agent-os/events` package** — Create the append-only `EventStore` backed by Drizzle (SQLite dev / PostgreSQL prod). Implement the five-stage secret redaction pipeline (§21): pattern scanner regex block-list, schema-annotated scrubber, entropy-based credential detector, PII structural detection, audit sanitizer. Every event's `data` field passes all five stages synchronously before persistence; failures set `redaction_incomplete: true` rather than blocking.

5. **`@agent-os/scheduler` package** — BullMQ integration with the five queue definitions from §24.2 (`agent-os:executions`, `agent-os:delayed`, `agent-os:approvals`, `agent-os:replay`, `agent-os:cleanup`). Worker pool bootstrap with FIFO + priority scheduling. Backpressure: API returns `202 Accepted` immediately; clients poll or subscribe via SSE.

6. **`@agent-os/runtime` rewrite** — Replace `p-limit`-based in-process execution with the worker-thread model (§35). Each `AgentRunner.run()` spawns a Worker with `resourceLimits` (512 MB old-gen, 128 MB young-gen). Implement the four-phase step-commit sequence (§18.2): write AgentEvent → persist ExecutionCheckpoint → commit AgentState → ACK BullMQ job. Implement crash recovery on startup (§18.3): scan `agent_runs` for `RUNNING`/`RESUMING` rows, load last valid checkpoint, re-enqueue to BullMQ. Token budget enforcement with `budget.warning` + `budget.exceeded` events remains from existing `TokenTracker`.

7. **`@agent-os/memory` package** — Execution memory (in-process `Map`, scoped by `runId`) and Session memory (Redis `SET` with configurable TTL, default 24 h). Expose the `ctx.memory` access API surface defined in §17.3.

8. **Drizzle schema and migrations** — Add all missing tables to `packages/db/src/schema.ts`: `pipeline_runs`, `execution_checkpoints`, `agent_state`, `pipeline_state`, `approval_requests`, `registry_entries`. Generate and apply the initial migration. Maintain SQLite dev parity via Drizzle ORM.

9. **`apps/dashboard-server` baseline** — Update the Express server to read from the new schema; wire the SSE `/events` endpoint to Redis pub/sub fan-out (§19). Keep existing REST endpoints (`/api/agents`, `/api/runs`, `/api/runs/:runId/events`) aligned with the new event store.

10. **`SECURITY.md` and CI baseline** — Add `SECURITY.md` at the project root with the audit surface manifest (§44.2). Configure CI to run: `tsc --noEmit`, ESLint with `@typescript-eslint/no-explicit-any` + `ban-types`, `npm audit --audit-level=high`, and secret scanning. Update `agos doctor` to check for `SECURITY.md` presence.

## Relevant files
- `packages/core/src/types.ts`
- `packages/core/src/errors.ts`
- `packages/core/src/index.ts`
- `packages/runtime/src/agent-runner.ts`
- `packages/runtime/src/event-bus.ts`
- `packages/runtime/src/token-tracker.ts`
- `packages/adapters/src/base.ts`
- `packages/adapters/src/anthropic.ts`
- `packages/db/src/schema.ts`
- `packages/db/src/client.ts`
- `packages/cli/src/index.ts`
- `apps/dashboard/server.js`
- `apps/dashboard/src/App.tsx`
- `pnpm-workspace.yaml`