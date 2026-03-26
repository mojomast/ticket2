import { Hono } from 'hono';
import * as notificationService from '../services/notification.service.js';

const app = new Hono();

app.get('/', async (c) => {
  const session = c.get('session');
  const query = Object.fromEntries(new URL(c.req.url).searchParams);
  const result = await notificationService.getNotifications(session.user.id, query);
  return c.json(result);
});

app.patch('/:id/read', async (c) => {
  const session = c.get('session');
  const notification = await notificationService.markRead(c.req.param('id'), session.user.id);
  return c.json({ data: notification, error: null });
});

app.post('/read-all', async (c) => {
  const session = c.get('session');
  await notificationService.markAllRead(session.user.id);
  return c.json({ data: { message: 'Toutes les notifications marquees comme lues' }, error: null });
});

export default app;
