import { Router } from 'express';
import db from '../db.js';
import { hashPattern, verifyPattern } from '../lib/hash.js';
import { createRateLimitMiddleware, emailResetRateLimiter, gardenCreateRateLimiter, recoverRateLimiter, unlockRateLimiter } from '../lib/rate-limit.js';
import { isEmailEnabled, sendPatternResetEmail } from '../lib/mailer.js';
import { generateResetToken, hashResetToken, isValidEmail, normalizeEmail } from '../lib/reset-token.js';
import { getPublicBaseUrl, getResetTokenTtlMinutes } from '../config.js';
import {
  generateRecoveryCode,
  hashRecoveryCode,
  isWellFormedRecoveryCode,
  normalizeRecoveryCode,
  recoveryCodeMatches,
} from '../lib/recovery.js';
import { utcNowIso } from '../lib/dates.js';
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

interface RecoverBody {
  garden_id: string;
  recovery_code: string;
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
    const recoveryCode = generateRecoveryCode();

    // Two requests for the same garden_id can both clear the check above while
    // the other is hashing, so the UNIQUE constraint is the real arbiter.
    try {
      const stmt = db.prepare(
        'INSERT INTO gardens (garden_id, pattern_hash, recovery_hash, recovery_issued_at) VALUES (?, ?, ?, ?)'
      );
      stmt.run(
        garden_id.toLowerCase(),
        patternHash,
        hashRecoveryCode(normalizeRecoveryCode(recoveryCode)),
        utcNowIso()
      );
    } catch (err) {
      if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'taken' });
      }
      throw err;
    }

    const garden = db.prepare('SELECT garden_id, created_at FROM gardens WHERE garden_id = ?').get(garden_id.toLowerCase()) as { garden_id: string; created_at: string };
    const token = generateToken(garden_id.toLowerCase());

    // The only time the plaintext code exists outside the user's own device.
    res.status(201).json({ token, garden, recovery_code: recoveryCode });
  }
);

/**
 * Issue a fresh recovery code for the garden the caller is already inside.
 * This is how gardens created before recovery existed get a code, and how
 * anyone replaces one they think has been seen.
 */
router.post('/recovery-code', requireGarden, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const recoveryCode = generateRecoveryCode();

  const result = db.prepare(
    'UPDATE gardens SET recovery_hash = ?, recovery_issued_at = ? WHERE garden_id = ?'
  ).run(hashRecoveryCode(normalizeRecoveryCode(recoveryCode)), utcNowIso(), authReq.gardenId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json({ recovery_code: recoveryCode });
});

/**
 * Reset a forgotten pattern using the recovery code. Succeeding rotates the
 * code, so a card that has been used — or photographed by someone else after
 * use — is worthless.
 */
router.post('/recover', async (req, res) => {
  const { garden_id, recovery_code, pattern } = req.body as RecoverBody;

  if (!garden_id || !/^[a-z0-9]{3,20}$/.test(garden_id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }

  const garden = db.prepare(
    'SELECT garden_id, recovery_hash FROM gardens WHERE garden_id = ?'
  ).get(garden_id.toLowerCase()) as { garden_id: string; recovery_hash: string | null } | undefined;

  if (!garden) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (!validatePattern(pattern)) {
    return res.status(400).json({ error: 'invalid_pattern' });
  }

  // Consume the attempt before touching the stored hash, so this endpoint can
  // never be used as a fast oracle for guessing codes.
  const rateLimitKey = `${req.ip}:${garden_id.toLowerCase()}`;
  const rateLimitResult = recoverRateLimiter.consume(rateLimitKey);
  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', rateLimitResult.retryAfterSeconds.toString());
    return res.status(429).json({ error: 'too_many_attempts' });
  }

  if (!garden.recovery_hash) {
    return res.status(409).json({ error: 'no_recovery_code' });
  }

  const canonical = normalizeRecoveryCode(recovery_code);
  if (!isWellFormedRecoveryCode(canonical) || !recoveryCodeMatches(canonical, garden.recovery_hash)) {
    return res.status(401).json({ error: 'invalid_recovery_code' });
  }

  const patternHash = await hashPattern(pattern);
  const nextRecoveryCode = generateRecoveryCode();

  db.prepare(
    'UPDATE gardens SET pattern_hash = ?, recovery_hash = ?, recovery_issued_at = ? WHERE garden_id = ?'
  ).run(
    patternHash,
    hashRecoveryCode(normalizeRecoveryCode(nextRecoveryCode)),
    utcNowIso(),
    garden.garden_id
  );

  recoverRateLimiter.reset(rateLimitKey);
  unlockRateLimiter.reset(rateLimitKey);

  const updated = db.prepare(
    'SELECT garden_id, created_at FROM gardens WHERE garden_id = ?'
  ).get(garden.garden_id) as { garden_id: string; created_at: string };

  res.json({
    token: generateToken(garden.garden_id),
    garden: updated,
    recovery_code: nextRecoveryCode,
  });
});

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

