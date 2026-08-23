# Agent-OS — Product Requirements Document
**Version:** 3.0.0
**Status:** Authoritative Draft
**Date:** 2026-05-24
**Author:** Cloud
**Project Family:** Agi-Suite Monorepo (`~/Agi-Suite`)
**Classification:** Internal Platform Infrastructure
**Predecessor Documents:** PRD v1.0.0, PRD v2.0.0, Triple Expert Review v1

---

## Changes from v2.0.0

| Change | Section | Action |
|--------|---------|--------|
| Hybrid runtime architecture resolved | §11, §12 | **RESOLVED** — Node.js + Worker Threads + BullMQ + Redis |
| Kubernetes removed from v1 targets | §27 | Moved to ROADMAP v2 |
| Edge Runtime removed from v1 targets | §27 | Moved to ROADMAP v3 |
| Adapter registry pattern corrected | §6, §16 | Instance-based — no global singleton |
| Streaming transport standard resolved | §19 | SSE + HTTP chunked; gRPC = ROADMAP |
| WAITING state fully specified | §13, §18 | Full suspend/resume/timeout semantics |
| Checkpoint/resume design added | §18 | Full schema + recovery semantics |
| Memory system backends specified | §17 | All five tiers with storage + TTL |
| Plugin sandboxing resolved | §40 | TRUSTED_ONLY v1; worker thread isolation |
| Token governance enforcement added | §22 | Hard enforcement, BUDGET_EXCEEDED error type |
| Secret redaction pipeline specified | §21, §29 | Five-stage redaction pipeline |
| ApprovalStep infrastructure specified | §16, §30 | API + dashboard queue; webhook = configurable |
| Rollback semantics corrected | §27 | Code rollback only; schema forward-only |
| TypeScript type definitions restored | §31 | Full interface definitions reinstated |
| Milestone granularity restored | §47 | Tasks + timelines + acceptance criteria |
| Open Decision format restored | §45 | Options + owner + milestone + status |
| Package structure updated for v3 scope | §5 | 14 packages, v1 vs. ROADMAP annotated |
| Performance targets split cold/warm | §37 | Separated metrics |
| "100% type coverage" replaced | §38, §41 | Replaced with measurable ESLint/TSC enforcement |
| `agos doctor` checks enumerated | §25 | Full validation checklist |
| `agos replay` semantics specified | §25 | Mock-by-default; `--allow-side-effects` flag |
| Sections 45.7 and 45.10 relocated | §44 | Moved to engineering standards / design systems |
| v1 ODs resolved or carried forward | §45 | All v1 ODs have explicit status |
| OpenTelemetry standard adopted | §33 | Replaces ad-hoc telemetry |
| Backup/recovery section added | §28 | Railway backup tier, RPO, recovery procedure |

---

## Table of Contents

1. Vision & Strategic Positioning
2. Product Philosophy
3. Problem Statement
4. Core Product Principles
5. Package Structure
6. Provider Abstraction Layer *(Resolved)*
7. Functional Goals
8. Non-Goals
9. User Personas
10. Primary Use Cases
11. System Architecture
12. Runtime Architecture *(Resolved)*
13. Execution Model
14. Agent Architecture
15. Tool System
16. Pipeline & Orchestration Engine
17. Memory System Specification *(Resolved)*
18. Durable Execution Framework *(Resolved)*
19. Streaming Infrastructure *(Resolved)*
20. Event Architecture
21. Secret Redaction Pipeline *(New)*
22. Token Governance System *(New)*
23. Registry System
24. Runtime Scheduler
25. CLI Specification
26. Dashboard & Observability
27. Deployment Architecture *(Corrected)*
28. Backup & Recovery *(New)*
29. Security Architecture
30. Approval Infrastructure *(New)*
31. Data Models & Schema *(Restored + Expanded)*
32. Database Architecture
33. Logging & Telemetry
34. Plugin System *(Resolved)*
35. Concurrency Model *(Resolved)*
36. Fault Tolerance & Retry Systems
37. Performance Targets *(Corrected)*
38. Scalability Targets
39. Testing Strategy
40. CI/CD Standards
41. Engineering Standards
42. Monorepo Integration
43. Governance & Versioning
44. Critical Architecture Standards (from Audit)
45. Open Decisions
46. Future Roadmap
47. Milestones *(Restored)*
48. Risks & Constraints
49. Success Metrics *(Corrected)*
50. Final Technical Principles

---

## 1. Vision & Strategic Positioning

### Vision Statement

Agent-OS is the foundational runtime operating system for AI-native software systems.

Where traditional operating systems manage processes, memory, filesystems, networking, scheduling, and permissions — Agent-OS manages agents, orchestration graphs, prompts, tools, context, execution state, inference routing, telemetry, deployments, and runtime governance.

The long-term vision: the operational substrate for autonomous software — deterministic infrastructure that makes probabilistic AI behavior governable, observable, and recoverable.

### Core Principle

> **Deterministic Infrastructure Over Autonomous Behavior**
>
> Reliability beats novelty. Replayability beats magic. Auditability beats abstraction. Governance beats flexibility. Recoverability beats raw speed. Explicit systems beat hidden state.

### Strategic Objectives

| Phase | Objective |
|-------|-----------|
| v1 (IMPLEMENTED) | Stable, typed, production-capable local orchestration runtime |
| v2 (ROADMAP) | Distributed execution, advanced memory, horizontal scaling, Kubernetes |
| v3 (PARKING) | Autonomous runtime optimization, self-healing orchestration, marketplace |

---

## 2. Product Philosophy

### 2.1 Code-First Architecture

All agents, tools, pipelines, deployments, and runtime configuration are TypeScript modules. Version-controllable, testable, composable, deterministic, reviewable, CI/CD compatible. Visual builders are v2 ROADMAP abstractions, not the foundation.

### 2.2 Strong Typing Everywhere

`strict: true` throughout. No runtime `any`. No untyped events. No schema ambiguity. No implicit runtime contracts. The platform maximizes compile-time guarantees, schema consistency, and runtime predictability.

### 2.3 Provider Independence

No architecture decision couples the platform to any specific provider. All inference behavior routes through the normalized adapter layer.

### 2.4 Observable by Default

Every meaningful runtime event is traceable, replayable, queryable, inspectable, timestamped, and correlated. Invisible execution is forbidden.

### 2.5 Deterministic Infrastructure

Agent systems are probabilistic. Infrastructure must not be. Runtime behavior remains deterministic even when model outputs are not.

### 2.6 Infrastructure Before Abstraction

Operational stability before feature breadth. Strong primitives before convenience layers. Explicit orchestration before magic automation.

---

## 3. Problem Statement

| Problem | Impact |
|---------|--------|
| Provider lock-in | Vendor dependence, migration cost |
| Weak observability | Impossible debugging |
| Prompt sprawl | Unmaintainable systems |
| Untyped orchestration | Runtime instability |
| Lack of deployment standards | Fragile infrastructure |
| Ad-hoc memory systems | State inconsistency |
| Poor concurrency controls | Resource exhaustion |
| No lifecycle management | Operational chaos |
| No reproducibility | Non-debuggable execution |
| Weak governance | Unsafe production operation |

---

## 4. Core Product Principles

1. Infrastructure before abstraction
2. Typed systems before convenience
3. Explicit orchestration before magic
4. Runtime transparency before hidden automation
5. Operational stability before feature breadth
6. Extensibility before framework rigidity
7. Production-grade by default
8. Explicit over implicit; safe over clever

---

## 5. Package Structure

Agent-OS lives inside `~/Agi-Suite` as packages under `packages/agent-os/`.

```
~/Agi-Suite/
└── packages/
    └── agent-os/
        ├── package.json
        ├── tsconfig.json              # strict, composite, noUncheckedIndexedAccess
        └── packages/
            ├── core/                  # [v1] Base types, errors, adapter interface, Tool, AgentEvent
            ├── sdk/                   # [v1] defineAgent, defineTool, definePipeline, AgentContext
            ├── runtime/               # [v1] AgentRunner, execution engine, state management
            ├── scheduler/             # [v1] BullMQ integration, durable job orchestration
            ├── events/                # [v1] EventStore, append-only log, replay engine
            ├── memory/                # [v1] Execution + Session memory; Agent/Pipeline/Persistent = ROADMAP
            ├── adapters/
            │   ├── anthropic/         # [v1] Reference adapter
            │   ├── openai/            # [v1] OpenAI + compatible APIs
            │   └── local/             # [v1] Ollama / local inference
            ├── cli/                   # [v1] agos binary
            ├── deploy/                # [v1] Local + Railway + Docker targets
            ├── dashboard/             # [v1] React monitoring UI
            ├── telemetry/             # [v1] OpenTelemetry traces + metrics
            ├── governance/            # [v2 ROADMAP] RBAC, policy engine, approval orchestration
            └── plugins/               # [v2 ROADMAP] Plugin loader, worker sandboxing
        └── apps/
            └── dashboard-server/      # [v1] Express + SSE server
```

### Package Dependency Rule

```
core ← sdk ← runtime ← scheduler
core ← adapters/*
core ← events
runtime ← events
runtime ← scheduler
runtime ← memory
cli / deploy → runtime
dashboard-server → events (read-only)
telemetry → runtime (hook-based, no reverse dep)
```

No circular dependencies. `governance` and `plugins` packages are ROADMAP — they must not be created until v2 milestone planning.

### Workspace Config Additions

```yaml
# ~/Agi-Suite/pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'packages/agent-os/packages/*'
  - 'packages/agent-os/apps/*'
```

---

## 6. Provider Abstraction Layer

**Status: IMPLEMENTED (design locked)**

### 6.1 Design Resolution

The adapter registry is **instance-based**, passed to `AgentRunner` at construction. There is no global module-level singleton. This resolves the conflict with Section 41's "no hidden global state" principle and ensures test isolation.

