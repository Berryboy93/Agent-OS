Follow the details from the attachment to triple check my project for security flaws, no guessing what so ever and always deep check for bugs and gaps before touching anything or files related to the issue;

The project lives on your Kali machine, not in the sandbox. To run a proper Mythos-grade audit I need the actual file content. Please paste or upload the following — I'll read every byte before forming any opinion, no guessing:
Highest priority (auth + data layer — the surfaces Mythos explicitly targets):

server/routers/sessions.ts — just patched, need the full current file
server/routers/daw.ts — just patched, full file
All other router files (list them with ls ~/Stable/server/routers/)
server/middleware/ or wherever auth/JWT validation lives
server/db/schema.ts — need column names to verify every .where() clause
server/index.ts or server/app.ts — route mounting, middleware order

Second pass (supply chain + secrets):

package.json (root + any workspace packages)
pnpm-lock.yaml (or paste pnpm audit output)
.env.example or any env-var documentation (not the real .env)

Why each one matters under the Mythos threat model:

The grep output already shows line 273 still has isNull(projects.deletedAt) without a userId check — that needs eyes on the surrounding query before I can call it clean or flag it
Line 374 shows another isNull(projects.deletedAt) — same question
I haven't seen the auth middleware yet, so I can't confirm the ctx.user.id trust chain is actually verified server-side vs. client-supplied
I haven't seen any other routers, so I can't rule out the same missing .and(userId) pattern elsewhere

Run this on your machine and paste the output:
bashls ~/Stable/server/routers/
ls ~/Stable/server/middleware/ 2>/dev/null || echo "no middleware dir"
cat ~/Stable/server/routers/sessions.ts
cat ~/Stable/server/routers/daw.ts
cat ~/Stable/server/db/schema.ts
cat ~/Stable/server/index.ts 2>/dev/null || cat ~/Stable/server/app.ts 2>/dev/null
do a full five-lesson pass per the skill before touching a single line.

r3v@penguin:~/Stable$ ls ~/Stable/server/routers/
ls ~/Stable/server/middleware/ 2>/dev/null || echo "no middleware dir"
cat ~/Stable/server/routers/sessions.ts
cat ~/Stable/server/routers/daw.ts
cat ~/Stable/server/db/schema.ts
cat ~/Stable/server/index.ts 2>/dev/null || cat ~/Stable/server/app.ts 2>/dev/null
adminRouter.ts              dj.router.ts                  sessions.ts
aiMix.router.ts             index.ts                      sessions.ts.bak-20260421_173355
daw.ts                      mixer.router.ts               sessions.ts.bak.20260422_145510
daw.ts.bak.20260422_145510  sessionMetrics.router.ts      sessions.ts.bak.20260422_145616
daw.ts.bak.20260422_145616  sessionMetrics.router.ts.bak  subscription.ts
auth.ts          errorHandler.ts  feature-gate.ts.bak  requireUser.ts
enforceUsage.ts  feature-gate.ts  rateLimit.ts
import { z } from "zod";
import { count, eq, and } from "drizzle-orm";
import { router }             from "../trpc";
import { protectedProcedure } from "../base-procedures";
import { db }                 from "../db";
import { aiDecisionLog }      from "../db/schema";
import { sessionMetrics }     from "../../shared/schema-session-metrics";
import {
  startSession,
  stopSession,
  getSessionSummary,
} from "../services/session-metrics.service";

