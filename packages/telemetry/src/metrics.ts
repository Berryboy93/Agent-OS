export interface MetricPoint {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
  type: "counter" | "gauge" | "histogram";
}

export class AgentOSMetrics {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();

  incrementCounter(
    name: string,
    value = 1,
    labels: Record<string, string> = {},
  ): void {
    const key = this.key(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value,
    );
  }

  setGauge(
    name: string,
    value: number,
    labels: Record<string, string> = {},
  ): void {
    const key = this.key(name, labels);
    this.gauges.set(key,
      value,  );
  }

  recordHistogram(
    name: string,
    value: number,
    labels: Record<string, string> = {},
  ): void {
    const key = this.key(name, labels);
    if (!this.histograms.has(key))
      this.histograms.set(key,
        [],  );
    this.histograms.get(key)!.push(value);
  }

  recordExecutionDuration(durationMs: number, agentId: string): void {
    this.recordHistogram("agent_os.execution.duration", durationMs, {
      agent_id: agentId,
    });
  }

  recordTokensUsed(
    inputTokens: number,
    outputTokens: number,
    agentId: string,
  ): void {
    this.incrementCounter("agent_os.tokens.used", inputTokens + outputTokens, {
      agent_id: agentId,
      type: "total",
    });
    this.incrementCounter("agent_os.tokens.used", inputTokens, {
      agent_id: agentId,
      type: "input",
    });
    this.incrementCounter("agent_os.tokens.used", outputTokens, {
      agent_id: agentId,
      type: "output",
    });
  }

  recordToolCall(toolName: string): void {
    this.incrementCounter("agent_os.tool.calls", 1, { tool: toolName });
  }

  setQueueDepth(queue: string, depth: number): void {
    this.setGauge("agent_os.queue.depth", depth, { queue });
  }

  setWorkerUtilization(active: number, total: number): void {
    this.setGauge(
      "agent_os.worker.utilization",
      total > 0 ? active / total : 0,
      {},
    );
  }

  recordBudgetExceeded(agentId: string): void {
    this.incrementCounter("agent_os.budget.exceeded", 1, { agent_id: agentId });
  }

  setPendingApprovals(count: number): void {
    this.setGauge("agent_os.approval.pending", count, {});
  }

  snapshot(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [k, v] of this.counters) result[`counter.${k}`] = v;
    for (const [k, v] of this.gauges) result[`gauge.${k}`] = v;
    for (const [k, values] of this.histograms) {
      if (values.length === 0) continue;
      const sorted = [...values].sort((a, b) => a - b);
      result[`histogram.${k}.p50`] =
        sorted[Math.floor(sorted.length * 0.5)] ?? 0;
      result[`histogram.${k}.p99`] =
        sorted[Math.floor(sorted.length * 0.99)] ?? 0;
      result[`histogram.${k}.count`] = values.length;
    }
    return result;
  }

  private key(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return labelStr ? `${name}{${labelStr}}` : name;
  }
}

let _metrics: AgentOSMetrics | null = null;

export function getMetrics(): AgentOSMetrics {
  if (!_metrics) _metrics = new AgentOSMetrics();
  return _metrics;
}
