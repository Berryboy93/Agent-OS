import { config } from 'dotenv'; config({ path: new URL('../../../.env', import.meta.url) });
import { createDb } from '../src/client.js'
import { runMigrations } from '../src/migrations.js'

const dbPath = process.env.DATABASE_URL?.replace('file:', '') ?? '../../agent-os.db'
const db = createDb(dbPath)

const result = await runMigrations(db)
if (!result.success) {
  console.error('[migrate] Failed:', result.error?.message)
  process.exit(1)
}
