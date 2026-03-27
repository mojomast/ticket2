import { Hono } from 'hono';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  createCustomerNoteSchema, updateCustomerNoteSchema, customerNoteListQuerySchema,
} from '../validations/knowledgebase.js';
import * as noteService from '../services/customer-note.service.js';

const app = new Hono();

// GET /api/customer-notes?customerId=xxx
app.get('/', validateQuery(customerNoteListQuerySchema), async (c) => {
  const query = c.get('query') as any;
  const result = await noteService.listNotes(query);
  return c.json(result);
});

// POST /api/customer-notes
app.post('/', validateBody(createCustomerNoteSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const note = await noteService.createNote(data, session.user.id);
  return c.json({ data: note, error: null }, 201);
});

// PATCH /api/customer-notes/:id
app.patch('/:id', validateBody(updateCustomerNoteSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const note = await noteService.updateNote(c.req.param('id'), data, session.user.id);
  return c.json({ data: note, error: null });
});

// PATCH /api/customer-notes/:id/toggle-pin
app.patch('/:id/toggle-pin', async (c) => {
  const session = c.get('session');
  const note = await noteService.togglePin(c.req.param('id'), session.user.id);
  return c.json({ data: note, error: null });
});

// DELETE /api/customer-notes/:id
app.delete('/:id', async (c) => {
  const session = c.get('session');
  await noteService.deleteNote(c.req.param('id'), session.user.id);
  return c.json({ data: { success: true }, error: null });
});

export default app;
