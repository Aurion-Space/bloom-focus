import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { getBcryptCost, getDatabasePath } from './config.js';

const dbPath = getDatabasePath();
const db = new Database(dbPath);

const pattern = '0,1,2,5,4';
const patternHash = bcrypt.hashSync(pattern, getBcryptCost());

console.log('Inserting seed data...');

// Insert psps garden
const existing = db.prepare('SELECT id FROM gardens WHERE garden_id = ?').get('psps');
if (!existing) {
  db.prepare('INSERT INTO gardens (garden_id, pattern_hash) VALUES (?, ?)').run('psps', patternHash);
  console.log('Created psps garden');
} else {
  console.log('psps garden already exists');
}

// Insert sessions
const sessions = [
  { intention: 'Deep work on the hardest task', duration: 60, plant: 'rose', slug: 'bloom-soft-petal-x1a2', daysAgo: 1 },
  { intention: 'Learning something new', duration: 45, plant: 'sunflower', slug: 'bloom-warm-moss-y3b4', daysAgo: 1 },
  { intention: 'Creative writing session', duration: 90, plant: 'lavender', slug: 'bloom-quiet-fern-z5c6', daysAgo: 2 },
  { intention: 'Study without distractions', duration: 30, plant: 'cherry', slug: 'bloom-still-dawn-a7d8', daysAgo: 3 },
  { intention: 'Plan the week ahead', duration: 45, plant: 'tulip', slug: 'bloom-bright-meadow-b9e0', daysAgo: 4 },
  { intention: 'Read for 30 minutes', duration: 30, plant: 'daisy', slug: 'bloom-gentle-willow-c1f2', daysAgo: 5 },
  { intention: 'Practice meditation', duration: 60, plant: 'orchid', slug: 'bloom-wild-sprout-d3g4', daysAgo: 6 },
  { intention: 'Work on side project', duration: 120, plant: 'cactus', slug: 'bloom-slow-clover-e5h6', daysAgo: 7 },
  { intention: 'Review daily notes', duration: 30, plant: 'peony', slug: 'bloom-honey-garden-f7i8', daysAgo: 8 },
  { intention: 'Morning journaling', duration: 45, plant: 'succulent', slug: 'bloom-calm-dusk-g9j0', daysAgo: 9 },
  { intention: 'Deep work session', duration: 90, plant: 'fern', slug: 'bloom-soft-moss-h1k2', daysAgo: 10 },
  { intention: 'Coding practice', duration: 60, plant: 'lotus', slug: 'bloom-warm-petal-i3l4', daysAgo: 12 },
  { intention: 'Reading time', duration: 45, plant: 'rose', slug: 'bloom-quiet-fern-j5m6', daysAgo: 14 },
  { intention: 'Creative brainstorming', duration: 60, plant: 'sunflower', slug: 'bloom-still-dawn-k7n8', daysAgo: 16 },
  { intention: 'Focus work', duration: 90, plant: 'lavender', slug: 'bloom-bright-moss-l9o0', daysAgo: 18 },
  { intention: 'Study session', duration: 45, plant: 'cherry', slug: 'bloom-gentle-clover-m1p2', daysAgo: 20 },
  { intention: 'Deep focus work', duration: 120, plant: 'tulip', slug: 'bloom-wild-willow-n3q4', daysAgo: 25 },
  { intention: 'Planning session', duration: 60, plant: 'daisy', slug: 'bloom-slow-petal-o5r6', daysAgo: 30 },
];

let inserted = 0;
for (const s of sessions) {
  const existing = db.prepare('SELECT id FROM sessions WHERE unique_slug = ?').get(s.slug);
  if (!existing) {
    const completedAt = new Date(Date.now() - s.daysAgo * 86400000).toISOString();
    db.prepare('INSERT INTO sessions (garden_id, intention, duration_minutes, plant_type, unique_slug, completed_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('psps', s.intention, s.duration, s.plant, s.slug, completedAt);
    inserted++;
  }
}

console.log(`Inserted ${inserted} new sessions`);
console.log('Seed data complete!');
