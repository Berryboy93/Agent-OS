import { createHash } from "node:crypto";
import type { EvidenceBundle } from "./types.js";

export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, current) => {
    if (
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      return Object.fromEntries(
        Object.entries(current).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      );
    }

    return current;
  });
}

export function hashEvidence(bundle: Omit<EvidenceBundle, "evidenceHash">): string {
  return createHash("sha256")
    .update(stableJson(bundle))
    .digest("hex");
}

export function verifyEvidenceHash(bundle: EvidenceBundle): boolean {
  const { evidenceHash, ...unsigned } = bundle;
  return hashEvidence(unsigned) === evidenceHash;
}