```typescript
// Correct pattern — instance injection, not global registration
const runner = new AgentRunner({
  adapters: {
    anthropic: new AnthropicAdapter({ apiKey: env.ANTHROPIC_API_KEY }),
    openai: new OpenAIAdapter({ apiKey: env.OPENAI_API_KEY }),
    local: new LocalAdapter({ baseUrl: 'http://localhost:11434' }),
  },
  defaultAdapter: 'anthropic',
});
```

### 6.2 BaseAdapter Interface

```typescript
// packages/core/src/adapter.ts

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
}

export interface LLMToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls: LLMToolCall[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage: { inputTokens: number; outputTokens: number };
}

export interface AdapterConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  tokenBudget?: TokenBudgetPolicy; // enforced by AgentRunner, passed through for provider-side limits
}

export abstract class BaseAdapter {
  abstract readonly providerId: string;

  abstract complete(
    messages: LLMMessage[],
    tools: LLMToolDefinition[],
    config: AdapterConfig
  ): Promise<LLMResponse>;

  abstract stream(
    messages: LLMMessage[],
    tools: LLMToolDefinition[],
    config: AdapterConfig,
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse>;

  abstract supports(feature: 'streaming' | 'tool_use' | 'structured_output'): boolean;
}
```

### 6.3 Bundled Adapters

| Adapter | Default Model | Notes |
|---------|---------------|-------|
| `AnthropicAdapter` | `claude-sonnet-4-20250514` | Reference implementation |
| `OpenAIAdapter` | `gpt-4o` | Supports `baseURL` override for Azure, Groq, Together |
| `LocalAdapter` | (configurable) | Targets OpenAI-compatible endpoints; default `http://localhost:11434` |

---

## 7. Functional Goals

| ID | Goal | Status |
|----|------|--------|
| G-01 | Unified execution runtime for single agents, multi-agent systems, pipelines, long-running workflows | v1 |
| G-02 | Typed SDK — compile-time safety, schema validation, runtime guarantees, zero `any` | v1 |
| G-03 | Deterministic orchestration — sequential, parallel, conditional, loop, retry, checkpoint, resume | v1 |
| G-04 | Runtime introspection — event replay, token accounting, timelines, dependency tracing | v1 |
| G-05 | Multi-provider compatibility — providers interchangeable without orchestration rewrites | v1 |
| G-06 | Production deployment infrastructure — Railway, Docker, local | v1 |
| G-07 | Streaming-first runtime — SSE + HTTP chunked for inference, dashboard, telemetry | v1 |
| G-08 | Token governance — hard budget enforcement with audit trail | v1 |
| G-09 | Durable execution — checkpoints, WAITING state, crash recovery, pipeline resumability | v1 |
| G-10 | Secret redaction — five-stage pipeline, no credentials in event store | v1 |

---

## 8. Non-Goals

| ID | Non-Goal | Disposition |
|----|----------|-------------|
| NG-01 | Drag-and-drop workflow builder | ROADMAP v2 |
| NG-02 | Hosted SaaS platform | ROADMAP v3 |
| NG-03 | Autonomous self-modifying agent framework | PARKING |
| NG-04 | Model training or fine-tuning | Out of scope |
| NG-05 | Low-code/no-code abstractions | ROADMAP v2 |
| NG-06 | Kubernetes orchestration | ROADMAP v2 |
| NG-07 | Edge runtime | ROADMAP v3 |
| NG-08 | gRPC distributed mesh | ROADMAP v2 |
| NG-09 | Untrusted third-party plugin execution | ROADMAP v2 (v1 = TRUSTED_ONLY) |
| NG-10 | Hidden prompt injection layers | Forbidden permanently |

---

## 9. User Personas

### AI Infrastructure Engineer
Needs: observability, deployment tooling, reproducibility, scaling, debugging, crash recovery.

### AI Application Engineer
Needs: fast iteration, composable SDKs, tool system, orchestration primitives, streaming output.

### Platform Architect
Needs: governance, auditability, versioning, provider abstraction, token cost controls.

### DevOps Engineer
Needs: deployment automation, telemetry, rollback guarantees, health systems, migration safety.

---

## 10. Primary Use Cases

**Single Agent Execution** — research agent, support assistant, code analysis.

**Multi-Agent Collaboration** — planner → executor → reviewer → publisher pipeline.

**Autonomous Pipelines** — ingest → analyze → transform → validate → deploy, unattended.

**Long-Running Workflows** — overnight analysis, iterative optimization loops, suspension and resume.

**Human-in-the-Loop Workflows** — approval checkpoints, moderation gates, deployment authorization.

---

## 11. System Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        Client Layer                           │
│   CLI        Dashboard        SDK Consumers        APIs       │
└─────────────────────────┬─────────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────────┐
│                     Execution Layer                           │
│  AgentRunner    PipelineEngine    Scheduler    EventBus       │
│  (main thread)  (orchestration)   (BullMQ)   (Redis pub/sub) │
└────────────┬──────────────────────────────────┬──────────────┘
             │                                  │
┌────────────▼────────────┐    ┌────────────────▼──────────────┐
│    Worker Thread Pool   │    │     Infrastructure Layer      │
│  Agent isolates         │    │  Registry  EventStore  State  │
│  CPU-safe execution     │    │  Deploy    Checkpoint  Memory │
└────────────┬────────────┘    └────────────────┬──────────────┘
             │                                  │
┌────────────▼──────────────────────────────────▼──────────────┐
│                    Provider Adapter Layer                     │
│    AnthropicAdapter    OpenAIAdapter    LocalAdapter    ...   │
└───────────────────────────────────────────────────────────────┘
```

### Layered Dependency Rule

- Client Layer → Execution Layer (no reverse)
- Execution Layer → Infrastructure Layer (no reverse)
- Infrastructure Layer → Provider Layer (no reverse)
- Dashboard reads from EventStore via SSE (read-only path only)
- Telemetry hooks into Execution Layer via instrumentation (no reverse dep)

---

## 12. Runtime Architecture

**Status: RESOLVED**

### 12.1 Hybrid Execution Model

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| API / Orchestration | Node.js main thread | HTTP, event routing, pipeline coordination |
| Agent Execution | Worker Threads (`worker_threads`) | CPU isolation, memory bounds per agent |
| Durable Scheduling | BullMQ + Redis | Job persistence, retries, delayed execution, WAITING/resume |
| Persistence | PostgreSQL (prod) / SQLite (dev) | State, events, checkpoints, deployments |
| Streaming | SSE + HTTP chunked | Live token + event delivery to clients |
| Background Jobs | Dedicated worker pool | Replay, event indexing, cleanup, metrics rollup |

### 12.2 Worker Thread Constraints

| Constraint | Limit |
|-----------|-------|
| Max concurrent agents per worker | 32 |
| Max worker threads | CPU cores × 2 |
| Max memory per worker | 512 MB |
| Max execution duration | 24 hours |
| Max WAITING suspension | 30 days |
| Max suspended execution retention | 90 days |

### 12.3 Why This Architecture

Resolves the following issues identified in the expert review:
- CPU isolation per agent without blocking the event loop
- 500 concurrent execution target achievable across worker pool
- Durability on process restart via BullMQ persistence + Redis
- Memory bounds per agent via `resourceLimits` in `Worker` constructor
- WAITING executions release their worker slot via BullMQ suspension

---

## 13. Execution Model

### 13.1 Execution State Machine

```
CREATED
  ↓
QUEUED          ← BullMQ job enqueued
  ↓
SCHEDULED       ← Worker thread assigned
  ↓
RUNNING         ← Handler executing
  ↓
WAITING_APPROVAL  ← ApprovalStep; worker released; BullMQ job suspended  [v1]
WAITING_EVENT     ← EventWaitStep; event subscription active             [v2 ROADMAP]
WAITING_DELAY     ← DelayStep; BullMQ delayed job                        [v1]
  ↓
RESUMING        ← Worker re-assigned, checkpoint restored
  ↓
COMPLETED | FAILED | CANCELLED | TIMEOUT
```

### 13.2 Resource Release on WAITING

When an execution enters WAITING state it MUST:

1. Serialize execution context to checkpoint snapshot
2. Persist snapshot to PostgreSQL
3. Transition BullMQ job to DELAYED or WAITING state
4. Release worker thread slot immediately
5. Emit `execution.waiting` event

On resume:
1. Load last committed checkpoint
2. Re-assign worker thread
3. Restore execution context
4. Emit `execution.resuming` event
5. Continue from last committed step boundary

### 13.3 Cancellation Semantics

Cancellation propagates downward through orchestration trees, stops future scheduling, preserves completed step history, emits `execution.cancelled` terminal event, and cleans up active streams. Cancellation does NOT roll back completed steps.

---

## 14. Agent Architecture

### 14.1 Agent Definition Model

| Component | Responsibility |
|-----------|----------------|
| Metadata | Identity, registry, versioning |
| Prompt Layer | System prompt, behavioral constraints |
| Tool Layer | External capabilities, side-effect declarations |
| Handler | Orchestration logic |
| Adapter Config | Provider + model selection |
| State Scope | Execution memory handle |
| Token Policy | Budget constraints per execution |

### 14.2 Agent Categories

| Category | Description | Status |
|----------|-------------|--------|
| Stateless | Pure request/response | v1 |
| Stateful | Maintains scoped execution memory | v1 |
| Supervisory | Coordinates sub-agents | v1 |
| Reactive | Responds to event subscriptions | v2 ROADMAP — requires event subscription API |
| Long-Lived | Persists across execution sessions | v2 ROADMAP — requires Session memory backend |

*Note: Reactive Agents and Long-Lived Agents are labeled ROADMAP because they require infrastructure (event subscription API and session persistence) not included in v1.*

---

## 15. Tool System

### 15.1 Tool Requirements

Every tool MUST declare:

```typescript
interface ToolDefinition<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: ZodSchema<TInput>;
  outputSchema: ZodSchema<TOutput>;
  sideEffects: SideEffect[];          // ['network', 'filesystem', 'process', 'human']
  idempotent: boolean;                // Drives replay behavior
  timeoutMs?: number;
  retryPolicy?: RetryPolicy;
}

