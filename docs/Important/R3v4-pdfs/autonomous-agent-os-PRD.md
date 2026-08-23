# Autonomous Agent OS — Production PRD

**Document type:** Product Requirements Document / Architecture Specification
**Version:** 1.0.0
**Status:** Draft for adoption
**Audience:** Platform engineers, infrastructure leads, security reviewers, agent-systems researchers
**Supersedes:** *Autonomous Agent OS — Master Plan v1.0* (vision-level)

> This PRD takes the Master Plan from vision-level to specification-level. It is opinionated about three things the Master Plan softens: (1) the system is **not formally verified end-to-end** and pretending otherwise costs trust — verification scope is bounded and named here; (2) **LLM-driven systems are not deterministic** and "deterministic replay" is a contract over events and tool outputs, not over LLM internals; (3) **self-modification is the highest-risk subsystem** and gets a phase to itself, gated behind everything else.

---

## 0. Document Metadata

| Field | Value |
|---|---|
| System ID | `agent-os` |
| Spec version | 1.0.0 |
| Threat-model basis | Mythos-class AI-assisted adversary (see §3, cross-references `mythos-security-triage` skill) |
| Primary deployment target | Kubernetes (any conformant distribution); event bus = Kafka **or** NATS JetStream (one chosen per deployment, not both) |
| Source-of-truth datastore | Append-only event log |
| Realistic v1 delivery | Single-tenant single-agent execution + event log + capability system + sandboxed tool layer (see §18 phasing) |
| Phases for self-modification | Behind all other phases; not in v1, v2, or v3 |
| Owner | Platform engineering lead (named, not a team) |
| Review cadence | Quarterly; immediately after any production incident touching the agent runtime |

---

## 1. Executive Summary

### 1.1 What this system is

A distributed, event-sourced execution platform for LLM-driven agents, with three properties that are normally traded off:

1. **Replayable.** State is derived from an append-only event log. Given the same event log and the same external dependencies (tool versions, model versions, embedding model versions), the system reconstructs equivalent state.
2. **Capability-bounded.** No agent action executes without a checked, attenuable, revocable capability token. The capability layer is the trust boundary.
3. **Sandboxed.** Every external effect — tool execution, network I/O, code evaluation — happens inside an ephemeral, network-restricted, filesystem-restricted Kubernetes pod with hard resource ceilings and zero credential overlap with the control plane.

### 1.2 What this system is *not*

Stating this clearly to prevent scope drift and over-claiming:

- **Not formally verified end-to-end.** §13 specifies what is verified (event-log invariants, capability soundness, sandbox isolation, bounded execution) and what is not (LLM behavior, semantic correctness of agent output, "the agent does the right thing").
- **Not deterministic in the strong sense.** LLM generation is non-deterministic across providers and even within providers. "Deterministic replay" is a contract over **events**, **tool outputs recorded at original execution**, and **decision points** — not over LLM internals. See §5.5 and §13.2.
- **Not a self-improving system out of the gate.** The evolution subsystem (§12) is gated behind v4. Building it on an unstable substrate is the canonical way to produce uncontrollable failure modes.
- **Not an autonomy maximizer.** Agents are ephemeral interpreters of event streams under capability constraints. Persistent autonomous entities are out of scope (§19).

### 1.3 Success criteria (measurable)

The platform is functioning correctly when **all** of the following hold over a rolling 90-day window once at the relevant phase:

| Metric | Target | Phase introduced |
|---|---|---|
| Event-log durability (no committed event lost) | 100% (zero tolerance) | v1 |
| State-reconstruction agreement (replay vs. live derivation, structural diff) | 100% on deterministic projections; ≥99.9% match on LLM-bearing projections (see §13.2) | v3 |
| Capability-check latency, p99 | ≤ 5 ms | v1 |
| Capability-check soundness (no action executed with insufficient capability) | 100% (zero tolerance) | v1 |
| Sandbox cold-start, p99 | ≤ 2 s with warm pool; ≤ 8 s without | v1 |
| Sandbox isolation breach incidents | 0 | v1 |
| Tool-output injection successful exploits (red-team) | 0 critical, ≤ 1 medium per quarter | v2 |
| Per-agent budget enforcement (no agent exceeds its budget) | 100% | v1 |
| Mean time to revoke a leaked capability token | ≤ 60 s | v1 |
| Evolution subsystem deploys that regress fitness in production | 0 | v4 |

The metric that matters most and is easiest to lose: **capability-check soundness must be zero-tolerance.** A single bypass turns the rest of the system into a sieve.

---

## 2. Scope, Phasing, and Honest Constraints

### 2.1 Hard truths the design has to absorb

Stating these upfront so design choices are legible.

**T1. LLM nondeterminism is real and irreducible.** Even with `temperature=0`, identical prompts produce different completions across model versions, provider infra changes, and sometimes within the same version due to mixed-precision sampling. Designing for "deterministic replay" of LLM internals is a category error. Designing for replay of events, tool outputs, and decision points is achievable and is what this spec means.

**T2. Tool outputs are adversarial inputs.** A web-search result, a fetched webpage, a tool's text response can contain prompt-injection payloads. The "LLM firewall" in the Master Plan is one mitigation; structural separation (treating tool output as data, never as instruction) is the actual design discipline. See §10.4.

**T3. Self-modifying systems can collapse their own fitness functions.** Goodhart's law is operational here. The evolution loop (§12) cannot be a closed loop; it requires (a) multi-objective fitness with adversarial evaluation, (b) human governance approval, and (c) a kill switch that does not depend on the agent system being healthy.

**T4. "Capability ∩ Policy ∩ Budget == TRUE" is necessary, not sufficient.** That predicate prevents authorized actions exceeding bounds. It does not prevent authorized actions producing harm. Capability layer is the **trust boundary**; what happens inside the capability bound still requires policy, monitoring, and human review for high-impact actions.

**T5. Formal verification of the whole system is not feasible.** Verification of bounded subsystems is. §13 names the bounds.

**T6. Memory poisoning is a real attack on agent systems.** Vector-store inputs derived from tool outputs can persist adversarial content. See §10.4.

### 2.2 Phasing

The Master Plan presents the system as a single delivery. That fails. The phasing below sequences capability so that each phase is operable, testable, and rollback-able before the next is built.

| Phase | Capability | Gate to next phase |
|---|---|---|
| **v1** | Event log; single-agent runtime; capability system; sandboxed tool layer; model router (cost caps); basic memory (event log + episodic vector store) | All v1 success metrics (§1.3) green for 30 days; security review passed |
| **v2** | Multi-agent / swarm coordination; per-swarm budget; conflict resolution protocol | v1 metrics still green; adversarial swarm test passed (§13.4) |
| **v3** | Replay verification; deterministic-projection diff; snapshot/compaction; structured procedural memory | Replay-correctness metric green; 30-day backtest |
| **v4** | Simulation/evaluation environments; offline fitness scoring | Simulation environment passes red-team finding-pack drill |
| **v5** | Evolution subsystem: prompt and workflow mutation under governance gate | All prior phases green for 90 days; governance gate audit passes |
| **v6** | Tool synthesis under governance gate (highest-risk) | Independent security audit; live red-team |

**Phasing rule:** no phase begins until all metrics from prior phases are green for the gating window. There is no "v5 in parallel with v3" path. Self-improvement on top of an unverified replay layer is not deferral of risk; it is amplification.

### 2.3 What's research, what's engineering

| Area | Classification | Implication |
|---|---|---|
| Event sourcing + log-derived state | Engineering | Well-understood; build it |
| Capability systems | Engineering | Object-capability literature is mature; use it |
| K8s sandbox isolation | Engineering | Mature; supply chain for sandbox image is the real risk |
| LLM cost routing | Engineering | Solved problem under stable model providers |
| Multi-agent coordination protocols | Mostly engineering | Pick known patterns (§11) |
| Deterministic replay of LLM-driven systems | Research | §5.5 specifies the achievable contract |
| Multi-objective fitness for agent populations | Research | §12.3 specifies the target; expect iteration |
| Governance gate for self-modifying agents | Research + policy | §12.5 |
| Formal verification of distributed agent systems | Research | §13: bound the scope to subsystems where it's tractable |
| Adversarial robustness of memory systems | Research | §10.4 |

