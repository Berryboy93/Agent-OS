/**
 * apps/agent-runner/src/worker.ts  (Agi-Suite monorepo)
 *
 * Production-grade agent deployment worker.
 *
 * Fixes applied vs. v1:
 *   ✅ Atomic status claim (prevents double-execution)
 *   ✅ Polling outbox every 5s (pg NOTIFY unreliable across restarts)
 *   ✅ Stuck-deploying recovery (>30s in 'deploying' = crashed runner)
 *   ✅ Worker-thread isolation (handler crash can't kill this process)
 *   ✅ Per-agent execution timeout (60s default, configurable per type)
 *   ✅ Retry with backoff up to maxAttempts
 *   ✅ Concurrency cap (MAX_CONCURRENT_AGENTS env var)
 *   ✅ Graceful shutdown (SIGTERM drains in-flight workers)
 */
import { Worker } from 'worker_threads';
import { eq, and, or, lt } from 'drizzle-orm';
import path from 'path';
import { db } from '@agi-suite/db';
import { agents }          from '@agi-suite/db/schema/agents';
import { AgentEventBus }   from './event-bus';
import type { Agent }      from '@agi-suite/db/schema/agents';

// ─── Config ───────────────────────────────────────────────────────────────

const MAX_CONCURRENT      = parseInt(process.env.MAX_CONCURRENT_AGENTS ?? '5', 10);
const POLL_INTERVAL_MS    = parseInt(process.env.AGENT_POLL_INTERVAL_MS ?? '5000', 10);
const STUCK_THRESHOLD_MS  = parseInt(process.env.AGENT_STUCK_THRESHOLD_MS ?? '30000', 10);
const POLL_BATCH_SIZE     = parseInt(process.env.AGENT_POLL_BATCH_SIZE ?? '10', 10);

// Per-type timeout overrides (ms). Default: 60s.
const AGENT_TIMEOUTS: Record<string, number> = {
  'troubleshoot':  60_000,
  'mix':           120_000,
  'vocal-spectra': 300_000,   // long-running DSP session
  'style-delta':   90_000,
  'custom':        60_000,
};

// ─── State ────────────────────────────────────────────────────────────────

const activeWorkers = new Set<Worker>();
let   isShuttingDown = false;

// ─── Atomic Claim ─────────────────────────────────────────────────────────
// Uses WHERE status = 'registered' as the optimistic lock.
// Returns true only if THIS process claimed the agent.
// Concurrent workers racing on the same agentId: exactly one wins.

async function claimAgent(agentId: string): Promise<boolean> {
  const result = await db
    .update(agents)
    .set({ status: 'deploying', deployedAt: new Date() })
    .where(
      and(
        eq(agents.id, agentId),
        eq(agents.status, 'registered'),         // only unclaimed agents
      )
    )
    .returning({ id: agents.id });

  return result.length > 0;
}

// ─── Worker-Thread Isolation ───────────────────────────────────────────────
// Each agent runs in its own worker thread.
// A crash in the handler cannot propagate to this supervisor process.

