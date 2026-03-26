import { Hono } from 'hono';
import { requireRole } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  createAppointmentSchema, updateAppointmentSchema,
  appointmentStatusSchema, availabilityQuerySchema, appointmentListQuerySchema,
  createProposalSchema, respondProposalSchema, proposalListQuerySchema,
  dayScheduleQuerySchema,
} from '../validations/appointment.js';
import * as schedulingService from '../services/scheduling.service.js';

const app = new Hono();

// ─── Appointment CRUD ───

app.get('/', validateQuery(appointmentListQuerySchema), async (c) => {
  const session = c.get('session');
  const query = c.get('query') as any;
  const result = await schedulingService.getAppointments(query, session.user.id, session.user.role);
  return c.json(result);
});

app.post('/', validateBody(createAppointmentSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const appointment = await schedulingService.createAppointment(data, session.user.id, session.user.role);
  return c.json({ data: appointment, error: null }, 201);
});

app.get('/availability', validateQuery(availabilityQuerySchema), async (c) => {
  const query = c.get('query') as any;
  const slots = await schedulingService.getAvailability(query.date, query.technicianId, query.duration);
  return c.json({ data: slots, error: null });
});

// ─── Day Schedule (for inline calendar view) ───

app.get('/day-schedule', validateQuery(dayScheduleQuerySchema), async (c) => {
  const query = c.get('query') as any;
  const appointments = await schedulingService.getDaySchedule(query.date, query.technicianId);
  return c.json({ data: appointments, error: null });
});

// ─── Proposal Endpoints ───

app.get('/proposals', validateQuery(proposalListQuerySchema), async (c) => {
  const session = c.get('session');
  const query = c.get('query') as any;
  const proposals = await schedulingService.getProposals(query.ticketId, query.status, session.user.id, session.user.role);
  return c.json({ data: proposals, error: null });
});

app.post('/proposals', validateBody(createProposalSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const proposal = await schedulingService.createProposal(data, session.user.id, session.user.role);
  return c.json({ data: proposal, error: null }, 201);
});

app.patch('/proposals/:id/accept', validateBody(respondProposalSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const result = await schedulingService.acceptProposal(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: result, error: null });
});

app.patch('/proposals/:id/reject', validateBody(respondProposalSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const proposal = await schedulingService.rejectProposal(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: proposal, error: null });
});

app.delete('/proposals/:id', async (c) => {
  const session = c.get('session');
  const proposal = await schedulingService.cancelProposal(c.req.param('id'), session.user.id);
  return c.json({ data: proposal, error: null });
});

// ─── Appointment Detail ───

app.get('/:id', async (c) => {
  const appointment = await schedulingService.getAppointmentById(c.req.param('id'));
  return c.json({ data: appointment, error: null });
});

app.patch('/:id', requireRole('ADMIN', 'TECHNICIAN'), validateBody(updateAppointmentSchema), async (c) => {
  const data = c.get('body') as any;
  const appointment = await schedulingService.updateAppointment(c.req.param('id'), data);
  return c.json({ data: appointment, error: null });
});

app.delete('/:id', async (c) => {
  const session = c.get('session');
  const appointment = await schedulingService.cancelAppointment(
    c.req.param('id'),
    session.user.id,
    session.user.role
  );
  return c.json({ data: appointment, error: null });
});

app.patch('/:id/status', requireRole('ADMIN', 'TECHNICIAN'), validateBody(appointmentStatusSchema), async (c) => {
  const data = c.get('body') as any;
  const appointment = await schedulingService.changeAppointmentStatus(c.req.param('id'), data.status, data.cancelReason);
  return c.json({ data: appointment, error: null });
});

export default app;