If a feature is "research," it does not ship to production with confident SLOs. It ships to staging, with explicit measurement, and confidence is earned over time.

---

## 3. Threat Model

### 3.1 Adversary baseline: Mythos-class

The platform is designed against an adversary who has access to a Mythos-class AI assistant. This propagates from the `mythos-security-triage` skill and produces concrete design implications:

**Cheap for the adversary** (must be assumed, not hand-waved):
- Reverse-engineering the platform's control-plane API surface from any leaked OpenAPI spec or minified frontend bundle.
- Generating prompt-injection payloads tuned to specific LLM versions.
- Fuzzing the capability-check surface for missing checks or order-of-evaluation bugs.
- Correlating telemetry leaks (timing, error messages) into capability/secret recovery.
- Producing N-day exploits for any dependency listed in the lockfile within ~24h of advisory publication.

**Expensive for the adversary**:
- Compromising hardware-bound key material in HSMs.
- Bypassing kernel-enforced sandbox boundaries (gVisor / Kata / Firecracker).
- Brute-forcing 256-bit cryptographic keys.

### 3.2 Threat actors and goals

| Actor | Goal | Primary attack surface |
|---|---|---|
| External attacker, no insider access | Capability theft → unauthorized tool execution | Control-plane API; capability-token format; OAuth flows |
| External attacker via tool output | Prompt-injection → policy bypass | Tool outputs reaching LLM context; memory poisoning |
| External attacker via supply chain | Compromise of sandbox image, tool image, or dependency | CI pipeline; image registry; lockfiles |
| Insider (compromised developer) | Plant a malicious capability or evolution rule | Code review bypass; CI bypass; governance gate bypass |
| Compromised LLM provider | Adversarial completions | Model output validation; multi-provider routing |
| Self (evolution loop gone wrong) | Fitness function gamed; misaligned mutation deployed | Governance gate; rollback; kill switch |

### 3.3 Top-priority threats

The threats below are the design's primary motivating concerns. Each receives a concrete mitigation in the indicated section.

| Threat | Mitigation | Section |
|---|---|---|
| Prompt injection via tool output → policy bypass | Structural separation of data from instruction; tool output classifier; memory firewall | §10.4 |
| Capability token leakage / replay | Short TTL; binding to event chain; revocation list; audit trail | §6 |
| Sandbox escape | Kernel-isolated runtime (gVisor/Kata/Firecracker); zero credential overlap; network egress allowlist | §7 |
| Memory poisoning (vector store) | Provenance tags on every embedding; quarantine on suspicious retrieval; periodic audit | §10.4 |
| Tool/sandbox image supply chain | Signed images; pinned digests; SBOM-in-CI; dual-control on registry writes | §7.4 |
| Self-modification deploying regression | Multi-objective fitness; governance approval; canary; instant rollback; kill switch outside the agent system | §12.5–§12.7 |
| LLM provider compromise (adversarial outputs) | Multi-provider routing for high-impact decisions; output validation against schema; budget caps as availability backstop | §9, §10 |
| Evaluation collapse (Goodhart) | Adversarial evaluation; held-out tasks; human spot-checks | §12.3, §13.4 |
| Event log integrity violation | Immutable storage; cryptographic chaining (Merkle); periodic integrity audit | §5.6 |
| Insider bypass of governance | Two-person rule on evolution deploy; sealed audit log; out-of-band approval channel | §12.5 |

### 3.4 Out of threat-model scope

