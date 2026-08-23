import type { AgentEvent } from "@agent-os/core";
export interface Span {
    spanId: string;
    traceId: string;
    name: string;
    startTime: number;
    endTime?: number;
    attributes: Record<string, string | number | boolean>;
    status: "ok" | "error" | "unset";
    parentSpanId?: string;
    events: Array<{
        name: string;
        timestamp: number;
        attributes?: Record<string, string | number | boolean>;
    }>;
}
export interface TracerConfig {
    serviceName?: string;
    serviceVersion?: string;
    exporter?: "console" | "otlp" | "none";
    otlpEndpoint?: string;
}
export declare class AgentOSTracer {
    private readonly serviceName;
    private readonly serviceVersion;
    private readonly exporter;
    private readonly spans;
    constructor(config?: TracerConfig);
    startSpan(name: string, parentSpanId?: string): Span;
    endSpan(spanId: string, status?: "ok" | "error", attributes?: Record<string, string | number | boolean>): void;
    addEvent(spanId: string, name: string, attributes?: Record<string, string | number | boolean>): void;
    fromAgentEvent(event: AgentEvent, parentSpanId?: string): void;
    private export;
}
export declare function getTracer(config?: TracerConfig): AgentOSTracer;
export declare function configureTracer(config: TracerConfig): AgentOSTracer;
//# sourceMappingURL=tracer.d.ts.map