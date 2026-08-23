# M2 — Production Deployment + Observability

## What & Why
Deliver the `@agent-os/deploy` package (Local, Railway, Docker targets), versioned deployment records with rollback, the `@agent-os/telemetry` package (OpenTelemetry traces + metrics for all boundaries in §33.2), expanded dashboard views (Agent Detail, Pipeline Detail, Deployments, full Approvals), and the remaining observability CLI commands (`agos trace`, `agos benchmark`, `agos export events`, `agos profile pipeline`). Enables the first production deploy to Railway with a documented rollback path.

## Done looks like
- `agos deploy --target railway` completes, health probe on `/health` returns 200, a new `ACTIVE` Deployment record is written, and the prior record is set `INACTIVE`
- `agos deploy --target railway --dry-run` prints the deploy plan and makes zero changes
- `agos rollback <deploymentId>` restores the prior code deployment; the new run record has `rollbackOf` populated
- `agos trace <runId>` prints an OpenTelemetry trace tree for a completed run
- OTel spans appear in the dev console exporter for a full pipeline run covering all boundaries in §33.2
- Dashboard renders live events for a running agent and shows token usage, step timelines, and deployment history
- The pre-migration backup script produces a valid `pg_dump` file before any migration applies
- All M2 features carry correct status-taxonomy labels in UI and docs

## Out of scope
- Kubernetes deployment — v2 ROADMAP
- Edge runtime — v3 ROADMAP
- gRPC transport — v2 ROADMAP
- Slack/email approval notifications — v2 ROADMAP
- Remote registry sync — v2 ROADMAP (dependent on OD-01 resolution)
- Vector memory / pgvector — v2 ROADMAP
- Load / chaos tests — M3

## Steps

1. **`@agent-os/deploy` package** — Implement three deployment targets: Local (process spawn, health probe loop), Railway (full §27.5 flow: validate tokens, TSC gate, `npm audit`, esbuild bundle, Dockerfile check, `railway up`, health poll, Deployment record write), Docker (build image, write `imageDigest` to Deployment record). All targets support `--dry-run` (print plan, no execution). Deployment records follow the `Deployment` interface (§27.4) including `rollbackOf`, `status`, and `imageDigest`.

2. **Rollback CLI + API** — `agos rollback <deploymentId>` calls the deploy target's rollback mechanism (re-activate prior image/version), writes a new Deployment record with `rollbackOf` set, marks the current `ACTIVE` record `INACTIVE`. `POST /api/deployments/:id/rollback` exposes this via the dashboard server. Schema is forward-only — no DB schema rollback ever executes.

3. **`@agent-os/telemetry` package** — OpenTelemetry SDK integration with OTLP exporter (console in dev, configurable endpoint in prod). Instrument all required trace boundaries (§33.2): agent execution root span, pipeline step child spans, tool call + response, provider API request, queue dispatch/dequeue, DB operations, approval request/resolution. Emit all required metrics (§33.3): `agent_os.execution.duration`, `agent_os.tokens.used`, `agent_os.tool.calls`, `agent_os.queue.depth`, `agent_os.worker.utilization`, `agent_os.budget.exceeded`, `agent_os.approval.pending`. Telemetry hooks into runtime via instrumentation — no reverse dependency on `telemetry` from `runtime`.

4. **Observability CLI commands** — `agos trace <runId>` reconstructs and prints the OTel trace tree for a run from the event store. `agos benchmark agent <agentId> --iterations N --input <file>` runs N sequential executions and reports p50/p95/p99 latency and token cost. `agos export events --runId --from --to --format json|csv` streams events from the event store to stdout or file. `agos profile pipeline <pipelineId>` prints token + latency breakdown by step across recent runs.

5. **Dashboard — Agent Detail view** — Per-agent run history table (paginated), per-run event timeline (expandable), token usage chart over time (`recharts`), error breakdown, budget utilization per run. Resolve OD-04 (pipeline graph visualization library selection).

6. **Dashboard — Pipeline Detail view** — Static pipeline structure visualization (step graph), step-level status per run, parallel step Gantt chart, checkpoint history table.

7. **Dashboard — Deployments view** — Deployment history table (version, target, status, deployed by, timestamp), version diff between consecutive deployments, one-click rollback button (calls `POST /api/deployments/:id/rollback`), deployment health status badge. All write endpoints protected by `Authorization: Bearer $DASHBOARD_SECRET`.

8. **Pre-migration backup script** — Shell script (`scripts/backup-before-migrate.sh`) that runs `pg_dump` to a timestamped file, records the path to the migration changelog (`packages/agent-os/migrations/CHANGELOG.md`), and exits non-zero if the dump fails. Wire into the Railway deploy flow (step 1) so it runs before any `drizzle-kit migrate` invocation.

9. **Registry system** — Implement local filesystem registry (`registry/agents/`, `registry/pipelines/`, `registry/manifest.json`) with `RegistryEntry` schema (§23.3) including SHA-256 checksum. Wire `agos list agents|pipelines` to read from registry. Resolve OD-01 (confirm v1 ships local-only; annotate remote registry as v2 ROADMAP).

## Relevant files
- `packages/cli/src/index.ts`
- `packages/db/src/schema.ts`
- `apps/dashboard/server.js`
- `apps/dashboard/src/App.tsx`
