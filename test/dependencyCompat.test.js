'use strict';

// Guards the integration points that broke when @discordjs/collection and @discordjs/ws moved to v2.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { inspect } = require('node:util');
const {
  WebSocketManager: WSWebSocketManager,
  WebSocketShard: WSWebSocketShard,
  WebSocketShardEvents: WSEvents,
} = require('@discordjs/ws');
const { ChannelType, GatewayCloseCodes } = require('discord-api-types/v10');
const { Client, Collection, Events, Status } = require('../src');
const handlers = require('../src/client/websocket/handlers');
const WebSocketShard = require('../src/client/websocket/WebSocketShard');
const { discordSort } = require('../src/util/Util');

test('discordSort works with @discordjs/collection v2', () => {
  const roles = new Collection([
    ['2', { id: '2', rawPosition: 1 }],
    ['1', { id: '1', rawPosition: 0 }],
  ]);
  assert.deepEqual([...discordSort(roles).keys()], ['1', '2']);
});

test('WebSocketManager understands @discordjs/ws v2 event arguments', async () => {
  const client = new Client({ intents: [] });
  const manager = client.ws;
  // A real, never-connected manager: its constructor makes no network calls.
  manager._ws = new WSWebSocketManager({ token: 'not-a-real-token', intents: 0, rest: client.rest });
  manager.attachEvents();
  const shard = new WebSocketShard(manager, 0);
  manager.shards.set(0, shard);

  const debug = [];
  const raw = [];
  const disconnects = [];
  const errors = [];
  const reconnecting = [];
  client.on(Events.Debug, message => debug.push(message));
  client.on(Events.ShardReconnecting, shardId => reconnecting.push(shardId));
  client.on(Events.Raw, (packet, shardId) => raw.push([packet.t, shardId]));
  client.on(Events.ShardDisconnect, (event, shardId) => disconnects.push([event.code, shardId]));
  client.on(Events.ShardError, (error, shardId) => errors.push([error.message, shardId]));

  manager._ws.emit(WSEvents.Debug, 'hello from ws', 0);
  assert.ok(debug.includes('[WS => Shard 0] hello from ws'));

  manager._ws.emit(WSEvents.Dispatch, { op: 0, t: 'TYPING_START', d: {}, s: 1 }, 0);
  assert.deepEqual(raw, [['TYPING_START', 0]]);

  manager._ws.emit(WSEvents.Hello, 0);
  assert.equal(shard.status, Status.Identifying);

  manager._ws.emit(WSEvents.Ready, { guilds: [] }, 0);
  assert.equal(shard.status, Status.WaitingForGuilds);

  manager._ws.emit(WSEvents.Resumed, 0);
  assert.equal(shard.status, Status.Ready);

  manager._ws.emit(WSEvents.HeartbeatComplete, { ackAt: 2, heartbeatAt: 1, latency: 42 }, 0);
  assert.equal(shard.ping, 42);

  manager._ws.emit(WSEvents.Closed, GatewayCloseCodes.AuthenticationFailed, 0);
  assert.deepEqual(disconnects, [[GatewayCloseCodes.AuthenticationFailed, 0]]);

  manager._ws.emit(WSEvents.Error, new Error('shard failure'), 0);
  manager._ws.emit(WSEvents.SocketError, new Error('socket failure'), 0);
  assert.deepEqual(errors, [
    ['shard failure', 0],
    ['socket failure', 0],
  ]);

  // ws v2 still dispatches RESUMED when client.destroy() cleared the session mid-resume.
  shard.sessionInfo = null;
  assert.doesNotThrow(() => manager._ws.emit(WSEvents.Dispatch, { op: 0, t: 'RESUMED', d: {}, s: 2 }, 0));

  // client.destroy() closes with code 1000; that is a shutdown, not a reconnect.
  const ws = manager._ws;
  await client.destroy();
  ws.emit(WSEvents.Closed, 1000, 0);
  assert.equal(shard.status, Status.Disconnected);
  assert.deepEqual(reconnecting, []);
});

