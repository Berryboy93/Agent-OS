/**
 * apps/agent-runner/src/event-bus/index.ts  (Agi-Suite monorepo)
 *
 * Hybrid event bus:
 *   - pg NOTIFY for low-latency delivery when the worker is up
 *   - Polling outbox as the durable fallback (catches events missed during downtime)
 *
 * No Redis dependency — zero new infrastructure.
 */
import { Client } from 'pg';

const CHANNEL = 'agent_registered';

// ─── Publisher (called from agentsRouter after db insert) ─────────────────

export async function publishAgentEvent(
  agentId: string,
  databaseUrl: string = process.env.DATABASE_URL!,
): Promise<void> {
  // Payload must be < 8KB — agentId UUID is well within limits
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query(`NOTIFY ${CHANNEL}, $1`, [agentId]);
  } finally {
    await client.end();
  }
}

// ─── Subscriber (used in worker) ─────────────────────────────────────────

type AgentEventHandler = (agentId: string) => Promise<void>;

export class AgentEventBus {
  private client: Client;
  private handler: AgentEventHandler;
  private reconnectMs = 5_000;

  constructor(handler: AgentEventHandler) {
    this.handler = handler;
    this.client  = new Client({ connectionString: process.env.DATABASE_URL! });
  }

  async start(): Promise<void> {
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      await this.client.query(`LISTEN ${CHANNEL}`);

      this.client.on('notification', async (msg) => {
        if (msg.channel !== CHANNEL || !msg.payload) return;
        await this.handler(msg.payload).catch((err) =>
          console.error(`[EventBus] Handler error for agentId=${msg.payload}:`, err)
        );
      });

      this.client.on('error', (err) => {
        console.error('[EventBus] pg client error, reconnecting:', err.message);
        this.reconnect();
      });

      console.log('[EventBus] LISTEN active on channel:', CHANNEL);
    } catch (err) {
      console.error('[EventBus] Connect failed, retrying in', this.reconnectMs, 'ms:', err);
      this.reconnect();
    }
  }

  private reconnect(): void {
    this.client = new Client({ connectionString: process.env.DATABASE_URL! });
    setTimeout(() => this.connect(), this.reconnectMs);
  }

  async stop(): Promise<void> {
    await this.client.end().catch(() => {});
  }
}
