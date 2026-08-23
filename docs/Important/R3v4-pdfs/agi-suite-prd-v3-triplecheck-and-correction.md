# AGI Suite PRD v3.0 — Triple-Check + Corrected Architecture Resolution

**Document type:** PRD audit + correction to prior gap analysis
**Sources:** `PRD.md` (v2.0, 2026-04-18), `PRD_v3.md` (v3.0, 2026-04-18, supersedes v2.0)
**Method:** Full read of both PRDs; cross-checked v3 against v2 for drift; cross-checked v3 against my prior gap analysis (which was based on inference from chat fragments, not ground truth)
**Date:** 2026-04-30

---

## Part 0 — Reading the Room: I Got It Wrong

Before triple-checking the PRD, I owe you a correction on what I wrote yesterday in the gap analysis. With ground truth in hand, three of my four expert inferences were off in important ways:

| Question | What I said | Ground truth from PRDs |
|---|---|---|
| Q2: LLM-driven component in AGI Suite today? | "~95% confident: No. RHOS is the closest thing." | **Wrong.** `AgentSuitePanel` + `POST /api/agent/chat` is shipped in v2 as a streaming Claude Sonnet chat. It IS LLM-driven, today. It's not yet *autonomous* (no tool use), but it's present. |
| Q3: `install-policy-engine.sh` = systemd as root? | "~80% systemd, ~70% root. Treat as root regardless." | **Indeterminate.** The "Policy Engine" referenced in v3 (FR-027) is a **TypeScript** module in the L5 governance layer — not the bash RHOS scripts. **RHOS is not in either AGI Suite PRD.** Either it's a separate subsystem on Penguin, or it's deprecated, or it's something else entirely. My analysis was reasoning about a different thing than what the PRD describes. |
| Q4: AGI Suite writes to a database? | "~98% confident: No. Pure read + in-memory." | **Wrong.** AGI Suite has its own PostgreSQL via Drizzle ORM. v2 §12 plans `metrics_kv`, `metrics_events`, `conversations`, `messages`. v3 §11 mandates DB persistence for all stateful AI components — twelve tables across Phases 2–6. Current state is "DB present, totalSubscribers not yet persisted, hence the reset-on-deploy bug." |

**Q1 (r3agent.py)** stands as written: it's not in either PRD, so it's external dev tooling. The threat-model framing (SSH = full home-dir access regardless of intended scope) is unaffected.

**What this means:** the PRDs are far more sophisticated than I had room to infer from chat snippets. The architecture is closer to my agent OS PRD spec than I gave it credit for. The gap analysis in Part 5 below is the corrected version. The retrofit plan in the prior file (P0 fix `|| true`, P1 JSONL log, etc.) was about RHOS, which is **not the AGI Suite product** — that plan is still useful for whatever RHOS is, but it's not the answer to "use the agent OS PRD for the AGI Suite." Those are two different systems.

The substantive correction matters more than the apology. I'll be direct about what's actually in scope below.

---

## Part 1 — Triple-Check of PRD v3.0

### Methodology

Read v3.0 end-to-end (1300+ lines source). Cross-checked every internal reference (FR↔FR, table↔code, schema↔requirement). Compared every section against v2.0 for drift. Tagged each finding by severity: BLOCKER (fix before adoption), HIGH (fix before phase ships), MEDIUM (fix before next revision), LOW (cosmetic).

**Up front credit:** v3.0 includes a self-audit table at the top (23 issues from the upgrade source resolved). That's unusual and good. The PRD already shows the discipline of a triple-check pass. The findings below are second-order — issues the self-audit didn't catch, or new ones introduced by v3's own additions.

### Severity summary

| Severity | Count | Meaning |
|---|---|---|
| BLOCKER | 0 | None — the PRD is shippable |
| HIGH | 3 | Will cause implementation failure or genuine ambiguity at build time |
| MEDIUM | 9 | Spec gaps that will need resolution before code, but are catchable |
| LOW | 5 | Cosmetic / version-tracking |

### Findings