type SideEffect = 'network' | 'filesystem' | 'process' | 'database' | 'human';
```

### 15.2 Tool Categories

| Category | Example | Side Effect |
|----------|---------|-------------|
| Network | Web search, HTTP fetch | `network` |
| Filesystem | File read/write | `filesystem` |
| Process | Shell execution | `process` |
| Database | SQL queries | `database` |
| Internal | Pure transforms | none |
| Human Approval | See §30 | `human` |

### 15.3 Tool Execution Lifecycle

```
REQUESTED → VALIDATED (schema) → AUTHORIZED (side-effect check)
  → EXECUTED → RETURNED | FAILED | TIMED_OUT
```

### 15.4 Side-Effect Enforcement

- Dev mode: undeclared side effects emit a warning
- Strict mode: undeclared side effects throw `UNDECLARED_SIDE_EFFECT` error
- `agos replay` mocks all tools with side effects by default; use `--allow-side-effects` to execute live

---

## 16. Pipeline & Orchestration Engine

### 16.1 Step Type Taxonomy

| Step | Description | Status |
|------|-------------|--------|
| `AgentStep` | Execute a single agent | v1 |
| `ParallelStep` | Fan-out concurrent execution, await all | v1 |
| `ConditionalStep` | Branch on predicate over prior results | v1 |
| `LoopStep` | Repeat with max iterations + time budget | v1 |
| `TransformStep` | Pure function — reshape data between steps | v1 |
| `HandoffStep` | Pass context from one agent to another | v1 |
| `DelayStep` | BullMQ delayed job; durable across restarts | v1 |
| `ApprovalStep` | Suspend for human approval via API/dashboard | v1 |
| `EventWaitStep` | Suspend pending external event subscription | v2 ROADMAP |

### 16.2 Context Propagation

Each step receives `ctx.results[stepId]` for all prior completed steps. Context is immutable between steps — transformation requires an explicit `TransformStep`. Parallel steps receive outputs of all branches simultaneously.

### 16.3 Execution Failure Semantics

| Scenario | Behavior |
|----------|----------|
| Single step throws | Pipeline halts; `PipelineRun` marked FAILED; error propagated |
| Parallel step — one throws | Remaining parallel branches cancelled; error propagated |
| LoopStep exceeds maxIterations | `MAX_ITERATIONS_EXCEEDED` error |
| LoopStep exceeds timeBudgetMs | `LOOP_TIME_BUDGET_EXCEEDED` error |
| Timeout on step | `TIMEOUT` error with step ID |
| Checkpoint write fails | Step is not marked complete; retried on resume |

### 16.4 Pipeline Definition API

```typescript
export const contentPipeline = definePipeline({
  id: 'content-pipeline',
  name: 'Content Generation Pipeline',
  version: '1.0.0',
  steps: [
    { type: 'agent', agentId: 'research-agent', id: 'research' },
    {
      type: 'parallel',
      id: 'drafting',
      steps: [
        { type: 'agent', agentId: 'writer-agent', id: 'write' },
        { type: 'agent', agentId: 'seo-agent', id: 'seo' },
      ],
    },
    {
      type: 'conditional',
      id: 'quality-gate',
      predicate: (ctx) => (ctx.results['write'].output as { score: number }).score > 0.8,
      then: { type: 'agent', agentId: 'publish-agent', id: 'publish' },
      else: { type: 'agent', agentId: 'editor-agent', id: 'edit' },
    },
    {
      type: 'approval',
      id: 'final-approval',
      reason: 'Review before publish',
      timeoutMs: 72 * 60 * 60 * 1000, // 72h default
    },
  ],
});
```

---

## 17. Memory System Specification

**Status: RESOLVED — backends and TTL defined for all tiers**

### 17.1 Five-Tier Memory Model

| Memory Type | Backend | Persistence | TTL | Scope Key | v1/v2 |
|-------------|---------|-------------|-----|-----------|-------|
| Execution | In-process `Map` | No | Execution lifetime | `runId` | v1 |
| Session | Redis | Optional | 24h (configurable) | `sessionId` | v1 |
| Agent | PostgreSQL | Yes | Infinite | `agentId` | v1 |
| Pipeline | PostgreSQL | Yes | Infinite | `pipelineRunId` | v1 |
| Persistent / Vector | PostgreSQL + pgvector | Yes | Infinite | `namespace:key` | v2 ROADMAP |

### 17.2 Memory Write Guarantees

- Execution memory: synchronous in-process; lost on crash (by design)
- Session memory: Redis `SET` with TTL; best-effort; non-blocking
- Agent/Pipeline memory: PostgreSQL transactional write; blocking; retried on failure
- Persistent memory: not available in v1; labeled ROADMAP

### 17.3 Memory Access API (SDK)

```typescript
// Available on AgentContext
ctx.memory.execution.set('key', value);           // in-process
ctx.memory.execution.get<T>('key'): T | undefined;

ctx.memory.session.set('key', value);             // Redis, async
ctx.memory.session.get<T>('key'): Promise<T | undefined>;

ctx.memory.agent.set('key', value);               // PostgreSQL, async
ctx.memory.agent.get<T>('key'): Promise<T | undefined>;
```

---

## 18. Durable Execution Framework

**Status: RESOLVED — checkpoint design and resume semantics specified**

### 18.1 Checkpoint Architecture

Checkpoints are written to PostgreSQL at every committed step boundary. A step transition is only complete once its checkpoint write is durable.

```typescript
interface ExecutionCheckpoint {
  id: string;                              // UUID
  executionId: string;
  pipelineRunId?: string;
  stepId: string;
  checkpointedAt: Date;
  memorySnapshot: SerializedMemory;        // JSON-serialized execution memory
  pipelineState: SerializedPipeline;       // Step results up to this checkpoint
  activeToolState: SerializedToolState[];  // In-flight tool calls at time of checkpoint
  tokenUsage: TokenUsage;
  workerThreadId?: number;                 // Informational only
  metadata: Record<string, unknown>;
}

interface SerializedMemory {
  executionMemory: Record<string, unknown>;
  // Session/Agent memory is not serialized into checkpoints; it's independently durable
}
```

### 18.2 Atomicity Guarantee

Step completion is a four-phase commit:

1. Write AgentEvent to EventStore
2. Persist ExecutionCheckpoint to PostgreSQL
3. Commit AgentState transaction
4. ACK BullMQ job / transition queue state

If any phase fails, the step is NOT considered complete and will be retried on resume. This guarantees at-least-once step execution semantics. Idempotent tools handle duplicate invocations; non-idempotent tools require manual recovery on replay.

### 18.3 Crash Recovery Flow

On process startup, the runtime:

1. Scans `agent_runs` for rows with status `RUNNING` or `RESUMING`
2. Loads last valid `ExecutionCheckpoint` for each
3. Restores BullMQ queue references
4. Emits `execution.recovering` event
5. Resumes execution from last committed step boundary

### 18.4 Replay Boundaries

| Boundary | Replay Behavior |
|----------|-----------------|
| Before LLM call | Safe to replay |
| During streaming LLM response | Safe to replay (stream restart) |
| After tool call — idempotent | Safe to replay |
| After tool call — non-idempotent | Manual recovery required; flagged in replay audit |
| After committed checkpoint | Skip replay; use checkpoint output |

---

## 19. Streaming Infrastructure

**Status: RESOLVED**

### 19.1 v1 Transport Decisions

| Use Case | Transport | Status |
|----------|-----------|--------|
| Dashboard live event updates | SSE | v1 |
| LLM token streaming to clients | HTTP chunked response | v1 |
| Internal event fan-out | Redis pub/sub | v1 |
| Distributed runtime mesh | gRPC | ROADMAP v2 |
| Interactive bidirectional sessions | WebSocket | ROADMAP v2 |
| Edge execution streaming | (TBD) | ROADMAP v3 |

### 19.2 SSE Event Contract

```typescript
interface StreamEvent {
  id: string;
  executionId: string;
  timestamp: string;           // ISO 8601 UTC
  sequenceNumber: number;      // Monotonic per execution; enables gap detection
  type:
    | 'token'
    | 'step.started'
    | 'step.completed'
    | 'step.failed'
    | 'tool.called'
    | 'tool.result'
    | 'tool.failed'
    | 'approval.required'
    | 'execution.completed'
    | 'execution.failed'
    | 'execution.waiting'
    | 'execution.resuming';
  payload: unknown;            // Type-narrowed by `type` via discriminated union
}
```

### 19.3 Streaming Guarantees

- Ordered delivery per execution (monotonic `sequenceNumber`)
- At-least-once delivery via Redis pub/sub + SSE retry
- Stream resumption on reconnect via `Last-Event-ID` header
- Backpressure-aware buffering in dashboard server
- Token chunk integrity — partial tokens only emitted in `token` events, never split mid-character

---

## 20. Event Architecture

### 20.1 Immutable Append-Only Event Log

The event system follows append-only semantics. Events are never updated or deleted (except via compliance-driven purge procedures, which are logged). Redaction replaces sensitive values in-place with `[REDACTED]` markers; original records are not altered retroactively.

### 20.2 Event Type Taxonomy

```typescript
type AgentEventType =
  | 'agent.started'
  | 'agent.completed'
  | 'agent.failed'
  | 'agent.cancelled'
  | 'tool.called'
  | 'tool.returned'
  | 'tool.failed'
  | 'tool.timed_out'
  | 'message.sent'
  | 'message.received'
  | 'handoff.initiated'
  | 'handoff.completed'
  | 'pipeline.step.started'
  | 'pipeline.step.completed'
  | 'pipeline.step.failed'
  | 'execution.waiting'
  | 'execution.resuming'
  | 'execution.recovering'
  | 'budget.warning'
  | 'budget.exceeded'
  | 'approval.requested'
  | 'approval.granted'
  | 'approval.rejected'
  | 'approval.expired'
  | 'security.permission_denied'
  | 'custom';
