# API Reference

## DAG Compiler

### `DAGCompiler.compile(dag: DAG): ExecutionPlan`
Compiles a validated DAG into an execution plan with stages, critical path, and risk score.

### `DAGValidator.validate(dag: DAG): { valid: boolean; errors: string[] }`
Validates DAG structure: acyclicity, reachability, executor presence.

## Agent OS Runtime

### `AgentSandbox.execute(code: string, input: object): SandboxResult`
Executes code in a sandboxed VM with configurable timeouts, memory limits, and module restrictions.

### `CapabilityManager.checkCapability(agentId, resource, action): boolean`
Checks if an agent has a specific capability.

### `AgentExecutor.executeNode(node: DAGNode): NodeExecutionResult`
Executes a single DAG node with capability checks and event emission.

## Mythos Policy Engine

### `MythosEngine.registerPolicy(name: string, dsl: string): void`
Registers a policy from DSL source.

### `MythosEngine.evaluate(eventType, context): PolicyDecision`
Evaluates all registered policies against an event context.

## Event Store

### `PostgresEventStore.append(event): StoreEvent`
Appends an event with SHA-256 cryptographic chaining.

### `PostgresEventStore.verifyChain(): { valid: boolean }`
Verifies the integrity of the entire event chain.

### `HybridEventStore.append(event): void`
Writes to Postgres (source of truth) + publishes to Kafka (streaming).

## Swarm Runtime

### `SwarmOrchestrator.submitDAG(dag: DAG): string`
Submits a DAG for distributed execution. Returns job ID.

### `DAGScheduler.schedule(plan, dag): ScheduleResult`
Partitions DAG into parallel stages and assigns to agents.

## Simulation Engine

### `CounterfactualEngine.evaluate(dag: DAG): CounterfactualResult`
Generates execution branches, scores them, and provides recommendations.

## Civilization Orchestrator

### `CivilizationOrchestrator.initiateGoal(goalId): CoordinationSession`
Starts a long-horizon goal execution session.

### `CivilizationOrchestrator.executePhase(sessionId, phaseIndex): void`
Executes a specific phase of a strategy.
