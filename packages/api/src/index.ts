import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok', version: '0.1.0' }));

// Routes added in session 4:
// POST /v1/challenge
// POST /v1/verify
// POST /v1/validate-token
// Enterprise routes added in session 7:
// POST /v1/enroll/start
// POST /v1/enroll/submit
// GET  /v1/profile/:externalUserId
// POST /v1/profile/:externalUserId/recalibrate
// DELETE /v1/profile/:externalUserId

const port = parseInt(process.env.PORT || '3100');

export default {
  port,
  fetch: app.fetch,
};

console.log(`RhythmGuard API running on port ${port}`);
