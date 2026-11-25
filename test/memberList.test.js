'use strict';

// op-37 member-list fetch: collects members from GUILD_MEMBER_LIST_UPDATE ops (skipping group headers).
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { GatewayOpcodes, PermissionFlagsBits } = require('discord-api-types/v10');
const { Client } = require('../src');
const Events = require('../src/util/Events');

test('fetchMemberList collects members from the gateway member list via op 37', async () => {
  const client = new Client();
  const sent = [];
  client.ws.shards.set(0, { send: payload => sent.push(payload) });
  const guild = client.guilds._add({ id: '1', member_count: 2, properties: { name: 'G' } });
  guild.shardId = 0;

  const promise = guild.members.fetchMemberList('123456789012345678', { limit: 2, time: 2000 });

  // the op-37 Guild Subscriptions Bulk request was sent to the gateway
  assert.equal(sent[0]?.op, 37);
  assert.deepEqual(sent[0]?.d?.subscriptions?.['1']?.channels?.['123456789012345678'], [[0, 99]]);

  // simulate the gateway member-list response (members + a group header that must be skipped)
  client.emit(Events.Raw, {
    t: 'GUILD_MEMBER_LIST_UPDATE',
    d: {
      guild_id: '1',
      ops: [
        {
          op: 'SYNC',
          items: [
            { member: { user: { id: 'u1', username: 'alice' }, roles: [] } },
            { group: { id: 'online', count: 2 } },
            { member: { user: { id: 'u2', username: 'bob' }, roles: [] } },
          ],
        },
      ],
    },
  });

  const members = await promise;
  assert.equal(members.size, 2);
  assert.ok(members.has('u1') && members.has('u2'));
  assert.equal(guild.members.cache.size, 2); // also populated the cache

  // Caps collected members at limit even when a single SYNC frame contains more items
  const cappedPromise = guild.members.fetchMemberList('123456789012345678', { limit: 1, time: 2000 });
  client.emit(Events.Raw, {
    t: 'GUILD_MEMBER_LIST_UPDATE',
    d: {
      guild_id: '1',
      ops: [
        {
          op: 'SYNC',
          items: [
            { member: { user: { id: 'u1', username: 'alice' }, roles: [] } },
            { member: { user: { id: 'u2', username: 'bob' }, roles: [] } },
          ],
        },
      ],
    },
  });
  const capped = await cappedPromise;
  assert.equal(capped.size, 1);
});

test('fetchMemberList requires a finite positive limit (op-37 is a window, not a bulk fetch)', () => {
  const client = new Client();
  const guild = client.guilds._add({ id: '1', properties: { name: 'G' } });
  assert.throws(() => guild.members.fetchMemberList('123456789012345678'), /limit option must be/);
  assert.throws(() => guild.members.fetchMemberList('123456789012345678', { limit: Infinity }), /limit option must be/);
  assert.throws(
    () => guild.members.fetchMemberList('123456789012345678', { limit: Number.NaN }),
    /limit option must be/,
  );
});

test('fetchMemberList steps one 100-slot range at a time, handles group headers past limit, and cleans up on error', async () => {
  const client = new Client();
  const sent = [];
  client.ws.shards.set(0, { send: payload => sent.push(payload) });
  const guild = client.guilds._add({ id: '1', properties: { name: 'G' } });
  guild.shardId = 0;

  // Group headers eat 2 slots in [0, 99], so limit: 100 must advance into [100, 199] to reach 100 members.
  const promise = guild.members.fetchMemberList('123456789012345678', { limit: 100, time: 2000 });
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].d.subscriptions['1'].channels['123456789012345678'], [[0, 99]]);

  const batch1 = [
    { group: { id: 'admins', count: 2 } },
    { group: { id: 'online', count: 96 } },
    ...Array.from({ length: 98 }, (_, i) => ({
      member: { user: { id: `u${i}`, username: `u${i}` }, roles: [] },
    })),
  ];
  client.emit(Events.Raw, {
    t: 'GUILD_MEMBER_LIST_UPDATE',
    d: { guild_id: '1', ops: [{ op: 'SYNC', items: batch1 }] },
  });

  // After SYNC 1 arrives, the next window anchors [0, 99] and requests [100, 199].
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[1].d.subscriptions['1'].channels['123456789012345678'], [
    [0, 99],
    [100, 199],
  ]);

  // Re-echoing [0, 99] adds 0 new members and must NOT prematurely advance to [200, 299].
  client.emit(Events.Raw, {
    t: 'GUILD_MEMBER_LIST_UPDATE',
    d: { guild_id: '1', ops: [{ op: 'SYNC', items: batch1 }] },
  });
  assert.equal(sent.length, 2);

  const batch2 = Array.from({ length: 2 }, (_, i) => ({
    member: { user: { id: `u${98 + i}`, username: `u${98 + i}` }, roles: [] },
  }));
  client.emit(Events.Raw, {
    t: 'GUILD_MEMBER_LIST_UPDATE',
    d: { guild_id: '1', ops: [{ op: 'SYNC', items: batch2 }] },
  });

  const members = await promise;
  assert.equal(members.size, 100);

  // Disconnected shard rejects without leaking the Raw listener.
  const listenersBefore = client.listenerCount(Events.Raw);
  client.ws.shards.set(0, {
    send() {
      throw new Error('socket closed');
    },
  });
  await assert.rejects(() => guild.members.fetchMemberList('123456789012345678', { limit: 10 }), /socket closed/);
  assert.equal(client.listenerCount(Events.Raw), listenersBefore);
});

