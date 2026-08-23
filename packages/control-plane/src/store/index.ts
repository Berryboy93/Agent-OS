import Database from 'better-sqlite3';

export class RuntimeStore {
  private db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
  }

  getRoles() {
    return this.db.prepare('SELECT * FROM rbac_roles').all();
  }

  getPolicies() {
    return this.db.prepare('SELECT * FROM rbac_policies').all();
  }
}
