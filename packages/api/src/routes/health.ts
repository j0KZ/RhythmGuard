import { Hono } from 'hono';
import { db } from '../db/client';
import { sql } from 'drizzle-orm';

const healthRouter = new Hono();

const startTime = Date.now();

// Helper to read version from package.json
async function getVersion(): Promise<string> {
  try {
    const pkg = await Bun.file('../../package.json').json();
    return pkg.version || '0.1.0';
  } catch {
    return '0.1.0';
  }
}

// Composite health
healthRouter.get('/', async (c) => {
  const uptime = Date.now() - startTime;
  const timestamp = new Date().toISOString();
  const version = await getVersion();

  let dbConnected = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  return c.json({
    ok: dbConnected,
    uptime,
    timestamp,
    version,
    db: dbConnected,
  });
});

// Liveness — no DB dependency
healthRouter.get('/live', (c) => {
  return c.text('alive', 200);
});

// Readiness — depends on DB
healthRouter.get('/ready', async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({ ready: true }, 200);
  } catch {
    return c.json({ ready: false }, 503);
  }
});

export default healthRouter;
