import { Hono } from 'hono';
import { requireRole } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  createUserSchema, updateUserSchema, updateProfileSchema,
  techPermissionsSchema, userListQuerySchema,
} from '../validations/user.js';
import * as userService from '../services/user.service.js';

const app = new Hono();

// Admin user management routes (mounted at /api/admin/users)
app.get('/', validateQuery(userListQuerySchema), async (c) => {
  const query = c.get('query') as any;
  const result = await userService.getUsers(query);
  return c.json(result);
});

app.post('/', validateBody(createUserSchema), async (c) => {
  const data = c.get('body') as any;
  const user = await userService.createUser(data);
  return c.json({ data: user, error: null }, 201);
});

app.get('/:id', async (c) => {
  const user = await userService.getUserById(c.req.param('id'));
  return c.json({ data: user, error: null });
});

app.patch('/:id', validateBody(updateUserSchema), async (c) => {
  const data = c.get('body') as any;
  const user = await userService.updateUser(c.req.param('id'), data);
  return c.json({ data: user, error: null });
});

app.delete('/:id', async (c) => {
  const user = await userService.deleteUser(c.req.param('id'));
  return c.json({ data: user, error: null });
});

app.patch('/:id/permissions', validateBody(techPermissionsSchema), async (c) => {
  const data = c.get('body') as any;
  const user = await userService.updatePermissions(c.req.param('id'), data);
  return c.json({ data: user, error: null });
});

export default app;
