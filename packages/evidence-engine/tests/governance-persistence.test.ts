import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PostgresEventStore } from "@agi-ecosystem/event-store";
import {
  EVIDENCE_EVENT_TYPES,
  PostgresEvidenceStore,
  createEvidenceBundle,
  evaluatePromotion,
  type EvidenceEvent,
} from "../src/index.js";

function config() {
  return {
    host: process.env.TEST_DB_HOST || "localhost",
    port: Number(process.env.TEST_DB_PORT || 5432),
    database: process.env.TEST_DB_NAME || "agi_test",
    user: process.env.TEST_DB_USER || "postgres",
    password: process.env.TEST_DB_PASSWORD || "postgres",
  };
}

describe("Governance persistence", () => {
  const tableName =
    `governance_persistence_${randomUUID().replace(/-/g, "")}`;

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

  it("rehydrates persisted evidence and reaches the same promotion decision", async () => {
    const runId = `governance-${randomUUID()}`;
    const taskId = "governance-roundtrip";

    const bundle = createEvidenceBundle({
      runId,
      taskId,
      changeSet: {
        baseRevision: "base-123",
        headRevision: "head-456",
        filesChanged: ["src/example.ts"],
        operations: ["modify"],
      },
      checks: [
        {
          id: "test-1",
          category: "test",
          status: "passed",
          required: true,
          critical: true,
        },
        {
          id: "build-1",
          category: "build",
          status: "passed",
          required: true,
          critical: true,
        },
        {
          id: "security-1",
          category: "security",
          status: "passed",
          required: true,
          critical: true,
        },
      ],
    });

    const originalPromotion = evaluatePromotion({
      bundle,
    });

    const runStarted: EvidenceEvent = {
      eventId: randomUUID(),
      runId,
      taskId,
      type: EVIDENCE_EVENT_TYPES.RUN_STARTED,
      occurredAt: new Date().toISOString(),
      sequence: 0,
      payload: {
        baseRevision: bundle.changeSet.baseRevision,
      },
    };

    const checkEvents: EvidenceEvent[] = bundle.checks.map(
      (check, index) => ({
        eventId: randomUUID(),
        runId,
        taskId,
        type: EVIDENCE_EVENT_TYPES.CHECK_COMPLETED,
        occurredAt: new Date().toISOString(),
        sequence: index + 1,
        payload: check,
      }),
    );

    const bundleCreated: EvidenceEvent = {
      eventId: randomUUID(),
      runId,
      taskId,
      type: EVIDENCE_EVENT_TYPES.BUNDLE_CREATED,
      occurredAt: new Date().toISOString(),
      sequence: 4,
      payload: bundle,
    };

    const confidenceCalculated: EvidenceEvent = {
      eventId: randomUUID(),
      runId,
      taskId,
      type: EVIDENCE_EVENT_TYPES.CONFIDENCE_CALCULATED,
      occurredAt: new Date().toISOString(),
      sequence: 5,
      payload: originalPromotion.score,
    };

    const promotionDecided: EvidenceEvent = {
      eventId: randomUUID(),
      runId,
      taskId,
      type: EVIDENCE_EVENT_TYPES.PROMOTION_DECIDED,
      occurredAt: new Date().toISOString(),
      sequence: 6,
      payload: originalPromotion,
    };

    await evidenceStore.append(runStarted);

    for (const event of checkEvents) {
      await evidenceStore.append(event);
    }

    await evidenceStore.append(bundleCreated);
    await evidenceStore.append(confidenceCalculated);
    await evidenceStore.append(promotionDecided);

    const persisted = await evidenceStore.getRun(runId);

    expect(persisted).toHaveLength(7);

    const rehydratedBundle = persisted.find(
      (event) =>
        event.type === EVIDENCE_EVENT_TYPES.BUNDLE_CREATED,
    )?.payload;

    const persistedConfidence = persisted.find(
      (event) =>
        event.type ===
        EVIDENCE_EVENT_TYPES.CONFIDENCE_CALCULATED,
    )?.payload;

    const persistedPromotion = persisted.find(
      (event) =>
        event.type ===
        EVIDENCE_EVENT_TYPES.PROMOTION_DECIDED,
    )?.payload;

    expect(rehydratedBundle).toEqual(bundle);
    expect(persistedConfidence).toEqual(originalPromotion.score);
    expect(persistedPromotion).toEqual(originalPromotion);
    expect(persistedPromotion?.evidenceHash).toBe(bundle.evidenceHash);

    if (!rehydratedBundle) {
      throw new Error("Bundle was not rehydrated.");
    }

    const rehydratedPromotion = evaluatePromotion({
      bundle: rehydratedBundle,
    });

    expect(rehydratedPromotion).toEqual(originalPromotion);
    expect(rehydratedPromotion.decision).toBe("promote");
    expect(rehydratedPromotion.score.overall).toBe(1);
    expect(rehydratedPromotion.reasons).toEqual([
      "All promotion gates passed",
    ]);
  });
  it("rehydrates a critical security failure and preserves rollback", async () => {
    const runId = `governance-rollback-${randomUUID()}`;
    const taskId = "governance-rollback-roundtrip";

    const bundle = createEvidenceBundle({
      runId,
      taskId,
      changeSet: {
        baseRevision: "base-rollback",
        headRevision: "head-rollback",
        filesChanged: ["src/security-sensitive.ts"],
        operations: ["modify"],
      },
      checks: [
        {
          id: "test-1",
          category: "test",
          status: "passed",
          required: true,
          critical: true,
        },
        {
          id: "build-1",
          category: "build",
          status: "passed",
          required: true,
          critical: true,
        },
        {
          id: "security-1",
          category: "security",
          status: "failed",
          required: true,
          critical: true,
          message: "Critical security finding",
        },
      ],
    });

    const originalPromotion = evaluatePromotion({
      bundle,
    });

    expect(originalPromotion.decision).toBe("rollback");

    const events: EvidenceEvent[] = [
      {
        eventId: randomUUID(),
        runId,
        taskId,
        type: EVIDENCE_EVENT_TYPES.RUN_STARTED,
        occurredAt: new Date().toISOString(),
        sequence: 0,
        payload: {
          baseRevision: bundle.changeSet.baseRevision,
        },
      },
      ...bundle.checks.map((check, index) => ({
        eventId: randomUUID(),
        runId,
        taskId,
        type: EVIDENCE_EVENT_TYPES.CHECK_COMPLETED,
        occurredAt: new Date().toISOString(),
        sequence: index + 1,
        payload: check,
      })),
      {
        eventId: randomUUID(),
        runId,
        taskId,
        type: EVIDENCE_EVENT_TYPES.BUNDLE_CREATED,
        occurredAt: new Date().toISOString(),
        sequence: 4,
        payload: bundle,
      },
      {
        eventId: randomUUID(),
        runId,
        taskId,
        type: EVIDENCE_EVENT_TYPES.CONFIDENCE_CALCULATED,
        occurredAt: new Date().toISOString(),
        sequence: 5,
        payload: originalPromotion.score,
      },
      {
        eventId: randomUUID(),
        runId,
        taskId,
        type: EVIDENCE_EVENT_TYPES.PROMOTION_DECIDED,
        occurredAt: new Date().toISOString(),
        sequence: 6,
        payload: originalPromotion,
      },
    ];

    for (const event of events) {
      await evidenceStore.append(event);
    }

    const persisted = await evidenceStore.getRun(runId);

    expect(persisted).toHaveLength(7);

    const rehydratedBundle = persisted.find(
      (event) =>
        event.type === EVIDENCE_EVENT_TYPES.BUNDLE_CREATED,
    )?.payload;

    const persistedPromotion = persisted.find(
      (event) =>
        event.type === EVIDENCE_EVENT_TYPES.PROMOTION_DECIDED,
    )?.payload;

    expect(rehydratedBundle).toEqual(bundle);
    expect(persistedPromotion).toEqual(originalPromotion);
    expect(persistedPromotion?.evidenceHash).toBe(bundle.evidenceHash);

    if (!rehydratedBundle) {
      throw new Error("Rollback bundle was not rehydrated.");
    }

    const rehydratedPromotion = evaluatePromotion({
      bundle: rehydratedBundle,
    });

    expect(rehydratedPromotion).toEqual(originalPromotion);
    expect(rehydratedPromotion.decision).toBe("rollback");
    expect(rehydratedPromotion.reasons).toContain(
      "1 critical evidence check(s) failed",
    );
  });

  it("rehydrates incomplete evidence and preserves human review", async () => {
    const runId = `governance-review-${randomUUID()}`;
    const taskId = "governance-review-roundtrip";

    const bundle = createEvidenceBundle({
      runId,
      taskId,
      changeSet: {
        baseRevision: "base-review",
        headRevision: "head-review",
        filesChanged: ["src/needs-review.ts"],
        operations: ["modify"],
      },
      checks: [
        {
          id: "test-1",
          category: "test",
          status: "passed",
          required: true,
          critical: false,
        },
        {
          id: "build-1",
          category: "build",
          status: "failed",
          required: true,
          critical: false,
        },
      ],
    });

    const originalPromotion = evaluatePromotion({
      bundle,
      requireCompleteEvidence: true,
    });

    expect(originalPromotion.decision).toBe("human_review");

    const events: EvidenceEvent[] = [
      {
        eventId: randomUUID(),
        runId,
        taskId,
        type: EVIDENCE_EVENT_TYPES.RUN_STARTED,
        occurredAt: new Date().toISOString(),
        sequence: 0,
        payload: {
          baseRevision: bundle.changeSet.baseRevision,
        },
      },
      ...bundle.checks.map((check, index) => ({
        eventId: randomUUID(),
        runId,
        taskId,
        type: EVIDENCE_EVENT_TYPES.CHECK_COMPLETED,
        occurredAt: new Date().toISOString(),
        sequence: index + 1,
        payload: check,
      })),
      {
        eventId: randomUUID(),
        runId,
        taskId,
        type: EVIDENCE_EVENT_TYPES.BUNDLE_CREATED,
        occurredAt: new Date().toISOString(),
        sequence: bundle.checks.length + 1,
        payload: bundle,
      },
      {
        eventId: randomUUID(),
        runId,
        taskId,
        type: EVIDENCE_EVENT_TYPES.CONFIDENCE_CALCULATED,
        occurredAt: new Date().toISOString(),
        sequence: bundle.checks.length + 2,
        payload: originalPromotion.score,
      },
      {
        eventId: randomUUID(),
        runId,
        taskId,
        type: EVIDENCE_EVENT_TYPES.PROMOTION_DECIDED,
        occurredAt: new Date().toISOString(),
        sequence: bundle.checks.length + 3,
        payload: originalPromotion,
      },
    ];

    for (const event of events) {
      await evidenceStore.append(event);
    }

    const persisted = await evidenceStore.getRun(runId);

    expect(persisted).toHaveLength(events.length);

    const rehydratedBundle = persisted.find(
      (event) =>
        event.type === EVIDENCE_EVENT_TYPES.BUNDLE_CREATED,
    )?.payload;

    const persistedPromotion = persisted.find(
      (event) =>
        event.type ===
        EVIDENCE_EVENT_TYPES.PROMOTION_DECIDED,
    )?.payload;

    expect(rehydratedBundle).toEqual(bundle);
    expect(persistedPromotion).toEqual(originalPromotion);
    expect(persistedPromotion?.evidenceHash).toBe(bundle.evidenceHash);

    if (!rehydratedBundle) {
      throw new Error("Review bundle was not rehydrated.");
    }

    const rehydratedPromotion = evaluatePromotion({
      bundle: rehydratedBundle,
      requireCompleteEvidence: true,
    });

    expect(rehydratedPromotion).toEqual(originalPromotion);
    expect(rehydratedPromotion.decision).toBe("human_review");
    expect(
      rehydratedPromotion.reasons,
    ).toContain("Evidence set is incomplete");
  });

});
