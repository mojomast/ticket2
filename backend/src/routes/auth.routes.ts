import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { createToken } from '../lib/auth.js';
import { AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { loginSchema, demoLoginSchema } from '../validations/user.js';
import * as userService from '../services/user.service.js';
import { prisma } from '../lib/prisma.js';

const app = new Hono();

// POST /api/auth/login
app.post('/login', validateBody(loginSchema), async (c) => {
  const { email, password } = c.get('body') as { email: string; password: string };

  const user = await userService.authenticate(email, password);

  const token = await createToken({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  });

  setCookie(c, 'valitek-auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return c.json({ data: user, error: null });
});

// POST /api/auth/demo-login
app.post('/demo-login', validateBody(demoLoginSchema), async (c) => {
  if (!process.env.DEMO_MODE || process.env.DEMO_MODE !== 'true') {
    throw AppError.forbidden('Mode demo desactive');
  }

  const { email } = c.get('body') as { email: string };

  const user = await prisma.user.findFirst({
    where: { email, isDemo: true, isActive: true, deletedAt: null },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, phone: true, customerType: true, companyName: true,
      address: true, isActive: true, isDemo: true, permissions: true,
      createdAt: true, updatedAt: true,
    },
  });

  if (!user) throw AppError.notFound('Persona demo introuvable');

  const token = await createToken({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  });

  setCookie(c, 'valitek-auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  return c.json({ data: user, error: null });
});

// POST /api/auth/logout
app.post('/logout', async (c) => {
  deleteCookie(c, 'valitek-auth', { path: '/' });
  return c.json({ data: { message: 'Deconnecte' }, error: null });
});

// GET /api/auth/me
app.get('/me', requireAuth, async (c) => {
  const session = c.get('session');
  return c.json({ data: session.user, error: null });
});

export default app;
