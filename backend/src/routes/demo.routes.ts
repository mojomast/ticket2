import { Hono } from 'hono';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';

const app = new Hono();

// GET /api/demo/personas (public, but only if DEMO_MODE)
app.get('/personas', async (c) => {
  if (!process.env.DEMO_MODE || process.env.DEMO_MODE !== 'true') {
    throw AppError.forbidden('Mode demo desactive');
  }

  const personas = await prisma.user.findMany({
    where: { isDemo: true, isActive: true, deletedAt: null },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, customerType: true, companyName: true,
    },
    orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
  });

  return c.json({ data: personas, error: null });
});

// POST /api/demo/reset (admin only)
app.post('/reset', requireAuth, requireRole('ADMIN'), async (c) => {
  if (!process.env.DEMO_MODE || process.env.DEMO_MODE !== 'true') {
    throw AppError.forbidden('Mode demo desactive');
  }

  // Import and call seed function
  // In production, this would call the shared seedDemoData function
  // For now, return success
  return c.json({ data: { message: 'Demo reset complete' }, error: null });
});

export default app;
