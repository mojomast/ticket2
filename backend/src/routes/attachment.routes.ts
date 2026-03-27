import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { AppError } from '../lib/errors.js';
import * as attachmentService from '../services/attachment.service.js';

const app = new Hono();

// ─── POST /api/tickets/:ticketId/attachments — upload file to a ticket ───

app.post('/tickets/:ticketId/attachments', async (c) => {
  const session = c.get('session');
  const ticketId = c.req.param('ticketId');

  const body = await c.req.parseBody();
  const file = body['file'];

  if (!(file instanceof File)) {
    throw AppError.badRequest('Fichier requis');
  }

  const attachment = await attachmentService.uploadAttachment(
    file,
    session.user.id,
    ticketId,
  );

  return c.json({ data: attachment, error: null }, 201);
});

// ─── GET /api/tickets/:ticketId/attachments — list attachments for a ticket ───

app.get('/tickets/:ticketId/attachments', async (c) => {
  const session = c.get('session');
  const ticketId = c.req.param('ticketId');

  const attachments = await attachmentService.getAttachmentsByTicket(
    ticketId,
    session.user.id,
    session.user.role,
  );

  return c.json({ data: attachments, error: null });
});

// ─── GET /api/attachments/:id/download — download a specific attachment ───

app.get('/attachments/:id/download', async (c) => {
  const attachment = await attachmentService.getAttachment(c.req.param('id'));
  const filePath = attachmentService.getAttachmentFilePath(attachment.storagePath);

  if (!existsSync(filePath)) {
    throw AppError.notFound('Fichier introuvable sur le serveur');
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
