'use strict';

// A user-account READY payload has no `application` (that field is bot-only); the handler must not crash on it.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Client } = require('../src');
const readyHandler = require('../src/client/websocket/handlers/READY');

test('READY handler tolerates a user payload with no application field', () => {
  const client = new Client();
  const shard = { id: 0, checkReady: () => {} };
  const data = {
    user: { id: '1', username: 'u', discriminator: '0', global_name: 'U', avatar: null, bot: false },
    guilds: [],
  };
  assert.doesNotThrow(() => readyHandler(client, { d: data }, shard));
  assert.equal(client.user.id, '1');
  assert.equal(client.application, null); // user accounts have no application
});
