import { createMiddleware } from 'hono/factory';
import { AppError } from '../lib/errors.js';

export const csrfProtection = createMiddleware(async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    return next();
  }

  const origin = c.req.header('Origin');
  const allowed = process.env.FRONTEND_URL;

  if (allowed && origin) {
    try {
      if (new URL(origin).origin !== new URL(allowed).origin) {
        throw AppError.forbidden('Invalid origin');
      }
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw AppError.forbidden('Invalid origin');
    }
  }

  await next();
});
