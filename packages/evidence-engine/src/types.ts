export type EvidenceStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "warning";

export type PromotionDecision =
  | "promote"
  | "reject"
  | "human_review"
  | "rollback";

export interface EvidenceCheck {
  id: string;
  category:
    | "test"
    | "build"
    | "security"
    | "runtime"
    | "policy"
    | "artifact";
  status: EvidenceStatus;
  required: boolean;
  critical: boolean;
  message?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ChangeSet {
  baseRevision: string;
  headRevision?: string;
  filesChanged: string[];
  operations: string[];
}

export interface EvidenceBundle {
  runId: string;
  taskId: string;
  createdAt: string;
  changeSet: ChangeSet;
  checks: EvidenceCheck[];
  rollbackReference?: string;
  evidenceHash: string;
}

export interface ConfidenceScore {
  evidenceCompleteness: number;
  testConfidence: number;
  buildConfidence: number;
  securityConfidence: number;
  overall: number;
}

export interface PromotionResult {
  decision: PromotionDecision;
  score: ConfidenceScore;
  reasons: string[];
}

export interface EvidenceEvaluationInput {
  bundle: EvidenceBundle;
  minimumConfidence?: number;
  requireCompleteEvidence?: boolean;
}
