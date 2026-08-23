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

export class AgentOSTracer {
  private readonly serviceName: string;
  private readonly serviceVersion: string;
  private readonly exporter: "console" | "otlp" | "none";
  private readonly spans = new Map<string, Span>();

  constructor(config: TracerConfig = {}) {
    this.serviceName = config.serviceName ?? "agent-os";
    this.serviceVersion = config.serviceVersion ?? "3.0.0";
    this.exporter =
      config.exporter ??
      (process.env["OTEL_EXPORTER"] as
        | "console"
        | "otlp"
        | "none"
        | undefined) ??
      "console";
  }

  startSpan(name: string, parentSpanId?: string): Span {
    const span: Span = {
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
    this.spans.set(span.spanId,
      span,  );
    return span;
  }

  endSpan(
    spanId: string,
    status: "ok" | "error" = "ok",
    attributes?: Record<string, string | number | boolean>,
  ): void {
    const span = this.spans.get(spanId);
    if (!span) return;
    span.endTime = Date.now();
    span.status = status;
    if (attributes) {
      Object.assign(span.attributes, attributes);
    }
    this.export(span);
    this.spans.delete(spanId);
  }

  addEvent(
    spanId: string,
    name: string,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    const span = this.spans.get(spanId);
    if (!span) return;
    span.events.push({ name, timestamp: Date.now(), attributes });
  }

  fromAgentEvent(event: AgentEvent, parentSpanId?: string): void {
    const span = this.startSpan(`agent.event.${event.type}`, parentSpanId);
    span.attributes["agent.run_id"] = event.runId;
    span.attributes["agent.id"] = event.agentId;
    span.attributes["event.type"] = event.type;
    this.endSpan(span.spanId, "ok");
  }

  private export(span: Span): void {
    if (this.exporter === "none") return;
    if (this.exporter === "console") {
      const duration =
        span.endTime !== undefined ? span.endTime - span.startTime : 0;
      console.log(
        `[OTEL] ${span.name} trace=${span.traceId.slice(0, 8)} span=${span.spanId.slice(0, 8)} status=${span.status} duration=${duration}ms`,
      );
    }
  }
}

let _tracer: AgentOSTracer | null = null;

export function getTracer(config?: TracerConfig): AgentOSTracer {
  if (!_tracer) {
    _tracer = new AgentOSTracer(config);
  }
  return _tracer;
}

export function configureTracer(config: TracerConfig): AgentOSTracer {
  _tracer = new AgentOSTracer(config);
  return _tracer;
}
