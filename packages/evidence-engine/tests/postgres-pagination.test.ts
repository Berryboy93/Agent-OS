import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PostgresEventStore } from "@agi-ecosystem/event-store";
import {
  EVIDENCE_EVENT_TYPES,
  type EvidenceEvent,
} from "../src/events.js";
import { PostgresEvidenceStore } from "../src/postgres-store.js";

function config() {
  return {
    host: process.env.TEST_DB_HOST || "localhost",
    port: Number(process.env.TEST_DB_PORT || 5432),
    database: process.env.TEST_DB_NAME || "agi_test",
    user: process.env.TEST_DB_USER || "postgres",
    password: process.env.TEST_DB_PASSWORD || "postgres",
  };
}

function event(
  runId: string,
  sequence: number,
): EvidenceEvent {
  return {
    eventId: randomUUID(),
    runId,
    taskId: `task-${runId}`,
    type: EVIDENCE_EVENT_TYPES.RUN_STARTED,
    occurredAt: new Date().toISOString(),
    sequence,
    payload: {
      baseRevision: "pagination-test",
    },
  };
}

describe("PostgresEvidenceStore pagination", () => {
  const tableName =
    `evidence_pagination_${randomUUID().replace(/-/g, "")}`;

  let eventStore: PostgresEventStore;
  let evidenceStore: PostgresEvidenceStore;

  beforeAll(async () => {
    eventStore = new PostgresEventStore(config(), tableName);
    await eventStore.init();

    evidenceStore = new PostgresEvidenceStore(eventStore);
  });

  afterAll(async () => {
    if (evidenceStore) {
      await evidenceStore.close();
    }
  });

  it("reconstructs a run across multiple 1000-event pages without gaps, duplicates, or cross-run leakage", async () => {
    const targetRunId = "pagination-target";
    const otherRunId = "pagination-other";
    const targetCount = 1001;
    const otherCount = 1;

    /*
     * Force the target run across the GLOBAL 1000-event page boundary
     * with the minimum fixture size:
     *
     *   global 1..999   -> target sequences 0..998
     *   global 1000     -> other run
     *   global 1001..1002 -> target sequences 999..1000
     */
    for (let sequence = 0; sequence < 999; sequence += 1) {
      await evidenceStore.append(
        event(targetRunId, sequence),
      );
    }

    await evidenceStore.append(
      event(otherRunId, 0),
    );

    await evidenceStore.append(
      event(targetRunId, 999),
    );

    await evidenceStore.append(
      event(targetRunId, 1000),
    );

    const targetEvents = await evidenceStore.getRun(
      targetRunId,
    );

    expect(targetEvents).toHaveLength(targetCount);

    const sequences = targetEvents.map(
      (storedEvent) => storedEvent.sequence,
    );

    expect(sequences).toEqual(
      Array.from(
        { length: targetCount },
        (_, index) => index,
      ),
    );

    expect(
      new Set(targetEvents.map((storedEvent) => storedEvent.eventId))
        .size,
    ).toBe(targetCount);

    expect(
      targetEvents.every(
        (storedEvent) => storedEvent.runId === targetRunId,
      ),
    ).toBe(true);

    await expect(
      evidenceStore.getRun(otherRunId),
    ).resolves.toHaveLength(otherCount);


    const firstPage = await eventStore.getEvents({
      limit: 1000,
      after_sequence: 0,
    });

    const secondPage = await eventStore.getEvents({
      limit: 1000,
      after_sequence: Number(
        firstPage[firstPage.length - 1]?.sequence_number,
      ),
    });

    expect(firstPage).toHaveLength(1000);
    expect(secondPage).toHaveLength(2);

    expect(
      Number(secondPage[0]?.sequence_number),
    ).toBe(
      Number(firstPage[firstPage.length - 1]?.sequence_number) + 1,
    );
  }, 30000);
});
