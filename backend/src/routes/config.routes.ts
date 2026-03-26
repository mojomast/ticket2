import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

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

app.put('/branding', async (c) => {
  const body = await c.req.json();
  const config = await prisma.systemConfig.upsert({
    where: { key: 'branding' },
    update: { value: body },
    create: { key: 'branding', value: body },
  });
  return c.json({ data: config, error: null });
});

app.put('/:key', async (c) => {
  const body = await c.req.json();
  const config = await prisma.systemConfig.upsert({
    where: { key: c.req.param('key') },
    update: { value: body.value },
    create: { key: c.req.param('key'), value: body.value },
  });
  return c.json({ data: config, error: null });
});

export default app;