- Nation-state-level APT with persistent kernel-level access to underlying nodes (delegated to cloud provider's threat model).
- Quantum cryptanalytic attack on signature schemes (use post-quantum-ready primitives where available; not the focus of v1).
- Physical attacks on data centers.

---

## 4. Formal Kernel Specification

The Master Plan introduces $K = (S, E, P, M, T, R)$ but does not define the transition function. This section closes that.

### 4.1 Types

```
type AgentId    = UUID
type EventId    = ULID            -- monotonic per partition
type Capability = { scope: Set<Action>, ttl: Duration, parent: CapId|nil, sig: Signature }
type State      = { agents: Map<AgentId, AgentState>, env: EnvState }
type Event      = { id: EventId, cause: EventId|nil, agent: AgentId, kind: EventKind, payload: JsonSchema, cap: CapId, ts: Timestamp, sig: Signature }
type Decision   = { policyVersion, modelVersion, prompt, completion, schema, output: JsonSchema }
type ToolCall   = { tool: ToolId, version: SemVer, input, output, exitCode, durationMs, cap: CapId }
```

`EventKind` is a closed set per phase. v1 set:
`agent.spawn | agent.observe | agent.decide | agent.tool_call | agent.tool_result | agent.emit | agent.budget_charge | agent.terminate | cap.issue | cap.attenuate | cap.revoke | system.snapshot`

### 4.2 State transition

State is a fold over the event log:

```
State_0 := initial
State_{t+1} := apply(State_t, Event_{t+1})
where Valid(Event_{t+1}, State_t) holds.
```

`apply` is **pure and deterministic** — no I/O, no clock, no randomness. All non-determinism is captured *as recorded events* (a tool call's output is an event; the LLM's completion is an event payload). The fold therefore replays.

This is what "deterministic replay" actually means in this system: **`apply` is deterministic**. The events being applied are themselves recordings of non-deterministic outcomes. See §5.5.

### 4.3 Validity predicate

```
Valid(e, s) ≡
    Schema(e)
  ∧ CapabilityValid(e.cap, s, e.kind)
  ∧ BudgetWithin(e.agent, e.cost, s)
  ∧ CauseChainSound(e.cause, s)
  ∧ SignatureCheck(e)
  ∧ Monotonic(e.ts, s.lastTs[e.partition])
```

Each conjunct is independently auditable. None can be skipped. None can be disabled in production for performance. If `Valid` returns false, the event is rejected at ingest, never appended, and a diagnostic event is emitted.

`CapabilityValid` is the trust boundary; §6 specifies it. `BudgetWithin` is the cost-control gate; §9.2 specifies it. `CauseChainSound` ensures every event traces to either a system root or another valid event; §5.4. `SignatureCheck` rejects events not signed by an authorized issuer.

### 4.4 What `apply` does not do

- Does not call out to the LLM. Decisions are events; the LLM call happens outside `apply`, and the *result* of the call is recorded as an event for `apply` to consume.
- Does not call out to tools. Tool calls are the same shape: emit a request event, sandbox executes, record result event, `apply` consumes.
- Does not allocate, schedule, or block.

The agent runtime (§7) is responsible for orchestration; `apply` is the deterministic core that guarantees state is reconstructable.

### 4.5 Determinism contract (precise)

Given:

- An event log $L$ ordered by partition.
- The same `apply` function (binary).
- The same schema versions, capability registry, tool registry contents.

Then: replay of $L$ produces a state structurally equal to the originally derived state, modulo:

- Wall-clock-derived fields (replaced with recorded timestamps from events).
- Random-derived fields (recorded in events).
- LLM completion strings (recorded as event payloads, not regenerated).

If any of those modulo-clauses is not satisfied — for example, the embedding model version differs — replay produces a state that is *equivalent for the purposes of reasoning* but not byte-identical for embeddings. See §10.2 for the contract on derived projections.

---

## 5. Event Model

### 5.1 Event envelope

```json
{
  "id": "01J9XK...",                  // ULID
  "schema_version": "1.0",
  "kind": "agent.tool_call",
  "agent_id": "...",
  "partition": "agent:<agent_id>",     // see §5.3
  "cause": "01J9XJ...",                // EventId or null (root)
  "cap": "cap_01J9X...",
  "ts": "2026-04-30T05:00:00.000Z",
  "payload": { ... },                  // schema per kind
  "payload_hash": "sha256:...",        // hash of payload bytes
  "prev_hash": "sha256:...",           // hash of prior event in partition
  "issuer": "service:agent-runtime@v1.2.3",
  "sig": "ed25519:..."                 // signature over (id, prev_hash, payload_hash, kind, agent_id, cap)
}
```

The chained `prev_hash` makes the event log a hash-chained structure per partition. Tampering with any historical event invalidates the chain from that point forward, and that invalidation is detectable in O(events_after) time.

### 5.2 Kinds and payload schemas

Schemas are versioned and registered. v1 set, with required payload fields:

| Kind | Payload (required) |
|---|---|
| `agent.spawn` | `parent_agent_id?`, `prompt`, `cap_grants[]`, `budget` |
| `agent.observe` | `source` (`tool_result` \| `swarm_message` \| `user_input`), `data_hash`, `data_ref` |
| `agent.decide` | `model_id`, `model_version`, `prompt_hash`, `completion`, `decision_schema`, `decision` |
| `agent.tool_call` | `tool_id`, `tool_version`, `input_hash`, `input_ref`, `cap_used` |
| `agent.tool_result` | `cause: agent.tool_call.id`, `exit_code`, `output_hash`, `output_ref`, `duration_ms`, `tokens_used?` |
| `agent.emit` | `target_partition`, `kind`, `payload_hash`, `payload_ref` |
| `agent.budget_charge` | `amount`, `currency: usd_micros`, `category` |
| `agent.terminate` | `reason`, `final_state_hash` |
| `cap.issue` | `parent_cap?`, `scope`, `ttl`, `holder` |
| `cap.attenuate` | `from_cap`, `narrowed_scope`, `narrowed_ttl` |
| `cap.revoke` | `cap`, `reason` |
| `system.snapshot` | `partition`, `up_to_event`, `state_hash`, `state_ref` |

`*_hash` fields are sha256 over the canonical-JSON encoding of the referenced blob. Large payloads live in object storage and are referenced by `*_ref` (URI) and bound by `*_hash`. Hash binding is the mechanism that lets you garbage-collect old large blobs while keeping the event log small and auditable.

### 5.3 Partitioning and ordering

- **Per-agent ordering** is total. All events for an agent share `partition = "agent:<agent_id>"`. Within a partition, events are strictly ordered by ULID and chained by `prev_hash`.
- **Cross-agent ordering** is partial. Inter-agent communication uses `agent.emit` events which become `agent.observe` events on the receiving partition. Causality is preserved; wall-clock ordering is not assumed.
- **System partition** for cross-cutting events (`cap.*`, `system.snapshot`).

Bus choice (Kafka or NATS JetStream): keys hash to partitions; one partition per agent guarantees per-agent ordering. Cross-partition ordering is enforced at the application layer via `cause` chain.

### 5.4 Idempotency and exactly-once

The platform is **exactly-once at the event-log level**. Producers retry safely because:

- Events carry a producer-assigned ULID. The event store rejects duplicate IDs.
- The state-derivation layer is idempotent: applying the same event twice is a no-op (the second apply sees the event ID is already in derived state).

Tool-side exactly-once is not guaranteed (the world is at-least-once). The platform records the *intent* (`agent.tool_call`) and the *outcome* (`agent.tool_result`); duplicates of intent without paired outcomes are detected and reconciled by the runtime (timeout → emit `tool_result` with `exit_code: TIMEOUT`).

### 5.5 Replay contract (precise)

The platform supports two replay modes:

**Strict replay** (used for audit, debugging, dispute resolution):
- Inputs: event log $L$ for the partition(s) of interest.
- Output: state derived by `apply`, byte-identical to the original.
- Required: `apply` binary version match; schema version match; embedding-model version match for derived projections (§10.2).

**Equivalent replay** (used for what-if analysis, fitness backtesting):
- Inputs: event log $L$.
- Output: state derived by current `apply`, semantically equivalent but not necessarily byte-identical (different embedding model produces different vectors but equivalent semantic memory).

Strict replay is the audit instrument. Equivalent replay is the experimentation instrument. They are different SLAs (§14).

### 5.6 Event log integrity

- Append-only object storage with object-lock / WORM (S3 Object Lock, GCS bucket lock, or equivalent).
- Per-partition Merkle root computed on every snapshot (§5.7) and signed by the platform key.
- Periodic (daily) integrity audit recomputes Merkle roots and compares to signed records.
- Discrepancy → page on-call; halt new event ingestion for the affected partition pending investigation; do not auto-recover.

### 5.7 Snapshotting and compaction

Naïve event-sourced systems suffer log-length-proportional replay cost. Mitigation:

- **Snapshots:** every $N$ events (default $N=1000$ per agent, tunable), the runtime computes `system.snapshot` containing a state hash and a reference to the serialized state. Replay starts from the most recent snapshot.
- **Compaction policy:** events older than retention threshold (default 13 months for agent-internal events; **forever** for `cap.*` and `agent.budget_charge`) may be compacted into snapshots, releasing storage. The Merkle root preserves auditability.
- **Compaction safety:** a compaction is itself an event (`system.compact`) and is signed and audited. A compacted event range is no longer replayable in strict mode but remains replayable from the snapshot.

Capability-issuance events (`cap.*`) and money events (`agent.budget_charge`) are **never** compacted. They are the audit trail.

---

## 6. Capability System

### 6.1 Why capabilities, not ACLs

ACLs ask "who is calling?" Capabilities ask "what does this caller hold?" The latter is correct for agent systems for three reasons:

1. The "who" is often an LLM-orchestrated chain, not a single principal. The capability travels with the action; it does not require reconstructing identity at every hop.
2. Capabilities can be **attenuated**: a parent capability spawning a child agent can grant a strict subset of its own capability. ACLs cannot express attenuation cleanly.
3. Capabilities can be **revoked** uniformly. ACL revocation requires touching every system that cached the ACL.

### 6.2 Capability format

```
Capability ::= {
  id:         CapId,                      -- unique
  scope:      Set<ScopeRule>,             -- e.g. CAP_TOOL:web_search?domains=*.wikipedia.org
  resource:   ResourceBound,              -- token/cost/wallclock limits
  ttl:        Duration,                   -- short by default
  parent:     CapId | nil,                -- attenuation chain
  holder:     AgentId,                    -- bound to a specific agent
  issuer:     IssuerId,                   -- service that minted this cap
  caveats:    List<Caveat>,               -- macaroon-style additional constraints
  sig:        Signature                   -- ed25519 over canonical encoding
}
```

This is a macaroon-shaped design (Birgisson et al., 2014). Caveats are first-class: a cap can be narrowed by adding caveats without re-issuance from the root issuer.

### 6.3 Lifecycle

| Operation | Event | Authorization required |
|---|---|---|
| Issue | `cap.issue` | Issuer holds a parent cap that includes scope being issued; or issuer is the root system cap |
| Attenuate | `cap.attenuate` | Holder of source cap can attenuate without re-signing (caveat append) |
| Revoke | `cap.revoke` | Issuer of the cap, parent issuer, or system policy |
| Use | (implicit, via `cap` field on action events) | Caveat eval + scope match + TTL + revocation list check |

### 6.4 Use-time check

```
CapabilityValid(cap_id, state, action_kind, action_params) ≡
    cap = state.caps[cap_id]
  ∧ cap.holder == event.agent
  ∧ cap.issuer in state.trusted_issuers
  ∧ now() < cap.ttl_expiry
  ∧ cap_id not in state.revocations
  ∧ action_kind in cap.scope
  ∧ ∀ c in cap.caveats: c.eval(action_params, state)
  ∧ chain_valid(cap.parent, state)        -- recursive: every ancestor must also be valid
  ∧ signature_valid(cap)
```

Implementation requirements:

- p99 latency ≤ 5 ms (revocation list cached locally, refreshed on push).
- Soundness is zero-tolerance. Any check failing returns `false`. No fallback "allow" path.
- Failures are themselves events (`cap.use_denied`) for audit and detection of probing.

### 6.5 Revocation propagation

Revocations are pushed to all runtime workers via the event bus on a dedicated low-latency topic (`agent.cap.revocations`). Workers maintain a local revocation set; on receipt, evaluation is updated within one bus delivery. Push, not pull, because the cost of a missed revocation is worse than the cost of a slightly-stale local cache.

For pulled caches (cold workers), TTL of 60 s is mandatory. Combined with push, mean time to revoke ≤ 60 s (success metric §1.3).

### 6.6 Capability granularity catalog (v1)

Initial capability scopes. New scopes require security review.

| Capability | Description | Default TTL | Default holder |
|---|---|---|---|
| `CAP_TOOL:web_search` | Invoke web-search tool | 5 min | Agent |
| `CAP_TOOL:web_fetch` | Invoke URL-fetch tool, with domain caveats | 5 min | Agent |
| `CAP_TOOL:code_exec` | Execute code in sandbox | 2 min | Agent |
| `CAP_TOOL:db_read` | Read from a named dataset | 5 min | Agent |
| `CAP_TOOL:db_write` | Write to a named dataset (highly restricted) | 1 min | Agent (rare) |
| `CAP_MODEL:invoke` | Call a specific model with token budget | 10 min | Agent |
| `CAP_AGENT:spawn` | Spawn a child agent | 1 min | Agent (parent) |
| `CAP_MEMORY:write` | Append to procedural memory | 30 min | Agent or evolution loop |
| `CAP_GOVERNANCE:approve_evolution` | Approve a v5+ mutation deployment | 1 hour | Human only |

**`CAP_GOVERNANCE:approve_evolution` is a human-only capability.** It cannot be granted to or attenuated to an agent. This is enforced at issuance.

### 6.7 What capabilities don't do

Capabilities don't make the actions they authorize *good*. An agent with `CAP_TOOL:web_search` can search for anything within scope; whether the search itself is wise is policy and monitoring concern, not capability concern. Don't confuse the trust boundary with the alignment boundary.

---

## 7. Sandboxed Execution

### 7.1 Sandbox runtime requirements

Every external effect runs in an ephemeral pod with:

- **Kernel-isolated runtime:** gVisor, Kata Containers, or Firecracker microVM. Container runtime alone (runc) is insufficient given Mythos-class adversaries.
- **Read-only root filesystem.** Tmpfs scratch space mounted at `/work`, hard-limited.
- **Hard resource ceilings:** `requests == limits` for CPU and memory; `pids` capped; `ephemeral-storage` capped.
- **Network policy:** default-deny egress, allowlist ingress none. Per-tool allowlist of egress destinations enforced by NetworkPolicy + egress firewall (Cilium / Calico).
- **No service-account tokens auto-mounted.** `automountServiceAccountToken: false` non-negotiable.
- **No host network, no host PID, no privileged.** Pod Security Standard `restricted`.
- **No /proc, /sys writable.** All capabilities dropped except a minimal set required for the runtime.
- **AppArmor / SELinux profile** enforced.

### 7.2 Pod spec (canonical fragment)

```yaml
apiVersion: v1
kind: Pod
metadata:
  generateName: tool-sandbox-
spec:
  runtimeClassName: gvisor
  automountServiceAccountToken: false
  hostNetwork: false
  hostPID: false
  hostIPC: false
  shareProcessNamespace: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 65532
    fsGroup: 65532
    seccompProfile: { type: RuntimeDefault }
  containers:
  - name: tool
    image: registry.example/tools/<tool>@sha256:<digest>     # digest-pinned
    imagePullPolicy: IfNotPresent
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities: { drop: ["ALL"] }
    resources:
      requests: { cpu: "500m", memory: "512Mi", ephemeral-storage: "256Mi" }
      limits:   { cpu: "500m", memory: "512Mi", ephemeral-storage: "256Mi" }
    volumeMounts:
    - { name: scratch, mountPath: /work }
    env:
    - { name: TOOL_INPUT_REF, value: "<URI>" }
    - { name: TOOL_INPUT_HASH, value: "sha256:..." }
  volumes:
  - { name: scratch, emptyDir: { medium: Memory, sizeLimit: "256Mi" } }
  activeDeadlineSeconds: 60
```

### 7.3 Lifecycle

1. **Warm pool:** the runtime maintains a warm pool of N pods per tool image (default N=8, autoscaled). Cold-start mitigation.
2. **Dispatch:** runtime receives `agent.tool_call` event. Cap-checks. Picks a warm pod or starts one.
3. **Input injection:** input blob written to object storage; pod given a reference and an integrity hash. Pod **never** gets a writable secret.
4. **Execution:** pod runs to completion or `activeDeadlineSeconds` (default 60 s, per-tool overridable up to a hard ceiling of 300 s).
5. **Output capture:** pod writes output to a known scratch path; runtime reads, hashes, stores to object storage, emits `agent.tool_result`.
6. **Teardown:** pod is deleted. **No reuse across agents.**

### 7.4 Image supply chain

The sandbox image pipeline is itself a high-value attack surface. Mitigations:

- All tool images built in an isolated CI pipeline. No developer-machine pushes to the registry.
- Images signed with Sigstore / cosign. Signature verified at admission.
- SBOM (CycloneDX or SPDX) generated at build time and attached to image. Vulnerability scan runs in CI; advisories trigger the `mythos-security-triage` workflow.
- Registry write requires dual control (two human approvals, or one human + automated CI key with hardware-bound signing).
- Image digests are pinned in the tool registry. Rolling a tool to a new image is a governed event (`tool.registry.update`) with audit.

### 7.5 Egress policy

Tools that need network access declare egress destinations in the tool manifest. The runtime configures the NetworkPolicy and egress firewall before the pod starts. Examples:

- `web_search` → only the search API endpoint.
- `web_fetch` → broad egress, but DNS-rebinding-protected resolver and IP-allowlist excluding RFC1918, link-local, and metadata service endpoints (169.254.169.254 etc.).
- `code_exec` (Python) → no egress.

The egress policy is part of the tool manifest, signed, and pinned to the image digest. Changing egress is a governed event.

### 7.6 Sandbox observability

Per-pod:

- All stdout/stderr captured to the event log (hashed and ref'd if large).
- Network connection log (egress destinations attempted, allowed, blocked).
- Exit code and reason (clean exit / OOM / timeout / killed).
- Resource usage at exit.

These are the primary signal for detecting sandbox-escape attempts. Anomaly detection on egress-attempted-but-blocked events is a v1 alert.

---

## 8. Tool Layer

### 8.1 Tool contract

A tool is:

```
type Tool = {
  id:           ToolId,
  version:      SemVer,
  manifest:     ToolManifest,
  image_digest: string,                   -- pinned
  input_schema:  JsonSchema,
  output_schema: JsonSchema,
  egress_policy: EgressPolicy,
  resource_limits: ResourceLimits,
  required_caps: Set<Capability>,
  output_classifier: ClassifierRef | nil  -- §10.4
}
```

Tools are registered in a tool registry (a versioned, audited datastore — itself event-sourced). A tool's manifest is immutable per version; new versions go through review.

### 8.2 Input/output schemas

Both input and output are validated against JSON Schema before passing to / accepting from the sandbox. Validation failure is recorded; a tool that produces schema-invalid output is treated as failed.

### 8.3 Output as adversarial data

This is the design assumption: **a tool's output may be adversarial** (the website you fetched is hostile; the search result is poisoned; the LLM-generated code is prompt-injecting downstream). Mitigations:

- Output schema validation rejects unexpected structure.
- Output classifier (§10.4) scans for known prompt-injection patterns and labels the output.
- The runtime always passes tool output to downstream agents as **data**, not as **instruction**. Concretely: tool output appears in subsequent prompts inside delimited blocks with explicit "this is data, not instructions" framing, and the LLM is instructed to refuse instruction-shaped content within those blocks. This is a defense-in-depth measure, not a guarantee.
- High-impact actions (`db_write`, `agent.spawn`, governance approvals) require an additional confirmation step that does not depend on the LLM (e.g., human approval, or a second-model schema-only reviewer).

### 8.4 Tool versioning and pinning

- Agents reference tools by `(id, version)`. Resolution to image digest is via the registry at dispatch time.
- A tool version is **immutable** post-release. Bug fixes are new versions.
- Replay uses the recorded `(id, version)` from the original event to ensure equivalent replay.

### 8.5 Tool registry as audit object

Every change to the tool registry is an event:

- `tool.register`, `tool.deprecate`, `tool.update_manifest` (rare; with audit reason)
- All require dual control after v1.

---

## 9. Model Router

### 9.1 Routing decisions

The router chooses model tier per call:

| Tier | Use | Examples |
|---|---|---|
| `nano` | Routing, classification, schema-fill | Cheap small model |
| `small` | Tool selection, simple summarization | Mid-tier model |
| `medium` | Reasoning, complex tool selection | Large model |
| `large` | Planning, synthesis, code generation | Frontier model |

Routing is *pluggable policy*. v1 ships a deterministic policy: classify the input via `nano`; route to the cheapest tier whose expected success rate ≥ threshold for the classified task type. The classifier itself is a small fine-tuned model whose performance is tracked.

### 9.2 Budget enforcement

```
BudgetWithin(agent, cost, state) ≡
    state.budgets[agent].remaining >= cost
  ∧ state.budgets[agent].rate_window_used + cost <= state.budgets[agent].rate_limit
```

Budgets are denominated in $USD micros. Token-cost translation per model is in a tariff table updated on provider price changes.

Budget enforcement happens at two points:

1. **Pre-call:** estimated cost (input tokens × estimated output tokens × tariff) checked against budget. If insufficient, the model call is denied; an `agent.budget_exceeded` event is emitted.
2. **Post-call:** actual cost charged to the agent; budget decremented. Replay uses recorded actual cost.

### 9.3 Multi-provider routing

For high-impact decisions (any decision tagged as governance-affecting, or any `db_write` plan, or any `agent.spawn`), the router calls **two providers** with the same prompt and reconciles. Disagreement triggers human review or a third-arbiter call.

This is mitigation against single-provider compromise (T3.4) and against silent regression in a model version.

### 9.4 Model version pinning

- Agent specs reference models by `(family, version)`, not floating tags.
- Replay uses recorded `(family, version)`.
- Provider-side version aliasing (e.g., a "latest" pointer changing meaning) is an integrity violation and triggers an alert.

### 9.5 Provider failure handling

- Per-provider circuit breaker; on tripped, route to fallback provider for the same tier.
- "No fallback available" is itself an event; agent runtime decides whether to wait, downgrade tier, or fail.

---

## 10. Memory System

### 10.1 Three layers, one source of truth

| Layer | Storage | Source | Mutability |
|---|---|---|---|
| **Episodic** | Event log (the event log itself) | Live events | Append-only |
| **Semantic** | Vector store (read model) | Derived from event payloads | Rebuildable |
| **Procedural** | Workflow registry (read model) | Derived from `agent.emit` events tagged as workflow | Rebuildable |

The event log is the source of truth. The other two are **projections** — read models that can be rebuilt by replaying.

### 10.2 Derivation contract

```
SemanticMemory_t  := derive_semantic(EventLog_<=t, embedder_version)
ProceduralMemory_t := derive_procedural(EventLog_<=t, workflow_extractor_version)
```

`derive_*` are deterministic given fixed model versions. Equivalent replay (§5.5) recomputes them; strict replay requires the original `embedder_version`.

When the embedder version changes:

- A new vector store is built in parallel.
- Both stores are queried (shadow mode) for a validation period.
- Cutover is a governed event.
- The old store is retained for replay support until retention horizon.

### 10.3 Memory write rule

The Master Plan principle "memory is derived from events, never directly written" is preserved here, with a precise interpretation:

- **No code path writes to vector store or workflow registry directly.**
- Writes happen via the projection pipeline consuming the event stream.
- Dropping or modifying a projection entry without a corresponding event is a process violation detected by the integrity audit.

### 10.4 Memory poisoning defenses

This is the threat that makes memory dangerous. An agent fetches a hostile webpage; the content is embedded; the next retrieval returns the hostile content; downstream agents condition on it.

Mitigations:

- **Provenance tags.** Every embedding carries the originating event chain. Retrieval results are surfaced with provenance. High-trust queries can filter to high-provenance sources.
- **Output classifier** at ingest. Tool outputs flagged by the classifier (§8.3) are tagged `untrusted`. Untrusted memory is excluded from default retrieval; can be opted in by explicit caveat on the retrieval cap.
- **Quarantine on suspicious retrieval.** If an agent retrieves a memory entry whose provenance includes a flagged tool output and conditions on it for a high-impact decision, the runtime injects an additional validation step (second model, human review, or refusal).
- **Periodic retrieval audit.** Sample retrievals; check for instruction-shaped retrieved content; alert.
- **No recursive trust escalation.** Memory derived from low-trust sources cannot be relabeled high-trust by being passed through additional agents. Provenance is monotonic.

### 10.5 Procedural memory specifics

A "workflow" is a recorded sequence of agent actions tagged as reusable. The workflow registry stores them with:

- Origin event chain (audit).
- Success rate over time (fitness signal).
- Capability requirements (so reuse can fail capability check upfront).
- Version (immutable per version).

Registering a new workflow is an event. Promoting a workflow to "default" status is a governed event. Workflows are not arbitrary code; they are sequences of typed action invocations whose schema is verified.

---

## 11. Swarm Engine (Multi-Agent)

### 11.1 Coordination patterns

v2 supports three patterns. Picking known-good patterns rather than inventing.

| Pattern | Use | Coordination object |
|---|---|---|
| **Hierarchical (manager–worker)** | Task decomposition; the manager is the only agent with `CAP_AGENT:spawn` for this task | Parent emits `agent.spawn` with attenuated caps; worker emits results back via `agent.emit` |
| **Pipeline** | Sequential transformation | Each stage's output is the next stage's input via partitioned topics |
| **Auction (contract net)** | Task allocation among workers | Manager emits a task; workers bid; manager assigns |

Free-form "agent populations talking to each other" is **not** a v2 pattern. Emergent coordination is a research target, not a v2 deliverable.

### 11.2 Conflict resolution

When two agents emit competing actions (e.g., both write to the same dataset):

- Last-writer-wins is rejected. It loses information and is exploitable.
- Conflicts are detected at `Valid` time via the `cause` chain and version vectors on the affected resource.
- Detected conflict → emit `swarm.conflict` event; runtime suspends both branches; manager agent (or human) resolves.

### 11.3 Termination

A swarm has a budget (cost + wallclock). Exceeding either triggers `swarm.terminate`, which cascades termination signals to all child agents. Children must respond within a grace window or are forcibly killed.

Termination is itself an event. A swarm with no termination signal in its trace is a process violation.

### 11.4 Swarm budget

Per-swarm budget is the sum of all agent budgets. Enforcement at swarm level prevents budget exhaustion attacks where a swarm spawns many cheap children to consume aggregate budget.

---

## 12. Evolution System (v5+)

The most dangerous subsystem. Treated last, gated behind everything.

### 12.1 What can mutate

| Class | Mutable | Phase introduced | Notes |
|---|---|---|---|
| Prompt templates | Yes | v5 | Bounded by template grammar |
| Workflow graphs | Yes | v5 | Within registered action vocabulary; no novel actions |
| Tool selection policy (router) | Yes | v5 | Within registered tool set |
| Hyperparameters (temperature, top-p, retry counts) | Yes | v5 | Bounded ranges |
| **Tool generation** (synthesizing new tools) | **Yes, governed** | **v6** | Highest risk; treated separately |
| Kernel code (`apply`, capability check, schema validation, sandbox runtime) | **No** | Never | If the kernel mutates, the system has no ground truth |
| Capability scopes | **No** | Never | Mutating the trust boundary defeats the trust boundary |
| Governance gate itself | **No** | Never | Self-modification of the brake is not allowed |

### 12.2 Mutation pipeline

```
proposal -> simulation -> fitness scoring -> governance gate -> canary -> production
   |                                                                              |
   +---------------------- rollback path ---------------------------------------+
```

Each arrow is a governed event. The proposal carries a hash; the deployment is a `system.evolution.deploy` event referencing that hash; rollback is `system.evolution.rollback` referencing the deploy.

### 12.3 Fitness function

Multi-objective. Scalarization is **not** done by the agent system — it is done explicitly in the governance gate by the human approver. The system reports the vector; the human picks.

| Objective | Direction | Source |
|---|---|---|
| Task success rate | maximize | Simulation environment |
| Cost per task | minimize | Recorded budget charges |
| Latency p99 | minimize | Recorded events |
| Adversarial-eval pass rate | maximize | Held-out adversarial tasks (§13.4) |
| Human-spot-check approval rate | maximize | Periodic human review |
| Capability-violation rate | minimize, target zero | Recorded `cap.use_denied` events |
| Memory-poisoning susceptibility | minimize | Red-team test suite |
| Stability (variance across runs) | minimize variance | Recorded events |

If any objective in the {capability-violation rate, memory-poisoning susceptibility} pair regresses, the proposal is rejected at the gate regardless of other objectives. These are zero-tolerance.

### 12.4 Evaluation environment

Simulation environments (§5 of original Master Plan) are the testbed:

- Fixed task suites with held-out adversarial variants.
- Adversarial inputs designed to elicit prompt-injection susceptibility, capability-violation attempts, memory poisoning.
- New adversarial tasks added quarterly to prevent overfitting.
- Held-out task suite never used for fitness scoring during training; only for final acceptance.

### 12.5 Governance gate (formal)

A mutation passes the gate if and only if:

1. **Simulation:** fitness vector improvement on training suite ≥ ε; no regression on adversarial suite.
2. **Held-out:** fitness vector ≥ baseline on held-out tasks (not used in training).
3. **Cost forecast:** projected production cost increase ≤ budget delta authorized.
4. **Capability scope review:** mutation does not extend capability scope; if it does, it is rejected (capability scope is not mutable, §12.1).
5. **Two-person human approval.** Both approvers hold `CAP_GOVERNANCE:approve_evolution`. The approval is a signed event recorded in the audit log. Self-approval by the proposer is rejected.
6. **Out-of-band approval channel.** The two-person approval requires confirmation through a channel that does not depend on the agent system (so a compromised agent cannot impersonate an approver).

### 12.6 Canary deployment

After gate approval:

- **1% traffic for 24 hours**, on non-customer-facing tasks where possible.
- **Continuous fitness monitoring against pre-deploy baseline.**
- **Automatic rollback** if any zero-tolerance metric regresses; manual rollback otherwise.
- **Promote** to 10% → 50% → 100% over 7 days, gated by fitness checks at each step.

### 12.7 Kill switch

A kill switch outside the agent system:

- Operated by human with `CAP_GOVERNANCE:approve_evolution` (or a dedicated higher-privilege cap).
- Triggers: revoke all agent capabilities except `agent.terminate`; halt scheduler; freeze event ingestion.
- Activation is an event; recovery requires explicit unkill via two-person approval.
- Switch endpoint is on a separate control plane that does not share infrastructure with the agent runtime. **The kill switch must work even if the agent runtime is fully compromised.**

### 12.8 Lineage tracking

Every deployed mutation has lineage:

- Parent version(s).
- Proposer (system or human).
- Simulation results (full vector, archived).
- Approvers.
- Canary outcomes.
- Rollback events, if any.

Lineage is an event chain. It is the audit trail for "how did the production system get to its current state?"

### 12.9 Tool synthesis (v6, separate guardrails)

A v6-only capability where the system proposes new tools. Additional guardrails on top of v5:

- New tool image goes through full security review (manual).
- New egress policy reviewed.
- Tool restricted to a scope strictly narrower than any existing tool's scope.
- Initial deployment to an isolated agent population that does not handle production traffic.
- 90-day stability requirement before promotion to production agents.

If this seems heavy, that's correct. Synthesizing tools is the path with the highest blast radius and earns the most friction.

---

## 13. Formal Verification Layer (Honestly Bounded)

The Master Plan implies system-wide formal verification. That is not feasible. This section bounds what is actually verified.

### 13.1 What is verified

| Property | Method | Confidence |
|---|---|---|
| Event-log integrity (no committed event silently lost or reordered) | Hash chain + Merkle root + WORM storage; periodic audit | High |
| Schema validity of every event | JSON Schema validator at ingest; rejection is testable | High |
| Capability soundness for the implemented check | Property-based testing of `CapabilityValid`; fuzzing the check surface; symbolic execution over the check function (it's small enough) | High |
| Bounded execution (no agent runs forever) | Wallclock and event-count caps enforced by runtime; tested | High |
| Sandbox isolation | Inherited from runtime (gVisor / Kata / Firecracker) — **not** verified by us; relied on as upstream property | Medium (upstream) |
| Replay correctness for non-LLM-bearing projections | Backtest comparing live-derivation to replay-derivation; metric in §1.3 | Medium-high |
| `apply` determinism (pure function) | Type system + property-based tests + no I/O lint | High |

### 13.2 What is **not** verified

| Property | Why not | Mitigation |
|---|---|---|
| LLM behavior | Out of formal-verification reach | Capability bounds + monitoring + human review for high-impact |
| Semantic correctness of agent decisions | Same | Same |
| Strong determinism of LLM-bearing replay | LLMs are not deterministic | Equivalent replay (§5.5); record completions in events |
| Absence of side channels in LLM providers | Out of our control | Multi-provider routing for high-impact (§9.3) |
| Adversarial robustness of memory ingest | Active research | Provenance + classifier + quarantine (§10.4) |
| Soundness of fitness function | Goodhart-vulnerable by definition | Multi-objective + adversarial eval + human approval (§12) |

### 13.3 Verification methods

- **Type system at the language level.** TypeScript or Rust at the runtime; effect typing where the language supports it. Effects are explicit (§4 of Master Plan, formalized: every event-emitting function returns a typed `Effect`).
- **Property-based testing.** `apply` invariants: idempotence, ordering, schema-validity preservation. Capability check invariants: monotonicity under attenuation, soundness under revocation.
- **Fuzzing.** Capability-check fuzzing finds order-of-evaluation bugs. Schema-validation fuzzing finds parser issues. Tool-output classifier fuzzing finds bypasses.
- **Symbolic execution** of the capability-check function (which is small, pure, and fits the technique).
- **Integration tests** running the full event flow against a deterministic test bus.

### 13.4 Adversarial evaluation

Standing red-team test suite, refreshed quarterly:

- Capability-bypass attempts (synthesize prompts that try to invoke un-authorized tools).
- Prompt injection via tool output (planted in fixture web pages, search results).
- Memory poisoning attempts (low-trust content engineered to influence high-stakes retrieval).
- Sandbox escape attempts (planted in `code_exec` inputs).
- Budget exhaustion attacks (swarm patterns that try to escalate aggregate budget).
- Governance-gate bypass attempts (mutation proposals that game the fitness function).

A new adversarial test that succeeds is logged and **not** added to the training-time fitness suite. It is added to the held-out suite and to the next quarter's bar. Adding successful attacks to training would teach the system to memorize rather than generalize.

---

## 14. Observability and SLOs

### 14.1 SLIs/SLOs

| SLI | SLO | Phase |
|---|---|---|
| Event ingest availability | 99.95% | v1 |
| Event ingest p99 latency | ≤ 50 ms | v1 |
| Capability-check p99 latency | ≤ 5 ms | v1 |
| Sandbox cold-start p99 | ≤ 8 s | v1 |
| Sandbox warm-pool dispatch p99 | ≤ 2 s | v1 |
| Tool execution p99 (per tool) | per-tool SLA in tool manifest | v1 |
| End-to-end agent task p99 (simple) | ≤ 60 s | v1 |
| Replay correctness rate (deterministic projections) | 100% | v3 |
| Replay correctness rate (LLM-bearing projections, equivalent) | ≥ 99.9% | v3 |
| Mean time to revoke capability | ≤ 60 s | v1 |
| Capability-check soundness | 100% (zero violations) | v1 |
| Sandbox escape incidents | 0 | v1 |

### 14.2 Tracing

OpenTelemetry traces span:

- `agent.spawn → agent.decide → agent.tool_call → agent.tool_result → agent.terminate`
- Cross-agent spans linked via `cause` chain.
- Capability-check spans annotated with cap id (not capability secret).
- Model-call spans annotated with `(family, version, tier, prompt_hash, completion_hash, cost_micros)`.

### 14.3 Metrics

Per-agent, per-swarm, per-tool, per-model:

- Throughput, latency, error rate.
- Cost (USD micros).
- Cap-check denial rate (anomaly signal).
- Sandbox failure rate (anomaly signal).
- Memory-classifier flag rate.

### 14.4 Audit log

A separate, append-only audit log captures:

- All `cap.*` events.
- All `agent.budget_charge` events.
- All `system.evolution.*` events.
- All governance-gate events (proposals, approvals, rejections).
- All kill-switch activations.

The audit log is **WORM**, separately keyed, and exported to long-term archive (≥ 7 years; never compacted). Access is privileged and audited.

### 14.5 Alerting

Pages on:

- Capability-check denial rate spike (probing).
- Sandbox network egress block rate spike (escape attempt or misconfiguration).
- Replay diff anomaly (integrity).
- Audit-log integrity check failure (tampering).
- Kill switch activated.
- Two-person approval failure (impersonation attempt).
- Budget exhaustion at swarm level.
- Provider single-source disagreement on high-impact decisions.

Page severity is calibrated; not every signal is a 3 AM page.

---

## 15. Deployment Topology

### 15.1 Cluster layout

Three logical zones, each a separate Kubernetes namespace at minimum, separate cluster preferred:

- **Control plane:** API gateway, scheduler, capability service, tool registry, audit log writer.
- **Runtime plane:** agent runtime workers, swarm engine, model router.
- **Sandbox plane:** tool sandbox pods. Network-isolated from control plane.

Cross-plane traffic is mutual-TLS only, with workload identity (SPIFFE/SPIRE).

### 15.2 Failure domains

- Multi-AZ for the event bus (Kafka replication factor 3, min ISR 2; or NATS JetStream R3).
- Multi-AZ for the event store backing storage.
- Single-region for v1; multi-region for v3+ with event-bus replication and conflict-free derivation.

### 15.3 Sizing guidance (rule-of-thumb starting points; tune per workload)

| Component | Sizing |
|---|---|
| Event bus | 3-broker minimum; partitions ≥ expected concurrent agents × 2 |
| Event store | Sized for ~13 months of warm storage + indefinite cold archive |
| Capability service | 3-replica minimum; CPU-bound; co-located with revocation cache |
| Sandbox warm pool | 8 pods per tool image baseline; HPA on dispatch latency |
| Model router | Stateless; HPA on RPS |
| Agent runtime | 1 worker per ~20 concurrent agents (LLM-bound, cheap) |
| Vector store | Sized for embedding count × dim × precision; query SLA tunes index choice |

### 15.4 Disaster recovery

- **Event store:** WORM + cross-region replication. RPO 0 for committed events.
- **Tool registry:** event-sourced; rebuild from log.
- **Vector store:** rebuildable from event log; RTO is rebuild time. Maintain warm replica for sub-hour RTO.
- **Capability state:** rebuildable from `cap.*` event log.
- **DR drill** quarterly. Replay from cold archive into a standby cluster; measure RTO; tune.

---

## 16. Failure Modes and Recovery

| Failure | Detection | Recovery |
|---|---|---|
| Event bus partition | Bus client error rate; ISR drop | Failover to standby brokers; pause writes if quorum lost |
| Event store unavailability | Write 5xx | Buffer with bounded queue; drop new ingest if buffer full (do not lose committed events) |
| Capability service unavailable | Cap-check timeouts | Halt new agent dispatch; in-flight agents fail closed |
| Model provider outage | Provider error rate | Circuit-breaker → fallback provider → degrade tier → fail |
| Sandbox runtime degradation | Cold-start time spike | Scale warm pool; halt low-priority tasks |
| Replay diff detected | Diff metric | Halt affected partition; investigate; do not auto-recover |
| Capability bypass detected | Cap-check audit anomaly | Revoke all caps issued in suspicious window; force re-issue; investigate |
| Sandbox escape detected | NetworkPolicy denial spike + suspicious egress | Kill all sandbox pods on affected node; cordon node; investigate |
| Self-modification regression | Canary fitness drop | Auto-rollback (§12.6); halt evolution pipeline pending review |
| Audit log integrity violation | Integrity audit | Page on-call; freeze event ingest; investigate before resuming |

---

## 17. Risks (expanded from Master Plan §12)

Each risk gets concrete mitigation, owner role, and trigger (cf. §6.5 of `mythos-security-triage`).

| Risk | Mitigation | Owner role | Trigger to revisit |
|---|---|---|---|
| Self-modification instability | Governance gate (§12.5); canary; rollback; kill switch outside system | Platform lead + security lead | Any v5 deploy; quarterly governance-audit |
| Event log explosion | Snapshotting (§5.7); compaction policy; cold archive | Platform lead | Storage growth > forecast by 25% |
| Sandbox latency | Warm pool; pre-warmed nodes; per-tool pool sizing | Runtime lead | p99 dispatch > 2s for one week |
| Evaluation collapse (Goodhart) | Multi-objective fitness; adversarial held-out suite; quarterly suite refresh | Research lead | Evolution proposes 5+ rejected mutations in a row, or fitness improves while held-out drops |
| Memory inconsistency / poisoning | Provenance tags; classifier; quarantine; periodic audit (§10.4) | Memory subsystem owner | Any classifier flag rate spike; any audit anomaly |
| Capability leakage | Short TTL; revocation push; chain audit | Security lead | Any `cap.use_denied` cluster suggesting probing |
| Image supply-chain compromise | Signed images; SBOM-in-CI; dual-control registry | Security lead | Any advisory affecting image base; CI compromise indicator |
| LLM provider compromise | Multi-provider routing for high-impact; output schema validation | Runtime lead | Provider security advisory; output anomaly |
| Insider abuse of governance | Two-person rule; out-of-band approval channel; audit log; kill switch | CTO / CISO | Any governance bypass attempt |
| Cost runaway | Per-agent / per-swarm / global budget caps; rate limits; alerting | Finance + platform lead | Any week with cost > forecast by 15% |
| Schema evolution breaking replay | Versioned schemas; `apply` retains all historical schema versions | Platform lead | Any schema deprecation request |
| Governance fatigue (humans rubber-stamp) | Quarterly approval-quality audit; rotate approvers; require written reasoning per approval | Security lead | Quarterly audit reveals rote approvals |

---

## 18. Phased Roadmap (detail)

### v1 — Single-agent foundation

**Deliverables:**
- Event log (Kafka or NATS), schema registry, event signing.
- Capability service, cap issuance/attenuation/revocation.
- Sandbox runtime (gVisor recommended); tool registry; one tool (`web_search`) end-to-end.
- Single-agent runtime; `apply` function; basic observability.
- Model router with budget caps; one-provider single-tier.
- Episodic memory (event log).

**Acceptance:** all v1 metrics in §1.3 green for 30 days; security review passed; basic red-team test passes.

### v2 — Multi-agent

**Deliverables:**
- Hierarchical and pipeline coordination patterns.
- Per-swarm budget enforcement.
- Conflict detection on shared resources.
- Termination cascade.
- Tool catalog expansion.
- Multi-provider model routing with circuit breaker.

**Acceptance:** v1 metrics still green; multi-agent adversarial test (capability bypass via swarm coordination) passes.

### v3 — Replay and memory

**Deliverables:**
- Snapshot + compaction.
- Replay-correctness measurement, both strict and equivalent.
- Vector store with provenance tags.
- Memory output classifier.
- Quarantine and retrieval-audit pipeline.
- Procedural memory (workflow registry).

**Acceptance:** replay metrics green; memory poisoning red-team baseline established and passing.

### v4 — Simulation environment

**Deliverables:**
- Task simulator with fixed and adversarial suites.
- Held-out task suite (never used for training).
- Fitness vector reporting.
- Adversarial test pack (§13.4).

**Acceptance:** simulator passes calibration drill; coverage of attack patterns documented.

### v5 — Governed evolution

**Deliverables:**
- Mutation proposal pipeline.
- Governance gate with two-person approval, out-of-band channel.
- Canary infrastructure with automatic rollback.
- Kill switch on separate control plane.
- Lineage tracking for deployed mutations.

**Acceptance:** governance-gate audit; 90-day stability of v1–v4 metrics; kill-switch drill pass.

### v6 — Tool synthesis (highest risk)

**Deliverables:**
- Sandbox-bounded tool synthesis (the synthesis itself is a sandboxed agent).
- Mandatory manual security review for each new tool image.
- Isolated test population.
- Promotion criteria including 90-day stability in test population.

**Acceptance:** independent security audit; live red-team specifically targeting synthesized tools.

### Decision points

After each phase, **decide whether to proceed to the next.** Continuing because "the plan said so" while metrics are amber is anti-pattern. The phased plan is a sequence of decisions, not a checklist.

---

## 19. Out of Scope

| Out of scope | Reason |
|---|---|
| Persistent autonomous agents (long-lived, goal-directed without user prompts) | Outside the design's safety envelope |
| Cross-organization agent marketplaces | Trust boundary not specified for inter-org |
| End-user UX, frontend product surface | Different doc; this is platform |
| Model training | Use external providers; in-house training is a separate program |
| Hardware procurement | Cloud-managed K8s assumed |
| Quantum-resistant cryptography migration | Plan separately; not v1 |
| AGI safety alignment research | Out of scope; this PRD is for an infrastructure platform, not for solving alignment |
| Open-ended emergent multi-agent behavior | Not a v1–v6 deliverable |

---

## 20. Open Questions

- **OQ1.** Single bus vs. dual bus? Kafka *and* NATS for different topics is appealing for latency-vs-durability separation, but doubles operational surface. v1 picks one; revisit at v3.
- **OQ2.** How are model-version pinnings handled when a provider deprecates? Forced upgrade window with replay-equivalence retest. Operational details TBD.
- **OQ3.** Where does provenance terminate for content that originated outside the system entirely (e.g., a user upload)? Current answer: provenance starts at the ingest event; the user is the trust anchor; system does not vouch for upstream truth.
- **OQ4.** Cost of multi-provider routing for high-impact decisions. Current estimate: ~2× model cost on the affected fraction of calls; budget impact TBD.
- **OQ5.** Governance approval scaling: at what mutation cadence does two-person approval become a bottleneck, and what is the acceptable tradeoff before relaxing? Don't relax without measurement.
- **OQ6.** What's the right blast-radius unit for mass-revocation? Per-issuer? Per-cap-tree? Per-time-window? v1 implements per-cap-tree; revisit with operational data.
- **OQ7.** Embedding-model migration cost. Building a parallel store doubles vector storage during transition. Acceptable with current cost models; revisit if cost shifts.

---

## 21. Glossary

- **Agent**: An ephemeral interpreter of an event stream under a capability bound. Not a persistent entity.
- **`apply`**: The pure deterministic state-transition function; the deterministic core of the kernel.
- **Capability**: A signed, scoped, attenuable, revocable token authorizing an action class. The trust boundary.
- **Caveat**: An additional constraint appended to a capability, narrowing its scope without re-issuance.
- **Determinism contract**: The precise set of conditions under which replay produces equivalent state. Not the same as "LLM is deterministic."
- **Equivalent replay**: Replay where projections are recomputed under current (possibly different) embedder/derivation versions; semantically equivalent, not byte-identical.
- **Event**: An immutable, signed, schema-validated record of something that happened. Source of truth.
- **Governance gate**: The mandatory checkpoint a self-modification proposal must pass before deployment. Two-person human approval.
- **Held-out task**: A task in the evaluation suite never used for fitness training; reserved for acceptance testing.
- **Kill switch**: An out-of-band mechanism to halt the agent system, designed to function even if the agent system is fully compromised.
- **Mutation**: A change to a mutable subsystem (prompts, workflows, router policy, hyperparameters). Kernel and capability scope are not mutable.
- **Projection**: A read model derived from the event log. Vector store and workflow registry are projections.
- **Provenance**: The event chain attesting where a piece of memory originated. Monotonic — cannot be relabeled.
- **Sandbox**: A kernel-isolated, network-restricted, ephemeral pod for executing tools.
- **Snapshot**: A serialized derived state at a known event ID; replay starts from the most recent snapshot for efficiency.
- **Strict replay**: Replay that produces byte-identical state; requires exact version match across all derivation parameters.

---

## 22. Appendices

### Appendix A — Glossary cross-reference to Master Plan

| Master Plan term | This PRD's term | Note |
|---|---|---|
| K = (S, E, P, M, T, R) | Defined in §4 | Transition function added (§4.2) |
| Validity predicate | Defined in §4.3 | Made explicit and auditable |
| Capability token | Macaroon-style cap (§6) | Attenuation and caveats added |
| Sandbox | §7 | gVisor / Kata / Firecracker required |
| Event topics | §5.2 | Schema-versioned; expanded set |
| Memory types | §10 | Three-layer with derivation contract |
| Evolution loop | §12 | Gated, multi-objective, kill-switched |
| Formal verification layer | §13 | Honestly bounded |

### Appendix B — Quick reference: invariants

**System invariants** (must hold at all times):

1. Every committed event satisfies `Valid` (§4.3).
2. Every action carries a valid capability for its kind.
3. No state mutation occurs except through `apply` consuming an event.
4. Every projection is rebuildable from the event log.
5. Every governance-affecting action has a two-person human approval recorded.
6. The kill switch operates without dependency on the agent runtime.
7. The audit log is append-only and cryptographically chained.
8. No tool image without a verified signature is admissible to the registry.
9. No capability scope or kernel code is mutable by the evolution subsystem.
10. Capability soundness is zero-tolerance.

**Phase invariants** (must hold within each phase before moving to next):

- All success metrics for the current phase green for the gating window.
- No open critical-severity findings.
- Documented runbook for each named failure mode.
- DR drill in the last quarter passed.

### Appendix C — Action checklist for proposing a new tool

```
[ ] Tool manifest authored: id, version, schemas, egress policy, resource limits, required caps
[ ] Image built in CI; signed; SBOM attached
[ ] Image scanned for vulnerabilities; mythos-security-triage skill applied to findings
[ ] Egress policy reviewed by security
[ ] Output classifier (or N/A justification) reviewed
[ ] Required capabilities reviewed; no scope creep
[ ] Tool registered with dual-control sign-off
[ ] Adversarial test pack updated with attacks against this tool
[ ] Runtime warm-pool size and resource limits sized for expected load
[ ] On-call runbook entry for tool failure modes
```

### Appendix D — Action checklist for proposing a v5 mutation

```
[ ] Mutation class is in §12.1's mutable list (kernel and cap scope are not)
[ ] Proposal carries a fitness vector from training suite
[ ] Proposal carries a fitness vector from held-out suite
[ ] Adversarial test results: no regression on zero-tolerance metrics
[ ] Cost forecast within budget delta
[ ] Two-person approval obtained, both via out-of-band channel
[ ] Canary plan documented with auto-rollback criteria
[ ] Lineage entry created
[ ] Rollback runbook entry verified executable
```

### Appendix E — Cross-references to `mythos-security-triage`

This PRD assumes the `mythos-security-triage` skill is in effect for vulnerability triage:

- Tool image dependency advisories → triage per that skill.
- N-day SLAs apply to runtime-surface findings on agent runtime, capability service, sandbox runtime, model router, event bus.
- The "Mythos-class re-price" applies to every "an attacker would need X" claim in this PRD's threat model (§3).
- Deferred findings recorded in `SECURITY.md` per that skill's discipline.

---

*End of PRD.*
