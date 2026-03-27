import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { serve } from '@hono/node-server';
import { errorHandler } from './middleware/error.middleware.js';
import { requestLogger } from './middleware/logging.middleware.js';
import { rateLimiter } from './middleware/rate-limit.middleware.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { requireAuth, requireRole } from './middleware/auth.middleware.js';
import { logger } from './lib/logger.js';
import { processFollowUpReminders } from './services/followup-reminder.service.js';

import authRoutes from './routes/auth.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import messageRoutes from './routes/message.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import userRoutes from './routes/user.routes.js';
import profileRoutes from './routes/profile.routes.js';
import configRoutes from './routes/config.routes.js';
import backupRoutes from './routes/backup.routes.js';
import technicianRoutes from './routes/technician.routes.js';
import demoRoutes from './routes/demo.routes.js';
import healthRoutes from './routes/health.routes.js';
import workorderRoutes from './routes/workorder.routes.js';
import serviceRequestRoutes from './routes/service-request.routes.js';
import attachmentRoutes from './routes/attachment.routes.js';
import kbRoutes from './routes/knowledgebase.routes.js';
import customerNoteRoutes from './routes/customer-note.routes.js';
import worksheetRoutes from './routes/worksheet.routes.js';

const app = new Hono();

// ─── Global Middleware ───
app.use('*', secureHeaders());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use('*', requestLogger);
app.use('*', csrfProtection);
app.onError(errorHandler);

// ─── Public Routes ───
app.route('/api/health', healthRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/demo', demoRoutes);
app.route('/api/service-request', serviceRequestRoutes);

// ─── Rate limit auth endpoints aggressively ───
app.use('/api/auth/*', rateLimiter({ max: 10, window: 60 }));
app.use('/api/*', rateLimiter({ max: 100, window: 60 }));

// ─── Public config ───
app.get('/api/config/branding', async (c) => {
  const { prisma } = await import('./lib/prisma.js');
  const branding = await prisma.systemConfig.findUnique({ where: { key: 'branding' } });
  return c.json({ data: branding?.value || {}, error: null });
});

// ─── Authenticated config read (non-sensitive keys only) ───
// Allows any logged-in user to read specific config keys like worksheet_config
const PUBLIC_CONFIG_KEYS = new Set(['worksheet_config', 'worksheet_alert_threshold']);
app.get('/api/config/:key', requireAuth, async (c) => {
  const key = c.req.param('key');
  if (!PUBLIC_CONFIG_KEYS.has(key)) {
    return c.json({ data: null, error: { message: 'Configuration introuvable', code: 'NOT_FOUND' } }, 404);
  }
  const { prisma } = await import('./lib/prisma.js');
  const config = await prisma.systemConfig.findUnique({ where: { key } });
  if (!config) {
    return c.json({ data: { key, value: null }, error: null });
  }
  return c.json({ data: { key: config.key, value: config.value }, error: null });
});

// ─── Authenticated Routes ───
app.use('/api/tickets/*', requireAuth);
app.use('/api/attachments/*', requireAuth);
app.use('/api/appointments/*', requireAuth);
app.use('/api/workorders/*', requireAuth);
app.use('/api/messages/*', requireAuth);
app.use('/api/notifications/*', requireAuth);
app.use('/api/technicians/*', requireAuth);
app.use('/api/users/*', requireAuth);
app.use('/api/kb/*', requireAuth);
app.use('/api/customer-notes/*', requireAuth);
app.use('/api/worksheets/*', requireAuth);

app.route('/api', attachmentRoutes);
app.route('/api/tickets', ticketRoutes);
app.route('/api/appointments', appointmentRoutes);
app.route('/api/workorders', workorderRoutes);
app.route('/api/messages', messageRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/technicians', technicianRoutes);
app.route('/api/users', profileRoutes);
app.route('/api/kb', kbRoutes);
app.route('/api/customer-notes', customerNoteRoutes);
app.route('/api/worksheets', worksheetRoutes);

// ─── Admin Routes ───
app.use('/api/admin/*', requireAuth);
app.use('/api/admin/*', requireRole('ADMIN'));
app.route('/api/admin/users', userRoutes);
app.route('/api/admin/config', configRoutes);
app.route('/api/admin/backups', backupRoutes);

// ─── Start Server ───
const port = parseInt(process.env.PORT || '3000', 10);

serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`Server running on http://localhost:${info.port}`);
});

// ─── Follow-Up Reminder Scheduler ───
// Run once on startup after a 10-second delay, then every hour.

async function runFollowUpReminders() {
  try {
    const result = await processFollowUpReminders();
    logger.info({ result }, 'Follow-up reminder check completed');
  } catch (err) {
    logger.error({ err }, 'Follow-up reminder check failed');
  }
}

setTimeout(runFollowUpReminders, 10_000);
setInterval(runFollowUpReminders, 3_600_000); // every hour

export default app;
