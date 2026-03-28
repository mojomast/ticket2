import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import * as attachmentService from '../services/attachment.service.js';

const app = new Hono();

// ─── GET /api/attachments/:id/download — download a specific attachment ───

app.get('/attachments/:id/download', async (c) => {
  const session = c.get('session');
  const attachment = await attachmentService.getAttachmentForUser(
    c.req.param('id'),
    session.user.id,
    session.user.role,
  );
  const filePath = attachmentService.getAttachmentFilePath(attachment.storagePath);

  if (!existsSync(filePath)) {
    throw new Error('Fichier introuvable sur le serveur');
  }

  const fileStat = await stat(filePath);

  c.header('Content-Type', attachment.mimeType);
  c.header('Content-Length', String(fileStat.size));
  c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);

  // Stream the file
  return stream(c, async (s) => {
    const nodeStream = createReadStream(filePath);
    const webReadable = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    const reader = webReadable.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await s.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  });
});

// ─── GET /api/attachments/:id/view — inline view (Content-Disposition: inline) ───

app.get('/attachments/:id/view', async (c) => {
  const session = c.get('session');
  const attachment = await attachmentService.getAttachmentForUser(
    c.req.param('id'),
    session.user.id,
    session.user.role,
  );
  const filePath = attachmentService.getAttachmentFilePath(attachment.storagePath);

  if (!existsSync(filePath)) {
    throw new Error('Fichier introuvable sur le serveur');
  }

  const fileStat = await stat(filePath);

  c.header('Content-Type', attachment.mimeType);
  c.header('Content-Length', String(fileStat.size));
  c.header('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
  // Allow embedding in iframes from the frontend origin
  c.header('X-Frame-Options', 'SAMEORIGIN');

  return stream(c, async (s) => {
    const nodeStream = createReadStream(filePath);
    const webReadable = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    const reader = webReadable.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await s.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  });
});

// ─── DELETE /api/attachments/:id — delete attachment (admin or author) ───

app.delete('/attachments/:id', async (c) => {
  const session = c.get('session');
  const result = await attachmentService.deleteAttachment(
    c.req.param('id'),
    session.user.id,
    session.user.role,
  );

  return c.json({ data: result, error: null });
});

export default app;