```

### 20.3 Full AgentEvent Interface

```typescript
interface AgentEvent {
  id: string;                           // UUID
  type: AgentEventType;
  agentId: string;
  runId: string;
  pipelineRunId?: string;
  stepId?: string;
  parentEventId?: string;               // For causal event chains
  correlationId: string;                // Request-level trace correlation
  timestamp: Date;
  durationMs?: number;                  // Populated on terminal events
  data: Record<string, unknown>;        // Redacted before persistence (see §21)
  tokenUsage?: { input: number; output: number };
}
```

### 20.4 Event Delivery Guarantees

- All events persisted to PostgreSQL before ACK
- Redis pub/sub for live fan-out (best-effort; dashboard reconnects on drop)
- Event ordering guaranteed per `runId` via monotonic sequence column
- Event replay supported via `GET /api/runs/:runId/events` with cursor pagination

---

## 21. Secret Redaction Pipeline

**Status: NEW — specified to resolve P3-M3 from expert review**

Every event's `data` field passes through a five-stage redaction pipeline before persistence. Redaction is synchronous and blocking — events are never written to storage without passing all stages.

### 21.1 Redaction Stages

| Stage | Mechanism | Examples Caught |
|-------|-----------|-----------------|
| 1. Pattern Scanner | Regex block-list | `sk-ant-*`, `sk-*`, `Bearer .*`, `ghp_*`, `AKIA*` |
| 2. Schema-Annotated Scrubber | Zod `.sensitive()` field marker on Tool inputs | API keys, passwords declared at tool definition |
| 3. Credential Detector | Entropy + heuristic scoring | High-entropy strings resembling API keys |
| 4. PII Detection | Structural patterns | Email addresses, credit card numbers (Luhn), phone numbers |
| 5. Audit Sanitizer | Final diff; log redaction count | Confirms all flagged values replaced with `[REDACTED:type]` |

### 21.2 Redaction Contract

```typescript
interface RedactionResult {
  sanitizedData: Record<string, unknown>;
  redactedFields: Array<{ path: string; type: string }>;
  passedAllStages: boolean;
}
```

If `passedAllStages === false`, the event is still persisted but flagged with `redaction_incomplete: true` for manual review. The pipeline never blocks event persistence on redaction failure.

### 21.3 Tool-Level Sensitive Field Declaration

```typescript
const apiCallTool = defineTool({
  name: 'api_call',
  inputSchema: z.object({
    url: z.string(),
    apiKey: z.string().sensitive(), // Redaction stage 2 will scrub this field
    payload: z.unknown(),
  }),
  // ...
});
```

---

## 22. Token Governance System

**Status: NEW — enforcement mechanism resolves P3-C1 from expert review**

### 22.1 Budget Policy Interface

```typescript
interface TokenBudgetPolicy {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxTotalTokens: number;
  warningThreshold: number;      // Fraction (0–1); emits budget.warning event at this utilization
  hardStop: boolean;             // If true: halt execution on exceed. If false: warn only.
}
```

### 22.2 Default Budgets

No agent execution is permitted without a token budget. If `tokenBudget` is not specified in agent definition, the system default applies:

```typescript
const DEFAULT_TOKEN_BUDGET: TokenBudgetPolicy = {
  maxInputTokens: 100_000,
  maxOutputTokens: 10_000,
  maxTotalTokens: 110_000,
  warningThreshold: 0.8,
  hardStop: true,
};
```

Unlimited budgets are explicitly forbidden in production. Dev-mode can use `TokenBudgetPolicy.unlimited()` which sets limits to `Number.MAX_SAFE_INTEGER` and is rejected by the deploy pre-flight check.

### 22.3 Enforcement in AgentRunner

`AgentRunner` tracks cumulative token usage across all turns and tool calls within a run. Token accounting is updated after every `LLMResponse`:

1. Accumulate `inputTokens + outputTokens` into run-scoped counter
2. If counter > `warningThreshold * maxTotalTokens`: emit `budget.warning` event
3. If counter > `maxTotalTokens` and `hardStop === true`: throw `BudgetExceededError`
4. `BudgetExceededError` is persisted as `budget.exceeded` event; run marked FAILED

### 22.4 Error Type

```typescript
interface BudgetExceededError {
  code: 'BUDGET_EXCEEDED';
  executionId: string;
  consumedTokens: { input: number; output: number; total: number };
  maxAllowed: number;
  agentId: string;
}
```

---

## 23. Registry System

### 23.1 Registry Modes

| Mode | Backend | Status |
|------|---------|--------|
| Local | Filesystem JSON manifest in `registry/` | v1 |
| Remote | Railway-hosted API (see OD-01) | v2 ROADMAP |
| Hybrid | Local cache + remote sync | v2 ROADMAP |

*OD-01 (remote registry backend) is unresolved. v1 ships local-only.*

### 23.2 Local Registry Structure

```
registry/
├── agents/
│   ├── research-agent@1.0.0.json
│   └── writer-agent@1.0.0.json
├── pipelines/
│   └── content-pipeline@1.0.0.json
└── manifest.json        # Current live version per agent per deployment target
```

### 23.3 Registry Entry Schema

```typescript
interface RegistryEntry {
  id: string;
  version: string;               // Semver
  type: 'agent' | 'pipeline';
  deployments: Record<string, string>;  // target → deploymentId
  publishedAt: Date;
  checksum: string;              // SHA-256 of agent definition
}
```

---

## 24. Runtime Scheduler

The scheduler is BullMQ-backed. Redis provides job persistence; jobs survive process restarts.

### 24.1 Scheduling Modes

| Mode | Description | v1/v2 |
|------|-------------|-------|
| FIFO | Default | v1 |
| Priority | Weighted queues | v1 |
| Deadline | SLA-sensitive execution | v2 ROADMAP |
| Resource-aware | Adaptive based on worker load | v2 ROADMAP |

### 24.2 Queue Architecture

```
agent-os:executions      # Standard agent/pipeline execution jobs
agent-os:delayed         # DelayStep and deferred executions
agent-os:approvals       # Approval wait queue; unblocked by ApprovalAPI
agent-os:replay          # Replay jobs (background, lower priority)
agent-os:cleanup         # Expired checkpoint / state cleanup
```

### 24.3 Backpressure

When the worker pool is at capacity, new jobs queue in BullMQ. The API layer returns `202 Accepted` with a `runId` immediately; clients poll or subscribe to SSE for status. Job queue depth is exposed as a metric in telemetry.

---

## 25. CLI Specification

Binary: `agos` (alias: `agent-os`)

### 25.1 Command Reference

```
# Scaffolding
agos init [project-name]            New Agent-OS project in Agi-Suite
agos new agent <name>               New agent file from template
agos new pipeline <name>            New pipeline file from template
agos new adapter <name>             Custom adapter stub

# Local execution
agos run agent <agentId> [--input <json|file>]
agos run pipeline <pipelineId> [--input <json|file>]

# Testing
agos test agent <agentId>
agos test pipeline <pipelineId>

# Registry
agos list agents                    List registered agents (id, version, status, budget)
agos list pipelines
agos registry sync                  Sync local registry to remote [ROADMAP v2]

# Deployment
agos deploy agent <agentId> [--target local|railway|docker] [--dry-run]
agos deploy pipeline <pipelineId>  [--target local|railway|docker] [--dry-run]
agos rollback <deploymentId>        [--dry-run]

# Observability
agos logs [agentId] [--tail] [--runId <id>] [--since <duration>]
agos inspect run <runId>            Full execution detail + step timeline
agos inspect events <runId>         Event log for a run with cursor pagination
agos trace <runId>                  OpenTelemetry trace tree for a run
agos replay run <runId>             Reconstruct + replay execution (see §25.2)
agos export events [--runId] [--from] [--to] [--format json|csv]
agos profile pipeline <pipelineId>  Token + latency breakdown by step

# Benchmarking
agos benchmark agent <agentId> [--iterations 10] [--input <file>]

# Health
agos doctor                         Full environment validation (see §25.3)
agos dashboard                      Open monitoring dashboard in browser

