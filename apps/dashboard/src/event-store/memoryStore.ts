import { EventStore } from './store';
import { StoredEvent, EventQuery } from './types';

export class MemoryEventStore implements EventStore {
  private events: StoredEvent[] = [];

  async append(event: StoredEvent): Promise<void> {
    this.events.push(event);
  }

  async query(query: EventQuery): Promise<StoredEvent[]> {
    let result = [...this.events];

    if (query.runId) {
      result = result.filter(e => e.runId === query.runId);
    }

    if (query.agentId) {
      result = result.filter(e => e.agentId === query.agentId);
    }

    if (query.type) {
      result = result.filter(e => e.type === query.type);
    }

    if (query.from) {
      result = result.filter(e => e.timestamp >= query.from!);
    }

    if (query.to) {
      result = result.filter(e => e.timestamp <= query.to!);
    }

    result.sort((a, b) => a.timestamp - b.timestamp);

    if (query.limit) {
      result = result.slice(-query.limit);
    }

    return result;
  }

  async getById(id: string): Promise<StoredEvent | null> {
    return this.events.find(e => e.id === id) || null;
  }
}
