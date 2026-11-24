'use strict';

// Part 4: passkey login — WebAuthn assertion signing (ES256) and the conditional start -> finish flow.
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { test } = require('node:test');
const { generateKeyPairSync, createHash, verify } = require('node:crypto');
const { Client } = require('../src');
const { buildAssertion } = require('../src/client/Passkey');

function p256KeyValue() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return { publicKey, keyValue: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64url') };
}

test('buildAssertion signs an assertion that verifies against the public key', () => {
  const { publicKey, keyValue } = p256KeyValue();
  const assertion = JSON.parse(
    buildAssertion({ credentialId: 'b64.CRED', privateKey: keyValue, userHandle: 'UH' }, 'discord.com', 'CHALLENGE'),
  );

  assert.equal(assertion.id, 'CRED'); // `b64.` prefix stripped
  assert.equal(assertion.rawId, 'CRED');
  assert.equal(assertion.type, 'public-key');
  assert.equal(assertion.response.userHandle, 'UH');

  const clientData = JSON.parse(Buffer.from(assertion.response.clientDataJSON, 'base64url').toString());
  assert.equal(clientData.type, 'webauthn.get');
  assert.equal(clientData.challenge, 'CHALLENGE');
  assert.equal(clientData.origin, 'https://discord.com');

  const authData = Buffer.from(assertion.response.authenticatorData, 'base64url');
  assert.equal(authData.length, 37);
  assert.equal(authData[32], 0x1d); // flags: UP|UV|BE|BS
  assert.equal(authData.readUInt32BE(33), 0); // counter
  assert.ok(authData.subarray(0, 32).equals(createHash('sha256').update('discord.com').digest())); // rpIdHash

  // signature must verify over authData || sha256(clientDataJSON)
  const toVerify = Buffer.concat([
    authData,
    createHash('sha256').update(Buffer.from(assertion.response.clientDataJSON, 'base64url')).digest(),
  ]);
  assert.equal(verify('sha256', toVerify, publicKey, Buffer.from(assertion.response.signature, 'base64url')), true);
});

test('a Bitwarden GUID credentialId is sent as its 16 raw bytes', () => {
  const { keyValue } = p256KeyValue();
  // the GUID / raw-id pair from Bitwarden's own credential-id-utils.spec.ts
  const passkey = { credentialId: '08d70b74-e9f5-4522-a425-e5dcd40107e7', privateKey: keyValue, userHandle: 'UH' };
  const assertion = JSON.parse(buildAssertion(passkey, 'discord.com', 'CH'));
  assert.equal(assertion.id, 'CNcLdOn1RSKkJeXc1AEH5w');
  assert.equal(assertion.rawId, 'CNcLdOn1RSKkJeXc1AEH5w');
});

test('passkeyLogin runs conditional start -> finish and returns the token', async () => {
  const { keyValue } = p256KeyValue();
  const client = new Client();
  client.login = async token => token;
  const posts = [];
  client.rest = {
    post: async (route, opts) => {
      posts.push([route, opts]);
      if (route === '/auth/conditional/start') {
        return { challenge: JSON.stringify({ publicKey: { challenge: 'CH', rpId: 'discord.com' } }), ticket: 'TK' };
      }
      if (route === '/auth/conditional/finish') return { token: 'PKTOKEN' };
      throw new Error(`unexpected route ${route}`);
    },
  };

  const token = await client.passkeyLogin({ credentialId: 'b64.CRED', privateKey: keyValue, userHandle: 'UH' });
  assert.equal(token, 'PKTOKEN');
  const finish = posts.find(p => p[0] === '/auth/conditional/finish')[1];
  assert.equal(finish.auth, false);
  assert.equal(finish.body.ticket, 'TK');
  const credential = JSON.parse(finish.body.credential);
  assert.equal(credential.id, 'CRED');
  assert.equal(JSON.parse(Buffer.from(credential.response.clientDataJSON, 'base64url').toString()).challenge, 'CH');
});

test('passkeyLogin rejects with TokenInvalid instead of falling back to DISCORD_TOKEN when finish omits token', async t => {
  const prev = process.env.DISCORD_TOKEN;
  process.env.DISCORD_TOKEN = 'ENV.ACCOUNT.TOKEN';
  t.after(() => {
    if (prev === undefined) delete process.env.DISCORD_TOKEN;
    else process.env.DISCORD_TOKEN = prev;
  });
  const { keyValue } = p256KeyValue();
  const client = new Client();
  let loginCalled = false;
  client.login = async () => {
    loginCalled = true;
  };
  client.rest.post = async route =>
    route === '/auth/conditional/start'
      ? { challenge: JSON.stringify({ publicKey: { challenge: 'CH', rpId: 'discord.com' } }), ticket: 'TK' }
      : {};
  await assert.rejects(
    () => client.passkeyLogin({ credentialId: 'b64.CRED', privateKey: keyValue, userHandle: 'UH' }),
    { code: 'TokenInvalid' },
  );
  assert.equal(loginCalled, false);
  await client.destroy();
});
