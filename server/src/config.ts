import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const BLOCKED_JWT_SECRETS = new Set([
  '',
  '<32-byte-random-hex>',
  'dev_secret_key_that_is_at_least_32_bytes_long',
  'dev_secret_key_that_is_at_least_32_bytes_long_for_hs256',
]);

function parseInteger(name: string, fallback: number, min?: number, max?: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`${name} must be an integer`);
  }
  if (min !== undefined && value < min) {
    throw new Error(`${name} must be at least ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new Error(`${name} must be at most ${max}`);
  }
  return value;
}

function normalizeOrigin(value: string): string {
  const url = new URL(value.trim());
  return url.origin;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value.trim());
  const pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
  return `${url.origin}${pathname}`;
}

export function getPort(): number {
  return parseInteger('PORT', 4000, 1, 65535);
}

export function getDatabasePath(): string {
  return process.env.DATABASE_PATH?.trim() || './data/bloomfocus.db';
}

export function getBcryptCost(): number {
  return parseInteger('BCRYPT_COST', 10, 8, 15);
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim() || '';
  const looksHex = /^[a-f0-9]+$/i.test(secret);
  const minimumLength = looksHex ? 64 : 32;

  if (BLOCKED_JWT_SECRETS.has(secret) || secret.length < minimumLength) {
    throw new Error(
      'JWT_SECRET must be set to a strong random secret. Use at least 32 random bytes (64 hex characters).'
    );
  }

  return secret;
}

export function getAllowedOrigins(): string[] {
  const configured = [
    ...(process.env.FRONTEND_ORIGIN?.split(',') ?? []),
    ...(process.env.PUBLIC_BASE_URL ? [process.env.PUBLIC_BASE_URL] : []),
  ]
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => normalizeOrigin(value));

  return Array.from(new Set(configured));
}

export function getPublicBaseUrl(): string {
  if (process.env.PUBLIC_BASE_URL?.trim()) {
    return normalizeBaseUrl(process.env.PUBLIC_BASE_URL);
  }

  const [firstAllowedOrigin] = getAllowedOrigins();
  return firstAllowedOrigin || 'http://localhost:5173';
}

export function getTrustProxy(): string | number | boolean {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) {
    return 'loopback, linklocal, uniquelocal';
  }
  if (/^\d+$/.test(raw)) {
    return Number.parseInt(raw, 10);
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
}
