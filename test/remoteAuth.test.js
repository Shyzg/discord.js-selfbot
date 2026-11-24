'use strict';

// Part 3: remote-auth (QR) handshake — RSA key proof, QR url, and token decryption, driven without a real socket.
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { test } = require('node:test');
const { setTimeout } = require('node:timers/promises');
const { createPublicKey, publicEncrypt, constants, randomBytes } = require('node:crypto');
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
  // docs.discord.food (remote auth, Nonce Proof): the decrypted nonce itself, base64url-encoded
  assert.equal(proof.nonce, nonce.toString('base64url'));

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

test('the socket closing right after pending_login does not fail the login', async t => {
  // Discord closes the remote-auth socket as soon as it sends pending_login, while the ticket exchange is in flight.
  const original = globalThis.WebSocket;
  t.after(() => {
    globalThis.WebSocket = original;
  });
  const sockets = [];
  globalThis.WebSocket = class extends EventTarget {
    constructor() {
      super();
      sockets.push(this);
    }
    send() {}
    close() {}
  };
  const client = userClient();
  const remote = new RemoteAuth(client);
  client.rest = {
    post: async () => {
      await setTimeout(20);
      return { encrypted_token: serverEncrypt(remote.encodedPublicKey, 'USER_TOKEN') };
    },
  };

  const login = remote.run({ onQRCode: () => {} });
  const [socket] = sockets;
  socket.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ op: 'pending_login', ticket: 'T' }) }));
  socket.dispatchEvent(new Event('close'));
  assert.equal(await login, 'USER_TOKEN');
});

test('a socket error during teardown after pending_login does not fail the login', async t => {
  const original = globalThis.WebSocket;
  t.after(() => {
    globalThis.WebSocket = original;
  });
  const sockets = [];
  globalThis.WebSocket = class extends EventTarget {
    constructor() {
      super();
      sockets.push(this);
    }
    send() {}
    close() {}
  };
  const client = userClient();
  const remote = new RemoteAuth(client);
  client.rest = {
    post: async () => {
      await setTimeout(20);
      return { encrypted_token: serverEncrypt(remote.encodedPublicKey, 'USER_TOKEN') };
    },
  };

  const login = remote.run({ onQRCode: () => {} });
  const [socket] = sockets;
  socket.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ op: 'pending_login', ticket: 'T' }) }));
  socket.dispatchEvent(new Event('error'));
  assert.equal(await login, 'USER_TOKEN');
});

test('an async onQRCode handler rejection fails run() cleanly', async t => {
  const original = globalThis.WebSocket;
  t.after(() => {
    globalThis.WebSocket = original;
  });
  const sockets = [];
  globalThis.WebSocket = class extends EventTarget {
    constructor() {
      super();
      sockets.push(this);
    }
    send() {}
    close() {}
  };
  const remote = new RemoteAuth(userClient());
  const login = remote.run({
    onQRCode: async () => {
      throw new Error('qr ui broke');
    },
  });
  sockets[0].dispatchEvent(
    new MessageEvent('message', { data: JSON.stringify({ op: 'pending_remote_init', fingerprint: 'FP' }) }),
  );
  await assert.rejects(login, /qr ui broke/);
});
