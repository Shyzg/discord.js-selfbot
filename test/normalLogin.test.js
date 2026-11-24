'use strict';

// Part 2: password -> captcha -> MFA -> token state machine (Client#normalLogin), driven by a stubbed REST.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { inspect } = require('node:util');
const { DiscordAPIError } = require('@discordjs/rest');
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
  // 16 base32 chars = 10 bytes: a real Discord-length 2FA secret, below otplib's default 16-byte guardrail
  const token = await client.normalLogin('user@example.com', 'pw', { totpSecret: 'JBSWY3DPEHPK3PXP' });
  assert.equal(token, 'MFATOKEN');
  const mfaCall = posts.find(p => p[0] === '/auth/mfa/totp')[1];
  assert.match(mfaCall.body.code, /^\d{6}$/); // a real generated TOTP code
  assert.equal(mfaCall.body.ticket, 'TK');
});

test('a totpSecret pasted in groups of four (with spaces) still works', async () => {
  const client = stubClient(async route => {
    if (route === '/auth/login') return { mfa: true, ticket: 'TK', totp: true };
    if (route === '/auth/mfa/totp') return { token: 'MFATOKEN' };
    throw new Error(`unexpected route ${route}`);
  });
  const token = await client.normalLogin('user@example.com', 'pw', { totpSecret: 'JBSW Y3DP EHPK 3PXP' });
  assert.equal(token, 'MFATOKEN');
});

test('a rejected login never carries the password in its error (captcha retry path)', async () => {
  let firstLogin = true;
  const client = stubClient(async (route, opts) => {
    if (firstLogin) {
      firstLogin = false;
      throw Object.assign(new Error('captcha'), { rawError: { captcha_service: 'hcaptcha', captcha_rqtoken: 'RQ' } });
    }
    // what @discordjs/rest throws for a 400: the request body rides along on the error
    throw new DiscordAPIError({ message: 'Invalid Form Body', code: 50035 }, 50035, 400, 'POST', route, {
      body: opts.body,
    });
  });
  const error = await client
    .normalLogin('user@example.com', 'hunter2-secret', { captcha: async () => 'SOLVED' })
    .catch(err => err);
  assert.ok(error instanceof DiscordAPIError);
  assert.ok(!inspect(error).includes('hunter2-secret'));
});

test('captcha retry omits x-captcha-rqtoken when the challenge has none', async () => {
  let retryHeaders;
  let first = true;
  const client = stubClient(async (_route, opts) => {
    if (first) {
      first = false;
      throw Object.assign(new Error('captcha'), { rawError: { captcha_service: 'hcaptcha' } });
    }
    retryHeaders = opts.headers;
    return { token: 'OK', mfa: false };
  });
  await client.normalLogin('user@example.com', 'pw', { captcha: async () => 'SOLVED' });
  assert.equal(retryHeaders['x-captcha-key'], 'SOLVED');
  assert.equal('x-captcha-rqtoken' in retryHeaders, false);
});

test('a rejected MFA submission strips the ticket and code from its error', async () => {
  const client = stubClient(async (route, opts) => {
    if (route === '/auth/login') return { mfa: true, ticket: 'SECRET-MFA-TICKET', totp: true };
    throw new DiscordAPIError({ message: 'Invalid two-factor code', code: 60008 }, 60008, 400, 'POST', route, {
      body: opts.body,
    });
  });
  const error = await client
    .normalLogin('user@example.com', 'pw', { mfa: async () => ({ method: 'totp', code: '999999' }) })
    .catch(err => err);
  assert.ok(error instanceof DiscordAPIError);
  assert.ok(!inspect(error).includes('SECRET-MFA-TICKET'));
  assert.ok(!inspect(error).includes('999999'));
});

test('normalLogin fails with TokenInvalid instead of falling back to DISCORD_TOKEN when no token returns', async t => {
  const prev = process.env.DISCORD_TOKEN;
  process.env.DISCORD_TOKEN = 'ENV.ACCOUNT.TOKEN';
  t.after(() => {
    if (prev === undefined) delete process.env.DISCORD_TOKEN;
    else process.env.DISCORD_TOKEN = prev;
  });
  const client = new Client();
  let loginCalled = false;
  client.login = async () => {
    loginCalled = true;
  };
  client.rest.post = async () => ({ mfa: false, suspended_user_token: 'S' });
  await assert.rejects(() => client.normalLogin('user@example.com', 'pw'), { code: 'TokenInvalid' });
  assert.equal(loginCalled, false);
  await client.destroy();
});

test('_censoredToken masks mfa.* user tokens, 3-part tokens, and bare tokens', () => {
  const client = new Client();
  client.token = 'mfa.SuperSecretUserToken';
  assert.equal(client._censoredToken, 'mfa.********************');

  client.token = 'userId.timestamp.hmacSecret';
  assert.equal(client._censoredToken, 'userId.timestamp.**********');

  client.token = 'baresecret';
  assert.equal(client._censoredToken, '**********');
});
