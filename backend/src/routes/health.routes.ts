import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';

const app = new Hono();

app.get('/', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ data: { status: 'healthy', database: 'connected', timestamp: new Date().toISOString() }, error: null });
  } catch {
    return c.json({ data: { status: 'unhealthy', database: 'disconnected', timestamp: new Date().toISOString() }, error: null }, 503);
  }
});

export default app;