**F1 [HIGH] FR-016 SSE auth via `Authorization` header is browser-incompatible without a polyfill — PRD doesn't say which library.**

v2 FR-016: "SSE connections include token as **query parameter** or custom header"
v3 FR-016: "SSE connections pass token as **`Authorization` header** on the initial request"

The native browser `EventSource` API does not allow custom headers on the request. This is a long-standing limitation. v3's spec works only with a fetch-based SSE polyfill (e.g., `@microsoft/fetch-event-source`). The PRD doesn't specify a library. An engineer reading v3 in isolation will write code against native `EventSource`, find that `Authorization` header can't be set, and have to either reach back to the v2 query-param approach or pull in a polyfill. Either way, v3 is wrong as written.

**Fix:** either revert to "query parameter or custom header (polyfill required)" or explicitly name the polyfill (`@microsoft/fetch-event-source` is the standard choice; treats SSE as a fetch with `text/event-stream` parsing).

Bonus: token-as-query-parameter has its own issue — it gets logged in access logs. If you choose query-param, also specify "redacted from access logs" as an NFR.

**F2 [HIGH] FR-031 Simulation Engine for `write_file` / `apply_patch` doesn't actually simulate.**

PRD: "Apply changes in a temp copy of the file, run `pnpm typecheck --noEmit` on it"

`pnpm typecheck --noEmit` runs `tsc --noEmit` against the project, using the project's `tsconfig.json` to resolve files. The compiler reads from the actual workspace, not the temp copy. So:
- If you apply the patch to a temp copy of *just the file*, `tsc` still reads the original from the workspace and ignores your temp copy.
- If you apply to the workspace and run `tsc`, you've defeated simulation.

The right approach: copy the *workspace* (or the relevant package) to a temp directory, apply the patch in temp, run `pnpm --dir temp-workspace typecheck --noEmit`. That's a real isolation. The PRD's wording suggests file-level temp swap, which doesn't work.

**Fix:** restate as "copy the affected package's source tree to a temp directory, apply the patch in the temp tree, run `pnpm --dir <temp> typecheck --noEmit`. The original tree is never touched."

For larger codebases this becomes expensive (copying node_modules etc.). The standard optimization is `cp -al` (hardlink copies) or a git worktree (`git worktree add /tmp/sim HEAD`). Worth naming an approach.

**F3 [HIGH] FR-031 Simulation for `run_migration`: `drizzle-kit generate --check` does not simulate running a migration.**

`drizzle-kit generate --check` checks whether the schema and migrations agree — i.e., whether you'd need to generate a new migration to reflect the current schema. It does not simulate applying a migration to a database. To simulate that, you need a temporary database (or a transaction that's rolled back) and run the migration there.

This finding matters because the PRD's stated "accept condition" is "No generation errors," which a `--check` could pass while the underlying migration still has DDL bugs.

**Fix:** either rename the simulation to "schema/migration consistency check" (which is what `--check` actually does) and accept that it's not a runtime simulation, or specify a real simulation against a temp Postgres (e.g., `pg_tmp` or a Railway preview environment) with rollback.

### Medium findings

**F4 [MEDIUM] §12 Phase 5 and Phase 6 schemas are elided as placeholders.**

```typescript
export const evolutionLogs = pgTable("evolution_logs", {
  /* see FR-034 */
});
```

A reader who jumps to §12 to copy-paste the schema gets nothing. Each FR contains the full schema, so the spec is not lost — but §12 is the data model section and it's the natural place to look. **Fix:** inline the schema bodies in §12 (duplicated from FR sections) or state explicitly at the top of §12 "see FR-NNN for full schema definition."

**F5 [MEDIUM] FR-019 scope drop from v2 to v3 unexplained.**

v2 FR-019 covered four packages: `lib/api-zod` (P0), `lib/api-client-react` (P1), `lib/db` (P1), `apps/api-server` (P2).
v3 FR-019 covers only `lib/api-zod`.

