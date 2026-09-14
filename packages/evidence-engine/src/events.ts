import type {
  ConfidenceScore,
  EvidenceBundle,
  PromotionResult,
} from "./types.js";

export const EVIDENCE_EVENT_TYPES = {
  RUN_STARTED: "evidence.run.started",
  CHECK_COMPLETED: "evidence.check.completed",
  BUNDLE_CREATED: "evidence.bundle.created",
  CONFIDENCE_CALCULATED: "evidence.confidence.calculated",
  PROMOTION_DECIDED: "evidence.promotion.decided",
  ROLLBACK_REQUESTED: "evidence.rollback.requested",
} as const;

export type EvidenceEventType =
  (typeof EVIDENCE_EVENT_TYPES)[keyof typeof EVIDENCE_EVENT_TYPES];

export interface EvidenceEventBase {
  eventId: string;
  runId: string;
  taskId: string;
  type: EvidenceEventType;
  occurredAt: string;
  sequence: number;
  metadata?: Record<string, unknown>;
}

export interface EvidenceRunStartedEvent
  extends EvidenceEventBase {
  type: typeof EVIDENCE_EVENT_TYPES.RUN_STARTED;
  payload: {
    baseRevision: string;
  };
}

export interface EvidenceCheckCompletedEvent
  extends EvidenceEventBase {
  type: typeof EVIDENCE_EVENT_TYPES.CHECK_COMPLETED;
  payload: EvidenceBundle["checks"][number];
}

export interface EvidenceBundleCreatedEvent
  extends EvidenceEventBase {
  type: typeof EVIDENCE_EVENT_TYPES.BUNDLE_CREATED;
  payload: EvidenceBundle;
}

export interface EvidenceConfidenceCalculatedEvent
  extends EvidenceEventBase {
  type: typeof EVIDENCE_EVENT_TYPES.CONFIDENCE_CALCULATED;
  payload: ConfidenceScore;
}

export interface EvidencePromotionDecidedEvent
  extends EvidenceEventBase {
  type: typeof EVIDENCE_EVENT_TYPES.PROMOTION_DECIDED;
  payload: PromotionResult;
}

export interface EvidenceRollbackRequestedEvent
  extends EvidenceEventBase {
  type: typeof EVIDENCE_EVENT_TYPES.ROLLBACK_REQUESTED;
  payload: {
    reason: string;
    rollbackReference?: string;
  };
}

export type EvidenceEvent =
  | EvidenceRunStartedEvent
  | EvidenceCheckCompletedEvent
  | EvidenceBundleCreatedEvent
  | EvidenceConfidenceCalculatedEvent
  | EvidencePromotionDecidedEvent
  | EvidenceRollbackRequestedEvent;

export function createEventId(): string {
  return crypto.randomUUID();
}

export function createEvent<T extends EvidenceEvent>(
  event: T,
): T {
  return event;
}
