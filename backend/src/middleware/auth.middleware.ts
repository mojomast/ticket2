import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { verifyToken } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import type { UserRole } from '@prisma/client';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  permissions: unknown;
}

export interface Session {
  user: SessionUser;
}

// Augment Hono context
declare module 'hono' {
  interface ContextVariableMap {
    session: Session;
    body: unknown;
    query: unknown;
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const token = getCookie(c, 'valitek-auth');
  if (!token) throw AppError.unauthorized();

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    throw AppError.unauthorized('Token invalide');
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.id, isActive: true, deletedAt: null },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      permissions: true,
    },
  });

  if (!user) throw AppError.unauthorized('Session invalide');

  c.set('session', { user });
  await next();
});

export function requireRole(...roles: UserRole[]) {
  return createMiddleware(async (c, next) => {
    const session = c.get('session');
    if (!roles.includes(session.user.role)) {
      throw AppError.forbidden();
    }
    await next();
  });
}
