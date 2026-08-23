import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(__dirname, '../../db');

export const COMMAND_CENTER_CONFIG = {
  database: {
    path: join(DB_DIR, 'control-plane.db'),
    // Enable WAL (Write-Ahead Logging) for better concurrency
    walMode: true,
    timeout: 5000
  },
  sse: {
    heartbeat: 30000, // 30 seconds
    maxClients: 1000
  },
  audit: {
    enabled: true,
    logPath: join(DB_DIR, 'audit.log'),
    retention: 30 * 24 * 60 * 60 * 1000 // 30 days in ms
  },
  api: {
    defaultLimit: 50,
    maxLimit: 1000,
    paginationEnabled: true
  },
  features: {
    eventStreaming: true,
    commandDispatch: true,
    auditLogging: true,
    metricsAggregation: true
  }
};
