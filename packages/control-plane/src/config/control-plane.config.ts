import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(__dirname, '../../db');

export const CONTROL_PLANE_CONFIG = {
  db: join(DB_DIR, 'control-plane.db'),
  rbac: {
    enableAudit: true,
    auditLogPath: join(DB_DIR, 'audit.log')
  },
  sse: {
    heartbeat: 30000
  }
};
