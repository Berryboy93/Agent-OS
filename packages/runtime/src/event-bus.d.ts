import type { AgentEvent, AgentEventType } from "@agent-os/core";
type EventHandler = (event: AgentEvent) => void | Promise<void>;
export declare class EventBus {
    private readonly handlers;
    private readonly allHandlers;
    private sequenceCounters;
    on(type: AgentEventType | "*", handler: EventHandler): () => void;
    emit(event: Omit<AgentEvent, "sequenceNumber">): Promise<AgentEvent>;
    clearRun(runId: string): void;
    removeAllHandlers(): void;
}
export {};
//# sourceMappingURL=event-bus.d.ts.map