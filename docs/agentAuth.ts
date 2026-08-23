/**
 * apps/r3vibe/src/server/middleware/agentAuth.ts  (Stable / R3v4 monorepo)
 *
 * Service-to-service authentication guard for agent-injected endpoints.
 *
 * Usage in any tRPC router:
 *   import { agentProcedure } from '../middleware/agentAuth';
 *   export const myRouter = router({
 *     myEndpoint: agentProcedure.input(...).mutation(...),
 *   });
 *
 * The token is set identically in both:
 *   ~/Agi-Suite/.env   → AGENT_SERVICE_TOKEN=<value>
 *   ~/Stable/.env      → AGENT_SERVICE_TOKEN=<same value>
 *
 * Generate once: openssl rand -hex 32
 * Rotate: update both .env files and restart both services.
 *
 * Security note:
 *   This does NOT replace user JWT auth on user-facing endpoints.
 *   agentProcedure is ONLY for internal agent injection routes.
 *   Do not expose these routes publicly (Nginx: deny all except 127.0.0.1 for /api/trpc/agent.*).
 */
import { TRPCError }    from '@trpc/server';
import { middleware, procedure } from '../trpc';

const AGENT_TOKEN = process.env.AGENT_SERVICE_TOKEN;

if (!AGENT_TOKEN) {
  // Hard fail at startup — not a runtime check
  throw new Error('AGENT_SERVICE_TOKEN env var is required but not set');
}

// ─── Middleware ────────────────────────────────────────────────────────────

const enforceAgentToken = middleware(({ ctx, next }) => {
  const token = ctx.req.headers['x-agent-token'];

  if (!token || token !== AGENT_TOKEN) {
    throw new TRPCError({
      code:    'UNAUTHORIZED',
      message: 'Invalid or missing agent service token',
    });
  }

  const agentId = ctx.req.headers['x-agent-id'] as string | undefined;

  return next({
    ctx: {
      ...ctx,
      agentId: agentId ?? 'unknown',
      isAgent: true,
    },
  });
});

// ─── Agent-scoped procedure (use instead of `procedure` in agent routers) ─

export const agentProcedure = procedure.use(enforceAgentToken);