/**
 * Attach or clear the address used for pattern-reset mail. Optional by design:
 * a garden with no email keeps working exactly as before, recovered by its QR key.
 */
router.post('/email', requireGarden, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const email = normalizeEmail((req.body as { email?: string }).email);

  if (email.length === 0) {
    db.prepare('UPDATE gardens SET email = NULL, email_added_at = NULL WHERE garden_id = ?').run(authReq.gardenId);
    return res.json({ email: null });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  db.prepare('UPDATE gardens SET email = ?, email_added_at = ? WHERE garden_id = ?')
    .run(email, utcNowIso(), authReq.gardenId);

  res.json({ email });
});

/** What the dashboard needs to show: is mail configured, and is an address on file. */
router.get('/email', requireGarden, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const row = db.prepare('SELECT email FROM gardens WHERE garden_id = ?')
    .get(authReq.gardenId) as { email: string | null } | undefined;

  res.json({ email: row?.email ?? null, email_enabled: isEmailEnabled() });
});

/**
 * Request a reset link. Always answers the same way whether or not the garden
 * exists or has an address on file — otherwise this endpoint would confirm both
 * for anyone who asked, and garden names are public.
 */
router.post('/forgot', async (req, res) => {
  const { garden_id } = req.body as { garden_id?: string };
  const accepted = { status: 'sent' as const };

  if (!garden_id || !/^[a-z0-9]{3,20}$/.test(garden_id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }

  if (!isEmailEnabled()) {
    return res.status(503).json({ error: 'email_unavailable' });
  }

  const rateLimitKey = `${req.ip}:${garden_id.toLowerCase()}`;
  const rateLimitResult = emailResetRateLimiter.consume(rateLimitKey);
  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', rateLimitResult.retryAfterSeconds.toString());
    return res.status(429).json({ error: 'too_many_attempts' });
  }

  const garden = db.prepare('SELECT garden_id, email FROM gardens WHERE garden_id = ?')
    .get(garden_id.toLowerCase()) as { garden_id: string; email: string | null } | undefined;

  if (!garden?.email) {
    return res.json(accepted);
  }

  // A new request supersedes any link still outstanding for this garden.
  db.prepare('UPDATE reset_tokens SET used_at = ? WHERE garden_id = ? AND used_at IS NULL')
    .run(utcNowIso(), garden.garden_id);

  const token = generateResetToken();
  const ttlMinutes = getResetTokenTtlMinutes();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  db.prepare('INSERT INTO reset_tokens (garden_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .run(garden.garden_id, hashResetToken(token), expiresAt);

  const resetUrl = `${getPublicBaseUrl()}/#/reset/${token}`;
  try {
    await sendPatternResetEmail(garden.email, garden.garden_id, resetUrl, ttlMinutes);
  } catch (err) {
    // Never echo the mail error back: it would reveal that an address exists.
    console.error('reset email failed for garden', garden.garden_id, (err as Error).message);
  }

  res.json(accepted);
});

/**
 * Is this link still good? Lets the reset screen say so on open, instead of
 * making someone draw a new pattern twice before finding out it is dead.
 * Takes the token in the body, not the path, to keep it out of access logs.
 */
router.post('/reset/check', (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'invalid_token' });
  }

  const row = db.prepare(
    'SELECT garden_id, expires_at, used_at FROM reset_tokens WHERE token_hash = ?'
  ).get(hashResetToken(token)) as
    { garden_id: string; expires_at: string; used_at: string | null } | undefined;

  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  res.json({ valid: true, garden_id: row.garden_id });
});

/** Spend a reset link and set the new pattern. */
router.post('/reset', async (req, res) => {
  const { token, pattern } = req.body as { token?: string; pattern?: string };

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'invalid_token' });
  }

  if (!validatePattern(pattern as string)) {
    return res.status(400).json({ error: 'invalid_pattern' });
  }

  const row = db.prepare(
    'SELECT id, garden_id, expires_at, used_at FROM reset_tokens WHERE token_hash = ?'
  ).get(hashResetToken(token)) as
    { id: number; garden_id: string; expires_at: string; used_at: string | null } | undefined;

  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  const patternHash = await hashPattern(pattern as string);
  db.prepare('UPDATE gardens SET pattern_hash = ? WHERE garden_id = ?').run(patternHash, row.garden_id);
  db.prepare('UPDATE reset_tokens SET used_at = ? WHERE id = ?').run(utcNowIso(), row.id);

  unlockRateLimiter.reset(`${req.ip}:${row.garden_id}`);

  const garden = db.prepare('SELECT garden_id, created_at FROM gardens WHERE garden_id = ?')
    .get(row.garden_id) as { garden_id: string; created_at: string };

  res.json({ token: generateToken(row.garden_id), garden });
});

export default router;
