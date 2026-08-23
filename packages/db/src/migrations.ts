/**
 * @agent-os/db — migration runner
 * Usage: import { runMigrations, getMigrationStatus } from '@agent-os/db'
 */

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

export interface MigrationResult {
  success: boolean;
  migrationsRun: number;
  error?: Error;
  startTime: number;
  endTime: number;
}

export async function runMigrations(
  db: BetterSQLite3Database
): Promise<MigrationResult> {
  const startTime = Date.now();
  try {
    console.log('[DB] Starting migrations...');
    await migrate(db, {
      migrationsFolder: join(__dirname, '../migrations'),
    });
    const endTime = Date.now();
    console.log(`[DB] ✅ Migrations completed in ${endTime - startTime}ms`);
    return { success: true, migrationsRun: 0, startTime, endTime };
  } catch (error) {
    const endTime = Date.now();
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[DB] ❌ Migration failed: ${err.message}`);
    return { success: false, migrationsRun: 0, error: err, startTime, endTime };
  }
}

export function getMigrationStatus(db: BetterSQLite3Database): unknown[] | null {
  try {
    const rows = (db as unknown as { all: (sql: string) => unknown[] }).all(
      `SELECT name, hash FROM __drizzle_migrations__ ORDER BY hash DESC`
    );
    return rows as unknown[];
  } catch {
    return null;
  }
}
