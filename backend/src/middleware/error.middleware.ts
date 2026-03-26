import type { ErrorHandler } from 'hono';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { data: null, error: { message: err.message, code: err.code } },
      err.status as any
    );
  }

  logger.error({ err, path: c.req.path, method: c.req.method }, 'Unhandled error');
  return c.json(
    { data: null, error: { message: 'Erreur serveur', code: 'INTERNAL_ERROR' } },
    500
  );
};
