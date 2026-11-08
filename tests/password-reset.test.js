const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createPasswordResetToken,
  hashPasswordResetToken
} = require('../src/utils/passwordReset');
const { isEmailConfigured, sendPasswordReset } = require('../src/services/email');

test('creates a random reset token and stores only its hash', () => {
  const first = createPasswordResetToken();
  const second = createPasswordResetToken();

  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, hashPasswordResetToken(first.token));
  assert.notEqual(first.token, first.tokenHash);
  assert.ok(first.expiresAt instanceof Date);
  assert.ok(first.expiresAt.getTime() > Date.now());
  assert.ok(first.expiresAt.getTime() <= Date.now() + 30 * 60 * 1000);
});

test('requires both Resend settings for password reset email', () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.MAIL_FROM;
  try {
    delete process.env.RESEND_API_KEY;
    process.env.MAIL_FROM = 'KeRRA <no-reply@example.org>';
    assert.equal(isEmailConfigured(), false);
    process.env.RESEND_API_KEY = 'test-api-key';
    assert.equal(isEmailConfigured(), true);
    delete process.env.MAIL_FROM;
    assert.equal(isEmailConfigured(), false);
  } finally {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.MAIL_FROM;
    else process.env.MAIL_FROM = originalFrom;
  }
});

test('sends staff reset links through Resend without exposing provider errors', async () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.MAIL_FROM;
  const originalFetch = global.fetch;
  let captured;
  process.env.RESEND_API_KEY = 'test-api-key';
  process.env.MAIL_FROM = 'KeRRA <no-reply@example.org>';
  global.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return { ok: true };
  };

  try {
    await sendPasswordReset('staff@example.org', 'https://example.org/login#resetToken=abc');
    assert.equal(captured.url, 'https://api.resend.com/emails');
    assert.equal(captured.options.headers.Authorization, 'Bearer test-api-key');
    assert.equal(captured.body.from, process.env.MAIL_FROM);
    assert.equal(captured.body.to, 'staff@example.org');
    assert.match(captured.body.text, /within 30 minutes/);
    assert.match(captured.body.text, /resetToken=abc/);

    global.fetch = async () => ({ ok: false, status: 503, text: async () => 'private provider detail' });
    await assert.rejects(sendPasswordReset('staff@example.org', 'https://example.org/reset'), {
      message: 'Resend API request failed (503).'
    });
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.MAIL_FROM;
    else process.env.MAIL_FROM = originalFrom;
  }
});