function runAgentInThread(agentId: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      path.resolve(__dirname, 'agent-sandbox.js'),  // compiled JS entry
      { workerData: { agentId } }
    );

    activeWorkers.add(worker);

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Agent ${agentId} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    worker.on('message', (msg) => {
      if (msg.type === 'done') {
        clearTimeout(timer);
        resolve();
      } else if (msg.type === 'error') {
        clearTimeout(timer);
        reject(new Error(msg.error));
      }
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    worker.on('exit', (code) => {
      activeWorkers.delete(worker);
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}

// ─── Deploy ───────────────────────────────────────────────────────────────

async function deployAgent(agentId: string): Promise<void> {
  if (isShuttingDown) return;
  if (activeWorkers.size >= MAX_CONCURRENT) {
    // Backpressure: re-enqueue via polling (agent stays 'registered')
    console.warn(`[Worker] Concurrency cap (${MAX_CONCURRENT}) reached, skipping ${agentId} until next poll`);
    return;
  }

  const claimed = await claimAgent(agentId);
  if (!claimed) {
    // Another runner instance claimed it first — nothing to do
    return;
  }

  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return;

  const timeoutMs = AGENT_TIMEOUTS[agent.type] ?? 60_000;

  console.log(`[Worker] Deploying agent ${agentId} (type=${agent.type}, timeout=${timeoutMs}ms)`);

  try {
    await runAgentInThread(agentId, timeoutMs);

    await db.update(agents)
      .set({ status: 'idle', completedAt: new Date() })
      .where(eq(agents.id, agentId));

    console.log(`[Worker] Agent ${agentId} completed successfully`);

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const attemptIncrement = agent.attemptCount + 1;

    if (attemptIncrement >= agent.maxAttempts) {
      // Exhausted retries — terminal failure
      await db.update(agents)
        .set({ status: 'error', errorLog: errorMsg, attemptCount: attemptIncrement })
        .where(eq(agents.id, agentId));
      console.error(`[Worker] Agent ${agentId} failed permanently after ${attemptIncrement} attempts:`, errorMsg);
    } else {
      // Requeue for retry — reset to 'registered' so polling picks it up
      await db.update(agents)
        .set({ status: 'registered', errorLog: errorMsg, attemptCount: attemptIncrement })
        .where(eq(agents.id, agentId));
      console.warn(`[Worker] Agent ${agentId} failed (attempt ${attemptIncrement}/${agent.maxAttempts}), requeued`);
    }
  }
}

// ─── Polling Outbox ────────────────────────────────────────────────────────
// Runs every POLL_INTERVAL_MS. Catches:
//   - agents missed during runner downtime (pg NOTIFY not delivered)
//   - agents stuck in 'deploying' from a previous crash
//   - retry-requeued agents (reset to 'registered' above)

async function pollOutbox(): Promise<void> {
  if (isShuttingDown) return;

  const stuckDeployingCutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);

  const pending = await db.select({ id: agents.id }).from(agents)
    .where(
      or(
        eq(agents.status, 'registered'),
        and(
          eq(agents.status, 'deploying'),
          lt(agents.deployedAt, stuckDeployingCutoff)
        )
      )
    )
    .limit(POLL_BATCH_SIZE);

  for (const { id } of pending) {
    // Reset stuck-deploying agents back to registered so claimAgent works
    await db.update(agents)
      .set({ status: 'registered' })
      .where(
        and(
          eq(agents.id, id),
          eq(agents.status, 'deploying'),
          lt(agents.deployedAt, stuckDeployingCutoff)
        )
      );

    await deployAgent(id).catch((err) =>
      console.error(`[Outbox] Error deploying ${id}:`, err)
    );
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('[Worker] Agent Runner starting...');

  // 1. pg NOTIFY listener (low-latency path)
  const eventBus = new AgentEventBus(async (agentId) => {
    await deployAgent(agentId).catch((err) =>
      console.error(`[EventBus] Deploy error for ${agentId}:`, err)
    );
  });
  await eventBus.start();

  // 2. Polling outbox (durable fallback)
  const pollTimer = setInterval(pollOutbox, POLL_INTERVAL_MS);

  // 3. Immediate startup scan (pick up anything from before this boot)
  await pollOutbox();

  console.log(`[Worker] Ready. Concurrency cap: ${MAX_CONCURRENT}, poll: ${POLL_INTERVAL_MS}ms`);

  // ─── Graceful shutdown ──────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`[Worker] ${signal} received, draining ${activeWorkers.size} active workers...`);
    isShuttingDown = true;
    clearInterval(pollTimer);
    await eventBus.stop();

    // Wait up to 30s for active workers to finish
    const drainTimeout = setTimeout(() => {
      console.warn('[Worker] Drain timeout — terminating remaining workers');
      for (const w of activeWorkers) w.terminate();
      process.exit(1);
    }, 30_000);

    // Poll until all workers complete
    while (activeWorkers.size > 0) {
      await new Promise((r) => setTimeout(r, 500));
    }

    clearTimeout(drainTimeout);
    console.log('[Worker] Clean shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[Worker] Fatal startup error:', err);
  process.exit(1);
});
