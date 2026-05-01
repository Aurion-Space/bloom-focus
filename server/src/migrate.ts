import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDatabasePath } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = getDatabasePath();

mkdirSync(dirname(dbPath), { recursive: true });

const { runMigrations } = await import('./db.js');
runMigrations();
console.log('Migrations complete.');
