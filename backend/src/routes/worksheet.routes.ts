import { Hono } from 'hono';
import { requireRole } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  createWorksheetSchema, updateWorksheetSchema, worksheetStatusSchema,
  worksheetListQuerySchema, createLaborEntrySchema, updateLaborEntrySchema,
  createPartSchema, updatePartSchema, createTravelEntrySchema,
  updateTravelEntrySchema, createWorksheetNoteSchema, createFollowUpSchema,
  updateFollowUpSchema, saveSignatureSchema,
} from '../validations/worksheet.js';
import * as worksheetService from '../services/worksheet.service.js';
import { generateWorksheetPdf } from '../services/worksheet-pdf.service.js';

const app = new Hono();

// ─── List & Create ───

app.get('/', validateQuery(worksheetListQuerySchema), async (c) => {
  const session = c.get('session');
  const query = c.get('query') as any;
  const result = await worksheetService.listWorksheets(query, session.user.id, session.user.role);
  return c.json(result);
});

app.post('/', requireRole('ADMIN', 'TECHNICIAN'), validateBody(createWorksheetSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const worksheet = await worksheetService.createWorksheet(data, session.user.id, session.user.role);
  return c.json({ data: worksheet, error: null }, 201);
});

// ─── Follow-Ups for Schedule (MUST be before /:id to avoid matching as ID) ───

app.get('/follow-ups/schedule', async (c) => {
  const session = c.get('session');
  const from = c.req.query('from');
  const to = c.req.query('to');

  if (!from || !to) {
    return c.json({ data: null, error: { message: 'Les paramètres "from" et "to" sont requis', code: 'VALIDATION_ERROR' } }, 400);
  }

  // Only ADMIN and TECHNICIAN can access schedule follow-ups
  if (session.user.role === 'CUSTOMER') {
    return c.json({ data: null, error: { message: 'Accès refusé', code: 'FORBIDDEN' } }, 403);
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return c.json({ data: [], error: null });
  }

  const followUps = await worksheetService.getFollowUpsForSchedule(
    session.user.id,
    session.user.role,
    fromDate.toISOString(),
    toDate.toISOString(),
  );
  return c.json({ data: followUps, error: null });
});

// ─── Detail ───

app.get('/:id', async (c) => {
  const session = c.get('session');
  const worksheet = await worksheetService.getWorksheetById(c.req.param('id'), session.user.id, session.user.role);
  return c.json({ data: worksheet, error: null });
});

app.patch('/:id', requireRole('ADMIN', 'TECHNICIAN'), validateBody(updateWorksheetSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const worksheet = await worksheetService.updateWorksheet(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: worksheet, error: null });
});

app.delete('/:id', requireRole('ADMIN'), async (c) => {
  const session = c.get('session');
  await worksheetService.deleteWorksheet(c.req.param('id'), session.user.id, session.user.role);
  return c.json({ data: { success: true }, error: null });
});

// ─── Status Changes ───

app.patch('/:id/status', requireRole('ADMIN', 'TECHNICIAN'), validateBody(worksheetStatusSchema), async (c) => {
  const session = c.get('session');
  const { status, reason } = c.get('body') as any;
  const worksheet = await worksheetService.changeStatus(c.req.param('id'), status, reason, session.user.id, session.user.role);
  return c.json({ data: worksheet, error: null });
});

// ─── PDF Generation ───

app.get('/:id/pdf', async (c) => {
  const session = c.get('session');
  const worksheet = await worksheetService.getWorksheetById(c.req.param('id'), session.user.id, session.user.role);
  const pdfBytes = await generateWorksheetPdf(worksheet);
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `inline; filename="feuille-travail-${worksheet.id.slice(0, 8)}.pdf"`);
  return c.body(pdfBytes as any);
});

// ─── Labor Entries ───

app.post('/:id/labor', requireRole('ADMIN', 'TECHNICIAN'), validateBody(createLaborEntrySchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const entry = await worksheetService.addLaborEntry(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: entry, error: null }, 201);
});

app.patch('/:id/labor/:entryId', requireRole('ADMIN', 'TECHNICIAN'), validateBody(updateLaborEntrySchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const entry = await worksheetService.updateLaborEntry(c.req.param('id'), c.req.param('entryId'), data, session.user.id, session.user.role);
  return c.json({ data: entry, error: null });
});

