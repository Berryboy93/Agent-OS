import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
export type AgentOSDb = ReturnType<typeof createDb>;
export declare function createDb(dbPath?: string): ReturnType<typeof drizzle<typeof schema>>;
export { schema };
//# sourceMappingURL=client.d.ts.map