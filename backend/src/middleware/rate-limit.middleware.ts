import { createMiddleware } from 'hono/factory';
import { AppError } from '../lib/errors.js';

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const store: RateLimitStore = {};

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const key of Object.keys(store)) {
    if (store[key].resetAt < now) {
      delete store[key];
    }
  }
}, 60_000);

export function rateLimiter(options: { max: number; window: number }) {
  return createMiddleware(async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();

    if (!store[key] || store[key].resetAt < now) {
      store[key] = { count: 0, resetAt: now + options.window * 1000 };
    }

    store[key].count++;

    c.header('X-RateLimit-Limit', options.max.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, options.max - store[key].count).toString());
    c.header('X-RateLimit-Reset', Math.ceil(store[key].resetAt / 1000).toString());

    if (store[key].count > options.max) {
      throw new AppError('RATE_LIMITED', 'Trop de requetes, veuillez reessayer plus tard', 429);
    }

    await next();
  });
}