test('WebSocketManager keeps the token out of inspect output and releases it on destroy', async t => {
  const token = 'FAKE.TOKEN.VALUE';
  const client = new Client({ intents: [] });
  client.token = token;
  // connect() stops where @discordjs/ws would open the socket
  t.mock.method(WSWebSocketManager.prototype, 'connect', () => Promise.reject(new Error('offline')));
  await assert.rejects(client.ws.connect(), /offline/);
  assert.equal(client.ws._ws.token, token);
  assert.ok(!inspect(client.ws, { depth: 4 }).includes(token));

  await client.destroy();
  assert.equal(client.ws._ws, null);

  // Logging in again after destroy() starts from a clean, non-destroyed manager.
  client.token = token;
  await assert.rejects(client.ws.connect(), /offline/);
  assert.equal(client.ws.destroyed, false);
  await client.destroy();
});

test('re-logging in after destroy() clears old session info and emits clientReady again', async t => {
  const client = new Client();
  t.mock.method(WSWebSocketManager.prototype, 'connect', async () => {});
  let readyCount = 0;
  client.on(Events.ClientReady, () => readyCount++);

  client.token = 'TOKEN.ONE.AAA';
  await client.ws.connect();
  client.ws.shards.get(0).sessionInfo = { sessionId: 'OLD_SESSION', sequence: 99 };
  client.ws.shards.get(0).onReadyPacket({ guilds: [] });
  client.ws.shards.get(0).checkReady();
  assert.equal(readyCount, 1);
  assert.ok(client.readyTimestamp);

  await client.destroy();
  assert.equal(client.readyTimestamp, null);
  assert.equal(client.ws.status, Status.Idle);
  assert.equal(client.ws.shards.get(0).sessionInfo, null);

  client.token = 'TOKEN.TWO.BBB';
  await client.ws.connect();
  assert.equal(client.ws._ws.options.retrieveSessionInfo(0), null);
  client.ws.shards.get(0).onReadyPacket({ guilds: [] });
  client.ws.shards.get(0).checkReady();
  assert.equal(readyCount, 2);
  await client.destroy();
});

test('connect() never requests the bot-only /gateway/bot, and targets the web client gateway', async t => {
  const client = new Client();
  client.token = 'FAKE.TOKEN.VALUE';
  const routes = [];
  client.rest.get = async route => {
    routes.push(route);
    throw new Error('unexpected REST call');
  };
  let gateway;
  t.mock.method(WSWebSocketManager.prototype, 'connect', async function connect() {
    gateway = await this.fetchGatewayInformation();
  });

  await client.ws.connect();
  assert.deepEqual(routes, []);
  assert.equal(gateway.url, 'wss://gateway.discord.gg');
  assert.equal(client.ws.gateway, 'wss://gateway.discord.gg/');
  await client.destroy();
});

test('a gateway authentication failure (close 4004) rejects connect() with TokenInvalid', async t => {
  // Take the error from a real @discordjs/ws shard, so the message the mapping relies on stays pinned.
  const wsShard = new WSWebSocketShard({ options: {} }, 0);
  let authError;
  wsShard.on(WSEvents.Error, error => (authError = error));
  await wsShard.onClose(GatewayCloseCodes.AuthenticationFailed);
  assert.ok(authError);

  const client = new Client();
  client.token = 'FAKE.TOKEN.VALUE';
  t.mock.method(WSWebSocketManager.prototype, 'connect', () => Promise.reject(authError));
  await assert.rejects(client.ws.connect(), { code: 'TokenInvalid' });
  await client.destroy();
});

test('re-logging in with a differing token without destroy() resets session state and emits clientReady', async t => {
  const client = new Client();
  t.mock.method(WSWebSocketManager.prototype, 'connect', async () => {});
  let readyCount = 0;
  client.on(Events.ClientReady, () => readyCount++);

  client.token = 'TOKEN.ONE.AAA';
  await client.ws.connect();
  client.ws.shards.get(0).sessionInfo = { sessionId: 'OLD_SESSION', sequence: 42 };
  client.ws.shards.get(0).onReadyPacket({ guilds: [] });
  client.ws.shards.get(0).checkReady();
  assert.equal(readyCount, 1);

  // Switch token directly without calling client.destroy() first
  client.token = 'TOKEN.TWO.BBB';
  await client.ws.connect();
  assert.equal(client.ws.destroyed, false);
  assert.equal(client.ws.status, Status.Idle);
  assert.equal(client.readyTimestamp, null);
  assert.equal(client.ws._ws.options.retrieveSessionInfo(0), null);
  client.ws.shards.get(0).onReadyPacket({ guilds: [] });
  client.ws.shards.get(0).checkReady();
  assert.equal(readyCount, 2);
  await client.destroy();
});