export const sessionsRouter = router({
  start: protectedProcedure
    .input(
      z.object({
        trackIds: z.array(z.string().uuid()).min(1),
        bpm: z.number().int().min(40).max(300),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return startSession(ctx.user.id, input);
    }),

  stop: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return stopSession(ctx.user.id, input);
    }),

  summary: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getSessionSummary(ctx.user.id, input.sessionId);
    }),

  // ── Live chip data — polled every 30s by SessionChip ─────────────────────
  // Returns AI action count + estimated time saved for an active session.
  // timeSavedSeconds is only written on sessions.stop; for live sessions
  // we return 0 and let the chip show action count only until session ends.
  liveSummary: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify session belongs to this user
      const [session] = await db
        .select({ timeSavedSeconds: sessionMetrics.timeSavedSeconds })
        .from(sessionMetrics)
        .where(and(eq(sessionMetrics.id, input.sessionId), eq(sessionMetrics.userId, ctx.user.id)))
        .limit(1);

      if (!session) throw new Error(`Session not found: ${input.sessionId}`);

      const [{ value: aiActionsCount }] = await db
        .select({ value: count() })
        .from(aiDecisionLog)
        .where(eq(aiDecisionLog.sessionId, input.sessionId));

      return {
        aiActionsCount,
        estimatedTimeSavedMs: (session.timeSavedSeconds ?? 0) * 1_000,
      };
    }),
});
/**
 * server/routers/daw.ts
 * tRPC router covering all DAW-specific server procedures.
 *
 * Procedures:
 *   project.save       — persist full project state to PostgreSQL (Drizzle ORM)
 *   project.load       — fetch a project by ID (ownership enforced)
 *   project.list       — list all projects for authed user
 *   project.delete     — soft-delete a project
 *   ai.analyse         — run LLPTE signal analysis on current mix params
 *   ai.suggestions     — generate mix/arrangement suggestions via llpte-ai
 *   ai.chat            — AI co-producer chat (single turn, stateless)
 *   mastering.analyse  — target-LUFS / dynamic range analysis
 *   collab.roomStats   — admin: current room occupancy (Elite tier only)
 *
 * Billing gates:
 *   Free  → project.save (1 project slot), project.load
 *   Pro   → project.save (unlimited), project.list, ai.analyse, ai.suggestions
 *   Elite → all above + ai.chat, mastering.analyse, collab.roomStats
 *
 * Error contract:
 *   TRPCError BAD_REQUEST  — invalid input (Zod parse failure)
 *   TRPCError UNAUTHORIZED — JWT missing / invalid
 *   TRPCError FORBIDDEN    — subscription tier insufficient
 *   TRPCError NOT_FOUND    — resource not found or not owned
 *   TRPCError INTERNAL_SERVER_ERROR — DB / LLPTE failure (non-leaking)
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router }              from '../trpc';
import { protectedProcedure } from '../base-procedures';
import { db } from '../db';
import { projects } from '../../shared/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';

// ── Zod schemas ───────────────────────────────────────────────────────────────

const TrackSchema = z.object({
  id:          z.string(),
  label:       z.string().max(40),
  type:        z.enum(['audio','midi','bus','instrument']),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/),
  gain:        z.number().min(0).max(1.5),
  pan:         z.number().min(-1).max(1),
  mute:        z.boolean(),
  solo:        z.boolean(),
  armed:       z.boolean(),
  fxChain:     z.array(z.object({
    id:      z.string(),
    type:    z.enum(['eq','compressor','reverb','delay','filter','distortion']),
    enabled: z.boolean(),
    params:  z.record(z.number()),
  })),
  sends:       z.array(z.object({ busId: z.string(), level: z.number() })),
  inputSource: z.string().nullable(),
});

const RegionSchema = z.object({
  id:          z.string(),
  trackId:     z.string(),
  startBeat:   z.number().min(0),
  lengthBeats: z.number().min(0.5),
  clipId:      z.string(),
  label:       z.string().max(40),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const MidiNoteSchema = z.object({
  id:       z.string(),
  pitch:    z.number().int().min(0).max(127),
  step:     z.number().int().min(0).max(63),
  duration: z.number().int().min(1).max(16),
  velocity: z.number().int().min(1).max(127),
});

const MidiPatternSchema = z.object({
  id:      z.string(),
  name:    z.string().max(40),
  steps:   z.union([z.literal(16), z.literal(32), z.literal(64)]),
  notes:   z.array(MidiNoteSchema),
  trackId: z.string(),
});

const ProjectStateSchema = z.object({
  bpm:           z.number().min(40).max(240),
  timeSignature: z.tuple([z.number().int().min(1).max(16), z.number().int().min(1).max(16)]),
  masterGain:    z.number().min(0).max(1.5),
  tracks:        z.array(TrackSchema),
  regions:       z.array(RegionSchema),
  midiPatterns:  z.array(MidiPatternSchema),
  loopEnabled:   z.boolean(),
  loopStart:     z.number().min(0),
  loopEnd:       z.number().min(0),
});

// ── Tier gate helper ──────────────────────────────────────────────────────────

type Tier = 'explorer' | 'creator' | 'pro_artist';

function requireTier(ctx: { subscription?: { tier: string } | null }, minTier: Tier): void {
  const ORDER: Tier[] = ['explorer','creator','pro_artist'];
  const userTier  = (ctx.subscription?.tier ?? 'explorer') as Tier;
  if (ORDER.indexOf(userTier) < ORDER.indexOf(minTier)) {
    throw new TRPCError({
      code:    'FORBIDDEN',
      message: `This feature requires the ${minTier} tier or higher.`,
    });
  }
}

// ── LLPTE helpers (lightweight wrappers — real impl imports from packages/llpte-*) ──

interface LLPTESignal {
  rms:            number;
  peak:           number;
  spectralCentroid: number;
  dynamicRange:   number;
  lufsIntegrated: number;
}

interface MixSuggestion {
  type:        'mix' | 'arrangement' | 'mastering' | 'harmony' | 'rhythm';
  confidence:  number;
  description: string;
  params:      Record<string, unknown>;
}

/**
 * Simulate LLPTE signal analysis.
 * In production this calls:
 *   import { analyseSignal } from '@llpte/signal';
 *   import { generateSuggestions } from '@llpte/ai';
 */
