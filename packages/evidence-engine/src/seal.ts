import { createHash } from "node:crypto";
import type { GovernanceEvidenceBundle } from "./governance.js";

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

export function hashEvidenceBundle(bundle: GovernanceEvidenceBundle): string {
  const unsigned = { ...bundle, sealedAt: undefined, evidenceHash: undefined };
  return createHash("sha256").update(canonicalize(unsigned)).digest("hex");
}

export function sealEvidenceBundle(bundle: GovernanceEvidenceBundle, sealedAt = new Date().toISOString()): GovernanceEvidenceBundle {
  if (bundle.sealedAt || bundle.evidenceHash) {
    throw new Error("Evidence bundle is already sealed.");
  }

  const evidenceHash = hashEvidenceBundle(bundle);
  return Object.freeze({
    ...bundle,
    sealedAt,
    evidenceHash,
  });
}

export function verifyEvidenceBundle(bundle: GovernanceEvidenceBundle): boolean {
  if (!bundle.sealedAt || !bundle.evidenceHash) return false;
  return hashEvidenceBundle(bundle) === bundle.evidenceHash;
}
