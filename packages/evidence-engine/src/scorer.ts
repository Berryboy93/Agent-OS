import type {
  ConfidenceScore,
  EvidenceBundle,
} from "./types.js";

function ratio(total: number, passed: number): number {
  if (total === 0) {
    return 0;
  }

  return passed / total;
}

export function scoreEvidence(
  bundle: EvidenceBundle,
): ConfidenceScore {
  const required = bundle.checks.filter((c) => c.required);

  const passed = required.filter((c) => c.status === "passed");

  const tests = required.filter((c) => c.category === "test");
  const builds = required.filter((c) => c.category === "build");
  const security = required.filter((c) => c.category === "security");

  const testPassed = tests.filter((c) => c.status === "passed").length;
  const buildPassed = builds.filter((c) => c.status === "passed").length;
  const securityPassed = security.filter(
    (c) => c.status === "passed",
  ).length;

  const completeness =
    required.length === 0
      ? 0
      : passed.length / required.length;

  const testConfidence =
    tests.length === 0
      ? completeness
      : ratio(tests.length, testPassed);

  const buildConfidence =
    builds.length === 0
      ? completeness
      : ratio(builds.length, buildPassed);

  const securityConfidence =
    security.length === 0
      ? completeness
      : ratio(security.length, securityPassed);

  const overall =
    completeness * 0.35 +
    testConfidence * 0.30 +
    buildConfidence * 0.20 +
    securityConfidence * 0.15;

  const normalizedOverall = Math.min(
    1,
    Math.max(0, Number(overall.toFixed(12))),
  );

  return {
    evidenceCompleteness: completeness,
    testConfidence,
    buildConfidence,
    securityConfidence,
    overall: normalizedOverall,
  };
}