async function runLLPTEAnalysis(
  tracks: z.infer<typeof TrackSchema>[],
  bpm: number,
): Promise<{ signal: LLPTESignal; suggestions: MixSuggestion[] }> {
  // Derive pseudo-signal from track mix parameters
  const activeTracks     = tracks.filter(t => !t.mute);
  const avgGain          = activeTracks.reduce((s, t) => s + t.gain, 0) / (activeTracks.length || 1);
  const lufsIntegrated   = -23 + avgGain * 10;
  const dynamicRange     = 8 + (1 - avgGain) * 6;

  const signal: LLPTESignal = {
    rms:              avgGain * 0.7,
    peak:             Math.min(avgGain * 1.1, 1.0),
    spectralCentroid: 1800 + bpm * 4,
    dynamicRange,
    lufsIntegrated,
  };

  const suggestions: MixSuggestion[] = [];

  // Gain staging check
  if (avgGain > 1.1) {
    suggestions.push({
      type: 'mix', confidence: 0.91,
      description: `Average channel gain is ${(avgGain * 100).toFixed(0)}% — headroom at risk. `
        + 'Reduce 3–4 channels by 2–3 dB before mastering.',
      params: { action: 'reduce_gain', targetGain: 0.85 },
    });
  }

  // Stereo balance check
  const avgPan = activeTracks.reduce((s, t) => s + t.pan, 0) / (activeTracks.length || 1);
  if (Math.abs(avgPan) > 0.2) {
    suggestions.push({
      type: 'mix', confidence: 0.78,
      description: `Mix centre-of-mass is ${avgPan > 0 ? 'right' : 'left'}-heavy by `
        + `${Math.abs(avgPan * 100).toFixed(0)}%. Rebalance panning on SYNTH/PAD layers.`,
      params: { action: 'balance_pan', targetPan: 0 },
    });
  }

  // LUFS recommendation
  if (lufsIntegrated > -10) {
    suggestions.push({
      type: 'mastering', confidence: 0.95,
      description: `Integrated LUFS (~${lufsIntegrated.toFixed(1)}) is above streaming targets. `
        + 'Apply limiting before export or enable Adaptive Mastering.',
      params: { action: 'limit', targetLUFS: -14 },
    });
  }

  // BPM-derived groove suggestion
  if (bpm >= 120 && bpm <= 145) {
    suggestions.push({
      type: 'rhythm', confidence: 0.72,
      description: `At ${bpm} BPM, a 1/32 ghost note layer on the hi-hat would add groove density typical of peak-hour techno.`,
      params: { trackType: 'hihat', pattern: 'ghost_32' },
    });
  }

  return { signal, suggestions };
}

async function runMasteringAnalysis(params: {
  targetLUFS:    number;
  ceilingDB:     number;
  dynamicsMode:  string;
  stereoWidth:   number;
  currentLUFS?:  number;
}): Promise<{
  inputLUFS:     number;
  inputPeak:     number;
  outputLUFS:    number;
  dynamicRange:  number;
  recommendation: string;
  gainApplied:   number;
}> {
  const inputLUFS  = params.currentLUFS ?? -18.5;
  const gainNeeded = params.targetLUFS - inputLUFS;

  let rec = `Apply ${Math.abs(gainNeeded).toFixed(1)} dB of integrated ${gainNeeded > 0 ? 'gain' : 'attenuation'}. `;
  rec += `True peak ceiling set to ${params.ceilingDB} dBFS. `;

  if (params.dynamicsMode === 'compressed') {
    rec += 'Multiband compression active — limiting transient punch. ';
  } else if (params.dynamicsMode === 'punchy') {
    rec += 'Transient enhancement applied — low-mid weight preserved. ';
  }

  if (params.stereoWidth !== 1.0) {
    rec += `Stereo width set to ×${params.stereoWidth.toFixed(1)} via M/S processing. `;
  }

  return {
    inputLUFS,
    inputPeak:       inputLUFS + 6.2,
    outputLUFS:      params.targetLUFS,
    dynamicRange:    9.8 - (params.dynamicsMode === 'compressed' ? 2 : 0),
    recommendation:  rec.trim(),
    gainApplied:     gainNeeded,
  };
}

// ── AI Co-Producer prompt builder ─────────────────────────────────────────────

function buildCoProducerSystem(): string {
  return [
    'You are an expert AI music co-producer specialising in electronic music production,',
    'acid techno, house, and experimental club music.',
    'Your role is to give concise, technically precise mixing and arrangement advice.',
    'You reference specific parameters (frequencies in Hz, dB values, timing in bars/beats).',
    'Keep responses under 80 words. Be direct, no marketing language.',
    'You are aware of the R3 v4 DAW context and its LLPTE signal analysis pipeline.',
  ].join(' ');
}

// ── Router ────────────────────────────────────────────────────────────────────

