/**
 * Integration tests — Hermes Express server
 *
 * Uses Supertest to exercise the real middleware stack with Supabase/Redis
 * stubbed out in tests/setup.js.
 *
 * Coverage:
 *  - Health endpoint
 *  - Security headers (helmet)
 *  - CORS behaviour
 *  - Auth middleware (missing token, invalid token, revoked token)
 *  - 404 handling for unknown API routes
 *  - Public routes reachable without auth
 */

const request = require('supertest');

// server.js now exports `app` and only calls startServer() when run directly.
// Supertest accepts an express app directly — no port binding needed in tests.

let app;
let server;
const { supabase } = require('../config/supabase');

beforeAll(async () => {
  app = require('../server');
});

afterAll(async () => {
  if (server) server.close();
});

// ── Reset mocks between tests ─────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();

  // Default: no revoked token, getUser returns invalid
  supabase.from.mockReturnValue({
    select:      jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    gt:          jest.fn().mockReturnThis(),
    limit:       jest.fn().mockReturnThis(),
    single:      jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    upsert:      jest.fn().mockResolvedValue({ data: null, error: null }),
  });

  supabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'invalid token' },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Health endpoint
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with status ok when db probe succeeds', async () => {
    supabase.from.mockReturnValue({
      select:      jest.fn().mockReturnThis(),
      eq:          jest.fn().mockReturnThis(),
      gt:          jest.fn().mockReturnThis(),
      limit:       jest.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
      single:      jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert:      jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('heap_mb');
    expect(res.body).toHaveProperty('latency_ms');
  });

  it('returns 503 with status degraded when db probe fails', async () => {
    supabase.from.mockReturnValue({
      select:      jest.fn().mockReturnThis(),
      eq:          jest.fn().mockReturnThis(),
      gt:          jest.fn().mockReturnThis(),
      limit:       jest.fn().mockResolvedValue({ data: null, error: { message: 'connection refused' } }),
      single:      jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert:      jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.db).toBe('degraded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1b. Payments webhook signature enforcement (audit fix #2)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/payments/webhook', () => {
  const ORIGINAL = process.env.PAYMONGO_WEBHOOK_SECRET;
  beforeEach(() => { process.env.PAYMONGO_WEBHOOK_SECRET = 'whsec_test'; });
  afterEach(() => { process.env.PAYMONGO_WEBHOOK_SECRET = ORIGINAL; });

  it('rejects a webhook with NO signature header (forgery guard)', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ data: { attributes: { type: 'payment.paid' } } }));
    expect(res.status).toBe(401);
  });

  it('rejects a webhook with an invalid signature', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('paymongo-signature', 't=1,te=deadbeef')
      .send(JSON.stringify({ data: { attributes: { type: 'payment.paid' } } }));
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Security headers
// ─────────────────────────────────────────────────────────────────────────────
describe('Security headers', () => {
  it('sets x-content-type-options: nosniff', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('does not expose x-powered-by', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sets x-request-id on every response', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CORS
// ─────────────────────────────────────────────────────────────────────────────
describe('CORS', () => {
  it('allows requests from localhost:5173', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('allows requests from the Render frontend domain', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://hermesv2-frontend.onrender.com');
    expect(res.headers['access-control-allow-origin']).toBe('https://hermesv2-frontend.onrender.com');
  });

  it('blocks requests from unknown origins', async () => {
    const res = await request(app)
      .options('/api/auth/change-password')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'POST');
    // CORS error results in no allow-origin header
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Auth middleware — requireAuth
// ─────────────────────────────────────────────────────────────────────────────
describe('requireAuth middleware', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when Authorization header is not Bearer format', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', 'Basic dXNlcjpwYXNz');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid (Supabase rejects it)', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired' },
    });

    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid|expired|unauthorized/i);
  });

  it('returns 401 when token is in the revocation blacklist', async () => {
    // First from() call is the revocation check — return a hit
    supabase.from.mockReturnValueOnce({
      select:      jest.fn().mockReturnThis(),
      eq:          jest.fn().mockReturnThis(),
      gt:          jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'revoked-id' }, error: null }),
    });

    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', 'Bearer revoked.token');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/revoked/i);
  });

  it('returns 403 when user profile not found', async () => {
    // Revocation check — no hit
    supabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq:     jest.fn().mockReturnThis(),
        gt:     jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
      // Profile lookup — not found
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq:     jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      });

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });

    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', 'Bearer valid.token.here');
    expect(res.status).toBe(403);
  });

  it('returns 403 when user account is disabled', async () => {
    supabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq:     jest.fn().mockReturnThis(),
        gt:     jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq:     jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-123', role: 'member', status: 'disabled' },
          error: null,
        }),
      });

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });

    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', 'Bearer valid.token.here');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not active/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. API 404 handling
// ─────────────────────────────────────────────────────────────────────────────
describe('API 404', () => {
  it('returns JSON 404 for unknown /api routes', async () => {
    const res = await request(app).get('/api/this-does-not-exist-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Root ping
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /', () => {
  it('returns API running message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/hermes api/i);
  });
});
