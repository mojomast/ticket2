/**
 * validate.middleware.test.ts
 * Tests for Zod validation middleware with Hono.
 */

// Set env vars before imports
process.env.AUTH_SECRET = 'test-secret-for-vitest-at-least-32-chars!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { z } from 'zod';
import { validateBody, validateQuery } from './validate.middleware.js';
import { AppError } from '../lib/errors.js';

// Helper: create a test Hono app with error handling
function createTestApp() {
  const app = new Hono();
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: { message: err.message, code: err.code } }, err.status as any);
    }
    return c.json({ error: { message: 'Internal error' } }, 500);
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Test Schemas ───
const bodySchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  age: z.number().int().positive('Age doit etre positif'),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
});

// ─── validateBody Tests ───
describe('validateBody', () => {
  it('passes valid data to context', async () => {
    const app = createTestApp();
    app.post('/test', validateBody(bodySchema), (c) => {
      const body = c.get('body');
      return c.json({ data: body });
    });

    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', age: 25 }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({ name: 'Alice', age: 25 });
  });

  it('throws VALIDATION_ERROR for invalid data', async () => {
    const app = createTestApp();
    app.post('/test', validateBody(bodySchema), (c) => {
      return c.json({ data: c.get('body') });
    });

    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', age: -5 }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('throws VALIDATION_ERROR for missing required fields', async () => {
    const app = createTestApp();
    app.post('/test', validateBody(bodySchema), (c) => {
      return c.json({ data: c.get('body') });
    });

    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });
});

// ─── validateQuery Tests ───
describe('validateQuery', () => {
  it('parses query string params', async () => {
    const app = createTestApp();
    app.get('/test', validateQuery(querySchema), (c) => {
      const query = c.get('query');
      return c.json({ data: query });
    });

    const res = await app.request('/test?page=2&search=hello', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({ page: 2, search: 'hello' });
  });

  it('applies defaults for missing query params', async () => {
    const app = createTestApp();
    app.get('/test', validateQuery(querySchema), (c) => {
      const query = c.get('query');
      return c.json({ data: query });
    });

    const res = await app.request('/test', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.page).toBe(1);
  });

  it('throws for invalid query params', async () => {
    const strictQuerySchema = z.object({
      page: z.coerce.number().int().min(1, 'Page doit etre >= 1'),
    });

    const app = createTestApp();
    app.get('/test', validateQuery(strictQuerySchema), (c) => {
      return c.json({ data: c.get('query') });
    });

    const res = await app.request('/test?page=0', {
      method: 'GET',
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });
});
