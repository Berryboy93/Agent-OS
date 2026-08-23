import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresEventStore } from '../src/index.js';

// Note: These tests require a running Postgres instance
// For CI, use testcontainers or mock

describe('PostgresEventStore', () => {
  let store: PostgresEventStore;

  beforeAll(async () => {
    store = new PostgresEventStore({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'agi_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres'
    });
    await store.init();
  });

  afterAll(async () => {
    await store.close();
  });

  it('appends events with cryptographic chaining', async () => {
    const event1 = await store.append({
      type: 'test_event',
      payload: { data: 'hello' },
      timestamp: new Date().toISOString()
    });

    expect(event1.hash).toBeDefined();
    expect(event1.previous_hash).toBeDefined();
    expect(event1.sequence_number).toBeDefined();

    const event2 = await store.append({
      type: 'test_event',
      payload: { data: 'world' },
      timestamp: new Date().toISOString()
    });

    expect(event2.previous_hash).toBe(event1.hash);
  });

  it('retrieves events by type', async () => {
    const events = await store.getEvents({ type: 'test_event', limit: 10 });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('test_event');
  });

  it('verifies chain integrity', async () => {
    const result = await store.verifyChain();
    expect(result.valid).toBe(true);
  });
});
