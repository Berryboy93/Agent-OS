import { WireMiddleware } from "./wire/WireMiddleware.js";
import type { AgentEvent, AgentEventType } from "@agent-os/core";

type EventHandler = (event: AgentEvent) => void | Promise<void>;

export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly allHandlers = new Set<EventHandler>();
  private sequenceCounters = new Map<string, number>();

  on(type: AgentEventType | "*", handler: EventHandler): () => void {
    if (type === "*") {
      this.allHandlers.add(handler);
      return () => this.allHandlers.delete(handler);
    }
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set(),
      );
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  async emit(event: Omit<AgentEvent, "sequenceNumber">): Promise<AgentEvent> {
    const counter = this.sequenceCounters.get(event.runId) ?? 0;
    this.sequenceCounters.set(event.runId,
      counter + 1,  );

    const fullEvent: AgentEvent = { ...event, sequenceNumber: counter };
    const typeHandlers = this.handlers.get(event.type) ?? new Set();
    const promises: Promise<void>[] = [];

    for (const handler of [...typeHandlers, ...this.allHandlers]) {
      const result = handler(fullEvent);
      if (result instanceof Promise) promises.push(result);
    }

    await Promise.allSettled(promises);
    return fullEvent;
  }

  clearRun(runId: string): void {
    this.sequenceCounters.delete(runId);
  }

  removeAllHandlers(): void {
    this.handlers.clear();
    this.allHandlers.clear();
    this.sequenceCounters.clear();
  }
}
