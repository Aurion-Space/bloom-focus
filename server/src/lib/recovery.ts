import { createHash, randomBytes, timingSafeEqual } from 'crypto';

// Crockford base32: no I, L, O or U, so a handwritten or mis-scanned code is
// still readable and there is nothing to confuse with 1 or 0.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_BYTES = 10;          // 80 bits of entropy
const CODE_LENGTH = 16;         // base32 characters, shown in groups of four
const PREFIX = 'BLOOM';

/**
 * A recovery code is a random secret, not a container: the QR the user saves
 * carries this string and nothing else. The server keeps only the hash, so a
 * stolen database yields no usable codes.
 */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(CODE_BYTES);
  let bits = 0;
  let value = 0;
  let out = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += ALPHABET[(value << (5 - bits)) & 31];
  }

  const body = out.slice(0, CODE_LENGTH);
  return `${PREFIX}-${(body.match(/.{1,4}/g) as string[]).join('-')}`;
}

/**
 * Reduce anything the user gives us — scanned, pasted, or typed by hand with
 * the wrong dashes — to the canonical body that gets hashed.
 */
export function normalizeRecoveryCode(raw: unknown): string {
  const cleaned = String(raw ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const body = cleaned.startsWith(PREFIX) ? cleaned.slice(PREFIX.length) : cleaned;
  return body.replace(/[ILO]/g, character => (character === 'O' ? '0' : '1'));
}

export function isWellFormedRecoveryCode(canonical: string): boolean {
  if (canonical.length !== CODE_LENGTH) return false;
  return canonical.split('').every(character => ALPHABET.includes(character));
}

/**
 * SHA-256 rather than bcrypt on purpose. Bcrypt's work factor exists to make
 * guessing low-entropy human passwords expensive; a code with 80 random bits is
 * not guessable at any hash speed, and bcrypt here would add a second slow hash
 * to every signup for no security gain.
 */
export function hashRecoveryCode(canonical: string): string {
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function recoveryCodeMatches(canonical: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashRecoveryCode(canonical), 'hex');
  let stored: Buffer;
  try {
    stored = Buffer.from(storedHash, 'hex');
  } catch {
    return false;
  }

  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}
