import { createEventId, EVIDENCE_EVENT_TYPES, type EvidenceEvent } from "./events.js";
import type {
  EvidenceBundle,
  PromotionResult,
} from "./types.js";
import type { EvidenceStore } from "./store.js";

export interface RecordEvidenceEvaluationInput {
  bundle: EvidenceBundle;
  promotion: PromotionResult;
}

export class EvidenceRecorder {
  constructor(
    private readonly store: EvidenceStore,
  ) {}

  async recordEvaluation(
    input: RecordEvidenceEvaluationInput,
  ): Promise<void> {
    const { bundle, promotion } = input;

    let sequence = 0;

    const append = async (
      event: Omit<EvidenceEvent, "eventId" | "occurredAt" | "sequence">,
    ): Promise<void> => {
      await this.store.append({
        ...event,
        eventId: createEventId(),
        occurredAt: new Date().toISOString(),
        sequence,
      } as EvidenceEvent);

      sequence += 1;
    };

    await append({
      runId: bundle.runId,
      taskId: bundle.taskId,
      type: EVIDENCE_EVENT_TYPES.RUN_STARTED,
      payload: {
        baseRevision: bundle.changeSet.baseRevision,
      },
    });

    for (const check of bundle.checks) {
      await append({
        runId: bundle.runId,
        taskId: bundle.taskId,
        type: EVIDENCE_EVENT_TYPES.CHECK_COMPLETED,
        payload: check,
      });
    }

    await append({
      runId: bundle.runId,
      taskId: bundle.taskId,
      type: EVIDENCE_EVENT_TYPES.BUNDLE_CREATED,
      payload: bundle,
    });

    await append({
      runId: bundle.runId,
      taskId: bundle.taskId,
      type: EVIDENCE_EVENT_TYPES.CONFIDENCE_CALCULATED,
      payload: promotion.score,
    });

    await append({
      runId: bundle.runId,
      taskId: bundle.taskId,
      type: EVIDENCE_EVENT_TYPES.PROMOTION_DECIDED,
      payload: promotion,
    });

    if (promotion.decision === "rollback") {
      await append({
        runId: bundle.runId,
        taskId: bundle.taskId,
        type: EVIDENCE_EVENT_TYPES.ROLLBACK_REQUESTED,
        payload: {
          reason: promotion.reasons.join("; "),
          ...(bundle.rollbackReference
            ? {
                rollbackReference: bundle.rollbackReference,
              }
            : {}),
        },
      });
    }
  }
}
