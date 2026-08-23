/**
 * server/routers/agent.ts  (R3v4 / Stable)
 *
 * tRPC router exposing R3v4 internals to AgentBridge (Agi-Suite).
 * All procedures protected by agentProcedure (x-agent-token).
 *
 * Mount in your main router:
 *   export const appRouter = router({ ..., agent: agentRouter });
 */

import { z } from "zod";
import { router, agentProcedure } from "../middleware/agentAuth";

// ─── Zod schemas ───────────────────────────────────────────────────────────────

const MixDecisionSchema = z.object({
  trackId: z.string(),
  gainDb: z.number().min(-60).max(12),
  panPercent: z.number().min(-100).max(100),
  eqBands: z
    .array(
      z.object({
        freq: z.number().min(20).max(20000),
        gainDb: z.number().min(-24).max(24),
        q: z.number().min(0.1).max(30),
      })
    )
    .optional(),
});

const VocalSpectraDSPConfigSchema = z.object({
  windowSize: z.union([
    z.literal(256),
    z.literal(512),
    z.literal(1024),
    z.literal(2048),
  ]),
  hopSize: z.number().int().positive(),
  smoothingCoeff: z.number().min(0).max(1),
  pitchAlgorithm: z.enum(["YIN", "CREPE", "PYIN"]),
});

const DiagnosticIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["low", "medium", "high"]),
});

// ─── Router ────────────────────────────────────────────────────────────────────

export const agentRouter = router({
  /**
   * AgentBridge → R3v4: apply mix decisions to a session's tracks.
   * Updates gain/pan/EQ state in the audio engine.
   */
  applyMixDecisions: agentProcedure
    .input(
      z.object({
        sessionId: z.string(),
        decisions: z.array(MixDecisionSchema),
        masterLUFS: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: wire to your audio engine state store
      // e.g. audioEngine.applyMixDecisions(input.sessionId, input.decisions)
      console.log(
        `[agentRouter] applyMixDecisions — session=${input.sessionId} tracks=${input.decisions.length}`
      );
      return { applied: true, sessionId: input.sessionId };
    }),

  /**
   * AgentBridge → R3v4: push VocalSpectra DSP config update.
   * Applied to the WASM AudioWorklet params for a specific track.
   */
  setVocalSpectraConfig: agentProcedure
    .input(
      z.object({
        sessionId: z.string(),
        trackId: z.string(),
        config: VocalSpectraDSPConfigSchema,
      })
    )
    .mutation(async ({ input }) => {
      // TODO: wire to VocalSpectra AudioWorklet param port
      // e.g. vocalSpectraWorklet.setConfig(input.trackId, input.config)
      console.log(
        `[agentRouter] setVocalSpectraConfig — track=${input.trackId} algo=${input.config.pitchAlgorithm}`
      );
      return { applied: true, trackId: input.trackId };
    }),

  /**
   * AgentBridge → R3v4: push diagnostic issues to the UI.
   * Displayed in the DAW's diagnostic panel.
   */
  pushDiagnostics: agentProcedure
    .input(
      z.object({
        sessionId: z.string(),
        issues: z.array(DiagnosticIssueSchema),
        suggestedFixes: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: wire to your diagnostics store / UI event emitter
      // e.g. diagnosticsStore.push(input.sessionId, input.issues)
      console.log(
        `[agentRouter] pushDiagnostics — session=${input.sessionId} issues=${input.issues.length}`
      );
      return { received: true, count: input.issues.length };
    }),

  /**
   * AgentBridge → R3v4: query current session state.
   * Used by agents to get track list, BPM, key signature before deciding.
   */
  getSessionState: agentProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      // TODO: wire to your session/project store
      // e.g. return sessionStore.get(input.sessionId)
      console.log(`[agentRouter] getSessionState — session=${input.sessionId}`);
      return {
        sessionId: input.sessionId,
        bpm: 120,
        keySignature: "C major",
        tracks: [] as Array<{ id: string; name: string; type: string }>,
      };
    }),
});

export type AgentRouter = typeof agentRouter;
