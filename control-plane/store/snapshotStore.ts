import { db } from '../db/db';

export const SnapshotStore = {
  create(id: string, data: any) {
    db.run(
      `INSERT INTO snapshots (id, timestamp, data) VALUES (?, ?, ?)`,
      [id, Date.now(), JSON.stringify(data)]
    );
  },

  list(cb: (rows: any) => void) {
    db.all(`SELECT * FROM snapshots ORDER BY timestamp DESC`, [], cb);
  }
};
