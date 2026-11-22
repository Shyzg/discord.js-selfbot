'use strict';

// Part 3: remote-auth (QR) handshake — RSA key proof, QR url, and token decryption, driven without a real socket.
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { test } = require('node:test');
const { createPublicKey, publicEncrypt, createHash, constants, randomBytes } = require('node:crypto');
const { Client } = require('../src');
const RemoteAuth = require('../src/client/RemoteAuth');

// Stands in for Discord: encrypts to the client's advertised public key with RSA-OAEP(SHA-256).
function serverEncrypt(encodedPublicKey, data) {
  const key = createPublicKey({ key: Buffer.from(encodedPublicKey, 'base64'), format: 'der', type: 'spki' });
  return publicEncrypt(
    { key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(data),
  ).toString('base64');
}

function userClient() {
  return new Client();
}

test('handshake: init, nonce proof, QR url, and token decryption', async () => {
  const client = userClient();
  const remote = new RemoteAuth(client);
  const sent = [];
  remote.ws = { send: payload => sent.push(JSON.parse(payload)), close: () => {} };
  const ctx = {
    resolve: () => {},
    fail: reason => {
      throw new Error(reason);
    },
  };

  await remote._handle({ op: 'hello', heartbeat_interval: 1e9 }, ctx);
  remote.destroy(); // stop the heartbeat timer so the test process can exit
  assert.equal(sent[0].op, 'init');
  assert.equal(sent[0].encoded_public_key, remote.encodedPublicKey);

  const nonce = randomBytes(32);
  await remote._handle({ op: 'nonce_proof', encrypted_nonce: serverEncrypt(remote.encodedPublicKey, nonce) }, ctx);
  const proof = sent.find(s => s.op === 'nonce_proof');
  assert.equal(proof.nonce, createHash('sha256').update(nonce).digest('base64url'));

  let qrUrl;
  await remote._handle({ op: 'pending_remote_init', fingerprint: 'FP123' }, { ...ctx, onQRCode: url => (qrUrl = url) });
  assert.equal(qrUrl, 'https://discord.com/ra/FP123');

  client.rest = {
    post: async (route, opts) => {
      assert.equal(route, '/users/@me/remote-auth/login');
      assert.equal(opts.auth, false);
      assert.equal(opts.body.ticket, 'TICKET');
      return { encrypted_token: serverEncrypt(remote.encodedPublicKey, 'USER_TOKEN') };
    },
  };
  let token;
  await remote._handle({ op: 'pending_login', ticket: 'TICKET' }, { ...ctx, resolve: value => (token = value) });
  assert.equal(token, 'USER_TOKEN');
});

test('pending_ticket decrypts the account preview', async () => {
  const remote = new RemoteAuth(userClient());
  remote.ws = { send: () => {}, close: () => {} };
  let user;
  await remote._handle(
    {
      op: 'pending_ticket',
      encrypted_user_payload: serverEncrypt(remote.encodedPublicKey, '123456789:0:avatarhash:cooluser'),
    },
    { onUserData: value => (user = value), resolve: () => {}, fail: () => {} },
  );
  assert.equal(user.id, '123456789');
  assert.equal(user.username, 'cooluser');
});

test('a cancel op fails the handshake', async () => {
  const remote = new RemoteAuth(userClient());
  remote.ws = { send: () => {}, close: () => {} };
  await assert.rejects(
    () =>
      remote._handle(
        { op: 'cancel' },
        {
          resolve: () => {},
          fail: reason => {
            throw new Error(reason);
          },
        },
      ),
    /cancel/i,
  );
});

test('pending_remote_init renders a QR to the terminal when no onQRCode handler is given', async () => {
  const remote = new RemoteAuth(userClient());
  remote.ws = { send: () => {}, close: () => {} };
  const logs = [];
  const original = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    await remote._handle({ op: 'pending_remote_init', fingerprint: 'FP' }, { resolve: () => {}, fail: () => {} });
  } finally {
    console.log = original;
  }
  assert.equal(logs.length, 1);
  assert.match(logs[0], /discord\.com\/ra\/FP/); // the url is printed next to the rendered QR
});