The other three reappear in §12 release-phase tables under Phase 3 ("Test coverage for `lib/db` and `api-server`"). Probably intentional — v3 staged the work across phases — but unacknowledged. A reader assumes the drop is regression rather than re-staging. **Fix:** in v3 FR-019, add a one-line note: "v2's broader test coverage is restaged across Phase 2 (api-zod) and Phase 3 (api-client-react, lib/db, api-server)."

**F6 [MEDIUM] FR-024 Drift Detection thresholds undefined for "prior period."**

"Error rate increases > 50% vs. prior period" — what counts as the prior period? Previous deploy? Previous 24h? Previous hour? Previous 7-day rolling window? Without anchor, "increase > 50%" is unimplementable.

**Fix:** define the comparison window per metric. Reasonable defaults: error rate vs. previous 1h; build time vs. 7-day rolling average (which the PRD already names elsewhere); test pass rate vs. previous deploy.

**F7 [MEDIUM] FR-023 health score composite undefined for null components.**

```typescript
components: {
  typecheck: number;
  testPassRate: number | null;       // null if no test files exist yet
  buildSuccess: number;
  errorRate: number;
  agentSuccessRate: number | null;   // null until Phase 4 agent actions exist
}
```

How does the score (0–100 weighted composite) handle the nullable components? Weighted average of non-nulls? Treat nulls as 0? Treat nulls as 100? Each of these gives different early-phase behavior. If null-as-0, Phase 2 systems start at ~60 (3/5 components). If null-as-100, they start at 100. This drives FR-027's `no-write-degrading-health` policy ("block file writes when systemHealthScore < 60") — getting it wrong either blocks all writes from day 1 or never blocks anything until Phase 5.

**Fix:** specify the aggregation. Suggested: weighted average of *non-null* components, weights summing to 1 over the non-null set. State the per-component weights (typecheck likely 0.3, others split).

**F8 [MEDIUM] FR-030 multi-agent: in-process trust boundary is unspecified.**

"All roles run in the same Node process. No separate services."

If Builder and Operator share a process, an agent that's compromised (e.g., via prompt injection through tool output) can call any function in the process — including the Operator's `apply_patch` even though the Builder's role doesn't have it. The trust boundary between agents is *role discipline*, not a process or capability boundary.

In a single-developer sandbox this is fine. As a security claim, it's not a barrier. The PRD elsewhere is careful (Policy Engine, sandboxing, READ ONLY transactions) — this section is the soft spot.

**Fix:** acknowledge explicitly. Either:
(a) State "agent roles share a process; trust separation is by Policy Engine gating per action, not by isolation. Inter-agent compromise is in the threat model only at the trust level of the most-privileged agent."
(b) Or move Operator (the only L4-capable role) to a separate process with its own capability tokens. Heavier, but cleaner.

For solo-dev (a) is acceptable. Just say it.

**F9 [MEDIUM] FR-032 rollback for migrations underspecified.**

"`run_migration` records the migration version before applying. On failure, the Operator agent calls `rollback(planId)` which restores the pre-action state."

For file patches, "restore the original file content" is exact. For migrations, "restore the pre-action state" is hard:
- A migration that drops a column cannot be reversed without re-creating it from data backup.
- A migration that adds a NOT NULL column with default values is reversible (drop column).
- A migration that runs a data transformation has no inverse.

**Fix:** either constrain `run_migration` to *reversible-by-design* migrations (defined as: schema-only, additive, or column-rename via a safe pattern) and require a separate "irreversible-migration" tool with stronger gating; or specify that rollback for migrations means "execute the previous-version migration generated by drizzle-kit" with the explicit caveat "this restores schema, not data lost during forward migration."

**F10 [MEDIUM] FR-040 sync GET endpoint authentication unspecified.**

"`POST /api/sync/insights` — push local validated insights (signed)"
"`GET /api/sync/insights` — pull global top-10 insights (filtered by reputation)"

POST is signed and verifiable. GET is not described. Anyone hitting `GET /api/sync/insights` could pull global insights — which is just metadata, but still a data exfiltration surface, and a probing-for-system-state surface. The PRD doesn't say.

