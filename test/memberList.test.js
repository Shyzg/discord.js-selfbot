'use strict';

// op-14 member-list fetch: collects members from GUILD_MEMBER_LIST_UPDATE ops (skipping group headers).
const assert = require('node:assert/strict');
const { test } = require('node:test');
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
});

test('fetchMemberList requires an explicit limit (op-14 is a window, not a bulk fetch)', () => {
  const client = new Client();
  const guild = client.guilds._add({ id: '1', properties: { name: 'G' } });
  assert.throws(() => guild.members.fetchMemberList('123456789012345678'), /limit option must be/);
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