test('switching accounts through READY clears old user ID, guilds, DMs, and users cache', async t => {
  const client = new Client();
  t.mock.method(WSWebSocketManager.prototype, 'connect', async () => {});

  const readyPayload = (userId, username, guildId, dmId) => ({
    d: {
      user: { id: userId, username, discriminator: '0' },
      users: [{ id: `${userId}9`, username: `friend-${userId}` }],
      private_channels: [{ id: dmId, type: ChannelType.DM, recipient_ids: [`${userId}9`] }],
      guilds: [
        {
          id: guildId,
          properties: { name: `Guild-${guildId}`, owner_id: userId },
          members: [{ user: { id: userId, username }, roles: [] }],
          channels: [],
          roles: [],
          emojis: [],
        },
      ],
    },
  });

  const dispatchReady = (userId, username, guildId, dmId) => {
    const payload = readyPayload(userId, username, guildId, dmId);
    const shard = client.ws.shards.get(0);
    shard.onReadyPacket(payload.d);
    handlers.READY(client, payload, shard);
  };

  // Login as Account A
  await client.login('TOKEN.ONE.AAA');
  dispatchReady('111', 'alice', '10', '900');
  assert.equal(client.user.id, '111');
  assert.equal(client.user.username, 'alice');
  assert.ok(client.guilds.cache.has('10'));
  assert.ok(client.channels.cache.has('900'));

  // Destroy then login as Account B
  await client.destroy();
  assert.equal(client.user, null);
  assert.equal(client.guilds.cache.size, 0);
  assert.equal(client.channels.cache.size, 0);
  assert.equal(client.users.cache.size, 0);

  await client.login('TOKEN.TWO.BBB');
  dispatchReady('999', 'bob', '20', '901');
  assert.equal(client.user.id, '999');
  assert.equal(client.user.username, 'bob');
  assert.equal(client.guilds.cache.has('10'), false);
  assert.equal(client.channels.cache.has('900'), false);
  assert.equal(client.users.cache.has('111'), false);
  assert.equal(client.guilds.cache.get('20')?.members.me?.id, '999');

  // Switch directly to Account C without calling destroy() first
  await client.login('TOKEN.THREE.CCC');
  dispatchReady('777', 'carol', '30', '902');
  assert.equal(client.user.id, '777');
  assert.equal(client.user.username, 'carol');
  assert.equal(client.guilds.cache.has('20'), false);
  assert.equal(client.channels.cache.has('901'), false);
  assert.equal(client.users.cache.has('999'), false);
  assert.equal(client.guilds.cache.get('30')?.members.me?.id, '777');

  await client.destroy();
});

test('retrying login() after a failed login or destroy() restarts cache and REST sweepers', async t => {
  const client = new Client();
  let failOnce = true;
  t.mock.method(WSWebSocketManager.prototype, 'connect', async () => {
    if (failOnce) {
      failOnce = false;
      throw new Error('temporary network error');
    }
  });

  await assert.rejects(() => client.login('TOKEN.RETRY.AAA'), /temporary network error/);
  assert.equal(client.sweepers.intervals.threads, null);

  await client.login('TOKEN.RETRY.AAA');
  assert.ok(client.sweepers.intervals.threads);
  assert.equal(client.sweepers.intervals.threads._destroyed, false);
  assert.equal(client.rest.hashTimer._destroyed, false);
  assert.equal(client.rest.handlerTimer._destroyed, false);

  await client.destroy();
  assert.equal(client.sweepers.intervals.threads, null);
});
