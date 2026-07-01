/**
 * Jest global setup — stubs external dependencies so tests run without
 * real Supabase credentials, Redis, or third-party APIs.
 *
 * Loaded via jest.setupFiles before each test file.
 */

// ── Env stubs ─────────────────────────────────────────────────────────────
process.env.NODE_ENV            = 'test';
process.env.SUPABASE_URL        = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.test';
process.env.SUPABASE_ANON_KEY   = 'test-anon-key';
process.env.PORT                = '5001';
process.env.FRONTEND_URL        = 'http://localhost:3000';
process.env.LOG_LEVEL           = 'silent';

// ── Supabase stub ─────────────────────────────────────────────────────────
// Prevents real network calls. Tests that need specific DB responses
// should override jest.mock('../config/supabase') in their own file.
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid token' } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gt:     jest.fn().mockReturnThis(),
      limit:  jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
    rpc: jest.fn().mockResolvedValue({ error: null }),
  },
}));

// ── Sentry stub ───────────────────────────────────────────────────────────
jest.mock('@sentry/node', () => ({
  init:          jest.fn(),
  captureException: jest.fn(),
  withScope:     jest.fn((cb) => cb({ setTag: jest.fn(), setExtra: jest.fn(), setUser: jest.fn() })),
}));

// ── ioredis stub ──────────────────────────────────────────────────────────
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect:    jest.fn().mockResolvedValue(undefined),
    get:        jest.fn().mockResolvedValue(null),
    set:        jest.fn().mockResolvedValue('OK'),
    setex:      jest.fn().mockResolvedValue('OK'),
    del:        jest.fn().mockResolvedValue(1),
    ping:       jest.fn().mockResolvedValue('PONG'),
    on:         jest.fn(),
    disconnect: jest.fn(),
  }));
});
