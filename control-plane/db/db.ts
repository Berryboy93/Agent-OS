import sqlite3 from 'sqlite3';
import path from 'path';

export const db = new sqlite3.Database(
  path.join(process.cwd(), 'control-plane.db')
);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      timestamp INTEGER,
      data TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      key TEXT,
      value TEXT,
      timestamp INTEGER
    )
  `);
});
