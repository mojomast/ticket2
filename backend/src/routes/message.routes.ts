import { Hono } from 'hono';
import { requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { updateMessageSchema } from '../validations/message.js';
import * as messageService from '../services/message.service.js';

const app = new Hono();

app.patch('/:id', validateBody(updateMessageSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const message = await messageService.updateMessage(c.req.param('id'), data, session.user.id);
  return c.json({ data: message, error: null });
});

app.delete('/:id', requireRole('ADMIN'), async (c) => {
  await messageService.deleteMessage(c.req.param('id'));
  return c.json({ data: { message: 'Message supprime' }, error: null });
});

export default app;
