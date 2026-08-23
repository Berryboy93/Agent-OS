export class AgentOSTracer {
    serviceName;
    serviceVersion;
    exporter;
    spans = new Map();
    constructor(config = {}) {
        this.serviceName = config.serviceName ?? "agent-os";
        this.serviceVersion = config.serviceVersion ?? "3.0.0";
        this.exporter =
            config.exporter ??
                process.env["OTEL_EXPORTER"] ??
                "console";
    }
    startSpan(name, parentSpanId) {
        const span = {
            spanId: crypto.randomUUID(),
            traceId: parentSpanId
                ? (this.spans.get(parentSpanId)?.traceId ?? crypto.randomUUID())
                : crypto.randomUUID(),
            name,
            startTime: Date.now(),
            attributes: {
                "service.name": this.serviceName,
                "service.version": this.serviceVersion,
            },
            status: "unset",
            events: [],
            ...(parentSpanId !== undefined ? { parentSpanId } : {}),
        };
        this.spans.set(span.spanId, span);
        return span;
    }
    endSpan(spanId, status = "ok", attributes) {
        const span = this.spans.get(spanId);
        if (!span)
            return;
        span.endTime = Date.now();
        span.status = status;
        if (attributes) {
            Object.assign(span.attributes, attributes);
        }
        this.export(span);
        this.spans.delete(spanId);
    }
    addEvent(spanId, name, attributes) {
        const span = this.spans.get(spanId);
        if (!span)
            return;
        span.events.push({ name, timestamp: Date.now(), attributes });
    }
    fromAgentEvent(event, parentSpanId) {
        const span = this.startSpan(`agent.event.${event.type}`, parentSpanId);
        span.attributes["agent.run_id"] = event.runId;
        span.attributes["agent.id"] = event.agentId;
        span.attributes["event.type"] = event.type;
        this.endSpan(span.spanId, "ok");
    }
    export(span) {
        if (this.exporter === "none")
            return;
        if (this.exporter === "console") {
            const duration = span.endTime !== undefined ? span.endTime - span.startTime : 0;
            console.log(`[OTEL] ${span.name} trace=${span.traceId.slice(0, 8)} span=${span.spanId.slice(0, 8)} status=${span.status} duration=${duration}ms`);
        }
    }
}
let _tracer = null;
export function getTracer(config) {
    if (!_tracer) {
        _tracer = new AgentOSTracer(config);
    }
    return _tracer;
}
export function configureTracer(config) {
    _tracer = new AgentOSTracer(config);
    return _tracer;
}
//# sourceMappingURL=tracer.js.map