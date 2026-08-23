/**
 * apps/r3vibe/src/server/routers/diagnostics.ts  (Stable / R3v4 monorepo)
 *
 * Receives agent-injected diagnostic findings and migration status queries.
 * All endpoints guarded by agentProcedure (service-to-service token).
 *
 * Wire into _app.ts:
 *   import { diagnosticsRouter } from './diagnostics';
 *   export const appRouter = router({
 *     ...existing,
 *     diagnostics: diagnosticsRouter,
 *   });
 */
import { router }           from '../trpc';
import { agentProcedure }   from '../middleware/agentAuth';
import { z }                from 'zod';
import { db }               from '@r3/db';
import { diagnosticFindings, migrations } from '@r3/db/schema';
import { eq, sql }          from 'drizzle-orm';

// ─── Zod schemas ──────────────────────────────────────────────────────────

const FindingSchema = z.object({
  severity:  z.enum(['info', 'warn', 'error', 'critical']),
  category:  z.string().min(1).max(100),
  message:   z.string().min(1).max(2000),
  fix:       z.string().max(2000).optional(),
  autoApply: z.boolean().optional(),
});

const IngestSchema = z.object({
  sessionId: z.string().nullable(),
  projectId: z.string().nullable(),
  agentId:   z.string().uuid(),
  findings:  z.array(FindingSchema).min(1).max(100),
});

// ─── Router ───────────────────────────────────────────────────────────────

export const diagnosticsRouter = router({

  /**
   * Receive troubleshooting findings from an Agi-Suite agent.
   * Persists to diagnosticFindings table.
   * Auto-applies critical findings where autoApply=true and a fix handler exists.
   */
  ingestAgentFindings: agentProcedure
    .input(IngestSchema)
    .mutation(async ({ input, ctx }) => {
      const now = new Date();

      // Bulk insert all findings in one query
      await db.insert(diagnosticFindings).values(
        input.findings.map((f) => ({
          severity:  f.severity,
          category:  f.category,
          message:   f.message,
          fix:       f.fix ?? null,
          autoApply: f.autoApply ?? false,
          sessionId: input.sessionId,
          projectId: input.projectId,
          agentId:   input.agentId,
          resolved:  false,
          createdAt: now,
        }))
      );

      // Handle auto-apply for critical findings that have a fix handler
      const autoFixable = input.findings.filter(
        (f) => f.autoApply && f.severity === 'critical' && f.fix
      );

      const autoApplied: string[] = [];
      for (const finding of autoFixable) {
        const applied = await tryAutoApply(finding, input, ctx.agentId);
        if (applied) autoApplied.push(finding.category);
      }

      return {
        ingested:    input.findings.length,
        autoApplied: autoApplied.length,
        categories:  autoApplied,
      };
    }),

  /**
   * Return R3v4 audio metrics for the troubleshoot agent.
   */
  getAudioMetrics: agentProcedure
    .input(z.object({ sessionId: z.string().optional() }))
    .query(async ({ input }) => {
      // Pull from your existing session-metrics service / table
      // Placeholder shape — replace with real query against your metrics table
      const row = await db.query.sessionMetrics.findFirst({
        where: input.sessionId
          ? (t, { eq }) => eq(t.sessionId, input.sessionId!)
          : undefined,
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });

      return {
        bufferUnderrunRate: row?.bufferUnderrunRate ?? 0,
        latencyMs:          row?.outputLatencyMs ?? 0,
        sampleRate:         row?.sampleRate ?? 44100,
      };
    }),

  /**
   * Return Drizzle migration health for the troubleshoot agent.
   */
  getMigrationStatus: agentProcedure
    .query(async () => {
      // Check drizzle_migrations table for unapplied entries
      const [result] = await db.execute<{
        applied: number;
        pending: string;
      }>(sql`
        SELECT
          COUNT(*) FILTER (WHERE applied_at IS NOT NULL) AS applied,
          STRING_AGG(migration_name, ', ')
            FILTER (WHERE applied_at IS NULL)             AS pending
        FROM drizzle_migrations
      `);

      const pendingNames = result?.pending
        ? result.pending.split(', ')
        : [];

      return {
        upToDate:             pendingNames.length === 0,
        pendingCount:         pendingNames.length,
        pending:              pendingNames,
        aiDecisionLogMissing: pendingNames.some((n) => n.includes('0005')),
      };
    }),

});

// ─── Auto-apply dispatcher ────────────────────────────────────────────────

async function tryAutoApply(
  finding: z.infer<typeof FindingSchema>,
  input:   z.infer<typeof IngestSchema>,
  agentId: string,
): Promise<boolean> {
  // Only auto-apply known, safe categories
  // Never auto-apply: 'database', 'audio-engine', or anything with DB migrations
  const SAFE_AUTO_APPLY_CATEGORIES = new Set(['vocal-spectra']);

  if (!SAFE_AUTO_APPLY_CATEGORIES.has(finding.category)) {
    return false;
  }

  // Dispatch to category-specific handler
  switch (finding.category) {
    case 'vocal-spectra': {
      // Example: restart an errored node
      // In practice: call your VocalSpectra service here
      console.log(`[Diagnostics] Auto-applying fix for vocal-spectra (agent=${agentId}):`, finding.fix);
      return true;
    }
    default:
      return false;
  }
}
