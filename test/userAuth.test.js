'use strict';

// Part 0: user-account auth core — raw token scheme, web-client fingerprint, and intent-free IDENTIFY.
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { test } = require('node:test');
const { Client } = require('../src');
const { superProperties, userHeaders, fixUserRequestHeaders, USER_AGENT } = require('../src/util/UserProperties');

test('x-super-properties encodes the captured web-client build', () => {
  const decoded = JSON.parse(Buffer.from(userHeaders['x-super-properties'], 'base64').toString());
  assert.equal(decoded.client_build_number, superProperties.client_build_number);
  assert.equal(decoded.browser, 'Chrome');
  assert.equal(typeof decoded.client_build_number, 'number');
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

test('a Client injects the web-client fingerprint into REST and needs no intents', () => {
  const client = new Client();
  assert.equal(Number(client.options.intents.bitfield), 0); // empty but valid, so intents.has() still works
  assert.equal(client.options.rest.headers['x-super-properties'], userHeaders['x-super-properties']);
  // makeRequest is wrapped to fix the auth scheme + User-Agent, so it differs from the @discordjs/rest default
  assert.notEqual(client.options.rest.makeRequest, require('@discordjs/rest').DefaultRestOptions.makeRequest);
});

test('a Client constructs with no options (intents are no longer required)', () => {
  assert.doesNotThrow(() => new Client());
});
