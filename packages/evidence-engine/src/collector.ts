import { hashEvidence } from "./hash.js";
import type {
  EvidenceBundle,
  EvidenceCheck,
  ChangeSet,
} from "./types.js";

export interface CreateEvidenceInput {
  runId: string;
  taskId: string;
  changeSet: ChangeSet;
  checks: EvidenceCheck[];
  rollbackReference?: string;
}

export function createEvidenceBundle(
  input: CreateEvidenceInput,
): EvidenceBundle {
  const unsigned: Omit<EvidenceBundle, "evidenceHash"> = {
    runId: input.runId,
    taskId: input.taskId,
    createdAt: new Date().toISOString(),
    changeSet: input.changeSet,
    checks: [...input.checks],
    rollbackReference: input.rollbackReference,
  };

  return {
    ...unsigned,
    evidenceHash: hashEvidence(unsigned),
  };
}