export const dawRouter = router({

  // ── project.save ────────────────────────────────────────────────────────────
  'project.save': protectedProcedure
    .input(z.object({
      projectId:   z.string().optional(),
      name:        z.string().min(1).max(80),
      state:       ProjectStateSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      requireTier(ctx, 'explorer');

      const userId    = ctx.user.id;
      const stateJson = JSON.stringify(input.state);

      if (input.projectId) {
        // Update existing — verify ownership
        const existing = await db
          .select({ id: projects.id, userId: projects.userId })
          .from(projects)
          .where(and(eq(projects.id, input.projectId), isNull(projects.deletedAt)))
          .limit(1);

        if (!existing[0]) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
        }
        if (existing[0].userId !== userId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your project.' });
        }

        const updated = await db
          .update(projects)
          .set({ name: input.name, state: stateJson, updatedAt: new Date() })
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, userId)))
          .returning({ id: projects.id, updatedAt: projects.updatedAt });

        return { projectId: updated[0].id, savedAt: updated[0].updatedAt };
      }

      // Free tier: enforce 1-project slot
      if (!ctx.subscription || ctx.subscription.tier === 'explorer') {
        const count = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)));
        if (count.length >= 1) {
          throw new TRPCError({
            code:    'FORBIDDEN',
            message: 'Free tier supports 1 saved project. Upgrade to Pro for unlimited projects.',
          });
        }
      }

      // New project
      const inserted = await db
        .insert(projects)
        .values({ userId, name: input.name, state: stateJson })
        .returning({ id: projects.id, createdAt: projects.createdAt });

      return { projectId: inserted[0].id, savedAt: inserted[0].createdAt };
    }),

  // ── project.load ────────────────────────────────────────────────────────────
  'project.load': protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.userId, ctx.user.id),
          isNull(projects.deletedAt),
        ))
        .limit(1);

      if (!row[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
      }

      let state: unknown;
      try {
        state = JSON.parse(row[0].state as string);
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Corrupt project data.' });
      }

      return {
        projectId:  row[0].id,
        name:       row[0].name,
        state:      ProjectStateSchema.parse(state),
        updatedAt:  row[0].updatedAt,
      };
    }),

  // ── project.list ────────────────────────────────────────────────────────────
  'project.list': protectedProcedure
    .query(async ({ ctx }) => {
      requireTier(ctx, 'creator');
      const rows = await db
        .select({
          id:        projects.id,
          name:      projects.name,
          updatedAt: projects.updatedAt,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(and(eq(projects.userId, ctx.user.id), isNull(projects.deletedAt)))
        .orderBy(desc(projects.updatedAt))
        .limit(100);

      return rows;
    }),

  // ── project.delete ───────────────────────────────────────────────────────────
  'project.delete': protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select({ userId: projects.userId })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), isNull(projects.deletedAt)))
        .limit(1);

      if (!existing[0] || existing[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
      }

      await db
        .update(projects)
        .set({ deletedAt: new Date() })
        .where(eq(projects.id, input.projectId));

      return { deleted: true };
    }),

  // ── ai.analyse ───────────────────────────────────────────────────────────────
  'ai.analyse': protectedProcedure
    .input(z.object({
      tracks: z.array(TrackSchema),
      bpm:    z.number().min(40).max(240),
    }))
    .mutation(async ({ ctx, input }) => {
      requireTier(ctx, 'creator');
      try {
        return await runLLPTEAnalysis(input.tracks, input.bpm);
      } catch (err) {
        throw new TRPCError({
          code:    'INTERNAL_SERVER_ERROR',
          message: 'LLPTE analysis failed. Check server logs.',
          cause:   err,
        });
      }
    }),

  // ── ai.suggestions ───────────────────────────────────────────────────────────
  'ai.suggestions': protectedProcedure
    .input(z.object({
      tracks:   z.array(TrackSchema),
      bpm:      z.number().min(40).max(240),
      position: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      requireTier(ctx, 'creator');
      const { suggestions } = await runLLPTEAnalysis(input.tracks, input.bpm);
      return { suggestions };
    }),

  // ── ai.chat ──────────────────────────────────────────────────────────────────
  'ai.chat': protectedProcedure
    .input(z.object({
      messages: z.array(z.object({
        role:    z.enum(['user','assistant']),
        content: z.string().max(2000),
      })).max(20),
      context: z.object({
        bpm:           z.number(),
        trackCount:    z.number(),
        activeTrack:   z.string().optional(),
        position:      z.number(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      requireTier(ctx, 'pro_artist');

      // Build context string for system prompt
      const ctxStr = [
        `Project: ${input.context.trackCount} tracks, ${input.context.bpm} BPM.`,
        input.context.activeTrack ? `Selected track: ${input.context.activeTrack}.` : '',
        `Playhead at beat ${input.context.position}.`,
      ].filter(Boolean).join(' ');

      // Real implementation: call Anthropic Messages API or OpenAI
      // Stub returns a deterministic response for the current message
      const userMsg = input.messages.at(-1)?.content ?? '';

      const stubs: [RegExp, string][] = [
        [/reverb|space|room/i, `For techno at ${input.context.bpm} BPM, use a plate reverb with pre-delay 18–22ms and decay 0.8–1.2s. Keep wet <15% on percussive elements to preserve transient punch.`],
        [/bass|sub|low/i,      `Cut below 30Hz on all non-bass tracks with a 12dB/oct HP filter. Bass mono-sum below 120Hz — stereo sub energy wastes headroom. Boost 80Hz +2dB on the kick for weight.`],
        [/mix|balance|level/i, `${ctxStr} I suggest a gain-staging pass: reference levels at -18 dBFS RMS per track before any bus compression. Leave 6dB of headroom on the master output.`],
        [/compress|dynamic/i,  `For club music, glue compression on the drum bus: 2:1 ratio, 10ms attack, 60ms release, 1–2dB GR. Fast release preserves groove. Avoid over-compression on the full mix — it flattens transient energy.`],
        [/arrangement|struc/i, `${ctxStr} Classic 4-on-floor techno: 16-bar intro, 32-bar build, 16-bar drop, 32-bar main, 16-bar breakdown, 32-bar second drop, 16-bar outro. Use filtered loops in transitions.`],
      ];

      const match = stubs.find(([rx]) => rx.test(userMsg));
      const reply = match?.[1] ?? `${ctxStr} I'm analysing your session. The signal chain looks solid — try running the LLPTE analysis for specific mix suggestions tailored to your current arrangement.`;

      return { reply };
    }),

  // ── mastering.analyse ────────────────────────────────────────────────────────
  'mastering.analyse': protectedProcedure
    .input(z.object({
      targetLUFS:   z.number().min(-23).max(-6),
      ceilingDB:    z.number().min(-3).max(-0.1),
      dynamicsMode: z.enum(['natural','compressed','punchy']),
      stereoWidth:  z.number().min(0).max(2),
      currentLUFS:  z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireTier(ctx, 'pro_artist');
      return runMasteringAnalysis(input);
    }),

  // ── collab.roomStats ─────────────────────────────────────────────────────────
  'collab.roomStats': protectedProcedure
    .query(async ({ ctx }) => {
      requireTier(ctx, 'pro_artist');
      const { getRoomStats } = await import('../ws/collab');
      return getRoomStats();
    }),
});

export type DawRouter = typeof dawRouter;/**
 * server/db/schema.ts
 *
 * ROOT FIX — Bug 4 (two subscriptions tables):
 * This file previously defined its own `subscriptions` table with a schema that
 * diverged from shared/schema-subscription.ts on every important billing column:
 *   - Old: `plan text`, no stripeCustomerId, stripeSubscriptionId NOT NULL UNIQUE
 *   - New (canonical): `tier enum`, full Stripe billing columns, userId UNIQUE
 * Both targeted the same DB table name "subscriptions", guaranteeing migration
 * conflicts and runtime inconsistency.
 *
 * Fix: the local `subscriptions` table definition is removed entirely.
 * stripe-subscription.ts already imports from shared/schema-subscription.ts
 * (the authoritative definition). Callers that previously imported Subscription
 * types from here now import from shared/schema-subscription.ts directly.
 *
 * ROOT FIX — Bug 3 (users.tier default mismatch):
 * `users.tier` defaulted to "free", which is not a valid SubscriptionTier
 * ("explorer" | "creator" | "pro_artist"). Changed to "explorer" for
 * consistency. The canonical tier lives in the subscriptions table; users.tier
 * is a denormalized cache — if you want to remove the duplication entirely,
 * drop this column and always read from subscriptions.
 */

import { sql } from "drizzle-orm";
import {
  pgTable, text, varchar, jsonb, integer, boolean,
  timestamp, real, index, uuid, json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// ── Re-export canonical subscription types so existing imports keep working ───
export type {
  Subscription,
  NewSubscription,
  StripeEvent,
  AiTransitionUsage,
} from '../../shared/schema-subscription';

// ==================== USERS ====================
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  /**
   * Denormalized tier cache. Canonical value lives in the `subscriptions` table
   * (shared/schema-subscription.ts). Keep in sync via the Stripe webhook handler.
   * Default changed from "free" → "explorer" to match SubscriptionTier enum.
   */
  tier: text("tier").notNull().default("explorer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isAdmin: boolean("is_admin").notNull().default(false),
});

// ==================== USAGE TRACKING ====================
export const usage = pgTable("usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  mixesUsed: integer("mixes_used").notNull().default(0),
  storageUsedMb: integer("storage_used_mb").notNull().default(0),
  resetAt: timestamp("reset_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("usage_user_id_idx").on(table.userId),
}));

// ==================== SESSIONS ====================
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  bpm: integer("bpm").notNull().default(120),
  fx: jsonb("fx").notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
  filterVal: real("filter_val").notNull().default(0.5),
  pitchSemitones: integer("pitch_semitones").notNull().default(0),
  recordedEvents: jsonb("recorded_events").notNull().default(sql`'[]'::jsonb`).$type<unknown[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
}));

// ==================== PROJECTS ====================
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  bpm: integer("bpm").notNull().default(120),
  timeSignature: text("time_signature").notNull().default("4/4"),
  key: text("key"),
  projectData: jsonb("project_data").notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
  thumbnailUrl: text("thumbnail_url"),
  filePath: text("file_path"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),

  state:     text('state').notNull().default('{}'),
  deletedAt:  timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("projects_user_id_idx").on(table.userId),
}));

