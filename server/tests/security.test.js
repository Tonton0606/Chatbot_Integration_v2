/**
 * Unit tests for the security-critical pure functions hardened during the audit.
 * No network/DB — exercises the logic directly.
 */

const {
  validatePasswordStrength,
  getProgressiveDelay,
  generateFingerprint,
  checkHoneypot,
} = require('../middleware/security');
const { verifyWebhookSignature } = require('../services/payMongo');
const { sanitizeSearch } = require('../domains/leads/routes');
const securityRouter = require('../routes/services/security');
const crypto = require('crypto');

describe('validatePasswordStrength', () => {
  it('rejects short passwords', () => {
    expect(validatePasswordStrength('Ab1!xy').valid).toBe(false);
  });

  it('rejects passwords missing a character class', () => {
    expect(validatePasswordStrength('alllowercase1').valid).toBe(false); // no upper/special
    expect(validatePasswordStrength('NOLOWERCASE1!').valid).toBe(false); // no lower
    expect(validatePasswordStrength('NoNumbersHere!').valid).toBe(false); // no number
  });

  it('rejects common passwords even if complex enough by length', () => {
    expect(validatePasswordStrength('password123').valid).toBe(false);
  });

  it('rejects passwords over the max length', () => {
    expect(validatePasswordStrength('Aa1!'.repeat(40)).valid).toBe(false);
  });

  it('accepts a strong password', () => {
    expect(validatePasswordStrength('Str0ng&Unique!Pass').valid).toBe(true);
  });
});

describe('getProgressiveDelay', () => {
  it('escalates delay with attempt count', () => {
    expect(getProgressiveDelay(1)).toBe(0);
    expect(getProgressiveDelay(4)).toBe(2_000);
    expect(getProgressiveDelay(6)).toBe(5_000);
    expect(getProgressiveDelay(9)).toBe(10_000);
    expect(getProgressiveDelay(50)).toBe(30_000);
  });
});

describe('generateFingerprint', () => {
  const req = (h = {}) => ({ ip: '1.2.3.4', headers: h });

  it('is deterministic for identical inputs', () => {
    expect(generateFingerprint(req({ 'user-agent': 'x' })))
      .toBe(generateFingerprint(req({ 'user-agent': 'x' })));
  });

  it('changes when a contributing header changes', () => {
    expect(generateFingerprint(req({ 'user-agent': 'x' })))
      .not.toBe(generateFingerprint(req({ 'user-agent': 'y' })));
  });
});

describe('checkHoneypot', () => {
  it('flags a filled honeypot field as a bot', () => {
    expect(checkHoneypot({ body: { website: 'http://spam' } }).isBot).toBe(true);
  });

  it('flags submissions completed implausibly fast', () => {
    expect(checkHoneypot({ body: { _form_start_time: String(Date.now()) } }).isBot).toBe(true);
  });

  it('passes a clean, human-paced submission', () => {
    const result = checkHoneypot({ body: { _form_start_time: String(Date.now() - 10_000) } });
    expect(result.isBot).toBe(false);
  });
});

describe('verifyWebhookSignature', () => {
  const ORIGINAL = process.env.PAYMONGO_WEBHOOK_SECRET;
  afterEach(() => { process.env.PAYMONGO_WEBHOOK_SECRET = ORIGINAL; });

  it('accepts a correctly-signed payload', () => {
    process.env.PAYMONGO_WEBHOOK_SECRET = 'whsec_test';
    const body = Buffer.from(JSON.stringify({ ok: true }));
    const t = '12345';
    const expected = crypto
      .createHmac('sha256', 'whsec_test')
      .update(`${t}.${body.toString()}`)
      .digest('hex');
    expect(verifyWebhookSignature(`t=${t},te=${expected}`, body)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    process.env.PAYMONGO_WEBHOOK_SECRET = 'whsec_test';
    const body = Buffer.from(JSON.stringify({ ok: true }));
    expect(verifyWebhookSignature('t=1,te=deadbeef', body)).toBe(false);
  });
});

describe('sanitizeSearch (PostgREST filter-injection guard)', () => {
  it('strips characters that could break out of the .or() expression', () => {
    expect(sanitizeSearch('a,workspace_id.neq.0')).not.toContain(',');
    expect(sanitizeSearch('x(y)')).toBe('xy');
    expect(sanitizeSearch('100%off')).toBe('100off');
    expect(sanitizeSearch('a\\b')).toBe('ab');
  });

  it('preserves a normal search term', () => {
    expect(sanitizeSearch('  John Doe  ')).toBe('John Doe');
  });

  it('caps length to 100 chars', () => {
    expect(sanitizeSearch('a'.repeat(500)).length).toBe(100);
  });

  it('handles nullish input', () => {
    expect(sanitizeSearch(undefined)).toBe('');
    expect(sanitizeSearch(null)).toBe('');
  });
});

describe('isForbiddenTarget (Nuclei SSRF guard)', () => {
  it('blocks localhost and private IP literals', () => {
    expect(securityRouter.isForbiddenTarget(new URL('http://localhost/admin'))).toBe(true);
    expect(securityRouter.isForbiddenTarget(new URL('http://127.0.0.1/api'))).toBe(true);
    expect(securityRouter.isForbiddenTarget(new URL('http://10.0.0.1/'))).toBe(true);
    expect(securityRouter.isForbiddenTarget(new URL('http://192.168.1.1/'))).toBe(true);
  });

  it('allows public targets', () => {
    expect(securityRouter.isForbiddenTarget(new URL('https://example.com/'))).toBe(false);
    expect(securityRouter.isForbiddenTarget(new URL('https://exponify.ph/'))).toBe(false);
  });
});
