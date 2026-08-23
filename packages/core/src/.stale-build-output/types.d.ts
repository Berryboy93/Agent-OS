export type AgentStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type RunStatus = 'CREATED' | 'QUEUED' | 'SCHEDULED' | 'PENDING' | 'RUNNING' | 'WAITING_APPROVAL' | 'WAITING_DELAY' | 'RESUMING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type DeploymentStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'FAILED' | 'ROLLED_BACK' | 'ROLLING_BACK';
export type PipelineStatus = 'PENDING' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type StepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type ToolCategory = 'filesystem' | 'web' | 'code' | 'data' | 'communication' | 'custom';
export type MemoryScope = 'execution' | 'session' | 'agent' | 'pipeline' | 'persistent';
export type StreamTransport = 'sse' | 'chunked';
export type AdapterProvider = 'anthropic' | 'openai' | 'local' | string;
export type SideEffect = 'network' | 'filesystem' | 'process' | 'database' | 'human';
export interface TokenBudgetPolicy {
    maxInputTokens?: number;
    maxOutputTokens?: number;
    maxTotalTokens: number;
    onBudgetExceeded: 'hard_stop' | 'warn' | 'graceful_finish';
    warnAt?: number;
}
export type TokenBudget = TokenBudgetPolicy;
export interface RetryPolicy {
    maxAttempts: number;
    strategy: 'exponential' | 'fixed' | 'jitter';
    initialDelayMs: number;
    maxDelayMs: number;
    retryOn: Array<string>;
    backoffMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
}
export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}
export interface AdapterConfig {
    provider: AdapterProvider;
    model: string;
    apiKey?: string;
    baseURL?: string;
    temperature?: number;
    maxTokens?: number;
    tokenBudget?: TokenBudgetPolicy;
    streaming?: boolean;
    options?: Record<string, unknown>;
}
export interface AgentDefinition {
    id: string;
    name: string;
    description?: string;
    version: string;
    adapter: AdapterConfig;
    tools?: ToolDefinition[];
    systemPrompt?: string;
    tokenBudget?: TokenBudgetPolicy;
    retryPolicy?: RetryPolicy;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export interface AgentRun {
    id: string;
    agentId: string;
    agentVersion?: string;
    status: RunStatus;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    tokenUsage?: TokenUsage;
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
    checkpointId?: string;
    correlationId?: string;
    parentRunId?: string;
    pipelineRunId?: string;
    deploymentId?: string;
    metadata?: Record<string, unknown>;
}
export interface AgentResult {
    runId: string;
    agentId: string;
    status: RunStatus;
    output?: Record<string, unknown>;
    error?: string;
    tokenUsage: TokenUsage;
    durationMs: number;
    events?: AgentEvent[];
    checkpointId?: string;
}
export interface AgentEvent {
    id: string;
    runId: string;
    agentId: string;
    type: AgentEventType;
    data: Record<string, unknown>;
    timestamp: Date;
    sequenceNumber: number;
    redactionIncomplete?: boolean;
}
export type AgentEventType = 'run.started' | 'run.completed' | 'run.failed' | 'run.cancelled' | 'run.resuming' | 'turn.started' | 'turn.completed' | 'tool.called' | 'tool.result' | 'tool.error' | 'token.usage' | 'budget.warning' | 'budget.exceeded' | 'stream.chunk' | 'stream.complete' | 'checkpoint.created' | 'pipeline.started' | 'pipeline.step.started' | 'pipeline.step.completed' | 'pipeline.step.failed' | 'pipeline.completed' | 'pipeline.failed' | 'execution.waiting' | 'execution.resuming' | 'approval.requested' | 'approval.resolved' | 'approval.expired' | 'system.event_gap';
export interface StreamEvent {
    type: AgentEventType;
    runId: string;
    agentId: string;
    data: Record<string, unknown>;
    timestamp: string;
    sequenceNumber: number;
}
export interface ToolDefinition {
    name: string;
    description: string;
    category?: ToolCategory;
    inputSchema: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    idempotent: boolean;
    sideEffects: SideEffect[];
    sensitive?: boolean;
    timeoutMs?: number;
    retryPolicy?: RetryPolicy;
    execute: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}
export interface ToolContext {
    runId: string;
    agentId: string;
    turnNumber: number;
    memory: {
        get: (key: string) => unknown;
        set: (key: string, value: unknown) => void;
    };
}
export interface ToolResult {
    success: boolean;
    output: unknown;
    error?: string;
    tokenUsage?: TokenUsage;
}
export interface ToolCall {
    id: string;
    name: string;
    input: Record<string, unknown>;
}
export interface Message {
    role: 'user' | 'assistant' | 'tool';
    content: string;
    toolCallId?: string;
    toolCalls?: ToolCall[];
}
export interface ContentBlock {
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    content?: string;
}
export interface ExecutionCheckpoint {
    id: string;
    runId: string;
    agentId: string;
    turnIndex: number;
    messages: Message[];
    tokenUsage: TokenUsage;
    agentState?: Record<string, unknown>;
    createdAt: Date;
}
export interface PipelineDefinition {
    id: string;
    name: string;
    version?: string;
    description?: string;
    steps: PipelineStep[];
    metadata?: Record<string, unknown>;
}
export interface PipelineRun {
    id: string;
    pipelineId: string;
    pipelineVersion?: string;
    status: PipelineStatus;
    currentStepIndex: number;
    currentStepId?: string;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    stepResults?: Record<string, AgentResult>;
    tokenUsage?: TokenUsage;
    correlationId?: string;
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
}
export type PipelineStep = AgentStep | ToolStep | BranchStep | ParallelStep | TransformStep | ApprovalStep | DelayStep;
export interface AgentStep {
    type: 'agent';
    id: string;
    name: string;
    agentId: string;
    input?: Record<string, unknown>;
}
export interface ToolStep {
    type: 'tool';
    id: string;
    name: string;
    tool: ToolDefinition;
    input?: Record<string, unknown>;
}
export interface BranchStep {
    type: 'branch';
    id: string;
    name: string;
    condition: string;
    trueBranch: PipelineStep[];
    falseBranch: PipelineStep[];
}
export interface ParallelStep {
    type: 'parallel';
    id: string;
    name: string;
    steps: PipelineStep[];
    maxConcurrency?: number;
}
export interface TransformStep {
    type: 'transform';
    id: string;
    name: string;
    transform: (input: Record<string, unknown>) => Record<string, unknown>;
}
export interface ApprovalStep {
    type: 'approval';
    id: string;
    name: string;
    reason: string;
    timeoutMs?: number;
    webhookUrl?: string;
}
export interface DelayStep {
    type: 'delay';
    id: string;
    name: string;
    delayMs: number;
}
export interface ApprovalRequest {
    id: string;
    executionId: string;
    pipelineRunId: string;
    stepId: string;
    requestedAt: Date;
    expiresAt: Date;
    reason: string;
    payload: Record<string, unknown>;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    resolvedAt?: Date;
    resolvedBy?: string;
    resolutionNote?: string;
}
export interface Deployment {
    id: string;
    agentId: string;
    version: string;
    status: DeploymentStatus;
    target: 'local' | 'docker' | 'railway';
    rollbackOf?: string;
    config: Record<string, unknown>;
    deployedBy?: string;
    imageDigest?: string;
    deployedAt?: Date;
    createdAt: Date;
}
export interface MemoryEntry {
    key: string;
    value: unknown;
    scope: MemoryScope;
    scopeId: string;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface AdapterRunConfig {
    systemPrompt?: string;
    tools?: ToolDefinition[];
    maxTokens?: number;
    temperature?: number;
}
export interface AdapterResult {
    content: string;
    toolCalls: ToolCall[];
    stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
    usage: TokenUsage;
}
export interface StreamChunk {
    type: 'text' | 'tool_use' | 'usage' | 'stop';
    text?: string;
    toolCall?: Partial<ToolCall>;
    usage?: Partial<TokenUsage>;
    stopReason?: string;
}
export interface AdapterInstance {
    readonly provider: string;
    readonly model: string;
    supports(feature: AdapterFeature): boolean;
    run(messages: Message[], config: AdapterRunConfig): Promise<AdapterResult>;
    stream(messages: Message[], config: AdapterRunConfig): AsyncGenerator<StreamChunk>;
}
export type AdapterFeature = 'streaming' | 'tools' | 'vision' | 'json_mode';
export interface AgentRunnerConfig {
    adapter: AdapterInstance;
    tools?: ToolDefinition[];
    concurrencyLimit?: number;
    defaultTokenBudget?: TokenBudgetPolicy;
    onEvent?: (event: AgentEvent) => void | Promise<void>;
}
export interface PluginDefinition {
    name: string;
    version: string;
    displayName?: string;
    trusted: true;
    permissions?: {
        filesystem?: boolean;
        network?: boolean;
        subprocess?: boolean;
        secrets?: string[];
    };
    entryPoint?: string;
    trustedBy?: string;
    tools?: ToolDefinition[];
    onLoad?: (context: PluginContext) => Promise<void>;
    onUnload?: () => Promise<void>;
}
export interface PluginContext {
    registerTool: (tool: ToolDefinition) => void;
}
export interface HealthCheck {
    status: 'ok' | 'degraded' | 'error';
    version: string;
    checks: {
        database: 'ok' | 'error';
        securityMd: 'ok' | 'missing';
        adapters: Record<string, 'ok' | 'error'>;
        concurrency: {
            current: number;
            limit: number;
        };
    };
    timestamp: Date;
}
export interface WorkerMessage {
    type: 'event' | 'checkpoint' | 'done' | 'error';
    event?: Omit<AgentEvent, 'sequenceNumber'>;
    checkpoint?: ExecutionCheckpoint;
    run?: AgentRun;
    error?: string;
}
export interface WorkerJobData {
    runId: string;
    agentId: string;
    input: Record<string, unknown>;
    systemPrompt?: string;
    adapterConfig: AdapterConfig;
    tokenBudget?: TokenBudgetPolicy;
    checkpoint?: ExecutionCheckpoint;
    metadata?: Record<string, unknown>;
}
export interface RegistryEntry {
    id: string;
    name: string;
    version: string;
    kind: 'agent' | 'tool' | 'pipeline' | 'adapter';
    config: Record<string, unknown>;
    checksumSha256?: string;
    trusted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=types.d.ts.map