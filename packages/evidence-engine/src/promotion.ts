import { verifyEvidenceHash } from "./hash.js";
import { scoreEvidence } from "./scorer.js";
import type {
  EvidenceEvaluationInput,
  PromotionResult,
} from "./types.js";

export function evaluatePromotion(
  input: EvidenceEvaluationInput,
): PromotionResult {
  const {
    bundle,
    minimumConfidence = 0.98,
    requireCompleteEvidence = true,
  } = input;

  const score = scoreEvidence(bundle);

  if (!verifyEvidenceHash(bundle)) {
    return {
      decision: "reject",
      score,
      reasons: ["Evidence bundle integrity verification failed"],
      evidenceHash: bundle.evidenceHash,
    };
  }
  const reasons: string[] = [];

  const criticalFailures = bundle.checks.filter(
    (check) =>
      check.critical &&
      check.status === "failed",
  );

  const requiredFailures = bundle.checks.filter(
    (check) =>
      check.required &&
      check.status !== "passed",
  );

  if (criticalFailures.length > 0) {
    reasons.push(
      `${criticalFailures.length} critical evidence check(s) failed`,
    );
  }

  if (requiredFailures.length > 0) {
    reasons.push(
      `${requiredFailures.length} required evidence check(s) did not pass`,
    );
  }

  if (
    requireCompleteEvidence &&
    score.evidenceCompleteness < 1
  ) {
    reasons.push("Evidence set is incomplete");
  }

  if (score.overall < minimumConfidence) {
    reasons.push(
      `Confidence ${(score.overall * 100).toFixed(2)}% is below ` +
        `${(minimumConfidence * 100).toFixed(2)}%`,
    );
  }

  if (reasons.length === 0) {
    return {
      decision: "promote",
      score,
      reasons: ["All promotion gates passed"],
      evidenceHash: bundle.evidenceHash,
    };
  }

  if (criticalFailures.length > 0) {
    return {
      decision: "rollback",
      score,
      reasons,
      evidenceHash: bundle.evidenceHash,
    };
  }

  if (score.overall < minimumConfidence) {
    return {
      decision: "human_review",
      score,
      reasons,
      evidenceHash: bundle.evidenceHash,
    };
  }

  return {
    decision: "reject",
    score,
    reasons,
    evidenceHash: bundle.evidenceHash,
  };
}
