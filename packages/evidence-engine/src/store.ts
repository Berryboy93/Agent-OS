import type { EvidenceEvent } from "./events.js";

export interface EvidenceStore {
  append(event: EvidenceEvent): Promise<void>;

  getRun(
    runId: string,
  ): Promise<readonly EvidenceEvent[]>;

  clear?(): Promise<void>;
}

function cloneEvent(event: EvidenceEvent): EvidenceEvent {
  return structuredClone(event);
}

export class InMemoryEvidenceStore
  implements EvidenceStore
{
  private readonly events = new Map<
    string,
    EvidenceEvent[]
  >();

  async append(event: EvidenceEvent): Promise<void> {
    const runEvents = this.events.get(event.runId) ?? [];

    const expectedSequence = runEvents.length;

    if (event.sequence !== expectedSequence) {
      throw new Error(
        `Invalid evidence event sequence for run ${event.runId}: ` +
        `expected ${expectedSequence}, received ${event.sequence}`,
      );
    }

    if (
      runEvents.some(
        (existing) => existing.eventId === event.eventId,
      )
    ) {
      throw new Error(
        `Duplicate evidence event ID: ${event.eventId}`,
      );
    }

    runEvents.push(cloneEvent(event));
    this.events.set(event.runId, runEvents);
  }

  async getRun(
    runId: string,
  ): Promise<readonly EvidenceEvent[]> {
    return Object.freeze(
      (this.events.get(runId) ?? []).map(cloneEvent),
    );
  }

  async clear(): Promise<void> {
    this.events.clear();
  }
}
