'use strict';

// User accounts require an explicit `limit` on GET /guilds/:id/bans; the no-arg fetch must default one.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Client } = require('../src');
const GuildBanManager = require('../src/managers/GuildBanManager');

test('bans _fetchMany defaults a limit, and respects a provided one', async () => {
  const client = new Client();
  let query;
  client.rest.get = async (_route, opts) => {
    query = opts.query.toString();
    return [];
  };
  const manager = new GuildBanManager({ client, id: '123' });

  await manager._fetchMany();
  assert.match(query, /(^|&)limit=1000(&|$)/); // no args -> default to the API max

  await manager._fetchMany({ limit: 5 });
  assert.match(query, /(^|&)limit=5(&|$)/); // an explicit limit is respected
});
