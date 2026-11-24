'use strict';

// op-14 member-list fetch: collects members from GUILD_MEMBER_LIST_UPDATE ops (skipping group headers).
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { GatewayOpcodes, PermissionFlagsBits } = require('discord-api-types/v10');
const { Client } = require('../src');
const Events = require('../src/util/Events');

test('fetchMemberList collects members from the gateway member list', async () => {
  const client = new Client();
  const sent = [];
  client.ws.shards.set(0, { send: payload => sent.push(payload) });
  const guild = client.guilds._add({ id: '1', member_count: 2, properties: { name: 'G' } });
  guild.shardId = 0;

  const promise = guild.members.fetchMemberList('123456789012345678', { limit: 2, time: 2000 });

  // the op-14 request was sent to the gateway
  assert.equal(sent[0]?.op, 14);
  assert.equal(sent[0]?.d?.guild_id, '1');
  assert.ok(sent[0]?.d?.channels['123456789012345678']);

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

test('fetchMemberList requires a finite positive limit (op-14 is a window, not a bulk fetch)', () => {
  const client = new Client();
  const guild = client.guilds._add({ id: '1', properties: { name: 'G' } });
  assert.throws(() => guild.members.fetchMemberList('123456789012345678'), /limit option must be/);
  assert.throws(() => guild.members.fetchMemberList('123456789012345678', { limit: Infinity }), /limit option must be/);
  assert.throws(
    () => guild.members.fetchMemberList('123456789012345678', { limit: Number.NaN }),
    /limit option must be/,
  );
});

test('fetchMemberList steps op-14 ranges above 300 one batch at a time and cleans up if disconnected', async () => {
  const client = new Client();
  const sent = [];
  client.ws.shards.set(0, { send: payload => sent.push(payload) });
  const guild = client.guilds._add({ id: '1', properties: { name: 'G' } });
  guild.shardId = 0;

  const promise = guild.members.fetchMemberList('123456789012345678', { limit: 350, time: 2000 });
  // Only the first 3 ranges go out immediately (does not overwrite itself with later frames).
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].d.channels['123456789012345678'], [
    [0, 99],
    [100, 199],
    [200, 299],
  ]);

  const batch1 = Array.from({ length: 300 }, (_, i) => ({
    member: { user: { id: `u${i}`, username: `u${i}` }, roles: [] },
  }));
  client.emit(Events.Raw, {
    t: 'GUILD_MEMBER_LIST_UPDATE',
    d: { guild_id: '1', ops: [{ op: 'SYNC', items: batch1 }] },
  });

  // After SYNC 1 arrives, the next window goes out with [0, 99] anchored plus [300, 399].
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[1].d.channels['123456789012345678'], [
    [0, 99],
    [300, 399],
  ]);

  const batch2 = Array.from({ length: 50 }, (_, i) => ({
    member: { user: { id: `u${300 + i}`, username: `u${300 + i}` }, roles: [] },
  }));
  client.emit(Events.Raw, {
    t: 'GUILD_MEMBER_LIST_UPDATE',
    d: { guild_id: '1', ops: [{ op: 'SYNC', items: batch2 }] },
  });

  const members = await promise;
  assert.equal(members.size, 350);

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
