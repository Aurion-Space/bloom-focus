import { Router } from 'express';
import db from '../db.js';
import { createRateLimitMiddleware, sessionCreateRateLimiter } from '../lib/rate-limit.js';
import { requireGarden, AuthenticatedRequest } from '../middleware/auth.js';
import { generateSlug } from '../lib/slug.js';
import { serializeSession, serializeSessions, utcNowIso } from '../lib/dates.js';

const router = Router();

const VALID_DURATIONS = [30, 45, 60, 90, 120];
const VALID_PLANTS = [
  'rose', 'sunflower', 'tulip', 'lavender', 'cherry', 'daisy',
  'cactus', 'orchid', 'peony', 'succulent', 'fern', 'lotus'
];

interface CreateSessionBody {
  intention: string;
  duration_minutes: number;
  plant_type: string;
}

function generateUniqueSlug(): string {
  for (let i = 0; i < 10; i++) {
    const slug = generateSlug();
    const existing = db.prepare('SELECT id FROM sessions WHERE unique_slug = ?').get(slug);
    if (!existing) return slug;
  }
  throw new Error('Failed to generate unique slug');
}

router.get('/', requireGarden, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const before = req.query.before as string | undefined;

  let query = 'SELECT * FROM sessions WHERE garden_id = ?';
  const params: (string | number)[] = [authReq.gardenId!];

  if (before) {
    query += ' AND completed_at < ?';
    params.push(before);
  }

  query += ' ORDER BY completed_at DESC LIMIT ?';
  params.push(limit);

  const sessions = db.prepare(query).all(...params) as Array<{
    completed_at: string;
  }>;
  res.json({ sessions: serializeSessions(sessions) });
});

router.get('/:slug', (req, res) => {
  const { slug } = req.params;

  const session = db.prepare(`
    SELECT garden_id, intention, duration_minutes, plant_type, unique_slug, completed_at
    FROM sessions WHERE unique_slug = ?
  `).get(slug) as {
    garden_id: string;
    intention: string;
    duration_minutes: number;
    plant_type: string;
    unique_slug: string;
    completed_at: string;
  } | undefined;

  if (!session) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json({ session: serializeSession(session) });
});

router.post(
  '/',
  requireGarden,
  createRateLimitMiddleware({
    limiter: sessionCreateRateLimiter,
    key: req => `${req.ip}:${(req as AuthenticatedRequest).gardenId ?? 'anonymous'}`,
  }),
  async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { intention, duration_minutes, plant_type } = req.body as CreateSessionBody;

    if (!intention || typeof intention !== 'string' || intention.trim().length === 0 || intention.trim().length > 120) {
      return res.status(400).json({ error: 'invalid_intention' });
    }

    if (!VALID_DURATIONS.includes(duration_minutes)) {
      return res.status(400).json({ error: 'invalid_duration' });
    }

    if (!VALID_PLANTS.includes(plant_type)) {
      return res.status(400).json({ error: 'invalid_plant_type' });
    }

    const uniqueSlug = generateUniqueSlug();
    const completedAt = utcNowIso();

    const stmt = db.prepare(`
      INSERT INTO sessions (garden_id, intention, duration_minutes, plant_type, unique_slug, completed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      authReq.gardenId,
      intention.trim(),
      duration_minutes,
      plant_type,
      uniqueSlug,
      completedAt
    );

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid) as {
      completed_at: string;
    };
    res.status(201).json({ session: serializeSession(session) });
  }
);

export default router;
