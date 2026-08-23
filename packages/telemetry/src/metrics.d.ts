export interface MetricPoint {
    name: string;
    value: number;
    labels: Record<string, string>;
    timestamp: number;
    type: "counter" | "gauge" | "histogram";
}
export declare class AgentOSMetrics {
    private readonly counters;
    private readonly gauges;
    private readonly histograms;
    incrementCounter(name: string, value?: number, labels?: Record<string, string>): void;
    setGauge(name: string, value: number, labels?: Record<string, string>): void;
    recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
    recordExecutionDuration(durationMs: number, agentId: string): void;
    recordTokensUsed(inputTokens: number, outputTokens: number, agentId: string): void;
    recordToolCall(toolName: string): void;
    setQueueDepth(queue: string, depth: number): void;
    setWorkerUtilization(active: number, total: number): void;
    recordBudgetExceeded(agentId: string): void;
    setPendingApprovals(count: number): void;
    snapshot(): Record<string, number>;
    private key;
}
export declare function getMetrics(): AgentOSMetrics;
//# sourceMappingURL=metrics.d.ts.map