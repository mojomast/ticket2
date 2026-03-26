import { Hono } from 'hono';
import { requireRole } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  createWorkOrderSchema, updateWorkOrderSchema, changeWorkOrderStatusSchema,
  workOrderQuoteSchema, addWorkOrderNoteSchema, workOrderListQuerySchema,
} from '../validations/workorder.js';
import * as workorderService from '../services/workorder.service.js';

const app = new Hono();

// ─── List & Create ───

app.get('/', validateQuery(workOrderListQuerySchema), async (c) => {
  const session = c.get('session');
  const query = c.get('query') as any;
  const result = await workorderService.getWorkOrders(query, session.user.id, session.user.role);
  return c.json(result);
});

app.post('/', requireRole('ADMIN', 'TECHNICIAN'), validateBody(createWorkOrderSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const wo = await workorderService.createWorkOrder(data, session.user.id, session.user.role);
  return c.json({ data: wo, error: null }, 201);
});

// ─── Dashboard Stats ───

app.get('/stats', async (c) => {
  const session = c.get('session');
  const stats = await workorderService.getDashboardStats(session.user.id, session.user.role);
  return c.json({ data: stats, error: null });
});

// ─── Detail ───

app.get('/:id', async (c) => {
  const session = c.get('session');
  const wo = await workorderService.getWorkOrderById(c.req.param('id'), session.user.id, session.user.role);
  return c.json({ data: wo, error: null });
});

app.patch('/:id', requireRole('ADMIN', 'TECHNICIAN'), validateBody(updateWorkOrderSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const wo = await workorderService.updateWorkOrder(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: wo, error: null });
});

app.delete('/:id', requireRole('ADMIN'), async (c) => {
  const session = c.get('session');
  const wo = await workorderService.deleteWorkOrder(c.req.param('id'), session.user.id, session.user.role);
  return c.json({ data: wo, error: null });
});

// ─── Status Changes ───

app.patch('/:id/status', validateBody(changeWorkOrderStatusSchema), async (c) => {
  const session = c.get('session');
  const { status, reason } = c.get('body') as any;
  const wo = await workorderService.changeStatus(c.req.param('id'), status, reason, session.user.id, session.user.role);
  return c.json({ data: wo, error: null });
});

// ─── Quote Management ───

app.post('/:id/quote', requireRole('ADMIN', 'TECHNICIAN'), validateBody(workOrderQuoteSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const wo = await workorderService.sendQuote(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: wo, error: null });
});

app.post('/:id/approve-quote', async (c) => {
  const session = c.get('session');
  const wo = await workorderService.approveQuote(c.req.param('id'), session.user.id, session.user.role);
  return c.json({ data: wo, error: null });
});

app.post('/:id/decline-quote', async (c) => {
  const session = c.get('session');
  const wo = await workorderService.declineQuote(c.req.param('id'), session.user.id, session.user.role);
  return c.json({ data: wo, error: null });
});

// ─── Notes ───

app.get('/:id/notes', async (c) => {
  const session = c.get('session');
  const notes = await workorderService.getNotes(c.req.param('id'), session.user.id, session.user.role);
  return c.json({ data: notes, error: null });
});

app.post('/:id/notes', validateBody(addWorkOrderNoteSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const note = await workorderService.addNote(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: note, error: null }, 201);
});

export default app;
