import { Hono } from 'hono';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { execSync } from 'child_process';

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

  // Delete all data in proper FK dependency order (children before parents)
  await prisma.$transaction([
    prisma.followUp.deleteMany(),
    prisma.worksheetNote.deleteMany(),
    prisma.travelEntry.deleteMany(),
    prisma.partUsed.deleteMany(),
    prisma.laborEntry.deleteMany(),
    prisma.worksheet.deleteMany(),
    prisma.kbArticleLink.deleteMany(),
    prisma.kbArticle.deleteMany(),
    prisma.customerNote.deleteMany(),
    prisma.workOrderNote.deleteMany(),
    prisma.workOrder.deleteMany(),
    prisma.appointmentProposal.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.message.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.systemConfig.deleteMany(),
    prisma.backupRecord.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Re-seed with demo data
  try {
    execSync('npx prisma db seed', {
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: 30000, // 30 second timeout
    });
  } catch (err: any) {
    const stderr = err?.stderr?.toString() || '';
    throw new AppError('INTERNAL_ERROR', `Erreur lors du re-seed: ${stderr.slice(0, 200)}`, 500);
  }

  return c.json({ data: { message: 'Demo reset complete' }, error: null });
});

export default app;
