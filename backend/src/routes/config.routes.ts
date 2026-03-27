import { Hono } from 'hono';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { brandingSchema, configValueSchema } from '../validations/config.js';
import type { BrandingInput, ConfigValueInput } from '../validations/config.js';

const app = new Hono();

// ── Secret masking ───────────────────────────────────────────────
const SENSITIVE_KEYS = new Set(['email_config', 'sms_config']);
const MASKED_FIELDS: Record<string, string[]> = {
  email_config: ['clientSecret'],
  sms_config: ['password'],
};

function maskSecrets(key: string, value: unknown): unknown {
  if (!SENSITIVE_KEYS.has(key) || !value || typeof value !== 'object') return value;
  const fields = MASKED_FIELDS[key] || [];
  const masked = { ...(value as Record<string, unknown>) };
  for (const field of fields) {
    if (masked[field] && typeof masked[field] === 'string') {
      const raw = masked[field] as string;
      masked[field] = raw.length > 4
        ? '•'.repeat(raw.length - 4) + raw.slice(-4)
        : '•'.repeat(raw.length);
    }
  }
  return masked;
}

// GET /api/admin/config
app.get('/', async (c) => {
  const configs = await prisma.systemConfig.findMany();
  const safe = configs.map((cfg) => ({
    ...cfg,
    value: maskSecrets(cfg.key, cfg.value),
  }));
  return c.json({ data: safe, error: null });
});

app.get('/branding', async (c) => {
  const branding = await prisma.systemConfig.findUnique({ where: { key: 'branding' } });
  return c.json({ data: branding?.value || {}, error: null });
});

app.get('/:key', async (c) => {
  const key = c.req.param('key');
  const config = await prisma.systemConfig.findUnique({ where: { key } });
  if (!config) throw AppError.notFound('Configuration introuvable');
  return c.json({
    data: { ...config, value: maskSecrets(key, config.value) },
    error: null,
  });
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
  const key = c.req.param('key');
  const body = c.get('body') as ConfigValueInput;

  // For sensitive configs, merge masked fields with existing values
  // so the frontend can send back masked values without overwriting secrets
  if (SENSITIVE_KEYS.has(key) && body.value && typeof body.value === 'object') {
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (existing?.value && typeof existing.value === 'object') {
      const existingVal = existing.value as Record<string, unknown>;
      const incoming = body.value as Record<string, unknown>;
      const maskedFields = MASKED_FIELDS[key] || [];
      for (const field of maskedFields) {
        // If the incoming value looks masked (starts with •), keep the old value
        if (
          typeof incoming[field] === 'string' &&
          (incoming[field] as string).startsWith('•')
        ) {
          incoming[field] = existingVal[field];
        }
      }
    }
  }

  const value = body.value as Prisma.InputJsonValue;
  const config = await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  return c.json({ data: config, error: null });
});

export default app;