test('concurrent fetchMemberList calls on the same guild are serialized', async () => {
  const client = new Client();
  const sent = [];
  client.ws.shards.set(0, { send: payload => sent.push(payload) });
  const guild = client.guilds._add({ id: '1', properties: { name: 'G' } });
  guild.shardId = 0;

  const first = guild.members.fetchMemberList('111111111111111111', { limit: 1, time: 2000 });
  const second = guild.members.fetchMemberList('222222222222222222', { limit: 1, time: 2000 });

  // Only the first call has subscribed so far.
  assert.equal(sent.length, 1);
  assert.ok(sent[0].d.subscriptions['1'].channels['111111111111111111']);

  client.emit(Events.Raw, {
    t: 'GUILD_MEMBER_LIST_UPDATE',
    d: { guild_id: '1', ops: [{ op: 'SYNC', items: [{ member: { user: { id: 'u1', username: 'a' }, roles: [] } }] }] },
  });
  const firstMembers = await first;
  assert.deepEqual([...firstMembers.keys()], ['u1']);

  // First call cleared its channel subscription, then the second call subscribed to channel 2.
  assert.equal(sent.length, 3);
  assert.deepEqual(sent[1].d.subscriptions['1'].channels, {});
  assert.ok(sent[2].d.subscriptions['1'].channels['222222222222222222']);

  client.emit(Events.Raw, {
    t: 'GUILD_MEMBER_LIST_UPDATE',
    d: { guild_id: '1', ops: [{ op: 'SYNC', items: [{ member: { user: { id: 'u2', username: 'b' }, roles: [] } }] }] },
  });
  const secondMembers = await second;
  assert.deepEqual([...secondMembers.keys()], ['u2']);
  assert.equal(sent.length, 4);
  assert.deepEqual(sent[3].d.subscriptions['1'].channels, {});
});

