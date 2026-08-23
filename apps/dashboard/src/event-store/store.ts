import { StoredEvent, EventQuery } from './types';

/**
 * Event Store Contract
 * This allows swapping:
 * - in-memory (dev)
 * - SQLite
 * - Postgres
 * - Kafka-backed log
 */
export interface EventStore {
  append(event: StoredEvent): Promise<void>;

  query(query: EventQuery): Promise<StoredEvent[]>;

  getById(id: string): Promise<StoredEvent | null>;
}
