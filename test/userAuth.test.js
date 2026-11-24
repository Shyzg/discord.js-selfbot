'use strict';

// Part 0: user-account auth core — raw token scheme, web-client fingerprint, and intent-free IDENTIFY.
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { test } = require('node:test');
const { Client } = require('../src');
const UserProperties = require('../src/util/UserProperties');
const { createUserProperties, fixUserRequestHeaders, USER_AGENT } = UserProperties;

test('UserProperties exports no unused module-level singletons', () => {
  assert.equal('superProperties' in UserProperties, false);
  assert.equal('userHeaders' in UserProperties, false);
});

test('x-super-properties encodes the captured web-client build', () => {
  const { superProperties, userHeaders } = createUserProperties();
  const decoded = JSON.parse(Buffer.from(userHeaders['x-super-properties'], 'base64').toString());
  assert.equal(decoded.client_build_number, superProperties.client_build_number);
  assert.equal(decoded.browser, 'Chrome');
  assert.equal(typeof decoded.client_build_number, 'number');
});

test('super-properties carry distinct, valid per-launch UUIDs', () => {
  const { superProperties } = createUserProperties();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const ids = [
    superProperties.client_launch_id,
    superProperties.launch_signature,
    superProperties.client_heartbeat_session_id,
  ];
  for (const id of ids) assert.match(id, uuid);
  assert.equal(new Set(ids).size, 3); // distinct
  assert.equal(superProperties.has_client_mods, false); // full fingerprint present
});

test('launch_signature reports no client mods (its mod-detection bits are 0)', () => {
  const { superProperties } = createUserProperties();
  // The mask from the launch-signature pseudocode on docs.discord.food (discord.py-self uses the same one).
  const modBits =
    0b00000000100000000001000000010000000010000001000000001000000000000010000010000001000000000100000000000001000000000000100000000000n;
  assert.equal(BigInt(`0x${superProperties.launch_signature.replaceAll('-', '')}`) & modBits, 0n);
});

test('fixUserRequestHeaders strips the Bot scheme and spoofs the User-Agent', () => {
  const headers = { Authorization: 'Bot my.user.token', 'User-Agent': 'DiscordBot (discord.js)' };
  fixUserRequestHeaders(headers);
  assert.equal(headers.Authorization, 'my.user.token'); // raw user token, no scheme prefix
  assert.equal(headers['User-Agent'], USER_AGENT);
});

test('fixUserRequestHeaders leaves unauthenticated requests untouched', () => {
  const headers = { 'User-Agent': 'x' }; // auth:false requests carry no Authorization
  fixUserRequestHeaders(headers);
  assert.equal('Authorization' in headers, false);
});

test('a Client injects its own per-client web-client fingerprint into REST and needs no intents', () => {
  const clientA = new Client();
  const clientB = new Client();
  assert.equal(Number(clientA.options.intents.bitfield), 0); // empty but valid, so intents.has() still works
  const propsA = JSON.parse(Buffer.from(clientA.options.rest.headers['x-super-properties'], 'base64').toString());
  const propsB = JSON.parse(Buffer.from(clientB.options.rest.headers['x-super-properties'], 'base64').toString());
  const { superProperties } = createUserProperties();
  assert.equal(propsA.client_build_number, superProperties.client_build_number);
  assert.notEqual(propsA.client_launch_id, propsB.client_launch_id);
  assert.notEqual(propsA.launch_signature, propsB.launch_signature);
  assert.notEqual(propsA.client_heartbeat_session_id, propsB.client_heartbeat_session_id);
  // makeRequest is wrapped to fix the auth scheme + User-Agent, so it differs from the @discordjs/rest default
  assert.notEqual(clientA.options.rest.makeRequest, require('@discordjs/rest').DefaultRestOptions.makeRequest);
});

test('a Client constructs with no options (intents are no longer required)', () => {
  assert.doesNotThrow(() => new Client());
});