test('fetchMemberList rejects when no member list arrives (the list always contains you)', async () => {
  const client = new Client();
  client.ws.shards.set(0, { send: () => {} });
  const guild = client.guilds._add({ id: '1', properties: { name: 'G' } });
  guild.shardId = 0;
  const fetching = guild.members.fetchMemberList('123456789012345678', { limit: 1, time: 10 });
  // the request's own timer is unref'd, so keep the process alive until it fires
  await Promise.all([assert.rejects(fetching, /didn't arrive/), new Promise(resolve => setTimeout(resolve, 50))]);
});

test('fetching every member without Manage Roles, Kick or Ban fails at once instead of waiting', async () => {
  const client = new Client();
  client.user = { id: '1' };
  const sent = [];
  client.ws.shards.set(0, { send: payload => sent.push(payload) });
  const guild = client.guilds._add({
    id: '10',
    properties: { name: 'G', owner_id: '99' },
    roles: [{ id: '10', name: '@everyone', permissions: '0' }], // @everyone (id = guild id) grants nothing
  });
  guild.shardId = 0;
  guild.members._add({ user: { id: '1', username: 'me' }, roles: [], joined_at: '2020-01-01T00:00:00.000Z' });

  await assert.rejects(guild.members.fetch(), { code: 'GuildMembersMissingPermissions' });
  assert.equal(sent.length, 0); // nothing was asked of the gateway

  // with Manage Roles the request goes out (and times out here, as no chunk ever arrives)
  guild.roles._add({ id: '10', name: '@everyone', permissions: String(PermissionFlagsBits.ManageRoles) });
  await assert.rejects(guild.members.fetch({ time: 10 }), { code: 'GuildMembersTimeout' });
  assert.equal(sent[0]?.op, GatewayOpcodes.RequestGuildMembers);
});

test('fetchMemberList does not hang when live UPDATE churn adds no new members', async () => {
  const client = new Client();
  client.ws.shards.set(0, { send: () => {} });
  const guild = client.guilds._add({ id: '1', properties: { name: 'G' } });

  const promise = guild.members.fetchMemberList('123456789012345678', { limit: 200, time: 40 });
  client.emit(Events.Raw, {
    t: 'GUILD_MEMBER_LIST_UPDATE',
    d: {
      guild_id: '1',
      ops: [{ op: 'SYNC', items: [{ member: { user: { id: 'u1', username: 'alice' }, roles: [] } }] }],
    },
  });

  // Emit repeated live UPDATE churn for an already-collected member every 10ms; must not keep resetting timer forever.
  const spam = setInterval(() => {
    client.emit(Events.Raw, {
      t: 'GUILD_MEMBER_LIST_UPDATE',
      d: {
        guild_id: '1',
        ops: [{ op: 'UPDATE', item: { member: { user: { id: 'u1', username: 'alice' }, roles: [] } } }],
      },
    });
  }, 10);

  try {
    const members = await promise;
    assert.deepEqual([...members.keys()], ['u1']);
  } finally {
    clearInterval(spam);
  }
});

test('async shard.send rejections reject cleanly without unhandledRejection and clean up listeners', async () => {
  const { WebSocketManager: WSWebSocketManager } = require('@discordjs/ws');
  const WebSocketShard = require('../src/client/websocket/WebSocketShard');
  const client = new Client();
  client.user = { id: '1' };
  client.ws._ws = new WSWebSocketManager({ token: 'fake', intents: 0, rest: client.rest });
  const realShard = new WebSocketShard(client.ws, 0);
  client.ws.shards.set(0, realShard);

  const guild = client.guilds._add({
    id: '10',
    properties: { name: 'G', owner_id: '1' },
    roles: [{ id: '10', name: '@everyone', permissions: String(PermissionFlagsBits.ManageRoles) }],
  });
  guild.shardId = 0;

  const rawBefore = client.listenerCount(Events.Raw);
  const chunkBefore = client.listenerCount(Events.GuildMembersChunk);
  const soundBefore = client.listenerCount(Events.SoundboardSounds);

  // Real @discordjs/ws rejects asynchronously when shard 0 is not connected.
  await assert.rejects(() => guild.members.fetchMemberList('123456789012345678', { limit: 10, time: 500 }), /Shard 0/);
  assert.equal(client.listenerCount(Events.Raw), rawBefore);

  await assert.rejects(() => guild.members.fetch({ time: 500 }), /Shard 0/);
  assert.equal(client.listenerCount(Events.Raw), rawBefore);
  assert.equal(client.listenerCount(Events.GuildMembersChunk), chunkBefore);

  await assert.rejects(() => client.guilds.fetchSoundboardSounds({ guildIds: ['10'], time: 500 }), /Shard 0/);
  assert.equal(client.listenerCount(Events.SoundboardSounds), soundBefore);

  // Cleanup unsubscribe failure on a dropped socket must not become an unhandled rejection.
  let calls = 0;
  client.ws.shards.set(0, {
    send() {
      calls++;
      return calls === 1 ? Promise.resolve() : Promise.reject(new Error('dropped during cleanup'));
    },
  });
  const okPromise = guild.members.fetchMemberList('123456789012345678', { limit: 1, time: 500 });
  client.emit(Events.Raw, {
    t: 'GUILD_MEMBER_LIST_UPDATE',
    d: {
      guild_id: '10',
      ops: [{ op: 'SYNC', items: [{ member: { user: { id: 'u1', username: 'a' }, roles: [] } }] }],
    },
  });
  const collected = await okPromise;
  assert.equal(collected.size, 1);

  // broadcast() and ClientPresence#set() route async send failures to ShardError instead of crashing.
  const shardErrors = [];
  client.on(Events.ShardError, (error, shardId) => shardErrors.push([error.message, shardId]));
  client.ws.shards.set(0, realShard);
  client.presence.set({ status: 'idle' });
  client.presence.set({ status: 'dnd', shardId: 0 });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(shardErrors.length, 2);
  assert.equal(shardErrors[0][1], 0);
  assert.equal(shardErrors[1][1], 0);

  await client.destroy();
});
