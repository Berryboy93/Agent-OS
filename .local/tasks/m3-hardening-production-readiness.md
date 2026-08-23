# M3 — Hardening + Production Readiness

## What & Why
Make Agent-OS production-ready for internal use within Agi-Suite. This milestone covers: load testing to the 500 concurrent agents target, chaos testing of crash recovery and Redis/PostgreSQL failure modes, a complete security test suite, full JSDoc on all public SDK surfaces, and a populated `SECURITY.md`. No new features — this milestone is exclusively about verification, documentation, and fixing regressions found during testing.

## Done looks like
- Load test: 500 concurrent agent executions complete without queue starvation or OOM crashes
- Chaos test: worker crash recovery succeeds for all in-flight executions; Redis unavailability degrades gracefully; PostgreSQL failure triggers correct error paths
- Zero high-severity `npm audit` findings
- All public SDK types have JSDoc comments
- `agos doctor` exits 0 on a correctly configured Railway environment
- `tsc --noEmit` from the monorepo root: zero errors
- All features in code carry the correct status taxonomy label (`IMPLEMENTED`, `ALPHA`, `ROADMAP`, `PARKING`, `DEPRECATED`)
- `SECURITY.md` fully populated for all v1 audit surfaces with `REVISIT_BY` dates; no expired dates
- Review confirms nothing labeled v1 is unimplemented — any gaps are labeled `ALPHA` or promoted to ROADMAP

## Out of scope
- New features of any kind
- v2 ROADMAP items
- External deployment (Kubernetes, edge)

## Steps

1. **Load testing** — Write k6 (or artillery) load test script that ramps to 500 concurrent agent executions against the local runtime. Measure: queue depth, worker utilization, p95 execution overhead, OOM events. Fix any bottlenecks or resource leaks discovered. Target: all §38 v1 scalability metrics pass.

2. **Chaos testing** — Write automated chaos tests using Vitest + process manipulation: (a) kill the runtime mid-pipeline and restart — verify resume from last checkpoint; (b) make Redis unavailable — verify graceful degradation for session memory and BullMQ; (c) make PostgreSQL unavailable during a checkpoint write — verify the step is not marked complete and retried on restart. Document all failure modes.

3. **Security test suite** — Vitest tests covering: token budget hard stop (`BUDGET_EXCEEDED`), all five redaction pipeline stages (pattern, schema-annotated, entropy, PII, audit), approval expiry (`APPROVAL_EXPIRED` error + event), cancellation propagation (downward through orchestration tree, no completed-step rollback), side-effect undeclared detection (warn dev / strict block). All tests must pass in CI.

4. **Performance profiling and regression fixes** — Profile the full pipeline execution path against §37 targets: warm execution overhead <100ms, cold worker startup <2s, queue dispatch latency <50ms, event persistence <25ms, SSE delivery <100ms, dashboard page load <500ms. Identify and fix any regressions. Document final measured values.

5. **JSDoc and public API documentation** — Add JSDoc comments to all exported symbols in `@agent-os/core`, `@agent-os/sdk`, `@agent-os/runtime`, `@agent-os/events`, `@agent-os/memory`, `@agent-os/scheduler`, `@agent-os/adapters/*`, `@agent-os/deploy`, `@agent-os/telemetry`, and `@agent-os/cli`. No implementation changes — documentation only.

6. **README and Getting Started guide** — Write a root `README.md` for the `packages/agent-os/` workspace covering: installation, prerequisites (`ANTHROPIC_API_KEY`, Redis, PostgreSQL), running `agos init`, defining an agent, running `agos run agent`, viewing the dashboard. Write a `docs/getting-started.md` with a full walkthrough from scaffold to dashboard observation.

7. **`SECURITY.md` full population** — Fill in all audit surface rows in `SECURITY.md` (auth, session, ORM, crypto, regex, native deps — each labeled `audited / partial / not-audited`). Assign owners, add `REVISIT_BY` dates for all deferred findings. Verify `agos doctor` passes the `REVISIT_BY` check (no expired dates).

8. **Final PRD compliance review** — Audit every v1 feature in the PRD against actual implementation. Any feature labeled v1 that is not fully implemented must either be completed or downgraded to `ALPHA` with a documented gap. Update status taxonomy labels in all code comments and CLI output. Verify all ROADMAP annotations are present for v2+ items.

## Relevant files
- `packages/core/src/types.ts`
- `packages/core/src/errors.ts`
- `packages/cli/src/index.ts`
- `apps/dashboard/server.js`
- `apps/dashboard/src/App.tsx`
