'use strict';

// Part 2: password -> captcha -> MFA -> token state machine (Client#normalLogin), driven by a stubbed REST.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Client } = require('../src');

// A user-mode client whose network calls are stubbed: rest.post is replaced per-test, and login() is
// short-circuited to return its token so no real gateway connection happens.
function stubClient(post) {
  const client = new Client();
  client.login = async token => token;
  client.rest = { post };
  return client;
}

test('direct login returns the token and never touches MFA', async () => {
  const posts = [];
  const client = stubClient(async (route, opts) => {
    posts.push([route, opts]);
    return { token: 'DIRECT', mfa: false };
  });
  const token = await client.normalLogin('user@example.com', 'pw');
  assert.equal(token, 'DIRECT');
  assert.equal(posts.length, 1);
  assert.equal(posts[0][0], '/auth/login');
  assert.equal(posts[0][1].auth, false);
  assert.equal(posts[0][1].body.login, 'user@example.com');
});

test('MFA login redeems the ticket with the handler code', async () => {
  const posts = [];
  const client = stubClient(async (route, opts) => {
    posts.push([route, opts]);
    if (route === '/auth/login') return { mfa: true, ticket: 'TK', totp: true, login_instance_id: 'LI' };
    if (route === '/auth/mfa/totp') return { token: 'MFATOKEN' };
    throw new Error(`unexpected route ${route}`);
  });
  const token = await client.normalLogin('user@example.com', 'pw', {
    mfa: async ctx => {
      assert.equal(ctx.ticket, 'TK');
      assert.equal(ctx.totp, true);
      return { method: 'totp', code: '123456' };
    },
  });
  assert.equal(token, 'MFATOKEN');
  const mfaCall = posts.find(p => p[0] === '/auth/mfa/totp')[1];
  assert.equal(mfaCall.body.ticket, 'TK');
  assert.equal(mfaCall.body.code, '123456');
  assert.equal(mfaCall.body.login_instance_id, 'LI');
});

test('captcha challenge is solved via the handler and retried with the key header', async () => {
  const posts = [];
  let firstLogin = true;
  const client = stubClient(async (route, opts) => {
    posts.push([route, opts]);
    if (route === '/auth/login' && firstLogin) {
      firstLogin = false;
      throw Object.assign(new Error('captcha'), {
        rawError: { captcha_service: 'hcaptcha', captcha_sitekey: 'SK', captcha_rqtoken: 'RQ' },
      });
    }
    return { token: 'AFTERCAPTCHA', mfa: false };
  });
  const token = await client.normalLogin('user@example.com', 'pw', {
    captcha: async challenge => {
      assert.equal(challenge.captcha_sitekey, 'SK');
      return 'SOLVED';
    },
  });
  assert.equal(token, 'AFTERCAPTCHA');
  const retry = posts[1][1];
  assert.equal(retry.headers['x-captcha-key'], 'SOLVED');
  assert.equal(retry.headers['x-captcha-rqtoken'], 'RQ');
});

test('MFA without a handler throws MFARequired', async () => {
  const client = stubClient(async () => ({ mfa: true, ticket: 'TK', totp: true, sms: true }));
  await assert.rejects(() => client.normalLogin('user@example.com', 'pw'), /two-factor/i);
});

test('captcha without a handler throws CaptchaRequired', async () => {
  const client = stubClient(async () => {
    throw Object.assign(new Error('captcha'), { rawError: { captcha_service: 'hcaptcha' } });
  });
  await assert.rejects(() => client.normalLogin('user@example.com', 'pw'), /captcha/i);
});

test('a non-captcha login error (bad credentials) propagates unchanged', async () => {
  const client = stubClient(async () => {
    throw Object.assign(new Error('Invalid Form Body'), { rawError: { code: 50035, message: 'Invalid Form Body' } });
  });
  await assert.rejects(() => client.normalLogin('user@example.com', 'wrong'), /invalid form body/i);
});

test('an unsupported MFA method (e.g. webauthn) is rejected', async () => {
  const client = stubClient(async route => {
    if (route === '/auth/login') return { mfa: true, ticket: 'TK', webauthn: true };
    throw new Error(`unexpected route ${route}`);
  });
  await assert.rejects(
    () => client.normalLogin('user@example.com', 'pw', { mfa: async () => ({ method: 'webauthn', code: 'x' }) }),
    /mfa method/i,
  );
});

test('a totpSecret solves TOTP MFA automatically (no mfa handler)', async () => {
  const posts = [];
  const client = stubClient(async (route, opts) => {
    posts.push([route, opts]);
    if (route === '/auth/login') return { mfa: true, ticket: 'TK', totp: true, login_instance_id: 'LI' };
    if (route === '/auth/mfa/totp') return { token: 'MFATOKEN' };
    throw new Error(`unexpected route ${route}`);
  });
  // 32 base32 chars = 20 bytes, clearing otplib's >=16-byte guardrail
  const token = await client.normalLogin('user@example.com', 'pw', { totpSecret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' });
  assert.equal(token, 'MFATOKEN');
  const mfaCall = posts.find(p => p[0] === '/auth/mfa/totp')[1];
  assert.match(mfaCall.body.code, /^\d{6}$/); // a real generated TOTP code
  assert.equal(mfaCall.body.ticket, 'TK');
});
