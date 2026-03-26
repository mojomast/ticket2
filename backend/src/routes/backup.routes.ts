import { Hono } from 'hono';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import { createBackupSchema, backupListQuerySchema } from '../validations/backup.js';
import * as backupService from '../services/backup.service.js';

const app = new Hono();

app.get('/', validateQuery(backupListQuerySchema), async (c) => {
  const query = c.get('query') as any;
  const result = await backupService.listBackups(query);
  return c.json(result);
});

app.post('/', validateBody(createBackupSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const backup = await backupService.createBackup(session.user.id, data.type, data.tables);
  return c.json({ data: backup, error: null }, 201);
});

app.get('/:id', async (c) => {
  const backup = await backupService.getBackupById(c.req.param('id'));
  return c.json({ data: backup, error: null });
});

app.delete('/:id', async (c) => {
  await backupService.deleteBackup(c.req.param('id'));
  return c.json({ data: { message: 'Sauvegarde supprimee' }, error: null });
});

app.get('/:id/download', async (c) => {
  const { content, fileName } = await backupService.downloadBackup(c.req.param('id'));
  c.header('Content-Type', 'application/json');
  c.header('Content-Disposition', `attachment; filename="${fileName}"`);
  return c.body(content);
});

app.post('/:id/restore', async (c) => {
  const session = c.get('session');
  const backup = await backupService.restoreBackup(c.req.param('id'), session.user.id);
  return c.json({ data: backup, error: null });
});

export default app;
