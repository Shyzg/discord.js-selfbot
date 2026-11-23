'use strict';

// User-account gateway payloads nest guild fields under `properties`; _patch must flatten them,
// while still handling a flat (REST / bot) payload unchanged.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Client } = require('../src');

test('Guild._patch flattens the user-gateway `properties` nesting', () => {
  const client = new Client();
  const guild = client.guilds._add({
    id: '1',
    member_count: 2,
    properties: { name: 'Zeppelin ID', owner_id: '99' },
  });
  assert.equal(guild.name, 'Zeppelin ID'); // was undefined before the fix
  assert.equal(guild.ownerId, '99');
  assert.equal(guild.memberCount, 2); // flat field still works
});

test('Guild._patch still handles a flat (REST) guild payload', () => {
  const client = new Client();
  const guild = client.guilds._add({ id: '2', name: 'Flat', owner_id: '88', member_count: 5 });
  assert.equal(guild.name, 'Flat');
  assert.equal(guild.ownerId, '88');
});
