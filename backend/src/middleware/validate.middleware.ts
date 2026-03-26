import { createMiddleware } from 'hono/factory';
import type { ZodSchema } from 'zod';
import { AppError } from '../lib/errors.js';

export function validateBody(schema: ZodSchema) {
  return createMiddleware(async (c, next) => {
    const body = await c.req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new AppError('VALIDATION_ERROR', result.error.issues[0].message, 400);
    }
    c.set('body', result.data);
    await next();
  });
}

export function validateQuery(schema: ZodSchema) {
  return createMiddleware(async (c, next) => {
    const query = Object.fromEntries(new URL(c.req.url).searchParams);
    const result = schema.safeParse(query);
    if (!result.success) {
      throw new AppError('VALIDATION_ERROR', result.error.issues[0].message, 400);
    }
    c.set('query', result.data);
    await next();
  });
}
