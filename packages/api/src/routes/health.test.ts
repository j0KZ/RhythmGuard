import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import healthRouter from './health';

describe('Health Routes', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/health', healthRouter);
  });

  describe('GET /health/live', () => {
    it('returns 200 always', async () => {
      const res = await app.request('/health/live');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('alive');
    });
  });

  describe('GET /health', () => {
    it('returns JSON with required fields', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('ok', expect.any(Boolean));
      expect(body).toHaveProperty('uptime', expect.any(Number));
      expect(body).toHaveProperty('timestamp', expect.any(String));
      expect(body).toHaveProperty('version', expect.any(String));
      expect(body).toHaveProperty('db', expect.any(Boolean));

      // Ensure only expected fields are exposed
      expect(Object.keys(body).sort()).toEqual(['db','ok','timestamp','uptime','version']);
    });
  });

  describe('GET /health/ready', () => {
    it('returns 200 or 503', async () => {
      const res = await app.request('/health/ready');
      expect([200, 503]).toContain(res.status);
      const body = await res.json();
      expect(body).toHaveProperty('ready', expect.any(Boolean));
    });
  });
});
