# Plan — Issue #5: Add /health endpoint with liveness/readiness checks

## Context
RhythmGuard API currently has a minimal `/health` inline in `src/index.ts` that only returns `{ status: 'ok', version: '0.1.0' }`. We need a comprehensive health check system for production deployments.

## Files Changed

### 1. `packages/api/src/routes/health.ts` (NEW)
Routes under `/health` base path (mounted at `/health`):

- `GET /health` — composite health:
  - `ok`: boolean (true if DB connectable)
  - `uptime`: number (ms since server start)
  - `timestamp`: ISO 8601 string
  - `version`: from `packages/api/package.json`
  - `db`: boolean (DB connection status)

- `GET /health/live` — liveness:
  - Returns 200 text `"alive"` with no DB dependency

- `GET /health/ready` — readiness:
  - Returns 200 JSON `{ ready: true }` if DB connectable
  - Returns 503 JSON `{ ready: false }` if DB unreachable

Implementation:
- Uses existing `db` client from `../db/client.ts`
- DB probe: `await db.execute(sql`select 1`)`
- `version` read via `Bun.file('../../package.json').json()`
- Start time captured at module load with `Date.now()`
- No env vars, secrets, or sensitive data exposed

### 2. `packages/api/src/index.ts` (MODIFY)
- Remove inline `/health` handler (line 8)
- Add `import healthRouter from './routes/health';`
- Add `app.route('/health', healthRouter);`

### 3. `packages/api/src/routes/health.test.ts` (NEW)
Vitest tests:
- Test `GET /health` returns composite JSON with all fields
- Test `GET /health/live` returns 200 always
- Test `GET /health/ready` returns 200 when DB OK
- Test `GET /health/ready` returns 503 when DB fails (mock `db.execute` to throw)
- Test no sensitive data exposed in any response

### 4. `docker-compose.yml` (MODIFY)
Add healthcheck to `api` service:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3100/health/ready"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 5s
```
Also add `depends_on` condition so api waits for postgres to be healthy before starting.

## Security
- No raw secrets in health responses (verified by grep/inspection)
- Only computed fields: uptime, timestamp, version, boolean db status

## Test Strategy
- `pnpm test -- --run` in `packages/api` to run Vitest
- Tests mock DB failures by stubbing `db.execute`