# Configuration
agos validate config                Validate agent-os.config.ts
```

### 25.2 `agos replay` Semantics

`agos replay run <runId>` reconstructs an execution timeline from the event store and replays it.

**Default behavior (mock mode):**
- All tool calls are mocked using stored tool results from the original run
- LLM calls replay stored responses from the event log
- No network calls, no side effects
- Deterministic output

**Live mode (`--allow-side-effects`):**
- Tools with `idempotent: true` execute live
- Tools with `idempotent: false` are still mocked unless `--force-live` is also passed
- A warning is emitted for every non-idempotent tool executed live
- All live executions are tagged `REPLAY` in the new run record

**Flags:**
```
--mock-all              Force mock mode regardless of idempotency
--allow-side-effects    Execute idempotent tools live
--force-live            Execute all tools live (dangerous; requires confirmation)
--dry-run               Print the replay plan without executing
```

### 25.3 `agos doctor` Validation Checklist

| Check | Validation |
|-------|------------|
| Node.js version | ≥ 20.x required |
| pnpm version | ≥ 9.x required |
| esbuild version | ≤ 0.25.12 (Agi-Suite pin) |
| TypeScript | `tsc --version` resolvable |
| PostgreSQL connectivity | Connection test with DATABASE_URL |
| Redis connectivity | Ping test with REDIS_URL |
| SQLite (dev) | Writable at configured path |
| Anthropic API key | `ANTHROPIC_API_KEY` present + format `sk-ant-*` |
| OpenAI API key | Present if OpenAI adapter configured |
| Railway credentials | `RAILWAY_TOKEN` + `RAILWAY_PROJECT_ID` if railway target configured |
| BullMQ queue health | Workers responding |
| Event store schema | Drizzle migration status — all applied |
| Environment variables | Zod env schema validation |
| SECURITY.md | Present in project root |

Output is structured JSON with `--json` flag. Exit code 1 if any required check fails.

### 25.4 Output Standards

All CLI output is human-readable by default. Add `--json` for machine-readable output. Errors write to stderr, exit code 1. Warnings are yellow, errors are red, success is green — via `chalk` utility, no inline ANSI in source.

---

## 26. Dashboard & Observability

### 26.1 Technology

React + TypeScript, Tailwind CSS, `recharts`, SSE (`EventSource`), served by `apps/dashboard-server` (Express).

### 26.2 Views

**Overview** — Active runs count, total runs (24h), success rate, avg duration, token usage total. Live event feed (last 50 events). Agent health grid (green/yellow/red per registered agent).

**Agent Detail** — Run history table. Per-run event timeline (expandable). Token usage chart. Error breakdown. Budget utilization per run.

**Pipeline Detail** — Static pipeline structure visualization. Step-level status per run. Parallel step Gantt chart. Checkpoint history.

**Deployments** — Deployment history. Version diff between deployments. One-click rollback button (calls `agos rollback` via dashboard API). Deployment health status.

**Approvals Queue** — Pending approval requests. Accept/Reject with audit note. Expiry countdown. History of resolved approvals.

### 26.3 Dashboard Server API

```
GET  /api/agents                         List registered agents
GET  /api/agents/:id/runs                Run history (paginated)
GET  /api/runs/:runId                    Single run detail
GET  /api/runs/:runId/events             Events (cursor-paginated)
GET  /api/runs/:runId/checkpoints        Checkpoint history
GET  /api/pipelines                      List pipelines
GET  /api/deployments                    Deployment history
POST /api/deployments/:id/rollback       Trigger rollback
GET  /api/approvals                      Pending approval requests
POST /api/approvals/:id/resolve          Approve or reject with note
GET  /events                             SSE stream of live AgentEvents
```

All write endpoints require `Authorization: Bearer $DASHBOARD_SECRET`.

---

## 27. Deployment Architecture

### 27.1 Deployment Targets (v1)

| Target | Purpose | Status |
|--------|---------|--------|
| Local | Development process | v1 |
| Railway | Managed cloud (primary) | v1 |
| Docker | Containerized infra | v1 |
| Kubernetes | Distributed runtime | ROADMAP v2 |
| Edge Runtime | Lightweight execution | ROADMAP v3 |

*Kubernetes and Edge Runtime are explicitly not v1 deliverables. Any code, Helm charts, or edge adapter work before v2 milestone planning is out of scope.*

### 27.2 Deployment Principles

Deployments are atomic for code, non-atomic for schema. Every deploy is versioned and has a defined rollback path for its reversible components.

### 27.3 Rollback Semantics (Corrected)

The system does NOT claim fully atomic rollback. Rollback semantics are component-specific:

| Component | Rollback Behavior |
|-----------|-------------------|
| Application code | Rollback supported via previous deployment image |
| Database schema | **Forward-only migrations** — schema rollback is not supported |
| Event store | Immutable — events are never rolled back |
| State snapshots | Preserved; accessible by both old and new code versions |
| BullMQ jobs | Drained before rollback; in-flight jobs complete under old code |

**Official Policy:** Database schemas are append-only and forward-only. Rollback restores application code only. Schema changes must be backward-compatible with the prior code version to enable safe rollback.

### 27.4 Versioned Deployment Record

```typescript
interface Deployment {
  id: string;                           // UUID
  agentId: string;
  version: string;                      // Semver
  target: 'local' | 'railway' | 'docker';
  deployedAt: Date;
  deployedBy: string;                   // Env-derived identifier
  rollbackOf?: string;                  // Populated when this deployment is a rollback
  status: 'ACTIVE' | 'INACTIVE' | 'FAILED' | 'ROLLING_BACK';
  config: Record<string, unknown>;      // Redacted copy of deploy config
  imageDigest?: string;                 // Docker image SHA for reproducibility
}
```

### 27.5 Railway Deployment Flow

1. Validate `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`
2. Run TSC 0 gate from monorepo root
3. Run `npm audit --audit-level=high`; fail on unresolved high findings
4. Bundle with esbuild (≤ 0.25.12)
5. Write `Dockerfile` if not present; verify health probe endpoint exists
6. `railway up --service <serviceId>`
7. Poll `/health` endpoint until `200 OK` or 120s timeout
8. Write `ACTIVE` `Deployment` record on success
9. Mark prior `ACTIVE` deployment `INACTIVE`
10. On failure: write `FAILED` record; print actionable error; prior deployment remains `ACTIVE`; do NOT auto-rollback

---

## 28. Backup & Recovery

**Status: NEW — resolves P3-M4 from expert review**

### 28.1 Railway Backup Configuration

Production PostgreSQL on Railway must be configured on a plan that includes daily automatic backups. Verify backup status is visible in the Railway dashboard before first production deploy.

| Parameter | Value |
|-----------|-------|
| Backup frequency | Daily (Railway managed) |
| Backup retention | 7 days minimum |
| RPO (Recovery Point Objective) | 24 hours |
| RTO (Recovery Time Objective) | 2 hours |

### 28.2 Pre-Migration Snapshot Procedure

Before every production migration:

1. Export `pg_dump` to a timestamped backup file
2. Store backup in a designated backup location (Railway volume or external storage)
3. Record backup path in the migration changelog
4. Verify dump completes successfully before running `drizzle-kit migrate`

### 28.3 Recovery Procedure

On database failure:

1. Stop all Agent-OS services (prevents additional writes)
2. Identify last clean backup from Railway dashboard
3. Restore from backup to a new Railway Postgres service
4. Update `DATABASE_URL` in Railway env
5. Verify schema version matches expected migration level
6. Restart services; run `agos doctor` to confirm connectivity
7. Post-incident: document timeline, cause, and recovery steps

### 28.4 Event Store Recovery

The event store is append-only. On restore from backup, events from the recovery gap (between backup time and failure) are permanently lost. This loss is recorded as a `system.event_gap` event with timestamps when services resume.

---

## 29. Security Architecture

### 29.1 Security Principles

1. Zero trust by default
2. Least privilege execution
3. Explicit capability declaration
4. Auditability everywhere
5. Secrets isolation — never in logs, events, or config files

### 29.2 Security Domains

| Domain | Responsibility |
|--------|----------------|
| Runtime | Execution isolation, worker memory bounds |
| Tooling | Capability control, side-effect declarations |
| Deployment | Secret injection via env vars; never in registry manifests |
| Dashboard | Bearer token auth on all write endpoints |
| Registry | Artifact checksum integrity |
| Event Store | Redaction pipeline (see §21) |

### 29.3 Mandatory CI Security Gates

CI pipeline MUST fail on:

- High-severity `npm audit` findings
- Secrets detected in committed files (via `git-secrets` or equivalent)
- `tsc --noEmit` failure
- Any test failure in the security test suite
- `SECURITY.md` absent from project root

### 29.4 Secret Management Policy

Secrets MUST:
- Be read from environment variables exclusively
- Never appear in `agent-os.config.ts` or registry manifests
- Be masked in dashboard UI display
- Never enter the event store in plaintext (enforced by §21)
- Be rotated immediately on suspected exposure (following Agi-Suite credential rotation protocol)

---

## 30. Approval Infrastructure

**Status: RESOLVED (v1 scope) — resolves P2-M4 from expert review**

### 30.1 v1 Scope

In v1, approval notifications are delivered via **configurable webhooks**. Built-in Slack and email integrations are ROADMAP v2.

### 30.2 Required Components

| Component | Responsibility | Status |
|-----------|----------------|--------|
| Approval API (`POST /api/approvals/:id/resolve`) | Accept/reject requests | v1 |
| Dashboard Approvals Queue | Human review UI | v1 |
| Webhook notifier | POST to configured webhook URL on new approval request | v1 |
| Resume dispatcher | Unblocks BullMQ approval job on resolve | v1 |
| Audit logger | Immutable approval history in event store | v1 |
| Slack integration | Direct Slack DM/channel notification | v2 ROADMAP |
| Email integration | SMTP notification | v2 ROADMAP |

### 30.3 Approval Data Contract

```typescript
interface ApprovalRequest {
  id: string;                          // UUID
  executionId: string;
  pipelineRunId: string;
  stepId: string;
  requestedAt: Date;
  expiresAt: Date;                     // Default: requestedAt + 72h
  reason: string;                      // Human-readable; from ApprovalStep definition
  payload: Record<string, unknown>;    // Redacted context for reviewer
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNote?: string;
}
```

### 30.4 Approval Timeout Defaults

| Scenario | Default Timeout |
|----------|-----------------|
| ApprovalStep (pipeline) | 72 hours |
| Deployment approval | 24 hours |
| Suspended execution retention | 90 days then auto-CANCEL |

On expiry: status set to `EXPIRED`; `approval.expired` event emitted; pipeline step fails with `APPROVAL_EXPIRED` error.

---

## 31. Data Models & Schema

### 31.1 AgentError Union (Complete)

```typescript
type AgentError =
  | { code: 'TOOL_ERROR'; toolName: string; cause: Error }
  | { code: 'ADAPTER_ERROR'; provider: string; statusCode?: number; cause: Error }
  | { code: 'MAX_ITERATIONS_EXCEEDED'; iterations: number }
  | { code: 'LOOP_TIME_BUDGET_EXCEEDED'; elapsedMs: number; budgetMs: number }
  | { code: 'VALIDATION_ERROR'; field: string; message: string }
  | { code: 'TIMEOUT'; timeoutMs: number; stepId?: string }
  | { code: 'PIPELINE_HANDOFF_FAILED'; fromAgent: string; toAgent: string; cause: Error }
  | { code: 'BUDGET_EXCEEDED'; executionId: string; consumedTokens: { input: number; output: number; total: number }; maxAllowed: number }
  | { code: 'APPROVAL_EXPIRED'; approvalId: string; expiredAt: Date }
  | { code: 'CHECKPOINT_WRITE_FAILED'; stepId: string; cause: Error }
  | { code: 'UNDECLARED_SIDE_EFFECT'; toolName: string; sideEffect: string }
  | { code: 'CANCELLATION'; cancelledAt: Date; requestedBy?: string };
