'use strict';

// Guards the integration points that broke when @discordjs/collection and @discordjs/ws moved to v2.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { inspect } = require('node:util');
const { WebSocketManager: WSWebSocketManager, WebSocketShardEvents: WSEvents } = require('@discordjs/ws');
const { GatewayCloseCodes } = require('discord-api-types/v10');
const { Client, Collection, Events, Status } = require('../src');
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

test('WebSocketManager keeps the token out of inspect output and releases it on destroy', async () => {
  const token = 'FAKE.TOKEN.VALUE';
  const client = new Client({ intents: [] });
  client.token = token;
  client.rest.get = () => Promise.reject(new Error('offline')); // connect() stops at the gateway fetch
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
