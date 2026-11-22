'use strict';

// Part 0 "Step 2": the user-account gateway IDENTIFY matches the web client (capabilities + client_state, no shard).
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { GatewayOpcodes } = require('discord-api-types/v10');
const { applyUserIdentify, CAPABILITIES } = require('../src/util/UserProperties');
const { isUserIdentify } = require('../src/client/websocket/userIdentify');

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
