import { createMiddleware } from 'hono/factory';
import { logger } from '../lib/logger.js';

export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  const logData = { method, path, status, duration: `${duration}ms` };

  if (status >= 500) {
    logger.error(logData, 'Request error');
  } else if (status >= 400) {
    logger.warn(logData, 'Request warning');
  } else {
    logger.info(logData, 'Request completed');
  }
});
