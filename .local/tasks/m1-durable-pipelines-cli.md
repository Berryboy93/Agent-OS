# M1 — Durable Pipelines + CLI Alpha

## What & Why
Deliver the `@agent-os/sdk` developer surface (`defineAgent`, `defineTool`, `definePipeline`), a full `PipelineEngine` with all v1 step types, durable WAITING state (`ApprovalStep` + `DelayStep`), approval infrastructure (API + dashboard queue + webhook notifier), and a complete `agos` CLI so developers can go from `agos new agent` to `agos run` to `agos logs` without leaving the terminal. Builds directly on the M0 worker-thread runtime and BullMQ scheduler.

## Done looks like
- A pipeline with 3+ steps survives a process restart and resumes from the last committed step boundary
- `ApprovalStep` suspends the pipeline, releases the worker slot, fires a webhook, and resumes the pipeline when the approval API is called
- `DelayStep` with a 10-second delay survives a process restart and fires at the correct time via BullMQ
- `agos replay run <id>` replays deterministically using stored tool results (mock mode default); `--allow-side-effects` executes idempotent tools live
- `agos doctor` validates all checks listed in §25.3 and exits with code 1 on any failure
- `agos run agent <id> --input <file>` executes an agent end-to-end
- Integration tests cover all v1 step types; CI passes

## Out of scope
- `EventWaitStep` — v2 ROADMAP
- Railway/Docker deployment targets — M2
- OpenTelemetry instrumentation — M2
- Dashboard Deployment and Approvals views (full polish) — M2
- `agos benchmark`, `agos trace`, `agos export events` — M2
- Reactive Agents, Long-Lived Agents — v2 ROADMAP

## Steps

1. **`@agent-os/sdk` package** — Implement `defineAgent`, `defineTool`, `definePipeline` factory functions. `AgentContext` must expose `ctx.memory` (all three tiers), `ctx.results[stepId]`, `ctx.emit()`, `ctx.tokenUsage`, and `ctx.correlationId`. Tool definitions enforce `inputSchema` (Zod), `outputSchema`, `sideEffects[]`, `idempotent`, optional `timeoutMs` and `retryPolicy`. Pipeline definitions accept the full v1 step taxonomy.

2. **`PipelineEngine` — core orchestration** — Implement `AgentStep`, `ParallelStep`, `ConditionalStep`, `LoopStep` (with `maxIterations` and `timeBudgetMs` per OD-11 resolution → option B), `TransformStep`, and `HandoffStep`. Each step commits a checkpoint before marking itself complete (four-phase commit from M0). Context propagation: each step receives `ctx.results[stepId]` for all prior completed steps; context is immutable between steps.

3. **WAITING state — `ApprovalStep` and `DelayStep`** — On entering WAITING, the runtime must: serialize execution context to checkpoint, persist to DB, transition BullMQ job to delayed/waiting, release worker thread slot, emit `execution.waiting` event. On resume: load last checkpoint, re-assign worker, emit `execution.resuming`, continue from last committed boundary. `ApprovalStep` suspends on the `agent-os:approvals` queue; `DelayStep` uses BullMQ delayed jobs on `agent-os:delayed`.

4. **Approval infrastructure** — Implement `POST /api/approvals/:id/resolve` (accept/reject with audit note) and `GET /api/approvals` (pending list) on the dashboard server. Persist `ApprovalRequest` records (§30.3). Webhook notifier: on new approval request, POST context payload (redacted) to configured webhook URL. On expiry (default 72 h): set status `EXPIRED`, emit `approval.expired`, fail the pipeline step with `APPROVAL_EXPIRED`. Add dashboard Approvals Queue view (pending items, accept/reject UI, expiry countdown, history).

5. **Full `agos` CLI** — Implement the complete M1 command set from §25.1: `agos init`, `agos new agent|pipeline|adapter`, `agos run agent|pipeline`, `agos test agent|pipeline`, `agos list agents|pipelines`, `agos logs`, `agos inspect run|events`, `agos validate config`, `agos doctor` (full §25.3 checklist including Redis ping, PostgreSQL connection test, BullMQ queue health, migration status, `SECURITY.md` presence, `REVISIT_BY` date check). All output human-readable by default; `--json` flag for machine-readable. Errors to stderr, exit code 1.

6. **`agos replay` command** — Mock mode default: replay stored LLM responses and tool results from the event log, no network calls. `--allow-side-effects`: execute idempotent tools live, mock non-idempotent. `--force-live`: execute all tools live with confirmation prompt. `--dry-run`: print replay plan without executing. Tag all replay runs as `REPLAY` in the run record.

7. **`agent-os.config.ts` resolution** — Implement config file discovery and loading (project root → `agent-os.config.ts`). Zod schema validates all required env vars on startup; descriptive error messages on validation failure. Expose `TokenBudgetPolicy` defaults (§22.2); reject `TokenBudgetPolicy.unlimited()` in non-dev environments.

8. **Agent memory + Pipeline memory** — Extend `@agent-os/memory` with Agent memory and Pipeline memory tiers (PostgreSQL-backed, transactional writes, `agentId` and `pipelineRunId` scope keys per §17.1). Wire into `AgentContext`.

9. **Integration test suite** — Vitest integration tests covering: all v1 step types, `ApprovalStep` suspend/resume, `DelayStep` timing, crash recovery (simulate process kill mid-pipeline, restart, verify resume), `agos replay` mock vs. live mode, token budget enforcement, cancellation propagation.

## Relevant files
- `packages/runtime/src/agent-runner.ts`
- `packages/runtime/src/event-bus.ts`
- `packages/db/src/schema.ts`
- `packages/cli/src/index.ts`
- `apps/dashboard/server.js`
- `apps/dashboard/src/App.tsx`
