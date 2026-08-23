/**
 * routers/agents.ts  (Agi-Suite)
 *
 * tRPC router exposed to Agent-OS.
 * Agent-OS calls registerAgent → worker.ts picks it up → result flows back to R3v4.
 *
 * Mount in your Agi-Suite main router:
 *   export const appRouter = router({ ..., agents: agentsRouter });
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, agentProcedure } from "../middleware/agentAuth"; // re-use same pattern
import { db } from "../db";
import { agents } from "../schema/agents";
import type { RegisterAgentInput, RegisterAgentOutput, AgentStatusOutput } from "@r3/api-types";

// ─── Input schemas ─────────────────────────────────────────────────────────────

const AgentTypeSchema = z.enum(["troubleshoot", "mix", "vocal-spectra", "style-delta"]);

const RegisterAgentSchema = z.object({
  type: AgentTypeSchema,
  payload: z.record(z.unknown()), // validated by handler at runtime
  idempotencyKey: z.string().optional(),
}) satisfies z.ZodType<RegisterAgentInput>;

// ─── Router ────────────────────────────────────────────────────────────────────

export const agentsRouter = router({
  /**
   * Agent-OS → Agi-Suite: register a new agent task.
   * Returns immediately — agent runs asynchronously.
   */
  register: agentProcedure
    .input(RegisterAgentSchema)
    .mutation(async ({ input }): Promise<RegisterAgentOutput> => {
      // Idempotency check
      if (input.idempotencyKey) {
        const existing = await db
          .select()
          .from(agents)
          .where(eq(agents.idempotencyKey, input.idempotencyKey))
          .limit(1);

        if (existing.length > 0) {
          const e = existing[0];
          return {
            agentId: e.id,
            status: e.status,
            queuedAt: e.createdAt.toISOString(),
          };
        }
      }

      const [agent] = await db
        .insert(agents)
        .values({
          type: input.type,
          payload: { ...input.payload, type: input.type },
          idempotencyKey: input.idempotencyKey ?? null,
        })
        .returning();

      // Notify worker via pg NOTIFY (worker also polls as fallback)
      await db.execute(`NOTIFY agent_ready, '${agent.id}'`);

      return {
        agentId: agent.id,
        status: agent.status,
        queuedAt: agent.createdAt.toISOString(),
      };
    }),

  /**
   * Agent-OS → Agi-Suite: poll agent status + result.
   */
  getStatus: agentProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ input }): Promise<AgentStatusOutput> => {
      const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, input.agentId))
        .limit(1);

      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Agent ${input.agentId} not found` });
      }

      return {
        agentId: agent.id,
        status: agent.status,
        result: agent.result as AgentStatusOutput["result"],
        error: agent.error ?? undefined,
        createdAt: agent.createdAt.toISOString(),
        completedAt: agent.completedAt?.toISOString(),
      };
    }),

  /**
   * Agent-OS → Agi-Suite: list recent agents (last 50).
   */
  list: agentProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        status: z.enum(["pending", "claimed", "running", "done", "failed"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(agents)
        .where(input.status ? eq(agents.status, input.status) : undefined)
        .orderBy(agents.createdAt)
        .limit(input.limit);

      return rows.map((a) => ({
        agentId: a.id,
        type: a.type,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        completedAt: a.completedAt?.toISOString(),
      }));
    }),
});

export type AgentsRouter = typeof agentsRouter;
