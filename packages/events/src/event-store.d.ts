import type { AgentEvent, AgentEventType } from "@agent-os/core";
import type { AgentOSDb } from "@agent-os/db";
type EventHandler = (event: AgentEvent) => void;
export declare class EventStore {
    private readonly handlers;
    private readonly allHandlers;
    private readonly sequenceCounters;
    private readonly sqlite;
    constructor(db: AgentOSDb);
    on(type: AgentEventType | "*", handler: EventHandler): () => void;
    appendSync(event: Omit<AgentEvent, "sequenceNumber">): AgentEvent;
    append(event: Omit<AgentEvent, "sequenceNumber">): AgentEvent;
    private broadcast;
    clearRun(runId: string): void;
    initSequenceFromDb(runId: string, lastSeq: number): void;
}
export {};
//# sourceMappingURL=event-store.d.ts.map