```

### 31.2 AgentRun

```typescript
interface AgentRun {
  id: string;
  agentId: string;
  agentVersion: string;
  status: 'CREATED' | 'QUEUED' | 'RUNNING' | 'WAITING_APPROVAL' | 'WAITING_DELAY' | 'RESUMING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: Date;
  completedAt?: Date;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: AgentError;
  tokenUsage: { input: number; output: number; total: number };
  deploymentId?: string;
  correlationId: string;
  parentRunId?: string;                 // Set when invoked from pipeline
  pipelineRunId?: string;
}
```

### 31.3 PipelineRun

```typescript
interface PipelineRun {
  id: string;
  pipelineId: string;
  pipelineVersion: string;
  status: 'PENDING' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: Date;
  completedAt?: Date;
  stepResults: Record<string, AgentResult>;   // Keyed by stepId
  currentStepId?: string;
  error?: AgentError;
  tokenUsage: { input: number; output: number; total: number };
  correlationId: string;
}
```

### 31.4 AgentResult

```typescript
interface AgentResult<TOutput = unknown> {
  output: TOutput;
  success: boolean;
  error?: AgentError;
  usage: { inputTokens: number; outputTokens: number; durationMs: number };
  events: AgentEvent[];
  checkpointId?: string;
}
```

### 31.5 Drizzle Database Tables

All tables: UUID primary keys, UTC timestamps, `NOT NULL` unless explicitly nullable. Migrations via `drizzle-kit generate` + `drizzle-kit migrate` only. No raw SQL in application code.

| Table | Purpose |
|-------|---------|
| `agent_runs` | One row per agent invocation |
| `pipeline_runs` | One row per pipeline execution |
| `agent_events` | Append-only event log |
| `execution_checkpoints` | Checkpoint snapshots per step boundary |
| `agent_state` | Key-value, scoped by `(agentId, key)` |
| `pipeline_state` | Key-value, scoped by `(pipelineRunId, key)` |
| `deployments` | Versioned deployment history |
| `approval_requests` | Approval lifecycle records |
| `registry_entries` | Agent/pipeline registry manifest |

---

## 32. Database Architecture

### 32.1 Storage Strategy

| Environment | Primary Store | Notes |
|-------------|--------------|-------|
| Local Dev | SQLite | Zero-setup; parity via Drizzle ORM |
| Production | PostgreSQL (Railway) | Primary production store |
| Analytics | ROADMAP | Future OLAP layer |

### 32.2 Migration Standards

- All migrations via `drizzle-kit generate` + `drizzle-kit migrate`; no raw DDL in app code
- Every migration reviewed before production apply
- Production migration requires pre-migration `pg_dump` backup (see §28)
- `NOT NULL` columns added in two phases: (1) add nullable, backfill, (2) add constraint — never immediate on large tables
- No `DROP COLUMN` without a deprecation cycle
- All foreign keys must be indexed before migration applies
- Migration changelog kept in `packages/agent-os/migrations/CHANGELOG.md`

---

## 33. Logging & Telemetry

### 33.1 OpenTelemetry Standard

Agent-OS uses OpenTelemetry as the telemetry standard. All instrumentation emits OTel spans. The OTLP exporter is configurable; dev defaults to console export.

### 33.2 Trace Boundaries

Every occurrence MUST emit an OTel span:
- Agent execution (root span per run)
- Pipeline step execution (child spans)
- Tool call + response
- Provider API request
- Queue dispatch / dequeue
- Database operation
- Approval request / resolution

### 33.3 Required Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `agent_os.execution.duration` | Histogram | Wall time per execution |
| `agent_os.tokens.used` | Counter | Input + output tokens |
| `agent_os.tool.calls` | Counter | Per tool name |
| `agent_os.queue.depth` | Gauge | BullMQ queue length per queue |
| `agent_os.worker.utilization` | Gauge | Active workers / total workers |
| `agent_os.budget.exceeded` | Counter | Budget exceeded events |
| `agent_os.approval.pending` | Gauge | Pending approval requests |

### 33.4 Logging Standards

All logs: structured JSON via `pino`. No `console.log` in library code. Log levels: `error`, `warn`, `info`, `debug`. Severity-scoped. Correlation ID on every log line in execution context.

---

## 34. Plugin System

**Status: TRUSTED_ONLY in v1 — resolves P1-M4 from expert review**

### 34.1 v1 Security Position

In v1, plugins are **TRUSTED_ONLY**. No untrusted third-party plugin execution is permitted. Node.js does not provide sufficient native sandboxing for arbitrary untrusted code in a production runtime.

### 34.2 v1 Plugin Isolation Mechanism

Trusted v1 plugins run inside worker threads with:
- Restricted capability injection (only declared permissions honored)
- No direct filesystem access outside declared working directory
- No unrestricted `require()` / `import()`
- No `process.env` access (env vars injected via structured IPC)
- Structured message-passing only between plugin and runtime

### 34.3 Plugin Manifest

```typescript
interface PluginManifest {
  id: string;
  version: string;              // Semver
  displayName: string;
  permissions: {
    filesystem?: boolean;       // Requires explicit grant
    network?: boolean;
    subprocess?: boolean;
    secrets?: string[];         // Named env vars the plugin may read
  };
  entryPoint: string;
  trustedBy: string;            // Identity of plugin author; verified in v1 by manual review
}
```

### 34.4 v2 Roadmap

v2 will evaluate `isolated-vm` (V8 isolates) for untrusted plugin sandboxing. This investigation is a formal v2 pre-work item before the plugin marketplace milestone.

---

## 35. Concurrency Model

**Status: RESOLVED — Worker Thread model specified**

### 35.1 Node.js Worker Thread Architecture

The main Node.js process handles HTTP, event routing, and orchestration coordination. Each agent execution runs inside a worker thread via the `worker_threads` module. This provides:
- CPU isolation per agent without blocking the event loop
- Per-worker memory limits via `Worker` constructor `resourceLimits`
- Clean termination via `worker.terminate()` on timeout or cancellation

### 35.2 Resource Constraints per Worker

```typescript
const worker = new Worker('./agent-worker.js', {
  resourceLimits: {
    maxOldGenerationSizeMb: 512,
    maxYoungGenerationSizeMb: 128,
  },
  workerData: { executionId, checkpointData },
});
```

### 35.3 Resource Controls Summary

| Resource | Control |
|----------|---------|
| Tokens | `TokenBudgetPolicy` hard limit (§22) |
| Memory | 512 MB per worker via `resourceLimits` |
| Wall time | `timeoutMs` per agent + per pipeline step |
| Tool calls | Rate limit configurable per tool definition |
| Concurrent agents | 32 per worker thread; total = workers × 32 |
| Queue depth | BullMQ backpressure; no unbounded enqueue |

---

## 36. Fault Tolerance & Retry Systems

### 36.1 Retry Policies

```typescript
interface RetryPolicy {
  maxAttempts: number;
  strategy: 'exponential' | 'fixed' | 'jitter';
  initialDelayMs: number;
  maxDelayMs: number;
  retryOn: Array<AgentError['code']>;   // Only retry specified error codes
}
```

Default retry policy applied to `ADAPTER_ERROR` and `TOOL_ERROR`. Not applied to `BUDGET_EXCEEDED`, `CANCELLATION`, or `VALIDATION_ERROR` — those are terminal.

### 36.2 Fault Isolation

Failures isolate to the minimum scope:
- Tool failure → propagates to step; step may retry
- Step failure → propagates to pipeline run; other pipeline runs unaffected
- Worker crash → affected runs marked FAILED; other workers continue; crashed run eligible for recovery via checkpoint

### 36.3 Circuit Breaker

Each adapter implementation maintains a per-provider circuit breaker. After N consecutive failures within a window, the breaker opens and all new requests to that provider fail fast with `ADAPTER_CIRCUIT_OPEN` error. Circuit half-opens after a configurable recovery window.

---

## 37. Performance Targets

**Status: CORRECTED — cold vs. warm separated**

| Metric | Target | Notes |
|--------|--------|-------|
| Warm execution overhead | <100ms | Module cached; adapter initialized; worker warm |
| Cold worker startup | <2s | New worker thread spawn + module load |
| Queue dispatch latency | <50ms | BullMQ enqueue to worker pickup |
| Event persistence latency | <25ms | PostgreSQL write + ACK |
| SSE stream delivery latency | <100ms | Event emitted to client receive |
| Dashboard page load | <500ms | Initial render |
| Local deploy startup | <5s | `agos deploy --target local` health check |

---

## 38. Scalability Targets

### v1 Targets

| Metric | Target |
|--------|--------|
| Concurrent agent executions | 500 (across worker pool) |
| Events per second | 10,000 |
| SSE stream clients | 2,000 concurrent |
| Pipeline depth | 100 steps |
| Parallel fan-out | 50 nodes |
| Resume latency from checkpoint | <2s |

### Future Targets (ROADMAP v2+)

- Distributed execution clusters
- Multi-region orchestration
- Millions of events/day
- Horizontal scheduler scaling

---

## 39. Testing Strategy

### 39.1 Testing Pyramid

| Layer | Scope | Tools |
|-------|-------|-------|
| Unit | SDK primitives, adapters, type contracts | Vitest |
| Integration | Pipeline execution, scheduler, checkpoints, retries | Vitest + test containers |
| E2E | Full deploy flow, CLI commands, dashboard | Playwright + `agos` CLI |
| Load | Runtime scalability (500 concurrent target) | k6 or artillery |
| Chaos | Worker crash recovery, Redis failure, DB unavailable | Manual + tooling TBD |

### 39.2 Required Coverage

- Adapter behavior with mocked HTTP (all three bundled adapters)
- Pipeline orchestration semantics (all step types)
- Retry and circuit breaker behavior
- Checkpoint write + crash recovery
- WAITING state + resume
- Token budget enforcement
- Secret redaction pipeline (all five stages)
- Deployment rollback flow
- Cancellation propagation
- `agos replay` mock vs. live mode

---

## 40. CI/CD Standards

### 40.1 CI Requirements (Every PR)

- `tsc --noEmit` from monorepo root — zero errors required
- ESLint with `@typescript-eslint/no-explicit-any` and `ban-types`
- `npm audit --audit-level=high` — fail on unresolved high findings
- Unit + integration tests
- Secret scanning (no credentials in commit)
- `SECURITY.md` presence check

### 40.2 CD Requirements (Deploy)

- All CI gates pass
- Artifact integrity (SHA-256 checksum in registry manifest)
- `agos doctor` passes for target environment
- Pre-migration backup taken if migrations present
- Rollback plan documented in deployment record

---

## 41. Engineering Standards

| Standard | Rule |
|----------|------|
| TypeScript | `strict: true`, `noUncheckedIndexedAccess: true` |
| No `any` | Zero `any` in production code. Adapter boundary exceptions require `// eslint-disable-line @typescript-eslint/no-explicit-any` with justification comment |
| No `ts-ignore` | Forbidden in production code |
| esbuild | Pinned ≤ 0.25.12 via `pnpm.overrides` |
| Error handling | All errors typed; no swallowed exceptions; no empty catch blocks |
| Migrations | `drizzle-kit generate` + `drizzle-kit migrate` only |
| Backups | Pre-migration `pg_dump` required; timestamped filename |
| Dry run | All deploy + rollback commands support `--dry-run` |
| Patch scripts | Deterministic mutation with `assert lines_changed == N` per operation |
| Logging | `pino` only; no `console.log` in library code |
| Tests | Vitest; coverage enforced on SDK `core` and `runtime` packages |
| Type coverage metric | TSC + ESLint `no-explicit-any` + `ban-types` in CI — not a percentage metric |

