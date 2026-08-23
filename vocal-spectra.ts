/**
 * runner/handlers/vocal-spectra.ts  (Agi-Suite) — STUB
 * TODO: Implement VocalSpectra analysis pipeline.
 */
import type { VocalSpectraPayload, VocalSpectraResult } from "@r3/api-types";

export async function vocalSpectraHandler(
  _payload: VocalSpectraPayload
): Promise<VocalSpectraResult> {
  throw new Error(
    "[vocal-spectra handler] Not yet implemented. " +
    "Wire to the VocalSpectra React widget's analysis backend. " +
    "See VocalSpectra PRD for YIN/CREPE/PYIN pipeline spec."
  );
}
