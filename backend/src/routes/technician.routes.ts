import { Hono } from 'hono';
import { requireRole } from '../middleware/auth.middleware.js';
import * as userService from '../services/user.service.js';

const app = new Hono();

app.get('/', requireRole('ADMIN', 'TECHNICIAN'), async (c) => {
  const technicians = await userService.getActiveTechnicians();
  return c.json({ data: technicians, error: null });
});

export default app;