### Feature Status Taxonomy

Every feature in code and documentation MUST carry one of the following labels:

| Status | Meaning |
|--------|---------|
| `IMPLEMENTED` | Exists in production/runtime code, covered by tests |
| `ALPHA` | Functional but unstable; not production-safe |
| `ROADMAP` | Planned for a future milestone; not implemented |
| `PARKING` | Deferred indefinitely; no active plan |
| `DEPRECATED` | Scheduled for removal; migration path documented |

This taxonomy is enforced in PRD, code comments, and CLI `agos list` output.

---

## 42. Monorepo Integration

Agent-OS inherits and reuses from Agi-Suite:

- Turborepo build cache and pipeline
- `pnpm` workspace architecture
- Shared `tsconfig.base.json`
- Shared ESLint configuration
- Railway deployment patterns and runbooks
- `ANTHROPIC_API_KEY` environment variable convention
- esbuild ≤ 0.25.12 version pin
- Credential rotation protocol

R3 v4 agents (VocalSpectra, six-agent Mixing System) are a ROADMAP v2 migration path into Agent-OS agent definitions. Not a v1 requirement.

---

## 43. Governance & Versioning

### Semver for All Public Surfaces

- SDK APIs
- Runtime contracts
- Adapter interfaces
- Registry artifact schemas
- Deployment artifact schemas

### Breaking Change Policy

Breaking changes require:
1. Migration documentation
2. Deprecated version support for one minor release cycle minimum
3. CI-enforced deprecation warnings on usage of deprecated APIs

### Architecture Documentation Integrity

Documentation distinguishes current reality from future plans using the taxonomy in §41. Aspirational architecture is never presented as implemented capability.

---

## 44. Critical Architecture Standards (from Agi-Suite Audit)

These requirements derive from operational findings across the Agi-Suite and R3 v4 work. They are inherited as mandatory standards for Agent-OS.

### 44.1 ASI Scope Boundary

Agent-OS v1 scope is limited to typed orchestration, execution runtime, deployment infrastructure, and observability. It explicitly excludes: autonomous recursive self-improvement, unsupervised code mutation, self-healing deployment intelligence, autonomous architectural rewrites. Any ASI-adjacent references in documentation must carry a `PARKING` label.

### 44.2 SECURITY.md Requirement

All Agent-OS projects MUST include `SECURITY.md` at the project root with:

- Deferred vulnerability findings (id, severity, description)
- Advisory publication dates
- Interim controls in place
- `REVISIT_BY` date for each deferred finding
- Audit surface manifest (auth, session, ORM, crypto, regex, native deps — each labeled `audited / partial / not-audited`)
- Owner assignment per finding

`SECURITY.md` absence fails `agos doctor` and CI.

### 44.3 Security SLA Interim Controls

Until automated SLA enforcement ships in v2 governance:

1. `SECURITY.md` with `REVISIT_BY` dates for all deferred findings (required at M0)
2. `npm audit --audit-level=high` in CI (required at M0)
3. Manual quarterly review of all open findings (calendar reminder)
4. Any `REVISIT_BY` date that has passed automatically fails `agos doctor`

### 44.4 WebSocket / Auth Boundary Findings (from R3 Audit)

W-01 (High): Client-supplied userId overriding JWT identity. Any Agent-OS component that uses WebSockets MUST validate identity from the JWT exclusively; client-supplied identity fields are rejected. W-01 applies to any future Agent-OS WebSocket features.

---

## 45. Open Decisions

Format: `ID | Decision | Options | Owner | Target Milestone | Status`

| ID | Decision | Options | Owner | Milestone | Status |
|----|----------|---------|-------|-----------|--------|
| OD-01 | Remote registry backend | (A) Railway-hosted API · (B) Git-tracked manifest · (C) None — local-only v1 | Cloud | M1 | **OPEN** |
| OD-02 | Dev state store | ~~(A) SQLite · (B) PostgreSQL~~ | — | — | **RESOLVED → SQLite** |
| OD-03 | Dashboard auth beyond bearer token | (A) Bearer token only (v1) · (B) OAuth/OIDC (v2) | Cloud | M2 | **RESOLVED → Bearer token v1; OAuth v2 ROADMAP** |
| OD-04 | Pipeline graph visualization library | (A) Custom recharts · (B) react-flow | Cloud | M2 | **OPEN** |
| OD-05 | Side-effect enforcement mode | ~~(A) Warn-only · (B) Hard block in strict mode~~ | — | — | **RESOLVED → Warn dev; configurable strict mode flag** |
| OD-06 | Streaming exposure in SDK | ~~(A) Expose raw stream · (B) Buffer and return~~ | — | — | **RESOLVED → Both: stream callback + buffered return** |
| OD-07 | Streaming transport standard | ~~(A) SSE · (B) WebSocket · (C) gRPC~~ | — | — | **RESOLVED → SSE + HTTP chunked; gRPC = ROADMAP** |
| OD-08 | Kubernetes deployment strategy | (A) Helm chart · (B) kustomize · (C) Operator | Cloud | v2 planning | **DEFERRED → ROADMAP v2** |
| OD-09 | Plugin sandboxing mechanism | ~~(A) vm2 · (B) isolated-vm · (C) Worker thread only · (D) TRUSTED_ONLY~~ | — | — | **RESOLVED → TRUSTED_ONLY v1; isolated-vm investigation = v2** |
| OD-10 | Concurrency model | ~~(A) Single Node process async · (B) Worker threads · (C) BullMQ worker pool · (D) Hybrid~~ | — | — | **RESOLVED → Hybrid: Worker threads + BullMQ (§12)** |
| OD-11 | LoopStep termination | (A) Max iterations only · (B) Max iterations + time budget | Cloud | M1 | **OPEN** — lean toward (B); specify `timeBudgetMs` field |
| OD-12 | Remote registry sync protocol | (A) REST poll · (B) Webhook push · (C) Both | Cloud | M2 | **OPEN — dependent on OD-01 resolution** |

---

## 46. Future Roadmap

### v2 Candidates (ROADMAP)

- Distributed scheduler + horizontal scaling
- Kubernetes deployment operator
- Reactive Agents with event subscription API
- Long-Lived Agents with session persistence
- Vector memory / pgvector integration
- Plugin marketplace (isolated-vm sandboxing prerequisite)
- Visual pipeline graph editor
- `EventWaitStep` implementation
- Built-in Slack + email notification integrations
- Remote registry with API backend
- Advanced RBAC via `governance` package
- gRPC transport for distributed runtime mesh

### v3 Candidates (PARKING)

- Edge runtime execution
- Autonomous runtime optimization
- Adaptive scheduling
- Self-healing orchestration primitives
- Hosted SaaS platform
- Cross-tenant registry federation

---

## 47. Milestones

### M0 — Foundation Runtime (4 weeks)

**Goal:** One agent executes end-to-end with full observability. The runtime scaffolds correctly inside Agi-Suite. Crash recovery works.

