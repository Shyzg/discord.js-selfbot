'use strict';

// Part 0 "Step 2": the user-account gateway IDENTIFY matches the web client (capabilities + client_state, no shard).
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { setImmediate } = require('node:timers/promises');
const { WebSocketShard } = require('@discordjs/ws');
const { GatewayOpcodes } = require('discord-api-types/v10');
const { applyUserIdentify, CAPABILITIES, superProperties } = require('../src/util/UserProperties');
const { isUserIdentify, patchUserIdentify } = require('../src/client/websocket/userIdentify');

test('CAPABILITIES keeps cleared the bits whose events this library has no handler for', () => {
  // AUTH_TOKEN_REFRESH, DEBOUNCE_MESSAGE_REACTIONS, PASSIVE_GUILD_UPDATE_V2
  for (const bit of [8, 13, 14]) assert.equal(CAPABILITIES & (1 << bit), 0, `bit ${bit} must stay cleared`);
});

test('a real @discordjs/ws shard sends the patched IDENTIFY (fails if ws internals change)', async () => {
  patchUserIdentify();
  const strategy = {
    options: { token: 'T', identifyProperties: superProperties, intents: undefined, shardCount: 1, compression: null },
    waitForIdentify: async () => {},
  };
  const shard = new WebSocketShard(strategy, 0);
  const sent = [];
  shard.connection = { send: data => sent.push(JSON.parse(data)), readyState: 1 };

  shard.identify(); // resolves only after READY; only the frame it sends first matters here
  for (let tick = 0; tick < 10 && !sent.length; tick++) await setImmediate();
  shard.emit('ready'); // let identify() finish

  assert.equal(sent.length, 1);
  assert.equal(sent[0].op, GatewayOpcodes.Identify);
  assert.equal(sent[0].d.capabilities, CAPABILITIES);
  assert.equal('shard' in sent[0].d, false);
  assert.equal(sent[0].d.properties.browser, 'Chrome');
});

test('applyUserIdentify rewrites the IDENTIFY to match the web client', () => {
  // the shape @discordjs/ws builds for a user shard (intents undefined -> dropped by JSON.stringify)
  const d = { token: 'T', properties: { browser: 'Chrome' }, compress: false, shard: [0, 1] };
  applyUserIdentify(d);
  assert.equal(d.capabilities, CAPABILITIES);
  assert.deepEqual(d.client_state, { guild_versions: {} });
  assert.equal('shard' in d, false); // bot-only field removed
  assert.equal(d.properties.browser, 'Chrome'); // untouched
});

test('isUserIdentify fires only for a user-mode IDENTIFY', () => {
  const identify = { op: GatewayOpcodes.Identify, d: {} };
  // user mode: no intents, web-client properties present
  assert.equal(isUserIdentify(identify, { intents: undefined, identifyProperties: { browser: 'Chrome' } }), true);
  // bot mode: intents set, no identifyProperties
  assert.equal(isUserIdentify(identify, { intents: 0, identifyProperties: undefined }), false);
  // not an IDENTIFY
  assert.equal(
    isUserIdentify({ op: GatewayOpcodes.Heartbeat, d: {} }, { intents: undefined, identifyProperties: {} }),
    false,
  );
});
