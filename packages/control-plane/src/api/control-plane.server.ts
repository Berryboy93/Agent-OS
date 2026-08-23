import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { CONTROL_PLANE_CONFIG } from '../config/control-plane.config.js';

export class ControlPlaneServer {
  private db: Database.Database;
  private clients: Set<any> = new Set();

  constructor() {
    // Ensure db directory exists before opening
    const dbDir = dirname(CONTROL_PLANE_CONFIG.db);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    this.db = new Database(CONTROL_PLANE_CONFIG.db);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rbac_roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rbac_policies (
        id TEXT PRIMARY KEY,
        role_id TEXT NOT NULL,
        resource TEXT NOT NULL,
        action TEXT NOT NULL
      );
    `);
  }

  handleSSE(res: any) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    this.clients.add(res);
    res.on('close', () => this.clients.delete(res));
  }

  getRoles() {
    return this.db.prepare('SELECT * FROM rbac_roles').all();
  }

  getPolicies() {
    return this.db.prepare('SELECT * FROM rbac_policies').all();
  }

  broadcast(data: any) {
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach(res => res.write(msg));
  }
}
