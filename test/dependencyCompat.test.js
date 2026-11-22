'use strict';

// Guards the integration points that broke when @discordjs/collection and @discordjs/ws moved to v2.
const assert = require('node:assert/strict');
const { test } = require('node:test');
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
  client.on(Events.Debug, message => debug.push(message));
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

  await client.destroy();
});