// ==================== SAMPLES ====================
export const samples = pgTable("samples", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  duration: real("duration").notNull().default(0),
  bpm: real("bpm"),
  key: text("key"),
  tags: jsonb("tags").notNull().default(sql`'[]'::jsonb`).$type<string[]>(),
  waveformData: jsonb("waveform_data").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("samples_user_id_idx").on(table.userId),
}));

// ==================== PRESETS ====================
export const presets = pgTable("presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  presetData: jsonb("preset_data").notNull().$type<Record<string, unknown>>(),
  isFactory: boolean("is_factory").notNull().default(false),
  tags: jsonb("tags").notNull().default(sql`'[]'::jsonb`).$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("presets_user_id_idx").on(table.userId),
  typeIdx: index("presets_type_idx").on(table.type),
}));

// ==================== SETTINGS ====================
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  audioBufferSize: integer("audio_buffer_size").notNull().default(2048),
  sampleRate: integer("sample_rate").notNull().default(48000),
  bitDepth: integer("bit_depth").notNull().default(24),
  midiEnabled: boolean("midi_enabled").notNull().default(true),
  audioInputDevice: text("audio_input_device").notNull().default("default"),
  audioOutputDevice: text("audio_output_device").notNull().default("default"),
  theme: text("theme").notNull().default("dark"),
  autoSave: boolean("auto_save").notNull().default(true),
  autoSaveInterval: integer("auto_save_interval").notNull().default(300000),
  masterVolume: real("master_volume").notNull().default(0.8),
  metronomeEnabled: boolean("metronome_enabled").notNull().default(false),
  metronomeBpm: integer("metronome_bpm").notNull().default(120),
  metronomeVolume: real("metronome_volume").notNull().default(0.5),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ==================== MIDI MAPPINGS ====================
