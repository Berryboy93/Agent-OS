import {
  maxSeverity,
  severityRank,
  type BarrierAssessment,
  type ChangeRequest,
  type DomainValidationResult,
  type GovernanceDecision,
  type EvidenceItem,
  type MythosReprice,
  type Severity,
} from "./governance.js";

export interface PromotionContext {
  readonly changeRequest: ChangeRequest;
  readonly mythosReprice?: MythosReprice;
  readonly barriers: readonly BarrierAssessment[];
  readonly domainValidations: readonly DomainValidationResult[];
  readonly evidence: readonly EvidenceItem[];
  readonly recoveryAvailable: boolean;
}

const GRADE_RANK: Record<EvidenceItem["grade"], number> = {
  E0: 0,
  E1: 1,
  E2: 2,
  E3: 3,
  E4: 4,
  E5: 5,
};

function strongestGrade(items: readonly EvidenceItem[]): EvidenceItem["grade"] {
  let best: EvidenceItem["grade"] = "E0";
  for (const item of items) {
    if (GRADE_RANK[item.grade] > GRADE_RANK[best]) best = item.grade;
  }
  return best;
}

export function evaluateGovernance(context: PromotionContext): GovernanceDecision {
  const { changeRequest: request } = context;
  const severity: Severity = maxSeverity(
    request.blastRadius.final,
    context.mythosReprice?.final ?? request.blastRadius.mythosRepriced,
  );

  if (request.boundaries.credentials) return "BLOCK";
  if (request.boundaries.payment) return "BLOCK";
  if (request.boundaries.auth && severityRank(severity) >= severityRank("critical")) {
    return "BLOCK";
  }
  if (request.boundaries.production_deployment && severityRank(severity) >= severityRank("critical")) {
    return "DEFER";
  }
  if (severity === "critical") return "DEFER";

  const missingRequiredBarrier = context.barriers.some(
    (barrier) => barrier.required && !barrier.satisfied && barrier.authority === "hard",
  );
  if (missingRequiredBarrier) return "BLOCK";

  if (!request.boundaries.sandbox && severityRank(severity) >= severityRank("medium")) {
    return "BLOCK";
  }

  const failedDomain = context.domainValidations.some((result) => !result.passed);
  if (failedDomain) return "DEFER";

  if (!context.recoveryAvailable && severityRank(severity) >= severityRank("medium")) {
    return "DEFER";
  }

  const grade = strongestGrade(context.evidence);
  if (severity === "high") {
    if (GRADE_RANK[grade] < GRADE_RANK.E4) return "DEFER";
    return request.boundaries.production_deployment ? "ALLOW_STAGING" : "ALLOW_SANDBOX";
  }

  if (severity === "medium") {
    if (GRADE_RANK[grade] < GRADE_RANK.E3) return "DEFER";
    return "ALLOW_SANDBOX";
  }

  if (GRADE_RANK[grade] < GRADE_RANK.E2) return "DEFER";
  return "ALLOW_RUNTIME";
}
