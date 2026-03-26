import { Hono } from 'hono';
import { validateBody } from '../middleware/validate.middleware.js';
import { serviceRequestSchema } from '../validations/ticket.js';
import * as ticketService from '../services/ticket.service.js';

const app = new Hono();

// POST /api/service-request — public endpoint (no auth required)
app.post('/', validateBody(serviceRequestSchema), async (c) => {
  const data = c.get('body') as any;
  const ticket = await ticketService.createServiceRequest(data);
  return c.json({ data: ticket, error: null }, 201);
});

export default app;
