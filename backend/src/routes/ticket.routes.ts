import { Hono } from 'hono';
import { requireRole } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  createTicketSchema, updateTicketSchema, changeStatusSchema,
  assignTechnicianSchema, sendQuoteSchema, blockerSchema, ticketListQuerySchema,
} from '../validations/ticket.js';
import { createMessageSchema, messageListQuerySchema } from '../validations/message.js';
import * as ticketService from '../services/ticket.service.js';
import * as messageService from '../services/message.service.js';
import * as attachmentService from '../services/attachment.service.js';
import { AppError } from '../lib/errors.js';

const app = new Hono();

// GET /api/tickets
app.get('/', validateQuery(ticketListQuerySchema), async (c) => {
  const session = c.get('session');
  const query = c.get('query') as any;
  const result = await ticketService.getTickets(query, session.user.id, session.user.role);
  return c.json(result);
});

// POST /api/tickets
app.post('/', validateBody(createTicketSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const ticket = await ticketService.createTicket(data, session.user.id, session.user.role);
  return c.json({ data: ticket, error: null }, 201);
});

// GET /api/tickets/:id
app.get('/:id', async (c) => {
  const session = c.get('session');
  const ticket = await ticketService.getTicketById(c.req.param('id'), session.user.id, session.user.role);
  return c.json({ data: ticket, error: null });
});

// PATCH /api/tickets/:id
app.patch('/:id', requireRole('ADMIN', 'TECHNICIAN'), validateBody(updateTicketSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const ticket = await ticketService.updateTicket(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: ticket, error: null });
});

// PATCH /api/tickets/:id/status
app.patch('/:id/status', validateBody(changeStatusSchema), async (c) => {
  const session = c.get('session');
  const { status } = c.get('body') as { status: any };
  const ticket = await ticketService.changeStatus(c.req.param('id'), status, session.user.id, session.user.role);
  return c.json({ data: ticket, error: null });
});

// PATCH /api/tickets/:id/assign
app.patch('/:id/assign', requireRole('ADMIN'), validateBody(assignTechnicianSchema), async (c) => {
  const session = c.get('session');
  const { technicianId } = c.get('body') as { technicianId: string };
  const ticket = await ticketService.assignTechnician(c.req.param('id'), technicianId, session.user.id);
  return c.json({ data: ticket, error: null });
});

// POST /api/tickets/:id/quote
app.post('/:id/quote', requireRole('ADMIN', 'TECHNICIAN'), validateBody(sendQuoteSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const ticket = await ticketService.sendQuote(c.req.param('id'), data.quotedPrice, data.quoteDescription, data.quoteDuration, session.user.id);
  return c.json({ data: ticket, error: null });
});

// POST /api/tickets/:id/approve-quote
app.post('/:id/approve-quote', async (c) => {
  const session = c.get('session');
  const ticket = await ticketService.approveQuote(c.req.param('id'), session.user.id, session.user.role);
  return c.json({ data: ticket, error: null });
});

// POST /api/tickets/:id/decline-quote
app.post('/:id/decline-quote', async (c) => {
  const session = c.get('session');
  const ticket = await ticketService.declineQuote(c.req.param('id'), session.user.id, session.user.role);
  return c.json({ data: ticket, error: null });
});

// POST /api/tickets/:id/blocker
app.post('/:id/blocker', requireRole('ADMIN', 'TECHNICIAN'), validateBody(blockerSchema), async (c) => {
  const session = c.get('session');
  const { reason } = c.get('body') as { reason: string };
  const ticket = await ticketService.addBlocker(c.req.param('id'), reason, session.user.id);
  return c.json({ data: ticket, error: null });
});

// DELETE /api/tickets/:id/blocker
app.delete('/:id/blocker', requireRole('ADMIN', 'TECHNICIAN'), async (c) => {
  const session = c.get('session');
  const ticket = await ticketService.removeBlocker(c.req.param('id'), session.user.id);
  return c.json({ data: ticket, error: null });
});

// POST /api/tickets/:id/accept
app.post('/:id/accept', requireRole('TECHNICIAN'), async (c) => {
  const session = c.get('session');
  const ticket = await ticketService.acceptTicket(c.req.param('id'), session.user.id);
  return c.json({ data: ticket, error: null });
});

// GET /api/tickets/:id/messages
app.get('/:id/messages', validateQuery(messageListQuerySchema), async (c) => {
  const session = c.get('session');
  const query = c.get('query') as any;
  const result = await messageService.getMessages(c.req.param('id'), query, session.user.id, session.user.role);
  return c.json(result);
});

// POST /api/tickets/:id/messages
app.post('/:id/messages', validateBody(createMessageSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const message = await messageService.createMessage(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: message, error: null }, 201);
});

// POST /api/tickets/:id/attachments — upload file to a ticket
app.post('/:id/attachments', async (c) => {
  const session = c.get('session');
  const ticketId = c.req.param('id');
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!(file instanceof File)) {
    throw AppError.badRequest('Fichier requis');
  }
  const attachment = await attachmentService.uploadAttachment(file, session.user.id, ticketId);
  return c.json({ data: attachment, error: null }, 201);
});

// GET /api/tickets/:id/attachments — list attachments for a ticket
app.get('/:id/attachments', async (c) => {
  const session = c.get('session');
  const ticketId = c.req.param('id');
  const attachments = await attachmentService.getAttachmentsByTicket(ticketId, session.user.id, session.user.role);
  return c.json({ data: attachments, error: null });
});

export default app;
