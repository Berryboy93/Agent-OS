import { Pool, PoolConfig } from 'pg';
import { createHash } from 'crypto';

export interface StoreEvent {
  id?: string;
  sequence_number?: number;
  timestamp: string;
  type: string;
  payload: Record<string, any>;
  previous_hash: string;
  hash: string;
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

export class PostgresEventStore {
  private pool: Pool;
  private tableName: string;

  constructor(config: EventStoreConfig, tableName = 'events') {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max_connections ?? 20,
    };
    this.pool = new Pool(poolConfig);
    this.tableName = tableName;
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        sequence_number BIGINT UNIQUE NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        type VARCHAR(255) NOT NULL,
        payload JSONB NOT NULL,
        previous_hash VARCHAR(64) NOT NULL,
        hash VARCHAR(64) NOT NULL,
        dag_id VARCHAR(255),
        agent_id VARCHAR(255),
        session_id VARCHAR(255)
      );
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_dag ON ${this.tableName}(dag_id);
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_agent ON ${this.tableName}(agent_id);
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_session ON ${this.tableName}(session_id);
    `);
  }

  async append(event: StoreEvent): Promise<StoreEvent> {
    const hash = this.computeHash(event);
    const result = await this.pool.query(
      `INSERT INTO ${this.tableName}
        (sequence_number, timestamp, type, payload, previous_hash, hash, dag_id, agent_id, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        event.sequence_number,
        event.timestamp,
        event.type,
        JSON.stringify(event.payload),
        event.previous_hash,
        hash,
        event.dag_id ?? null,
        event.agent_id ?? null,
        event.session_id ?? null,
      ]
    );
    return result.rows[0];
  }

  async getEvents(dagId?: string, limit = 100): Promise<StoreEvent[]> {
    let query = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];
    if (dagId) {
      query += ` WHERE dag_id = $1`;
      params.push(dagId);
    }
    query += ` ORDER BY sequence_number ASC LIMIT ${limit}`;
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private computeHash(event: StoreEvent): string {
    const data = `${event.timestamp}:${event.type}:${JSON.stringify(event.payload)}:${event.previous_hash}`;
    return createHash('sha256').update(data).digest('hex');
  }
}
