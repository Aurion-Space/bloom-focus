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

export function runMigrations() {
  const migrationPath = join(__dirname, '..', 'migrations', '001_init.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  getDb().exec(sql);
}

class DbProxy {
  prepare(sql: string): any { return getDb().prepare(sql); }
  exec(sql: string): any { return getDb().exec(sql); }
  pragma(pragma: string): any { return getDb().pragma(pragma); }
}

export default new DbProxy();
