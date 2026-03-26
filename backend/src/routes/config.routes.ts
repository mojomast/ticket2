import { Hono } from 'hono';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { brandingSchema, configValueSchema } from '../validations/config.js';
import type { BrandingInput, ConfigValueInput } from '../validations/config.js';

const app = new Hono();

// GET /api/config/branding (public) or GET /api/admin/config (admin)
app.get('/', async (c) => {
  const configs = await prisma.systemConfig.findMany();
  return c.json({ data: configs, error: null });
});

app.get('/branding', async (c) => {
  const branding = await prisma.systemConfig.findUnique({ where: { key: 'branding' } });
  return c.json({ data: branding?.value || {}, error: null });
});

app.get('/:key', async (c) => {
  const config = await prisma.systemConfig.findUnique({ where: { key: c.req.param('key') } });
  if (!config) throw AppError.notFound('Configuration introuvable');
  return c.json({ data: config, error: null });
});

app.put('/branding', validateBody(brandingSchema), async (c) => {
  const body = c.get('body') as BrandingInput;
  const config = await prisma.systemConfig.upsert({
    where: { key: 'branding' },
    update: { value: body },
    create: { key: 'branding', value: body },
  });
  return c.json({ data: config, error: null });
});

app.put('/:key', validateBody(configValueSchema), async (c) => {
  const body = c.get('body') as ConfigValueInput;
  const value = body.value as Prisma.InputJsonValue;
  const config = await prisma.systemConfig.upsert({
    where: { key: c.req.param('key') },
    update: { value },
    create: { key: c.req.param('key'), value },
  });
  return c.json({ data: config, error: null });
});

export default app;
