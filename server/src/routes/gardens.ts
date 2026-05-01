import { Router } from 'express';
import db from '../db.js';
import { hashPattern, verifyPattern } from '../lib/hash.js';
import { createRateLimitMiddleware, gardenCreateRateLimiter, unlockRateLimiter } from '../lib/rate-limit.js';
import { generateToken, requireGarden, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

interface CreateGardenBody {
  garden_id: string;
  pattern: string;
}

interface UnlockBody {
  garden_id: string;
  pattern: string;
}

function validatePattern(pattern: string): boolean {
  const dots = pattern.split(',').map(d => parseInt(d, 10));
  if (dots.length < 4 || dots.length > 9) return false;
  const unique = new Set(dots);
  return unique.size === dots.length && dots.every(d => d >= 0 && d <= 8);
}

router.post(
  '/',
  createRateLimitMiddleware({
    limiter: gardenCreateRateLimiter,
  }),
  async (req, res) => {
    const { garden_id, pattern } = req.body as CreateGardenBody;

    if (!garden_id || !/^[a-z0-9]{3,20}$/.test(garden_id)) {
      return res.status(400).json({ error: 'invalid_id' });
    }

    if (!validatePattern(pattern)) {
      return res.status(400).json({ error: 'invalid_pattern' });
    }

    const existing = db.prepare('SELECT id FROM gardens WHERE garden_id = ?').get(garden_id.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'taken' });
    }

    const patternHash = await hashPattern(pattern);

    const stmt = db.prepare('INSERT INTO gardens (garden_id, pattern_hash) VALUES (?, ?)');
    stmt.run(garden_id.toLowerCase(), patternHash);

    const garden = db.prepare('SELECT garden_id, created_at FROM gardens WHERE garden_id = ?').get(garden_id.toLowerCase()) as { garden_id: string; created_at: string };
    const token = generateToken(garden_id.toLowerCase());

    res.status(201).json({ token, garden });
  }
);

router.post('/unlock', async (req, res) => {
  const { garden_id, pattern } = req.body as UnlockBody;

  if (!garden_id || !/^[a-z0-9]{3,20}$/.test(garden_id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }

  const garden = db.prepare('SELECT garden_id, pattern_hash, created_at FROM gardens WHERE garden_id = ?').get(garden_id.toLowerCase()) as { garden_id: string; pattern_hash: string; created_at: string } | undefined;

  if (!garden) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (!validatePattern(pattern)) {
    return res.status(400).json({ error: 'invalid_pattern' });
  }

  const rateLimitKey = `${req.ip}:${garden_id.toLowerCase()}`;
  const rateLimitResult = unlockRateLimiter.consume(rateLimitKey);
  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', rateLimitResult.retryAfterSeconds.toString());
    return res.status(429).json({ error: 'too_many_attempts' });
  }

  const valid = await verifyPattern(pattern, garden.pattern_hash);
  if (!valid) {
    return res.status(401).json({ error: 'wrong_pattern' });
  }

  unlockRateLimiter.reset(rateLimitKey);
  const token = generateToken(garden.garden_id);

  res.json({ token, garden: { garden_id: garden.garden_id, created_at: garden.created_at } });
});

router.get('/me', requireGarden, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const garden = db.prepare('SELECT garden_id, created_at FROM gardens WHERE garden_id = ?').get(authReq.gardenId) as { garden_id: string; created_at: string } | undefined;

  if (!garden) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json({ garden });
});

router.get('/check', (req, res) => {
  const { garden_id } = req.query as { garden_id?: string };
  if (!garden_id || !/^[a-z0-9]{3,20}$/.test(garden_id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }
  const existing = db.prepare('SELECT id FROM gardens WHERE garden_id = ?').get(garden_id.toLowerCase());
  if (existing) {
    res.json({ exists: true });
  } else {
    res.status(404).json({ error: 'not_found' });
  }
});

export default router;
