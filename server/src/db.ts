import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDatabasePath } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _db: any = null;

export function getDb(): any {
  if (!_db) {
    _db = new Database(getDatabasePath());
    _db.pragma('journal_mode = WAL');
  }
  return _db;
}

// Applied in order and tracked with PRAGMA user_version. Listed explicitly
// rather than globbed so that 002_seed.sql — demo data with a placeholder
// password hash — can never reach a real database.
const MIGRATIONS = ['001_init.sql', '002_recovery.sql', '003_email_reset.sql'];

export function runMigrations() {
  const db = getDb();
  const applied = db.pragma('user_version', { simple: true }) as number;

  for (let version = applied; version < MIGRATIONS.length; version++) {
    const sql = readFileSync(join(__dirname, '..', 'migrations', MIGRATIONS[version]), 'utf-8');
    db.exec(sql);
  }

  db.pragma(`user_version = ${MIGRATIONS.length}`);
}

class DbProxy {
  prepare(sql: string): any { return getDb().prepare(sql); }
  exec(sql: string): any { return getDb().exec(sql); }
  pragma(pragma: string): any { return getDb().pragma(pragma); }
}

export default new DbProxy();