**Fix:** require authentication on the GET as well. Same node identity / signature, but as a request-time challenge rather than a payload signature. Or simpler: the GET requires the same `API_SECRET` bearer as other endpoints, plus optionally a node-identity header for reputation context.

**F11 [MEDIUM] FR-041 reputation score not bounded.**

"+0.05 when an adopted strategy succeeds, -0.05 when it fails."

Default starts at 0.500. After 30 successes: 0.5 + 30×0.05 = 2.0. After 30 failures: 0.5 − 30×0.05 = −1.0. The reputation table column is `numeric(precision: 4, scale: 3)` — so it'd store these out-of-range values without complaint. The downstream filter ("nodes with score < 0.7 are filtered") would behave correctly for negative scores but unboundedly favor a node that's just been around longer.

**Fix:** clamp to [0, 1]. Or use a Bayesian update with sample-size weighting (a node with 1 success and a node with 100 successes shouldn't have the same score). Either is fine; bounded is mandatory.

**F12 [MEDIUM] R3 v4 ↔ AGI Suite cross-PRD relationship undocumented.**

Both PRDs exist; both are dated 2026-04-18; both are versioned. R3 v4 PRD v4.1 doesn't mention AGI Suite. AGI Suite PRD v3 mentions R3 v4 as the target system. Neither states the cross-repo dependency relationship explicitly:
- Is AGI Suite a *consumer* of R3 v4 (reads `/api/healthz` or similar)? Yes per v2 §6.
- Does AGI Suite ship as part of R3 v4 product, or is it strictly internal tooling? Unclear from the PRDs.
- Does the agent in AGI Suite have access to R3 v4 code? FR-014's `read_file` is sandboxed to "the workspace root" — which workspace? AGI Suite's own, or R3 v4's? v2 FR-024 said "Read any file in the R3 v4 workspace" but v3 just says "sandboxed to workspace root."

**Fix:** add a one-paragraph cross-reference at the top of v3 stating the relationship. Suggested: "AGI Suite is a separate codebase that operates against R3 v4. The agent's filesystem sandbox is the AGI Suite repo (`~/Agi-Suite/`), not the R3 v4 repo. R3 v4 code is read via API calls (FR-004), not file system access."

This matters for Phase 4 onwards because `apply_patch` to the wrong workspace = wrong-repo modifications.

### Low findings

**F13 [LOW] Phase 4 timeline shrunk v2→v3.** v2 Phase 4 = "6 months." v3 Phase 4 = "+12 weeks" (~3 months). v3 supersedes v2, but the change isn't acknowledged. Cosmetic; mention in the §17 decisions log if you care.

**F14 [LOW] Trust level labels inconsistent between §13 and FR-028.**
§13: `L0 Observe / L1 Suggest / L2 Execute / L3 Control / L4 Restrict`
FR-028: `L0 Read-only / L1 Suggest actions only / L2 Execute safe tools automatically / L3 Execute controlled tools / L4 Execute restricted tools`
Same logic, different wording. Pick one form.

**F15 [LOW] FR-014 `query_db` regex DDL guard is friction-class on top of barrier.**
```typescript
const FORBIDDEN = /^\s*(DROP|CREATE|ALTER|TRUNCATE|INSERT|UPDATE|DELETE)/i;
```
Bypasses: `/* */ DROP TABLE`, `SELECT 1; DROP TABLE x`, missing keywords (`MERGE`, `GRANT`, `REVOKE`, `COPY`, `CALL`). The READ ONLY transaction is the actual barrier; the regex just adds friction. Per the security PRD §6.3, friction-on-top-of-barrier is fine — but state it: "regex is defense-in-depth; READ ONLY transaction is the primary control." Otherwise a future engineer will think the regex is the control and lower their guard if/when they relax the transaction.

**F16 [LOW] §12 Phase 2 schema block is empty with a "see v2.0" comment.** Supersession ambiguity. State in v3 §0 that v3 includes (rather than just supersedes) v2's data model unless explicitly redefined. Or inline the v2 schemas.

**F17 [LOW] L4 env var pair can be partially set.** `AGENT_TRUST_LEVEL=L4` without `AGENT_DEPLOY_CONFIRMED=true` — does the server start at L3? L4? Refuse to start? Spec it. Suggested: "If `AGENT_TRUST_LEVEL=L4` and `AGENT_DEPLOY_CONFIRMED` is not literally `true`, server logs a warning and clamps to L3."

---

## Part 2 — v2.0 → v3.0 Drift Map

A separate kind of audit: where v3 diverges from v2 in ways that aren't obvious from reading v3 in isolation. Useful because v2 is presumably what's *built* and v3 is what's *next* — divergences are migration items.

| Area | v2.0 | v3.0 | Migration concern |
|---|---|---|---|
| FR-016 SSE auth | Query param OR custom header | `Authorization` header on initial request | F1 — v3 is browser-broken without polyfill. v2 was correct. |
| Phase 4 duration | 6 months | 12 weeks | Aggressive; ensure the timeline is achievable before committing |
| FR-019 test scope | 4 packages, mixed priorities | 1 package | F5 — re-staging unacknowledged |
| FR-014 tool list | 7 tools, all in same risk class | 7 tools, split across `safe` (4) and `controlled` (3) | Risk classification is a v3 addition; v2 implicitly grouped them. Build accordingly. |
| FR-024 deploy authority | "FR-024" was deploy-authority in v2 | FR-024 is now Drift Detection in v3 | **Number reuse.** v2's FR-024 (deploy authority) maps to v3's Phase 4 cluster (FR-027 + FR-029 + FR-031 + FR-032). |
| Conversation persistence | Phase 1 (localStorage) "immediate"; Phase 2 (DB) "if multi-device" | Phase 2 (localStorage) → Phase 3 (DB) staged | Order is preserved, naming changed |
| Architecture | "Monitoring + AI chat" two-service | Five-tier (L1–L5) with governance/intelligence layers | Major reframing; v3's governance layer is essentially a new product surface |
| Data model | 4 planned tables | 12 tables across phases | Substantial expansion — most are Phase 4+ but worth budgeting migration cost |

The v2→v3 transition is a category change, not an iteration. The PRD says so explicitly in §1. The drift table above is what to actually port.

---

## Part 3 — Corrected Four-Question Resolution

Re-doing the four answers from the prior file with ground truth from the PRDs.

### Q1: Does `r3agent.py` touch `~/Agi-Suite/`?

**Status:** unchanged from prior analysis. Neither AGI Suite PRD mentions r3agent.py — it's external dev tooling, not product. The threat-model framing stands: SSH on Penguin = full home-dir access regardless of intended scope.

**Mastery recommendation (unchanged):** restrict via dedicated `command=`-bound key, or run as a low-privilege user. Telegram bot tokens leak; assume the token is compromised eventually.

### Q2: Is there an LLM-driven autonomous component in AGI Suite today?

**Corrected answer:** **Yes**, partially. `AgentSuitePanel` + `POST /api/agent/chat` is shipped in v2 as a streaming Claude Sonnet (`claude-sonnet-4-20250514`) chat with full SSE. The agent has system-prompt context for R3 v4. It is not yet *autonomous* in the action-taking sense — no tool use yet, no policy gate yet — but an LLM is in the loop today.

The path to autonomy is mapped:
- **Phase 3 (FR-014):** tool use enabled, with confirmation prompts for controlled tools.
- **Phase 4 (FR-027–033):** Policy Engine, planning, multi-agent, simulation, rollback.
- **Phase 5 (FR-034–037):** evolution tracker, strategy weights, meta-evolution.
- **Phase 6 (FR-038–042):** distributed insights across nodes.

**Mastery recommendation:**

Two things become important now that I have ground truth:

1. **The `/api/agent/chat` endpoint is unauthenticated today** (per v2 §15: "All API endpoints are currently unauthenticated. Acceptable for localhost-only development but a blocker for any production Railway deployment that is not behind a private network."). v2 §16 explicitly tags this **"Risk level: High if Railway service is public-facing."** Phase 2 FR-016 fixes it. Until FR-016 ships, **anyone with the Railway URL can burn your Anthropic budget.** This is the single highest-priority finding that the PRD already names. Move FR-016 to first thing in Phase 2 if it's not already.

2. **Prompt injection through tool output, foreshadowed by FR-014.** When tool use ships, the agent will read files (including potentially R3 v4 source) and external content. Per the agent OS PRD §10.4 and the security PRD §6.3, tool output must be treated as adversarial data — not as instruction. The v3 PRD has the right architectural shape (Policy Engine gates every action) but doesn't explicitly call out that tool outputs are adversarial inputs. Add this to FR-014's safety model: "Tool outputs are presented to the agent as data within delimited blocks; the agent is instructed to refuse instruction-shaped content from tool outputs."

### Q3: `install-policy-engine.sh` = systemd as root?

**Corrected answer:** **Indeterminate, and probably a different system than the PRD describes.**

The "Policy Engine" referenced in v3 (FR-027) is a TypeScript module in the AGI Suite codebase — part of the L5 Governance layer, gating agent actions. `install-policy-engine.sh` is a bash file in `~/Agi-Suite/tools/rhos/`. **Neither AGI Suite PRD references RHOS, the bash policy engine, or the disk-governor scripts.**

Three possibilities, and I can't distinguish them without inspecting the file:
1. RHOS is a separate operational subsystem you've built outside the AGI Suite product (host-level health/policy, distinct from the agent governance layer).
2. RHOS is a deprecated experiment that lives in the repo but isn't part of the PRD product.
3. RHOS is an early prototype of what FR-027 will eventually be — i.e., the bash version preceded the TypeScript version.

The chat history I saw in past sessions (signal-integrity bug, `|| true` swallowing failures, ALLOW-on-empty-signal) is real. That bug is real regardless of which of the three above is true.

**Mastery recommendation:**

Two things to do, one for each system:

1. **For the bash RHOS scripts (whichever of the three options is true):** the prior file's P0–P5 retrofit plan (signal-integrity fix → JSONL log → SSE wire → tool manifest → hash chain) still applies. It just isn't the answer to "use the agent OS PRD for AGI Suite." It's the answer to "fix the bash subsystem on Penguin." Worth doing if RHOS is in active use; worth deleting if it's deprecated.

2. **Decide RHOS's relationship to AGI Suite.** If RHOS is operational and AGI Suite product, it should be in the PRD (Section 5 current state, with explicit relationship). If RHOS is deprecated, delete it from the repo. The current state — code present, PRD silent — is the worst case because it's reachable but unaccounted-for.

If RHOS is option (3) — an early prototype of the v3 Policy Engine — then the v3 §17 decisions log should record: "Bash RHOS prototype superseded by FR-027 TypeScript Policy Engine. Bash subsystem to be deprecated by Phase 4 ship."

### Q4: Does AGI Suite write to a database?

**Corrected answer:** **Yes.** AGI Suite has its own PostgreSQL on Railway, accessed via Drizzle ORM. v2 §12 plans 4 tables; v3 §11 mandates DB persistence for 12 tables across Phases 2–6. Current state is "DB present, schema partially deployed."

The R3 v4 PRD has its own schema (`aiDecisionLog` and 12 others); these live in a *different* database (also on Railway). The two systems share infrastructure (Railway, pgsql) but not databases. **Two separate Drizzle repositories, two separate migration histories, two separate DATABASE_URLs.** Worth being explicit about because mistakes here mean cross-environment writes.

The earlier P1 ("append-only JSONL log for RHOS") was about a different system. For AGI Suite proper, the PRD already specifies `audit_log` (Phase 4 FR-027 / §12). **The audit_log is the AGI Suite agent's event log** — analogous to the agent OS PRD §5.

**Mastery recommendation:**

Two things, in order:

1. **Apply the security PRD §5 hash-chain pattern to `audit_log` from day one.** The PRD says `audit_log` is "append-only" but doesn't specify integrity. Add per-row `prev_hash` and `record_hash` columns. Add a daily Merkle root with separate signing. Cost: ~30 minutes when you write the migration; ~free thereafter; a tamper-evident audit trail forever.

2. **`metricsKv` key column is `varchar(64) PRIMARY KEY`** in v2 FR-021. Solid. But the other tables (planned in §12) have varying column-length choices. Audit them. Specifically: `audit_log.actionType varchar(64)` will fit current tools but may need expansion as the tool catalog grows.

---

## Part 4 — Corrected Gap Analysis: Agent OS PRD ↔ AGI Suite PRD v3

This replaces the prior gap analysis. With ground truth, the picture is **mostly aligned, partially weaker, and explicitly weaker in places where the PRD made a deliberate trade-off for solo-dev scale.**

### Where the AGI Suite PRD already covers the agent OS PRD spec

| Agent OS PRD spec | AGI Suite v3 location | Notes |
|---|---|---|
| §5 Event log (append-only audit) | FR-027 + §12 `audit_log` | Append-only ✓; integrity hash chain not specified — see Part 3 Q4 mastery rec |
| §6 Capability scopes (L0–L4 trust) | FR-028 Trust Authority Model | Five levels, env-var-controlled, no runtime escalation. Solid. |
| §6.6 Capability granularity catalog | FR-014 tool catalog (Safe/Controlled/Restricted) | Granularity by risk class rather than per-action capability tokens — coarser than my spec, but appropriate for in-process agents |
| §7 Sandboxed execution | FR-014 `assertSandboxed` (`path.resolve` + `startsWith`) | Friction-class for the threat model, but appropriate for the deployment scale (single-developer, not multi-tenant) |
| §10 Memory contract (DB-persisted, no in-memory) | §11 stateful components table | Explicit: "every component driving agent decisions MUST be persisted to PostgreSQL" |
| §12 Evolution governance gate | FR-035 + FR-037 | MIN_SAMPLE_SIZE, MAX_DELTA_PER_CYCLE, validateEvolution, MetaChangeTarget union type. Strong. |
| §12.1 What can/cannot mutate | FR-037 + §13 immutable rules | TypeScript union type prevents `execution_engine` / `security` / `governance` as MetaChangeTarget. Better than runtime string check. |
| §12.5 Two-person approval | (partially) FR-027 require_confirmation | Single-person typed acknowledgment for solo-dev. Two-person rule would be appropriate for multi-developer, currently overkill. |
| §12.7 Kill switch | NFR §14 + FR-024 implicit + safe_mode (mentioned in v2 §13 SR-004) | `safe_mode` flag is mentioned but not formalized in v3 §13 directly. Should be elevated to top-level in §13. |
| §15 Multi-region failure domains | FR-038–042 (Phase 6) | Per-node identity, ed25519 signing, reputation filtering. Distributed model is well-specified. |

### Where the AGI Suite PRD is genuinely weaker than the agent OS spec

Each of these is a deliberate or accidental trade-off; for solo-dev the trade-offs are mostly fine, but they should be acknowledged.

| Agent OS PRD spec | AGI Suite v3 status | Recommendation |
|---|---|---|
| §7 Kernel-isolated runtime (gVisor / Kata / Firecracker) | `path.resolve` + `startsWith` only | Acceptable for single-tenant, single-developer. NOT acceptable if AGI Suite ever runs untrusted code or hosts multiple agents. State this trade-off explicitly in §13 SR-001-style block. |
| §5.5 Strict vs. equivalent replay | Not addressed | LLM completions are non-deterministic. The PRD doesn't say what replaying an `audit_log` accomplishes (re-run the same actions → same outcomes? No.). Add §5.5-style note: "audit_log is for forensics, not deterministic replay." |
| §5.6 Hash-chained event log + Merkle root + WORM | Append-only only | Add per-row hash chain. ~30-min cost. |
| §9.3 Multi-provider routing for high-impact decisions | Single-provider (Anthropic) | Single provider is a single point of failure. For Phase 4 deploy decisions especially, consider routing to a second provider for cross-validation. Defer until budget justifies. |
| §12.5 Out-of-band approval channel | In-channel typed acknowledgment | A compromised agent could surface a fake confirmation prompt. For solo-dev, the threat is theoretical. For higher-stakes, OOB (Slack DM, dedicated CLI confirmation, hardware key) becomes mandatory. |
| §12.7 Kill switch on separate control plane | `safe_mode` flag in same process | A kill switch that runs in the same process as what it kills is theatrical if the process is compromised. For solo-dev acceptable; revisit if the system grows. |
| §3 Threat model under Mythos-class adversary | Implicit only | The PRD covers prompt injection and trust escalation but doesn't have a §3-style threat model section. Worth adding even briefly. |

### Where the AGI Suite PRD is *better* than my agent OS spec

Genuine improvements that I'd port back if I revised the agent OS PRD:

- **MetaChangeTarget as a TypeScript union type, not a runtime string check.** My agent OS PRD §12.1 says "kernel and capability scope are not mutable" but specifies the rule as text. v3 enforces it via the type system: `MetaChangeTarget` = `"prompt_strategy" | "scoring_weights" | "strategy_selection"` — the compiler rejects `"execution_engine"`. This is stronger.

- **MIN_ADOPTION_SCORE absolute floor.** My agent OS PRD specifies multi-objective fitness with relative deltas. v3 FR-035 catches a real edge case I missed: when `baselineScore === 0` (new system), `baselineScore × 1.1 = 0`, so nothing ever beats it. The 0.05 absolute floor fixes this. Good.

- **Phase 6 prerequisite gate.** v3 §10 prerequisite gate ("a genuine second node exists") prevents premature distribution. My agent OS PRD §15 multi-region is hand-wavier on this.

- **Self-audit table at the document head (the 23 issues resolved).** I should adopt this pattern in my own PRDs. Self-auditing on the document itself, before triple-check from outside, is a discipline worth keeping.

### What to do this week

If RHOS is in active use on Penguin: the prior file's P0–P5 retrofit plan still applies to it (signal-integrity bug → JSONL log → etc.). Different from AGI Suite; possibly older.

For AGI Suite proper, in priority order:

1. **(High priority — already in PRD, but worth foregrounding)** FR-016 authentication. Per the PRD's own §16, the unauth state is the highest-risk gap. Move it earlier in Phase 2 if not already first.

2. **Add hash chain to `audit_log`** when the migration is written. ~30 minutes. Cheap insurance against future tampering claims.

3. **Resolve the RHOS / AGI Suite relationship** in the PRD. One paragraph in v3 §5 (Current State) stating whether RHOS is in scope, deprecated, or being superseded by FR-027.

4. **Fix F1 (SSE Authorization header)** before FR-016 implementation. Either revert to query parameter (with logging caveat) or specify the polyfill.

5. **Fix F2 + F3 (simulation engine)** before FR-031 implementation. Real isolation requires temp workspace + (for migrations) temp database.

6. **Fix F7 (health score null aggregation)** before FR-023 implementation. Pick the aggregation rule.

The other findings are workable but deserve explicit resolution before their respective phases ship.

---

## Part 5 — Closing

The PRDs are sound. v3 is a substantial, coherent specification — clearer thinking than I expected to find, including the rare discipline of a self-audit table. The findings above are second-order issues that will surface when the spec meets implementation; none of them are document-killers.

The corrections in Part 0 are the part of this document I most need you to absorb. With ground truth, my prior gap analysis had wrong premises about Q2, Q3, and Q4. The retrofit plan I wrote was about a system (RHOS) that's not the AGI Suite product. It may still be useful — but not as the answer to "use the agent OS PRD for the AGI Suite."

The agent OS PRD spec applies to AGI Suite v3, with the deltas in Part 4: AGI Suite's design is mostly aligned, weaker on isolation/integrity (deliberate, given solo-dev scale), and stronger in two specific places I'd port back. Where it diverges, name the trade-off; the PRD currently makes some of these implicitly (sandbox class, single-provider routing) without acknowledgment.

---

*End of document.*
