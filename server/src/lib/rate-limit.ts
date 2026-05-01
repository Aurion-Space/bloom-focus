import type { NextFunction, Request, RequestHandler, Response } from 'express';

type ConsumeResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

type RateLimitKeyBuilder = (req: Request) => string;

interface RateLimitMiddlewareOptions {
  limiter: InMemoryRateLimiter;
  key?: RateLimitKeyBuilder;
  skip?: (req: Request) => boolean;
  error?: string;
}

export class InMemoryRateLimiter {
  private readonly attempts = new Map<string, number[]>();
  private consumeCount = 0;

  constructor(
    public readonly maxAttempts: number,
    public readonly windowMs: number
  ) {}

  consume(key: string): ConsumeResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    this.compact(windowStart);
    const recentAttempts = (this.attempts.get(key) ?? []).filter(timestamp => timestamp > windowStart);

    if (recentAttempts.length >= this.maxAttempts) {
      const retryAfterMs = Math.max(this.windowMs - (now - recentAttempts[0]), 1000);
      this.attempts.set(key, recentAttempts);
      return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return { allowed: true, remaining: this.maxAttempts - recentAttempts.length };
  }

  reset(key: string) {
    this.attempts.delete(key);
  }

  private compact(windowStart: number) {
    this.consumeCount += 1;
    if (this.consumeCount % 200 !== 0) {
      return;
    }

    for (const [key, timestamps] of this.attempts.entries()) {
      const recentAttempts = timestamps.filter(timestamp => timestamp > windowStart);
      if (recentAttempts.length === 0) {
        this.attempts.delete(key);
      } else if (recentAttempts.length !== timestamps.length) {
        this.attempts.set(key, recentAttempts);
      }
    }
  }
}

function setRateLimitHeaders(
  res: Response,
  limiter: InMemoryRateLimiter,
  result: ConsumeResult
) {
  const resetSeconds = result.allowed
    ? Math.ceil(limiter.windowMs / 1000)
    : result.retryAfterSeconds;
  const remaining = result.allowed ? result.remaining : 0;

  res.setHeader('RateLimit-Policy', `${limiter.maxAttempts};w=${Math.ceil(limiter.windowMs / 1000)}`);
  res.setHeader('RateLimit-Limit', limiter.maxAttempts.toString());
  res.setHeader('RateLimit-Remaining', remaining.toString());
  res.setHeader('RateLimit-Reset', resetSeconds.toString());
}

export function createRateLimitMiddleware({
  limiter,
  key = req => req.ip || 'unknown',
  skip,
  error = 'too_many_requests',
}: RateLimitMiddlewareOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS' || skip?.(req)) {
      next();
      return;
    }

    const result = limiter.consume(key(req));
    setRateLimitHeaders(res, limiter, result);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfterSeconds.toString());
      res.status(429).json({ error });
      return;
    }

    next();
  };
}

export const apiRateLimiter = new InMemoryRateLimiter(240, 60 * 1000);
export const gardenCreateRateLimiter = new InMemoryRateLimiter(10, 15 * 60 * 1000);
export const sessionCreateRateLimiter = new InMemoryRateLimiter(60, 10 * 60 * 1000);
export const qrRateLimiter = new InMemoryRateLimiter(30, 5 * 60 * 1000);
export const unlockRateLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000);
