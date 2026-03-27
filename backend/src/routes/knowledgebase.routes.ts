import { Hono } from 'hono';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import { requireRole } from '../middleware/auth.middleware.js';
import {
  createArticleSchema, updateArticleSchema, articleListQuerySchema,
  createLinkSchema, linkListQuerySchema, articleLinksQuerySchema,
} from '../validations/knowledgebase.js';
import * as kbService from '../services/knowledgebase.service.js';

const app = new Hono();

// ─── Articles ───

// GET /api/kb/articles
app.get('/articles', validateQuery(articleListQuerySchema), async (c) => {
  const session = c.get('session');
  const query = c.get('query') as any;
  const result = await kbService.listArticles(query, session.user.role);
  return c.json(result);
});

// POST /api/kb/articles
app.post('/articles', requireRole('ADMIN', 'TECHNICIAN'), validateBody(createArticleSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const article = await kbService.createArticle(data, session.user.id);
  return c.json({ data: article, error: null }, 201);
});

// GET /api/kb/articles/by-slug/:slug
app.get('/articles/by-slug/:slug', async (c) => {
  const session = c.get('session');
  const article = await kbService.getArticleBySlug(c.req.param('slug'), session.user.role);
  return c.json({ data: article, error: null });
});

// GET /api/kb/articles/:id
app.get('/articles/:id', async (c) => {
  const session = c.get('session');
  const article = await kbService.getArticle(c.req.param('id'), session.user.role);
  return c.json({ data: article, error: null });
});

// PATCH /api/kb/articles/:id
app.patch('/articles/:id', requireRole('ADMIN', 'TECHNICIAN'), validateBody(updateArticleSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const article = await kbService.updateArticle(c.req.param('id'), data, session.user.id);
  return c.json({ data: article, error: null });
});

// DELETE /api/kb/articles/:id
app.delete('/articles/:id', requireRole('ADMIN', 'TECHNICIAN'), async (c) => {
  const session = c.get('session');
  await kbService.deleteArticle(c.req.param('id'), session.user.id);
  return c.json({ data: { success: true }, error: null });
});

// GET /api/kb/articles/:id/links
app.get('/articles/:id/links', validateQuery(articleLinksQuerySchema), async (c) => {
  const query = c.get('query') as any;
  const result = await kbService.getLinksForArticle(c.req.param('id'), query.page, query.limit);
  return c.json(result);
});

// ─── Links (entity-centric) ───

// GET /api/kb/links?entityType=TICKET&entityId=xxx
app.get('/links', validateQuery(linkListQuerySchema), async (c) => {
  const query = c.get('query') as any;
  const links = await kbService.getLinksForEntity(query.entityType, query.entityId);
  return c.json({ data: links, error: null });
});

// POST /api/kb/links
app.post('/links', requireRole('ADMIN', 'TECHNICIAN'), validateBody(createLinkSchema), async (c) => {
  const session = c.get('session');
  const data = c.get('body') as any;
  const link = await kbService.linkArticle(data, session.user.id);
  return c.json({ data: link, error: null }, 201);
});

// DELETE /api/kb/links/:id
app.delete('/links/:id', requireRole('ADMIN', 'TECHNICIAN'), async (c) => {
  const session = c.get('session');
  await kbService.unlinkArticle(c.req.param('id'), session.user.id);
  return c.json({ data: { success: true }, error: null });
});

export default app;
