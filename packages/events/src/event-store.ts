import type { AgentEvent, AgentEventType } from "@agent-os/core";
import type { AgentOSDb } from "@agent-os/db";
import { redactEventData } from "./redaction.js";

type EventHandler = (event: AgentEvent) => void;

type RawDb = {
  session: {
    client: {
      prepare: (sql: string) => {
        run: (...args: unknown[]) => void;
      };
    };
  };
};

export class EventStore {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly allHandlers = new Set<EventHandler>();
  private readonly sequenceCounters = new Map<string, number>();
  private readonly sqlite: RawDb["session"]["client"];

  constructor(db: AgentOSDb) {
    this.sqlite = (db as unknown as RawDb).session.client;
  }

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

  appendSync(event: Omit<AgentEvent, "sequenceNumber">): AgentEvent {
    const seq = this.sequenceCounters.get(event.runId) ?? 0;
    this.sequenceCounters.set(event.runId,
      seq + 1,  );

    const { data: redactedData, redactionIncomplete } = redactEventData(
      event.data,
    );

    const fullEvent: AgentEvent = {
      ...event,
      data: redactedData,
      sequenceNumber: seq,
      redactionIncomplete,
    };

    try {
      this.sqlite
        .prepare(
          `INSERT INTO agent_events
           (id, run_id, agent_id, type, data_json, timestamp, sequence_number, redaction_incomplete)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          fullEvent.id,
          fullEvent.runId,
          fullEvent.agentId,
          fullEvent.type,
          JSON.stringify(fullEvent.data),
          fullEvent.timestamp.getTime(),
          fullEvent.sequenceNumber,
          fullEvent.redactionIncomplete ? 1 : 0,
        );
    } catch {}

    this.broadcast(fullEvent);
    return fullEvent;
  }

  append(event: Omit<AgentEvent, "sequenceNumber">): AgentEvent {
    return this.appendSync(event);
  }

  private broadcast(event: AgentEvent): void {
    const typeHandlers = this.handlers.get(event.type) ?? new Set();
    for (const handler of [...typeHandlers, ...this.allHandlers]) {
      try {
        handler(event);
      } catch {
        /* handler errors are silent */
      }
    }
  }

  clearRun(runId: string): void {
    this.sequenceCounters.delete(runId);
  }

  initSequenceFromDb(runId: string, lastSeq: number): void {
    this.sequenceCounters.set(runId,
      lastSeq + 1,  );
  }
}
