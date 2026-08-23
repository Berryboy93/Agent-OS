export class AgentOSMetrics {
    counters = new Map();
    gauges = new Map();
    histograms = new Map();
    incrementCounter(name, value = 1, labels = {}) {
        const key = this.key(name, labels);
        this.counters.set(key, (this.counters.get(key) ?? 0) + value);
    }
    setGauge(name, value, labels = {}) {
        const key = this.key(name, labels);
        this.gauges.set(key, value);
    }
    recordHistogram(name, value, labels = {}) {
        const key = this.key(name, labels);
        if (!this.histograms.has(key))
            this.histograms.set(key, []);
        this.histograms.get(key).push(value);
    }
    recordExecutionDuration(durationMs, agentId) {
        this.recordHistogram("agent_os.execution.duration", durationMs, {
            agent_id: agentId,
        });
    }
    recordTokensUsed(inputTokens, outputTokens, agentId) {
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
    recordToolCall(toolName) {
        this.incrementCounter("agent_os.tool.calls", 1, { tool: toolName });
    }
    setQueueDepth(queue, depth) {
        this.setGauge("agent_os.queue.depth", depth, { queue });
    }
    setWorkerUtilization(active, total) {
        this.setGauge("agent_os.worker.utilization", total > 0 ? active / total : 0, {});
    }
    recordBudgetExceeded(agentId) {
        this.incrementCounter("agent_os.budget.exceeded", 1, { agent_id: agentId });
    }
    setPendingApprovals(count) {
        this.setGauge("agent_os.approval.pending", count, {});
    }
    snapshot() {
        const result = {};
        for (const [k, v] of this.counters)
            result[`counter.${k}`] = v;
        for (const [k, v] of this.gauges)
            result[`gauge.${k}`] = v;
        for (const [k, values] of this.histograms) {
            if (values.length === 0)
                continue;
            const sorted = [...values].sort((a, b) => a - b);
            result[`histogram.${k}.p50`] =
                sorted[Math.floor(sorted.length * 0.5)] ?? 0;
            result[`histogram.${k}.p99`] =
                sorted[Math.floor(sorted.length * 0.99)] ?? 0;
            result[`histogram.${k}.count`] = values.length;
        }
        return result;
    }
    key(name, labels) {
        const labelStr = Object.entries(labels)
            .map(([k, v]) => `${k}=${v}`)
            .join(",");
        return labelStr ? `${name}{${labelStr}}` : name;
    }
}
let _metrics = null;
export function getMetrics() {
    if (!_metrics)
        _metrics = new AgentOSMetrics();
    return _metrics;
}
//# sourceMappingURL=metrics.js.map