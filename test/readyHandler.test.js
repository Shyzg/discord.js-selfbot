'use strict';

// A user-account READY payload has no `application` (that field is bot-only); the handler must not crash on it.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Client } = require('../src');
const WebSocketShard = require('../src/client/websocket/WebSocketShard');
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

test('READY caches your own member from merged_members, so guild.members.me is set', () => {
  const client = new Client();
  const shard = { id: 0, checkReady: () => {} };
  const data = {
    user: { id: '1', username: 'u', discriminator: '0', global_name: 'U', avatar: null, bot: false },
    guilds: [{ id: '10', properties: { name: 'G' } }],
    // a user READY collapses members into one array per guild, with `user_id` in place of `user`
    merged_members: [[{ user_id: '1', roles: [], nick: 'me' }]],
  };
  readyHandler(client, { d: data }, shard);
  const me = client.guilds.cache.get('10').members.me;
  assert.equal(me?.id, '1');
  assert.equal(me.nickname, 'me');
});

test('a user READY (full guilds) waits only for the unavailable stubs', () => {
  const client = new Client();
  const shard = new WebSocketShard(client.ws, 0);
  shard.onReadyPacket({
    guilds: [
      { id: '10', properties: { name: 'G' } },
      { id: '11', unavailable: true },
    ],
  });
  assert.deepEqual([...shard.expectedGuilds], ['11']);
});
