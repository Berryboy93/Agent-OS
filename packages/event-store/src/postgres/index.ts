import { Pool, PoolClient, PoolConfig } from "pg";
import { createHash, randomUUID } from "node:crypto";

const GENESIS_HASH = "0".repeat(64);

export interface StoreEvent {
  id?: string;
  sequence_number?: number;
  timestamp: string | Date;
  type: string;
  payload: Record<string, unknown>;
  previous_hash?: string;
  hash?: string;
  dag_id?: string;
  agent_id?: string;
  session_id?: string;
}

export interface EventStoreConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max_connections?: number;
}

export interface EventQuery {
  type?: string;
  dag_id?: string;
  agent_id?: string;
  session_id?: string;
  after_sequence?: number;
  limit?: number;
}

export interface ChainVerificationResult {
  valid: boolean;
  checked: number;
  error?: string;
}

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

export class PostgresEventStore {
  private readonly pool: Pool;
  private readonly tableName: string;
  private readonly quotedTableName: string;

  constructor(config: EventStoreConfig, tableName = "events") {
    this.tableName = tableName;
    this.quotedTableName = quoteIdentifier(tableName);

    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max_connections ?? 20,
    };

    this.pool = new Pool(poolConfig);
  }

  async init(): Promise<void> {
    const table = this.quotedTableName;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id UUID PRIMARY KEY,
        sequence_number BIGINT UNIQUE NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        type VARCHAR(128) NOT NULL,
        payload JSONB NOT NULL,
        previous_hash VARCHAR(64) NOT NULL,
        hash VARCHAR(64) NOT NULL,
        dag_id UUID,
        agent_id UUID,
        session_id UUID,

        CONSTRAINT valid_hash
          CHECK (hash ~ '^[a-f0-9]{64}$'),

        CONSTRAINT valid_previous_hash
          CHECK (previous_hash ~ '^[a-f0-9]{64}$')
      );

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_type
        ON ${table}(type);

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_dag
        ON ${table}(dag_id);

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_agent
        ON ${table}(agent_id);

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_session
        ON ${table}(session_id);

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_timestamp
        ON ${table}(timestamp);

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_sequence
        ON ${table}(sequence_number);

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_payload
        ON ${table} USING GIN(payload);
    `);

    await this.pool.query(`
      CREATE OR REPLACE FUNCTION prevent_${this.tableName}_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION
          'Events are immutable: operation % on table % is forbidden',
          TG_OP,
          TG_TABLE_NAME;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await this.pool.query(`
      DROP TRIGGER IF EXISTS ${this.tableName}_immutable ON ${table};

      CREATE TRIGGER ${this.tableName}_immutable
      BEFORE UPDATE OR DELETE ON ${table}
      FOR EACH ROW
      EXECUTE FUNCTION prevent_${this.tableName}_mutation();
    `);
  }

  async append(event: StoreEvent): Promise<StoreEvent> {
    const client = await this.pool.connect();
    const table = this.quotedTableName;

    try {
      await client.query("BEGIN");

      // Serialize chain-head allocation for this event stream.
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        [this.tableName],
      );

      const headResult = await client.query<{
        sequence_number: string;
        hash: string;
      }>(
        `
        SELECT sequence_number, hash
        FROM ${table}
        ORDER BY sequence_number DESC
        LIMIT 1
        `,
      );

      const previousSequence = headResult.rows[0]
        ? Number(headResult.rows[0].sequence_number)
        : 0;

      const previousHash = headResult.rows[0]?.hash ?? GENESIS_HASH;
      const sequenceNumber = previousSequence + 1;
      const timestamp = event.timestamp || new Date().toISOString();

      const hash = this.computeHash({
        ...event,
        timestamp,
        sequence_number: sequenceNumber,
        previous_hash: previousHash,
      });

      const id = event.id ?? randomUUID();

      const result = await client.query(
        `
        INSERT INTO ${table} (
          id,
          sequence_number,
          timestamp,
          type,
          payload,
          previous_hash,
          hash,
          dag_id,
          agent_id,
          session_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id,
          sequence_number,
          timestamp,
          type,
          payload,
          previous_hash,
          hash,
          dag_id,
          agent_id,
          session_id
        `,
        [
          id,
          sequenceNumber,
          timestamp,
          event.type,
          JSON.stringify(event.payload),
          previousHash,
          hash,
          event.dag_id ?? null,
          event.agent_id ?? null,
          event.session_id ?? null,
        ],
      );

      await client.query("COMMIT");

      return result.rows[0] as StoreEvent;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getEvents(
    query?: EventQuery | string,
    limit = 100,
  ): Promise<StoreEvent[]> {
    const table = this.quotedTableName;

    const filters: string[] = [];
    const params: unknown[] = [];

    if (typeof query === "string") {
      filters.push(`dag_id = $1`);
      params.push(query);
    } else if (query) {
      if (query.type) {
        params.push(query.type);
        filters.push(`type = $${params.length}`);
      }

      if (query.dag_id) {
        params.push(query.dag_id);
        filters.push(`dag_id = $${params.length}`);
      }

      if (query.agent_id) {
        params.push(query.agent_id);
        filters.push(`agent_id = $${params.length}`);
      }

      if (query.session_id) {
        params.push(query.session_id);
        filters.push(`session_id = $${params.length}`);
      }

      if (query.after_sequence !== undefined) {
        params.push(query.after_sequence);
        filters.push(`sequence_number > $${params.length}`);
      }

      limit = query.limit ?? limit;
    }

    limit = Math.max(1, Math.min(Math.floor(limit), 1000));

    const where = filters.length
      ? `WHERE ${filters.join(" AND ")}`
      : "";

    const result = await this.pool.query(
      `
      SELECT
        id,
        sequence_number,
        timestamp,
        type,
        payload,
        previous_hash,
        hash,
        dag_id,
        agent_id,
        session_id
      FROM ${table}
      ${where}
      ORDER BY sequence_number ASC
      LIMIT ${limit}
      `,
      params,
    );

    return result.rows as StoreEvent[];
  }

  async verifyChain(): Promise<ChainVerificationResult> {
    const table = this.quotedTableName;

    const result = await this.pool.query<StoreEvent>(
      `
      SELECT
        id,
        sequence_number,
        timestamp,
        type,
        payload,
        previous_hash,
        hash,
        dag_id,
        agent_id,
        session_id
      FROM ${table}
      ORDER BY sequence_number ASC
      `,
    );

    let expectedSequence = 1;
    let previousHash = GENESIS_HASH;

    for (const event of result.rows) {
      if (Number(event.sequence_number) !== expectedSequence) {
        return {
          valid: false,
          checked: expectedSequence - 1,
          error:
            `Sequence mismatch: expected ${expectedSequence}, ` +
            `got ${event.sequence_number}`,
        };
      }

      if (event.previous_hash !== previousHash) {
        return {
          valid: false,
          checked: expectedSequence - 1,
          error:
            `Previous-hash mismatch at sequence ${expectedSequence}`,
        };
      }

      const computedHash = this.computeHash(event);

      if (event.hash !== computedHash) {
        return {
          valid: false,
          checked: expectedSequence - 1,
          error:
            `Hash mismatch at sequence ${expectedSequence}`,
        };
      }

      previousHash = event.hash;
      expectedSequence += 1;
    }

    return {
      valid: true,
      checked: result.rows.length,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private normalizeTimestamp(timestamp: string | Date): string {
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }

    return timestamp;
  }

  private stableJson(value: unknown): string {
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

  private computeHash(event: StoreEvent): string {
    const normalizedTimestamp = this.normalizeTimestamp(event.timestamp);
    const stablePayload = this.stableJson(event.payload);
    const previousHash = event.previous_hash ?? GENESIS_HASH;

    const data = [
      normalizedTimestamp,
      event.type,
      stablePayload,
      previousHash,
    ].join(":");

    return createHash("sha256").update(data).digest("hex");
  }
}
