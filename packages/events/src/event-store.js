import { redactEventData } from "./redaction.js";
export class EventStore {
    handlers = new Map();
    allHandlers = new Set();
    sequenceCounters = new Map();
    sqlite;
    constructor(db) {
        this.sqlite = db.session.client;
    }
    on(type, handler) {
        if (type === "*") {
            this.allHandlers.add(handler);
            return () => this.allHandlers.delete(handler);
        }
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type).add(handler);
        return () => this.handlers.get(type)?.delete(handler);
    }
    appendSync(event) {
        const seq = this.sequenceCounters.get(event.runId) ?? 0;
        this.sequenceCounters.set(event.runId, seq + 1);
        const { data: redactedData, redactionIncomplete } = redactEventData(event.data);
        const fullEvent = {
            ...event,
            data: redactedData,
            sequenceNumber: seq,
            redactionIncomplete,
        };
        try {
            this.sqlite
                .prepare(`INSERT INTO agent_events
           (id, run_id, agent_id, type, data_json, timestamp, sequence_number, redaction_incomplete)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(fullEvent.id, fullEvent.runId, fullEvent.agentId, fullEvent.type, JSON.stringify(fullEvent.data), fullEvent.timestamp.getTime(), fullEvent.sequenceNumber, fullEvent.redactionIncomplete ? 1 : 0);
        }
        catch { }
        this.broadcast(fullEvent);
        return fullEvent;
    }
    append(event) {
        return this.appendSync(event);
    }
    broadcast(event) {
        const typeHandlers = this.handlers.get(event.type) ?? new Set();
        for (const handler of [...typeHandlers, ...this.allHandlers]) {
            try {
                handler(event);
            }
            catch {
                /* handler errors are silent */
            }
        }
    }
    clearRun(runId) {
        this.sequenceCounters.delete(runId);
    }
    initSequenceFromDb(runId, lastSeq) {
        this.sequenceCounters.set(runId, lastSeq + 1);
    }
}
//# sourceMappingURL=event-store.js.map