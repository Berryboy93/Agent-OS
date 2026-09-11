import { describe, expect, it } from "vitest";
import {
  createEvidenceBundle,
  evaluatePromotion,
} from "../src/index.js";

describe("Evidence Engine v0.3", () => {
  it("creates deterministic evidence hashes", () => {
    const bundle = createEvidenceBundle({
      runId: "run-1",
      taskId: "task-1",
      changeSet: {
        baseRevision: "abc",
        headRevision: "def",
        filesChanged: ["a.ts"],
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

    expect(bundle.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("promotes a fully verified change", () => {
    const bundle = createEvidenceBundle({
      runId: "run-2",
      taskId: "task-2",
      changeSet: {
        baseRevision: "abc",
        filesChanged: [],
        operations: [],
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

    const result = evaluatePromotion({ bundle });

    expect(result.decision).toBe("promote");
    expect(result.score.overall).toBe(1);
  });

  it("rolls back on critical failure", () => {
    const bundle = createEvidenceBundle({
      runId: "run-3",
      taskId: "task-3",
      changeSet: {
        baseRevision: "abc",
        filesChanged: ["danger.ts"],
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
          id: "security-1",
          category: "security",
          status: "failed",
          required: true,
          critical: true,
        },
      ],
    });

    const result = evaluatePromotion({ bundle });

    expect(result.decision).toBe("rollback");
  });

  it("requires human review below confidence threshold", () => {
    const bundle = createEvidenceBundle({
      runId: "run-4",
      taskId: "task-4",
      changeSet: {
        baseRevision: "abc",
        filesChanged: [],
        operations: [],
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

    const result = evaluatePromotion({
      bundle,
      requireCompleteEvidence: true,
    });

    expect(result.decision).toBe("human_review");
  });
});