export const midiMappings = pgTable("midi_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  deviceId: text("device_id").notNull(),
  deviceName: text("device_name").notNull(),
  mappingData: jsonb("mapping_data").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("midi_mappings_user_id_idx").on(table.userId),
}));

// ==================== LEGACY TABLES ====================
export const effectPresetsTable = pgTable("effect_presets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  settings: json("settings").notNull(),
  category: text("category").default("general"),
  author: text("author"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const effectChainsTable = pgTable("effect_chains", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nodes: text("nodes").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const djCuesTable = pgTable("dj_cues", {
  id: text("id").primaryKey(),
  trackId: text("track_id").notNull(),
  index: integer("index").notNull(),
  position: real("position").notNull(),
  label: text("label"),
  color: text("color"),
});

export const waveformEditsTable = pgTable("waveform_edits", {
  id: text("id").primaryKey(),
  sampleId: text("sample_id").notNull(),
  editType: text("edit_type").notNull(),
  params: text("params").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});


export const aiDecisionLog = pgTable("ai_decision_log", {
  id:                   text("id").primaryKey(),
  sessionId:            text("session_id").notNull(),
  nodeId:               text("node_id").notNull(),          // 'aiMixEngine' | 'transitionGraph'
  actionType:           text("action_type").notNull(),      // 'gain_adjust' | 'eq_suggest' | 'transition_generate' | 'conflict_flag'
  trackId:              text("track_id"),
  inputConfidence:      real("input_confidence").notNull(),
  displayedConfidence:  real("displayed_confidence").notNull(),
  decision:             jsonb("decision").notNull(),
  outcome:              text("outcome").notNull(),           // 'auto_applied' | 'accepted' | 'rejected' | 'ignored' | 'discarded'
  latencyMs:            integer("latency_ms").notNull(),
  timestamp:            text("timestamp").notNull(),
});

// ==================== TYPESCRIPT TYPES ====================
export type User               = typeof users.$inferSelect;
export type InsertUser         = typeof users.$inferInsert;
export type Usage              = typeof usage.$inferSelect;
export type InsertUsage        = typeof usage.$inferInsert;
export type Session            = typeof sessions.$inferSelect;
export type InsertSession      = typeof sessions.$inferInsert;
export type Project            = typeof projects.$inferSelect;
export type InsertProject      = typeof projects.$inferInsert;
export type Sample             = typeof samples.$inferSelect;
export type InsertSample       = typeof samples.$inferInsert;
export type Preset             = typeof presets.$inferSelect;
export type InsertPreset       = typeof presets.$inferInsert;
export type Settings           = typeof settings.$inferSelect;
export type InsertSettings     = typeof settings.$inferInsert;
export type MidiMapping        = typeof midiMappings.$inferSelect;
export type InsertMidiMapping  = typeof midiMappings.$inferInsert;
export type AIDecisionLog      = typeof aiDecisionLog.$inferSelect;
export type InsertAIDecisionLog = typeof aiDecisionLog.$inferInsert;

// ==================== ZOD INSERT SCHEMAS ====================
export const insertSessionSchema = createInsertSchema(sessions);
export const insertProjectSchema = createInsertSchema(projects);
export const insertSampleSchema  = createInsertSchema(samples);
export const insertPresetSchema      = createInsertSchema(presets);
export const insertAIDecisionSchema  = createInsertSchema(aiDecisionLog);/**
 * server/index.ts
 * R3 v4 Express server — complete entry point.
 *
 * Wires together:
 *   - helmet, cors, compression, morgan, express-rate-limit
 *   - JSON body parser
 *   - Auth REST routes:  POST /api/auth/register|login  GET /api/auth/me
 *   - tRPC adapter:      /trpc/*  (all DAW procedures)
 *   - Stripe webhook:    POST /api/webhooks/stripe  (raw body, sig verified)
 *   - Static file serve: server/static.ts in production
 *   - WebSocket collab:  ws@8.19.0 at /ws  (attachCollabServer)
 *   - Health check:      GET /health  →  { ok, uptime, rooms }
 *
 * All environment variables are read from process.env.
 * In Railway: set via the Railway dashboard.
 * Locally:    copy .env.example → .env and fill in values.
 *
 * Required env vars:
 *   DATABASE_URL       — PostgreSQL connection string
 *   JWT_SECRET         — Secret for JWT signing (rotate if ever leaked)
 *   STRIPE_SECRET_KEY  — Stripe live/test secret key
 *   STRIPE_WEBHOOK_SECRET — Stripe webhook endpoint secret
 *
 * Optional:
 *   PORT               — default 3001
 *   CLIENT_URL         — CORS allow-list (default: http://localhost:5173)
 *   JWT_EXPIRES        — default 7d
 *   DATABASE_SSL       — set to 'false' to disable SSL (local dev only)
 */

import 'dotenv/config';
import { createServer }       from 'http';
import express                from 'express';
import helmet                 from 'helmet';
import cors                   from 'cors';
import compression            from 'compression';
import morgan                 from 'morgan';
import { rateLimit }          from 'express-rate-limit';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import Stripe                 from 'stripe';

import { createContext }      from './trpc';
import { appRouter }          from './procedures';
import { authRouter }         from './routes/auth';
import { internalRouter }     from './routes/internal';
import { logger }             from './utils/logger';
import { trpcAuth }            from './middleware/auth';
import { attachCollabServer, getRoomStats } from './ws/collab';
import { db }                 from './db';
import { subscriptions }      from '../shared/schema';
import { eq }                 from 'drizzle-orm';
import type { SubscriptionTier, SubscriptionStatus } from '../shared/subscription.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PORT       = parseInt(process.env.PORT ?? '3000', 10);
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();

// Trust Railway's reverse proxy (needed for correct IP in rate limiter)
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────────

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'", "'unsafe-inline'"],  // required by Vite HMR in dev
        connectSrc:  ["'self'", 'wss:', 'ws:'],      // WebSocket collab
        workerSrc:   ["'self'", 'blob:'],            // AudioWorklet
        mediaSrc:    ["'self'", 'blob:'],            // MediaRecorder
        imgSrc:      ["'self'", 'data:'],
      },
    },
    crossOriginEmbedderPolicy: false, // SharedArrayBuffer needs COEP
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin:      CLIENT_URL,
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ── Compression + logging ─────────────────────────────────────────────────────

app.use(compression());
app.use(morgan('combined', {
  skip: (req: express.Request) => req.url === '/health',  // suppress health check noise
  stream: { write: (msg: string) => process.stdout.write(msg) },
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────

// General API limiter
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max:      300,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { error: 'Too many requests. Please try again later.' },
  }),
);

// Strict limiter for auth endpoints (brute-force protection)
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max:      20,
    skipSuccessfulRequests: false,
    message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
  }),
);

