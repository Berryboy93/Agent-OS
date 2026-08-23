/**
 * apps/agent-runner/src/agent-sandbox.ts  (Agi-Suite monorepo)
 *
 * Worker-thread entry point.
 * Each agent runs in its own thread via worker_threads.
 * Crashes here do NOT propagate to the supervisor worker.ts process.
 *
 * Communication protocol with supervisor:
 *   parentPort.postMessage({ type: 'done' })           — success
 *   parentPort.postMessage({ type: 'error', error })   — failure
 */
import { workerData, parentPort } from 'worker_threads';
import { db }                     from '@agi-suite/db';
import { agents }                 from '@agi-suite/db/schema/agents';
import { eq }                     from 'drizzle-orm';
import { AgentBridge }            from './agent-bridge';
import { resolveAgentHandler }    from './handlers';

if (!parentPort) throw new Error('agent-sandbox must run as a worker thread');

const { agentId } = workerData as { agentId: string };

async function run() {
  // Load agent record
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) throw new Error(`Agent ${agentId} not found in DB`);

  // Resolve handler
  const handler = resolveAgentHandler(agent.type);

  // Build bridge
  const bridge = new AgentBridge({
    agentId:   agent.id,
    sessionId: agent.sessionId ?? null,
    projectId: agent.projectId ?? null,
    ownerId:   agent.ownerId,
  });

  try {
    // Connect real-time WS channel (for DSP agents)
    if (agent.target === 'r3v4' || agent.target === 'both') {
      await bridge.connectRealtime();
    }

    // Execute handler
    await handler.execute(agent.config as Record<string, unknown>, bridge);

    // Flush buffered audit writes
    await bridge.flush();

  } finally {
    bridge.destroy();   // stop heartbeat, close WS
  }
}

run()
  .then(() => {
    parentPort!.postMessage({ type: 'done' });
  })
  .catch((err) => {
    parentPort!.postMessage({
      type:  'error',
      error: err instanceof Error ? err.message : String(err),
    });
  });
