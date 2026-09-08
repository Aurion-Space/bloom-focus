import { createHash, randomBytes } from 'crypto';

/**
 * 256 bits of randomness, url-safe so it survives being pasted out of an email
 * client. The plaintext exists only in the message we send; the database keeps
 * the SHA-256, so a leaked table yields no usable links.
 */
export function generateResetToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@,]+\.[^\s@,]{2,}$/;

export function normalizeEmail(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= 254 && EMAIL_PATTERN.test(email);
}
