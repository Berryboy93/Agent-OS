import { describe, expect, it } from "vitest";
import {
  EVIDENCE_EVENT_TYPES,
  InMemoryEvidenceStore,
  type EvidenceEvent,
} from "../src/index.js";

function event(
  runId: string,
  sequence: number,
): EvidenceEvent {
  return {
    eventId: crypto.randomUUID(),
    runId,
    taskId: "task-1",
    type: EVIDENCE_EVENT_TYPES.RUN_STARTED,
    occurredAt: new Date().toISOString(),
    sequence,
    payload: {
      baseRevision: "abc123",
    },
  };
}

describe("EvidenceStore", () => {
  it("persists and rehydrates a run in sequence order", async () => {
    const store = new InMemoryEvidenceStore();

    await store.append(event("run-1", 0));
    await store.append(event("run-1", 1));

    const events = await store.getRun("run-1");

    expect(events).toHaveLength(2);
    expect(events[0]?.sequence).toBe(0);
    expect(events[1]?.sequence).toBe(1);
  });

  it("rejects sequence gaps", async () => {
    const store = new InMemoryEvidenceStore();

    await expect(
      store.append(event("run-2", 1)),
    ).rejects.toThrow(
      "expected 0, received 1",
    );
  });

  it("rejects duplicate event IDs", async () => {
    const store = new InMemoryEvidenceStore();

    const first = event("run-3", 0);
    await store.append(first);

    const duplicate: EvidenceEvent = {
      ...first,
      sequence: 1,
    };

    await expect(
      store.append(duplicate),
    ).rejects.toThrow(
      `Duplicate evidence event ID: ${first.eventId}`,
    );
  });

  it("isolates stored event objects from callers", async () => {
    const store = new InMemoryEvidenceStore();

    const original = event("run-4", 0);
    await store.append(original);

    original.payload.baseRevision = "mutated";

    const events = await store.getRun("run-4");

    expect(
      events[0]?.payload,
    ).toEqual({
      baseRevision: "abc123",
    });
  });

  it("returns no events for an unknown run", async () => {
    const store = new InMemoryEvidenceStore();

    const events = await store.getRun("does-not-exist");

    expect(events).toEqual([]);
  });
});