app.delete('/:id/labor/:entryId', requireRole('ADMIN', 'TECHNICIAN'), async (c) => {
  const session = c.get('session');
  await worksheetService.deleteLaborEntry(c.req.param('id'), c.req.param('entryId'), session.user.id, session.user.role);
  return c.json({ data: { success: true }, error: null });
});

app.post('/:id/labor/:entryId/stop', requireRole('ADMIN', 'TECHNICIAN'), async (c) => {
  const session = c.get('session');
  const entry = await worksheetService.stopTimer(c.req.param('id'), c.req.param('entryId'), session.user.id, session.user.role);
  return c.json({ data: entry, error: null });
});

// ─── Parts ───

app.post('/:id/parts', requireRole('ADMIN', 'TECHNICIAN'), validateBody(createPartSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const part = await worksheetService.addPart(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: part, error: null }, 201);
});

app.patch('/:id/parts/:partId', requireRole('ADMIN', 'TECHNICIAN'), validateBody(updatePartSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const part = await worksheetService.updatePart(c.req.param('id'), c.req.param('partId'), data, session.user.id, session.user.role);
  return c.json({ data: part, error: null });
});

app.delete('/:id/parts/:partId', requireRole('ADMIN', 'TECHNICIAN'), async (c) => {
  const session = c.get('session');
  await worksheetService.deletePart(c.req.param('id'), c.req.param('partId'), session.user.id, session.user.role);
  return c.json({ data: { success: true }, error: null });
});

// ─── Travel Entries ───

app.post('/:id/travel', requireRole('ADMIN', 'TECHNICIAN'), validateBody(createTravelEntrySchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const entry = await worksheetService.addTravelEntry(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: entry, error: null }, 201);
});

app.patch('/:id/travel/:entryId', requireRole('ADMIN', 'TECHNICIAN'), validateBody(updateTravelEntrySchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const entry = await worksheetService.updateTravelEntry(c.req.param('id'), c.req.param('entryId'), data, session.user.id, session.user.role);
  return c.json({ data: entry, error: null });
});

app.delete('/:id/travel/:entryId', requireRole('ADMIN', 'TECHNICIAN'), async (c) => {
  const session = c.get('session');
  await worksheetService.deleteTravelEntry(c.req.param('id'), c.req.param('entryId'), session.user.id, session.user.role);
  return c.json({ data: { success: true }, error: null });
});

// ─── Notes ───

app.post('/:id/notes', requireRole('ADMIN', 'TECHNICIAN'), validateBody(createWorksheetNoteSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const note = await worksheetService.addNote(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: note, error: null }, 201);
});

app.delete('/:id/notes/:noteId', requireRole('ADMIN', 'TECHNICIAN'), async (c) => {
  const session = c.get('session');
  await worksheetService.deleteNote(c.req.param('id'), c.req.param('noteId'), session.user.id, session.user.role);
  return c.json({ data: { success: true }, error: null });
});

// ─── Notes → KB Integration ───

app.post('/:id/notes/:noteId/to-kb', requireRole('ADMIN', 'TECHNICIAN'), async (c) => {
  const session = c.get('session');
  const article = await worksheetService.createKbFromNote(c.req.param('id'), c.req.param('noteId'), session.user.id);
  return c.json({ data: article, error: null }, 201);
});

// ─── Follow-Ups ───

app.post('/:id/follow-ups', requireRole('ADMIN', 'TECHNICIAN'), validateBody(createFollowUpSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const followUp = await worksheetService.createFollowUp(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: followUp, error: null }, 201);
});

app.patch('/:id/follow-ups/:followUpId', requireRole('ADMIN', 'TECHNICIAN'), validateBody(updateFollowUpSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const followUp = await worksheetService.updateFollowUp(c.req.param('id'), c.req.param('followUpId'), data, session.user.id, session.user.role);
  return c.json({ data: followUp, error: null });
});

app.delete('/:id/follow-ups/:followUpId', requireRole('ADMIN', 'TECHNICIAN'), async (c) => {
  const session = c.get('session');
  await worksheetService.deleteFollowUp(c.req.param('id'), c.req.param('followUpId'), session.user.id, session.user.role);
  return c.json({ data: { success: true }, error: null });
});

// ─── Signatures ───

app.post('/:id/signature', requireRole('ADMIN', 'TECHNICIAN'), validateBody(saveSignatureSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const worksheet = await worksheetService.saveSignature(c.req.param('id'), data, session.user.id, session.user.role);
  return c.json({ data: worksheet, error: null });
});

export default app;