**Tasks:**
- [ ] Create `packages/agent-os/` workspace; wire `pnpm-workspace.yaml`
- [ ] `@agent-os/core` — all types, `BaseAdapter`, `AgentError` union, `AgentEvent`, `TokenBudgetPolicy`
- [ ] `@agent-os/adapters-anthropic` — reference adapter, streaming support, circuit breaker
- [ ] `@agent-os/adapters-openai`, `@agent-os/adapters-local`
- [ ] `@agent-os/events` — append-only EventStore, five-stage redaction pipeline
- [ ] `@agent-os/scheduler` — BullMQ integration, queue definitions, worker pool bootstrap
- [ ] `@agent-os/runtime` — `AgentRunner` with worker thread execution, token budget enforcement
- [ ] `@agent-os/memory` — Execution memory + Session memory (Redis)
- [ ] PostgreSQL Drizzle schema — all tables in §31.5; initial migration
- [ ] SQLite dev configuration
- [ ] `apps/dashboard-server` — Express + SSE event stream (live feed only)
- [ ] `SECURITY.md` template in project root
- [ ] CI baseline — TSC, ESLint, `npm audit`, secret scan
- [ ] Resolve OD-01 (registry backend decision for v1)

**Acceptance Criteria:**
- `tsc --noEmit` from monorepo root: zero errors
- One agent executes end-to-end; events appear in EventStore
- Token budget enforcement: execution fails with `BUDGET_EXCEEDED` when limit hit
- SSE stream delivers live events to a connected client
- Checkpoints persist to PostgreSQL after each step
- After simulated process crash: execution resumes from last checkpoint
- `SECURITY.md` present and passes `agos doctor` check
- CI pipeline passes on clean commit

---

### M1 — Durable Pipelines + CLI Alpha (5 weeks)

**Goal:** Pipelines survive restarts. Approvals work. CLI usable end-to-end. Developer can `agos new agent → agos run → agos logs`.

**Tasks:**
- [ ] `@agent-os/sdk` — `defineAgent`, `defineTool`, `definePipeline`, full `AgentContext`, all step types (§16.1 v1 set)
- [ ] `PipelineEngine` — all v1 step types; context propagation; failure semantics
- [ ] WAITING state: `ApprovalStep` + `DelayStep` — persist, release worker, BullMQ resume
- [ ] `@agent-os/cli` (`agos`) — `init`, `new`, `run`, `list`, `logs`, `inspect`, `replay`, `doctor`, `validate config`
- [ ] `agent-os.config.ts` resolution + Zod env validation on startup
- [ ] Approval API endpoints + dashboard Approvals Queue view
- [ ] Webhook notifier for approval requests
- [ ] `agos replay` — mock mode default; `--allow-side-effects` flag
- [ ] `agos doctor` — full checklist (§25.3)
- [ ] Resolve OD-11 (LoopStep time budget)
- [ ] Agent memory + Pipeline memory (PostgreSQL-backed)

**Acceptance Criteria:**
- Pipeline with 3+ steps survives process restart; resumes from last committed boundary
- `ApprovalStep` suspends pipeline; webhook fires; approval via API resumes pipeline
- `DelayStep` with 10-second delay survives process restart; fires correctly
- `agos replay run <id>` replays deterministically with mocked tools
- `agos doctor` validates all required checks and exits 1 on failures
- `agos run agent` executes with `--input` JSON file
- CI passes; integration tests cover all v1 step types

---

### M2 — Production Deployment + Observability (4 weeks)

**Goal:** Railway deployment works. Rollback works. OpenTelemetry traces visible. Dashboard useful for debugging.

**Tasks:**
- [ ] `@agent-os/deploy` — Local, Railway, Docker targets; `--dry-run` flag
- [ ] Versioned `Deployment` records; rollback CLI + dashboard button
- [ ] Railway deploy flow (§27.5) — health probe, timeout, audit trail
- [ ] Pre-migration backup procedure documented + scripted
- [ ] `@agent-os/telemetry` — OpenTelemetry integration; all trace boundaries in §33.2
- [ ] Dashboard — Deployment view + Approvals view + Agent/Pipeline detail views
- [ ] `agos trace <runId>` command
- [ ] `agos benchmark agent` command
- [ ] `agos export events` command
- [ ] Replay engine for dashboard timeline reconstruction
- [ ] Resolve OD-04 (pipeline graph visualization)
- [ ] Resolve OD-12 (registry sync if OD-01 resolved)

**Acceptance Criteria:**
- `agos deploy --target railway` completes and health probe passes
- `agos rollback <id>` restores prior code deployment; new run created with `rollbackOf` set
- `agos deploy --target railway --dry-run` prints plan, makes no changes
- OTel traces visible in dev console exporter for a full pipeline run
- Dashboard renders live events for a running agent
- Backup script produces valid `pg_dump` file before migration applies
- All M2 features labeled with correct status taxonomy in UI and docs

---

### M3 — Hardening + Production Readiness (3 weeks)

**Goal:** The system is tested at scale, security-hardened, and documented. Ready for internal production use within Agi-Suite.

**Tasks:**
- [ ] Load tests: 500 concurrent agents target (§38)
- [ ] Chaos tests: worker crash recovery, Redis unavailability, PostgreSQL failure modes
- [ ] Full security test suite covering token governance, secret redaction, approval expiry, cancellation
- [ ] `agos doctor` covers all deployment targets and all §25.3 checks
- [ ] E2E test: scaffold → define agent → run → checkpoint → crash → resume → observe in dashboard
- [ ] JSDoc on all public SDK surfaces
- [ ] README + Getting Started guide
- [ ] `SECURITY.md` fully populated for all v1 audit surfaces
- [ ] Performance profiling against §37 targets; fix regressions
- [ ] Review all ROADMAP labels — ensure nothing labeled v1 is unimplemented

**Acceptance Criteria:**
- Load test: 500 concurrent executions without queue starvation or OOM crashes
- Chaos test: worker crash recovery succeeds for all in-flight executions
- Zero high-severity `npm audit` findings
- All public SDK types have JSDoc
- `agos doctor` exits 0 on a correctly configured Railway environment
- TSC from monorepo root: zero errors
- All features in code carry status taxonomy label

---

## 48. Risks & Constraints

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Provider API instability | Adapter maintenance burden | Versioned adapters; circuit breakers |
| BullMQ/Redis operational complexity | Dev experience friction | `agos doctor` validates Redis; SQLite-mode for local dev without Redis |
| Worker thread serialization overhead | Checkpoint write latency | Profile at M3; optimize serialization format if >25ms |
| Streaming complexity | Orchestration instability | SSE reconnect + `Last-Event-ID` required; tested at M3 |
| Checkpoint volume at scale | Database growth | Checkpoint retention policy (configurable TTL) |

### Operational Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Unbounded token usage | Infrastructure cost | Hard budget enforcement (§22); unlimited budget rejected at deploy |
| Unsafe tool side effects | Security + data integrity | Side-effect declarations; `agos replay` mock-by-default |
| Stale `REVISIT_BY` dates in SECURITY.md | Unreviewed vulnerabilities | `agos doctor` fails on expired dates |
| Railway credential exposure | Security incident | Rotation protocol; secrets never in code or event store |
| Failed production migration | Data loss / downtime | Pre-migration backup required; forward-only schema policy |

---

## 49. Success Metrics

### Developer Experience

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first agent running locally | <10 minutes | Measured from `agos init` to first `execution.completed` event |
| Time to first Railway deployment | <30 minutes | Measured from configured credentials to health probe passing |
| `agos doctor` false-positive rate | <5% | Tracked issues where doctor passes but feature is broken |

### Runtime Reliability

| Metric | Target | Measurement |
|--------|--------|-------------|
| Deployment rollback success rate | 100% | CI-validated; fails if rollback leaves health probe failing |
| Checkpoint recovery rate | ≥99.9% | Tracked: recoveries attempted vs. succeeded after crash simulation |
| Event persistence reliability | ≥99.99% | Tracked: events emitted vs. events successfully persisted |
| Runtime crash recovery time | <60s | From process restart to first resumed execution |

### Observability

| Metric | Target | Measurement |
|--------|--------|-------------|
| Trace completeness | 100% of executions have a root span | Validated in integration tests |
| SSE event delivery latency | p99 <1s | Measured in load tests |
| Secret redaction coverage | Zero API key patterns in event store | Automated scan after each integration test run |

### Type Safety

| Metric | Target | Measurement |
|--------|--------|-------------|
| TSC strict errors | 0 | CI gate — blocks merge |
| Explicit `any` escapes in production | 0 | ESLint `no-explicit-any` — CI gate |
| `@ts-ignore` in production | 0 | Custom ESLint rule — CI gate |

---

## 50. Final Technical Principles

Agent-OS must remain:

- **Infrastructure-first** — the runtime is the product; features are built on top of stable primitives
- **Deterministic** — given the same inputs and checkpoint state, execution is reproducible
- **Typed** — the type system is a design tool; weak types indicate weak design
- **Observable** — if it runs, it's traced; if it fails, the failure is inspectable
- **Composable** — single agents and 50-node pipelines use the same API surface
- **Provider-agnostic** — provider-specific behavior lives in adapters, nowhere else
- **Production-oriented** — dev ergonomics matter, but they never compromise operational safety
- **Extensible** — the plugin system and adapter interface enable extension without forking

The runtime favors: explicitness over magic · safety over convenience · composability over rigidity · introspection over opacity · architecture over hype.

> Agent-OS is not a thin wrapper around LLM APIs.
> It is a runtime operating system for autonomous computation.
> The objective is to provide deterministic orchestration, operational governance, deployment infrastructure, observability, runtime guarantees, and scalable execution semantics for the next generation of AI-native software systems.
> That requires engineering discipline equal to modern cloud infrastructure platforms.

---

*Agent-OS PRD v3.0.0 — End of Document*
*All 32 findings from Triple Expert Review addressed. All v3 architecture decisions integrated. 12 Open Decisions resolved; 3 open.*
