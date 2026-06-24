import { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from '../utils/errors';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const cache = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired rate limit entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now > value.resetTime) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000).unref(); // Clean up every 5 minutes

export const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Get IP address (support proxy headers if behind a reverse proxy)
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${req.path}:${ip}`;

    const record = cache.get(key);

    if (!record || now > record.resetTime) {
      cache.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    record.count++;
    if (record.count > limit) {
      return next(new TooManyRequestsError());
    }

    next();
  };
};
