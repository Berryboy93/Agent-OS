import {
  createEvidenceBundle,
  evaluatePromotion,
  type PromotionResult,
} from '@agi-ecosystem/evidence-engine';

export type PromotionEvidenceCheck =
  Parameters<typeof createEvidenceBundle>[0]['checks'][number];

export interface ExecutionPromotionInput {
  runId: string;
  taskId: string;
  baseRevision: string;
  operations: string[];
  checks: PromotionEvidenceCheck[];
}

export interface ExecutionPromotionResult {
  bundle: ReturnType<typeof createEvidenceBundle>;
  promotion: PromotionResult;
  evidenceHash: string;
}

export function evaluateExecutionPromotion(
  input: ExecutionPromotionInput,
): ExecutionPromotionResult {
  const bundle = createEvidenceBundle({
    runId: input.runId,
    taskId: input.taskId,
    changeSet: {
      baseRevision: input.baseRevision,
      filesChanged: [],
      operations: input.operations,
    },
    checks: input.checks,
  });

  const promotion = evaluatePromotion({
    bundle,
    requireCompleteEvidence: true,
  });

  return {
    bundle,
    promotion,
    evidenceHash: bundle.evidenceHash,
  };
}
