'use strict';

// Part 0 "Step 2": the user-account gateway IDENTIFY matches the web client (capabilities + client_state, no shard).
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { setImmediate } = require('node:timers/promises');
const { WebSocketShard, WebSocketShardEvents } = require('@discordjs/ws');
const { GatewayOpcodes } = require('discord-api-types/v10');
const { Client } = require('../src');
const ClientUser = require('../src/structures/ClientUser');
const { applyUserIdentify, CAPABILITIES, createUserProperties } = require('../src/util/UserProperties');
const {
  isUserIdentify,
  patchUserIdentify,
  registerUserClient,
  TOO_MANY_SESSIONS_CLOSE_CODE,
} = require('../src/client/websocket/userIdentify');

test('CAPABILITIES keeps cleared the bits whose events this library cannot apply correctly', () => {
  // AUTH_TOKEN_REFRESH, DEBOUNCE_MESSAGE_REACTIONS, PASSIVE_GUILD_UPDATE_V2, CHANNEL_OBFUSCATION
  for (const bit of [8, 13, 14, 15]) assert.equal(CAPABILITIES & (1 << bit), 0, `bit ${bit} must stay cleared`);
});

test('a real @discordjs/ws shard sends the patched IDENTIFY (fails if ws internals change)', async () => {
  patchUserIdentify();
  const { superProperties } = createUserProperties();
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

test('Client#login defaults IDENTIFY presence to web-client unknown/since:0 without mutating options.presence', async () => {
  const defaultClient = new Client();
  assert.deepEqual(defaultClient.options.presence, {});
  defaultClient.ws.connect = async () => {};
  await defaultClient.login('token');
  assert.deepEqual(defaultClient.options.ws.presence, {
    activities: [],
    status: 'unknown',
    since: 0,
    afk: false,
  });

  const customClient = new Client({ presence: { status: 'dnd' } });
  customClient.ws.connect = async () => {};
  await customClient.login('token');
  assert.deepEqual(customClient.options.ws.presence, {
    activities: [],
    status: 'dnd',
    since: 0,
    afk: false,
  });
});

test('setActivity/setAFK keep the unknown status instead of switching the account online', async () => {
  const client = new Client();
  client.user = new ClientUser(client, { id: '1', username: 'me' });
  const statuses = [];
  client.ws.broadcast = packet => statuses.push(packet.d.status);

  client.user.setActivity('Spotify');
  client.user.setAFK(true);
  assert.deepEqual(statuses, ['unknown', 'unknown']);

  // A status the caller picked sticks for later activity changes.
  client.user.setStatus('idle');
  client.user.setActivity('Spotify');
  assert.deepEqual(statuses.slice(2), ['idle', 'idle']);

  // A presence option without a status identifies as unknown as well.
  const activityClient = new Client({ presence: { activities: [{ name: 'Spotify' }] } });
  activityClient.ws.connect = async () => {};
  await activityClient.login('token');
  assert.equal(activityClient.options.ws.presence.status, 'unknown');
  assert.equal(activityClient.options.ws.presence.activities[0].name, 'Spotify');

  await client.destroy();
  await activityClient.destroy();
});

test('user shard stops reconnecting on close code 4015 (Too Many Sessions)', async () => {
  patchUserIdentify();
  const { superProperties } = createUserProperties();
  const shard = new WebSocketShard(
    {
      options: {
        token: 'T',
        identifyProperties: superProperties,
        intents: undefined,
        shardCount: 1,
        compression: null,
      },
      updateSessionInfo: async () => {},
    },
    0,
  );
  const events = [];
  let destroyOptions;
  shard.on(WebSocketShardEvents.Closed, code => events.push(['closed', code]));
  shard.on(WebSocketShardEvents.Error, err => events.push(['error', err.message]));
  shard.destroy = async options => {
    destroyOptions = options;
  };

  await shard.onClose(TOO_MANY_SESSIONS_CLOSE_CODE);
  assert.deepEqual(events, [
    ['closed', 4015],
    ['error', 'Too many sessions'],
  ]);
  assert.deepEqual(destroyOptions, { code: 4015 });
  assert.equal('recover' in destroyOptions, false);
});

test('user shard sends rotated client.token on IDENTIFY and RESUME after token update', async () => {
  patchUserIdentify();
  const client = new Client();
  client.token = 'INITIAL_TOKEN';
  const { superProperties } = client._userProperties;
  registerUserClient(superProperties, client);

  const strategy = {
    options: {
      token: 'INITIAL_TOKEN',
      identifyProperties: superProperties,
      intents: undefined,
      shardCount: 1,
      compression: null,
    },
    waitForIdentify: async () => {},
  };
  const shard = new WebSocketShard(strategy, 0);
  const sent = [];
  shard.connection = { send: data => sent.push(JSON.parse(data)), readyState: 1 };

  // Rotate token (as ClientUser#_patch does after setUsername) without re-creating @discordjs/ws
  client.token = 'ROTATED_TOKEN';
  await shard.send({ op: GatewayOpcodes.Identify, d: { token: 'INITIAL_TOKEN', properties: superProperties } });
  await shard.send({ op: GatewayOpcodes.Resume, d: { token: 'INITIAL_TOKEN', session_id: 's1', seq: 42 } });

  assert.equal(sent[0].d.token, 'ROTATED_TOKEN');
  assert.equal(sent[1].d.token, 'ROTATED_TOKEN');
  await client.destroy();
});