// ── Stripe webhook — MUST be before JSON body parser ─────────────────────────

const STRIPE_SECRET          = process.env.STRIPE_SECRET_KEY ?? '';
const STRIPE_WEBHOOK_SECRET  = process.env.STRIPE_WEBHOOK_SECRET ?? '';

const stripe = STRIPE_SECRET
  ? new Stripe(STRIPE_SECRET, { apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion })
  : null;

/**
 * Resolves a Stripe price ID to its SubscriptionTier via strict equality.
 * ROOT FIX: Previous substring tier checks matched nothing — replaced with resolveTierFromPriceId
 * against opaque Stripe IDs (e.g. price_1ABC...) — every paid subscription
 * webhook silently fell through to 'explorer' (free tier).
 */
function resolveTierFromPriceId(priceId: string): SubscriptionTier {
  if (!priceId) return 'explorer';
  const creatorMonthly   = process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID;
  const creatorYearly    = process.env.STRIPE_CREATOR_YEARLY_PRICE_ID;
  const proArtistMonthly = process.env.STRIPE_PRO_ARTIST_MONTHLY_PRICE_ID;
  const proArtistYearly  = process.env.STRIPE_PRO_ARTIST_YEARLY_PRICE_ID;
  if (priceId === creatorMonthly   || priceId === creatorYearly)   return 'creator';
  if (priceId === proArtistMonthly || priceId === proArtistYearly) return 'pro_artist';
  return 'explorer';
}

