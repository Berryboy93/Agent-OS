import { describe, expect, it } from "vitest";
import {
  EvidenceRecorder,
  InMemoryEvidenceStore,
  createEvidenceBundle,
  evaluatePromotion,
} from "../src/index.js";

describe("EvidenceRecorder", () => {
  it("persists a complete promotion lifecycle", async () => {
    const store = new InMemoryEvidenceStore();
    const recorder = new EvidenceRecorder(store);

    const bundle = createEvidenceBundle({
      runId: "recorder-run",
      taskId: "recorder-task",
      changeSet: {
        baseRevision: "base",
        headRevision: "head",
        filesChanged: ["src/example.ts"],
        operations: ["modify"],
      },
      checks: [
        {
          id: "test",
          category: "test",
          status: "passed",
          required: true,
          critical: true,
        },
        {
          id: "build",
          category: "build",
          status: "passed",
          required: true,
          critical: true,
        },
        {
          id: "security",
          category: "security",
          status: "passed",
          required: true,
          critical: true,
        },
      ],
    });

    const promotion = evaluatePromotion({ bundle });

    await recorder.recordEvaluation({ bundle, promotion });

    const events = await store.getRun(bundle.runId);

    expect(events.map((event) => event.type)).toEqual([
      "evidence.run.started",
      "evidence.check.completed",
      "evidence.check.completed",
      "evidence.check.completed",
      "evidence.bundle.created",
      "evidence.confidence.calculated",
      "evidence.promotion.decided",
    ]);

    expect(events.map((event) => event.sequence)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);

    expect(
      events.find(
        (event) => event.type === "evidence.bundle.created",
      )?.payload,
    ).toEqual(bundle);

    expect(
      events.find(
        (event) => event.type === "evidence.promotion.decided",
      )?.payload,
    ).toEqual(promotion);
  });

  it("records rollback after a critical failure", async () => {
    const store = new InMemoryEvidenceStore();
    const recorder = new EvidenceRecorder(store);

    const bundle = createEvidenceBundle({
      runId: "recorder-rollback",
      taskId: "recorder-task",
      changeSet: {
        baseRevision: "base",
        filesChanged: ["src/security-sensitive.ts"],
        operations: ["modify"],
      },
      checks: [
        {
          id: "security",
          category: "security",
          status: "failed",
          required: true,
          critical: true,
          message: "Critical finding",
        },
      ],
      rollbackReference: "rollback://recorder-rollback",
    });

    const promotion = evaluatePromotion({ bundle });

    expect(promotion.decision).toBe("rollback");

    await recorder.recordEvaluation({ bundle, promotion });

    const events = await store.getRun(bundle.runId);
    const rollback = events.at(-1);

    expect(rollback?.type).toBe("evidence.rollback.requested");
    expect(rollback?.payload).toMatchObject({
      rollbackReference: "rollback://recorder-rollback",
    });
    expect(
      (rollback?.payload as { reason: string }).reason,
    ).toContain("critical evidence check(s) failed");
  });
});
