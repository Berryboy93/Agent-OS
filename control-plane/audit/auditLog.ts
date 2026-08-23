import { db } from '../db/db';

export const AuditLog = {
  record(type: string, key: string, value: any) {
    db.run(
      `INSERT INTO audit_log (type, key, value, timestamp) VALUES (?, ?, ?, ?)`,
      [type, key, JSON.stringify(value), Date.now()]
    );
  }
};