app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      res.sendStatus(400);
      return;
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) { res.sendStatus(400); return; }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error('[stripe/webhook] Signature verification failed:', (err as Error).message);
      res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      return;
    }

    // Handle subscription lifecycle events
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = sub.customer as string;
          // Resolve user by Stripe customer ID stored in subscriptions table
          const [existing] = await db
            .select({ userId: subscriptions.userId })
            .from(subscriptions)
            .where(eq(subscriptions.stripeCustomerId, customerId))
            .limit(1);
          if (existing) {
            const priceId = sub.items.data[0]?.price.id ?? '';
            const tier    = resolveTierFromPriceId(priceId);
            const rawPeriodEnd = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end;
            await db.update(subscriptions)
              .set({
                tier,
                status:           sub.status,
                stripeSubscriptionId: sub.id,
                currentPeriodEnd: typeof rawPeriodEnd === 'number' ? new Date(rawPeriodEnd * 1000) : null,
                updatedAt:        new Date(),
              })
              .where(eq(subscriptions.userId, existing.userId));
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = sub.customer as string;
          const [existing] = await db
            .select({ userId: subscriptions.userId })
            .from(subscriptions)
            .where(eq(subscriptions.stripeCustomerId, customerId))
            .limit(1);
          if (existing) {
            await db.update(subscriptions)
              .set({ tier: 'explorer', status: 'canceled', updatedAt: new Date() })
              .where(eq(subscriptions.userId, existing.userId));
          }
          break;
        }

        default:
          // Unhandled event type — not an error
          break;
      }
    } catch (err) {
      console.error('[stripe/webhook] Handler error:', (err as Error).message);
      // Return 200 to prevent Stripe from retrying — log the failure instead
    }

    res.json({ received: true });
  },
);

// ── JSON body parser (after raw webhook route) ────────────────────────────────

app.use(express.json({ limit: '2mb' }));

// Global JWT middleware
app.use(trpcAuth);

// ── Auth REST routes ──────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/internal', internalRouter);

// ── tRPC adapter ──────────────────────────────────────────────────────────────

// trpcAuth populates req.user from Bearer token — must precede createContext
app.use('/api/trpc', trpcAuth);
app.use(
  '/api/trpc',
  createExpressMiddleware({
    router:        appRouter,
    createContext,
    onError({ path, error }: { path: string | undefined; error: { code: string; message: string } }) {
      // Only log unexpected errors (not input validation or auth failures)
      if (error.code !== 'BAD_REQUEST' && error.code !== 'UNAUTHORIZED' && error.code !== 'FORBIDDEN') {
        console.error(`[tRPC] /${path} → ${error.message}`);
      }
    },
  }),
);

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  const rooms = getRoomStats();
  res.json({
    ok:      true,
    uptime:  Math.floor(process.uptime()),
    memory:  process.memoryUsage().rss,
    collab:  rooms,
    version: process.env.npm_package_version ?? '4.0.0',
  });
});

// ── 404 fallback ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── HTTP + WebSocket server ───────────────────────────────────────────────────

const httpServer = createServer(app);

// Attach WebSocket collab server at /ws
attachCollabServer(httpServer);

httpServer.listen(PORT, () => {
  logger.info('[R3 v4] Server listening', { port: PORT });
  logger.info('[R3 v4] tRPC at /api/trpc');
  logger.info('[R3 v4] WebSocket collab at /ws');
  logger.info('[R3 v4] Auth at /api/auth');
  logger.info('[R3 v4] Internal at /api/internal');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('[R3 v4] SIGTERM received — shutting down gracefully');
  httpServer.close(() => process.exit(0));
});

export { app, httpServer };r3v@penguin:~/Stable$ 