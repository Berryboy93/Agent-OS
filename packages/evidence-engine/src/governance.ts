export type EvidenceGrade = "E0" | "E1" | "E2" | "E3" | "E4" | "E5";
export type Severity = "low" | "medium" | "high" | "critical";
export type GovernanceDecision =
  | "ALLOW_RUNTIME"
  | "ALLOW_SANDBOX"
  | "ALLOW_STAGING"
  | "DEFER"
  | "BLOCK";

import type {
  EvidenceCategory,
  EvidenceStatus,
  PromotionDecision,
} from "./types.js";

export type GovernanceSurface =
  | "runtime"
  | "dev-build-attacker-input"
  | "dev-build-supply-chain"
  | "dev-build-credential-pivot"
  | "dev-build-isolated"
  | "audio-engine"
  | "dsp-core"
  | "reverb-engine"
  | "fx-chain"
  | "midi-engine"
  | "automation-engine"
  | "session-state"
  | "session-migration"
  | "offline-render"
  | "plugin-host"
  | "wasm-plugin-sandbox"
  | "plugin-marketplace"
  | "cloud-projects"
  | "auth"
  | "payment"
  | "telemetry"
  | "ai-mixing"
  | "ui"
  | "build-system"
  | string;

export interface ChangeRequestActor {
  type: "human" | "astra" | "automation";
  id: string;
}

export interface ChangeRequestBoundaries {
  credentials: boolean;
  payment: boolean;
  auth: boolean;
  production_deployment: boolean;
  sandbox: boolean;
}

export interface ChangeRequestRecovery {
  rollbackAvailable: boolean;
  checkpointId?: string;
  rollbackReference?: string;
}

export interface GovernanceState {
  anchoringAlert: boolean;
  decision: GovernanceDecision;
  owner: string;
  trigger?: string | null;
  interimControl?: string | null;
}

export interface ChangeRequest {
  id: string;
  objective: string;
  actor: ChangeRequestActor;
  surfaces: readonly GovernanceSurface[];
  actionType: readonly string[];
  blastRadius: {
    advisory: Severity;
    mythosRepriced: Severity;
    final: Severity;
  };
  boundaries: ChangeRequestBoundaries;
  recovery: ChangeRequestRecovery;
  governance: GovernanceState;
}

export interface EvidenceItem {
  id: string;
  kind: string;
  grade: EvidenceGrade;
  claim: string;
  source: string;
  artifactHash?: string;
  validator?: string;
  result: "pass" | "fail" | "warning" | "not_run";
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface MythosReprice {
  advisory: Severity;
  mythos: Severity;
  final: Severity;
  anchoringAlert: boolean;
  reason: string;
  evaluatedAt: string;
}

export interface BarrierAssessment {
  id: string;
  required: boolean;
  satisfied: boolean;
  authority: "hard" | "friction";
  details?: string;
}

export interface DomainValidationResult {
  validatorId: string;
  validatorVersion: string;
  passed: boolean;
  evidenceGrade: EvidenceGrade;
  findings: readonly string[];
  artifactHash?: string;
  completedAt: string;
}

export interface RecoveryCheckpoint {
  checkpointId: string;
  changeRequestId: string;
  stage: string;
  surface: string;
  blastRadius: Severity;
  artifactHashes: readonly string[];
  authorizationState: string;
  retryCount: number;
  owner: string;
  createdAt: string;
  expiresAt?: string;
  rollbackReference?: string;
}

export interface GovernanceEvidenceBundle {
  schemaVersion: "0.4";
  changeRequest: ChangeRequest;
  evidence: readonly EvidenceItem[];
  mythosReprice?: MythosReprice;
  barriers: readonly BarrierAssessment[];
  domainValidations: readonly DomainValidationResult[];
  recovery?: RecoveryCheckpoint;
  sealedAt?: string;
  evidenceHash?: string;
}

export const EVIDENCE_CATEGORIES = [
  "test",
  "build",
  "security",
  "runtime",
  "policy",
  "artifact",
] as const satisfies readonly EvidenceCategory[];

export const EVIDENCE_STATUSES = [
  "passed",
  "failed",
  "skipped",
  "warning",
] as const satisfies readonly EvidenceStatus[];

export const PROMOTION_DECISIONS = [
  "promote",
  "reject",
  "human_review",
  "rollback",
] as const satisfies readonly PromotionDecision[];

export const GOVERNANCE_DECISIONS = [
  "ALLOW_RUNTIME",
  "ALLOW_SANDBOX",
  "ALLOW_STAGING",
  "DEFER",
  "BLOCK",
] as const satisfies readonly GovernanceDecision[];

export function isEvidenceCategory(value: unknown): value is EvidenceCategory {
  return typeof value === "string" && (EVIDENCE_CATEGORIES as readonly string[]).includes(value);
}

export function isEvidenceStatus(value: unknown): value is EvidenceStatus {
  return typeof value === "string" && (EVIDENCE_STATUSES as readonly string[]).includes(value);
}

export function isPromotionDecision(value: unknown): value is PromotionDecision {
  return typeof value === "string" && (PROMOTION_DECISIONS as readonly string[]).includes(value);
}

export function severityRank(value: Severity): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[value];
}

export function maxSeverity(a: Severity, b: Severity): Severity {
  return severityRank(a) >= severityRank(b) ? a : b;
}
