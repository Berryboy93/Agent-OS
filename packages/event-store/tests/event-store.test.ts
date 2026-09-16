import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresEventStore } from '../src/postgres/index.ts';

// Note: These tests require a running Postgres instance
// For CI, use testcontainers or mock

describe('PostgresEventStore', () => {
  let store: PostgresEventStore;
  const tableName =
    `events_test_${randomUUID().replace(/-/g, '')}`;

  beforeAll(async () => {
    store = new PostgresEventStore({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'agi_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres'
    }, tableName);
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

  it('verifies chain integrity after JSONB key reordering', async () => {
    const isolatedTableName =
      `events_jsonb_order_${randomUUID().replace(/-/g, '')}`;

    const isolatedStore = new PostgresEventStore({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'agi_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
    }, isolatedTableName);

    await isolatedStore.init();

    try {
      const timestamp = new Date().toISOString();

      await isolatedStore.append({
        type: 'jsonb_order_test',
        payload: {
          zeta: 3,
          alpha: {
            second: 'two',
            first: 'one',
          },
          middle: ['a', 'b', 'c'],
        },
        timestamp,
      });

      await isolatedStore.append({
        type: 'jsonb_order_test',
        payload: {
          middle: ['d', 'e', 'f'],
          alpha: {
            first: 'three',
            second: 'four',
          },
          zeta: 6,
        },
        timestamp: new Date().toISOString(),
      });

      const result = await isolatedStore.verifyChain();


      expect(result.valid).toBe(true);
      expect(result.checked).toBe(2);
      expect(result.error).toBeUndefined();
    } finally {
      await isolatedStore.close();
    }
  });

});

  it('E3-A: rehydrates every persisted event field', async () => {
    const isolatedTableName = `events_e3_a_${randomUUID().replace(/-/g, '')}`;
    const isolatedStore = new PostgresEventStore({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'agi_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
    }, isolatedTableName);

    await isolatedStore.init();

    try {
      const payload = { testKey: 'testValue' };
      const testDagId = randomUUID();
      const testAgentId = randomUUID();
      const testSessionId = randomUUID();

      const event = await isolatedStore.append({
        type: 'e3_a_test',
        payload,
        dag_id: testDagId,
        agent_id: testAgentId,
        session_id: testSessionId,
      });

      const fetched = await isolatedStore.getEvents({ type: 'e3_a_test' });
      expect(fetched).toHaveLength(1);
      expect(fetched[0]).toMatchObject({
        id: event.id,
        type: 'e3_a_test',
        payload,
        dag_id: testDagId,
        agent_id: testAgentId,
        session_id: testSessionId,
      });
    } finally {
      await isolatedStore.close();
    }
  });

  it('E3-B: returns events in deterministic sequence order', async () => {
    const isolatedTableName = `events_e3_b_${randomUUID().replace(/-/g, '')}`;
    const isolatedStore = new PostgresEventStore({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'agi_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
    }, isolatedTableName);

    await isolatedStore.init();

    try {
      for (let i = 0; i < 5; i++) {
        await isolatedStore.append({ type: 'e3_b_test', payload: { index: i } });
      }

      const fetched = await isolatedStore.getEvents({});
      expect(fetched).toHaveLength(5);
      for (let i = 0; i < fetched.length - 1; i++) {
        const seqCurrent = BigInt(fetched[i].sequence_number);
        const seqNext = BigInt(fetched[i + 1].sequence_number);
        expect(seqCurrent < seqNext).toBe(true);
      }
    } finally {
      await isolatedStore.close();
    }
  });

  it('E3-C: keeps independent stores and filtered streams isolated', async () => {
    const tableA = `events_e3_c1_${randomUUID().replace(/-/g, '')}`;
    const tableB = `events_e3_c2_${randomUUID().replace(/-/g, '')}`;

    const config = {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'agi_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
    };

    const storeA = new PostgresEventStore(config, tableA);
    const storeB = new PostgresEventStore(config, tableB);

    await storeA.init();
    await storeB.init();

    try {
      await storeA.append({ type: 'type_a', payload: { data: 'A' } });
      await storeB.append({ type: 'type_b', payload: { data: 'B' } });

      const eventsA = await storeA.getEvents({});
      const eventsB = await storeB.getEvents({});

      expect(eventsA).toHaveLength(1);
      expect(eventsA[0].type).toBe('type_a');

      expect(eventsB).toHaveLength(1);
      expect(eventsB[0].type).toBe('type_b');
    } finally {
      await storeA.close();
      await storeB.close();
    }
  });

  it('E3-D: paginates correctly across more than 1,000 events', async () => {
    const isolatedTableName = `events_e3_d_${randomUUID().replace(/-/g, '')}`;
    const isolatedStore = new PostgresEventStore({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'agi_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
    }, isolatedTableName);

    await isolatedStore.init();

    try {
      const totalEvents = 1050;
      const chunkSize = 25;

      for (let i = 0; i < totalEvents; i += chunkSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + chunkSize, totalEvents); j++) {
          batch.push(isolatedStore.append({ type: 'e3_d_test', payload: { index: j } }));
        }
        await Promise.all(batch);
      }

      let allFetched: any[] = [];
      let afterSequence: number | undefined = undefined;

      while (true) {
        const page = await isolatedStore.getEvents({
          after_sequence: afterSequence,
          limit: 500,
        });

        if (page.length === 0) break;
        allFetched = allFetched.concat(page);
        afterSequence = page[page.length - 1].sequence_number;
      }

      expect(allFetched).toHaveLength(totalEvents);

      const seqs = allFetched.map((e) => String(e.sequence_number));
      const uniqueSeqs = new Set(seqs);
      expect(uniqueSeqs.size).toBe(totalEvents);
    } finally {
      await isolatedStore.close();
    }
  }, 120000);
