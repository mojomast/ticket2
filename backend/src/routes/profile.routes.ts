import { Hono } from 'hono';
import { validateBody } from '../middleware/validate.middleware.js';
import { updateProfileSchema, changePasswordSchema } from '../validations/user.js';
import * as userService from '../services/user.service.js';

const app = new Hono();

app.get('/profile', async (c) => {
  const session = c.get('session');
  const profile = await userService.getProfile(session.user.id);
  return c.json({ data: profile, error: null });
});

app.patch('/profile', validateBody(updateProfileSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const profile = await userService.updateProfile(session.user.id, data);
  return c.json({ data: profile, error: null });
});

app.post('/profile/password', validateBody(changePasswordSchema), async (c) => {
  const session = c.get('session');
  const { currentPassword, newPassword } = c.get('body') as { currentPassword: string; newPassword: string; confirmPassword: string };
  await userService.changePassword(session.user.id, currentPassword, newPassword);
  return c.json({ data: { message: 'Mot de passe modifié avec succès' }, error: null });
});

export default app;
