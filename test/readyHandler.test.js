'use strict';

// A user-account READY payload has no `application` (that field is bot-only); the handler must not crash on it.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ChannelType } = require('discord-api-types/v10');
const { Client, Events } = require('../src');
const WebSocketShard = require('../src/client/websocket/WebSocketShard');
const messageCreateHandler = require('../src/client/websocket/handlers/MESSAGE_CREATE');
const readyHandler = require('../src/client/websocket/handlers/READY');
const readySupplementalHandler = require('../src/client/websocket/handlers/READY_SUPPLEMENTAL');

const self = { id: '1', username: 'u', discriminator: '0', global_name: 'U', avatar: null, bot: false };

test('READY handler tolerates a user payload with no application field', () => {
  const client = new Client();
  const shard = { id: 0, checkReady: () => {} };
  const data = {
    user: { id: '1', username: 'u', discriminator: '0', global_name: 'U', avatar: null, bot: false },
    guilds: [],
  };
  assert.doesNotThrow(() => readyHandler(client, { d: data }, shard));
  assert.equal(client.user.id, '1');
  assert.equal(client.application, null); // user accounts have no application
});

test('READY caches your own member from merged_members, so guild.members.me is set', () => {
  const client = new Client();
  const shard = { id: 0, checkReady: () => {} };
  const data = {
    user: { id: '1', username: 'u', discriminator: '0', global_name: 'U', avatar: null, bot: false },
    guilds: [{ id: '10', properties: { name: 'G' } }],
    // a user READY collapses members into one array per guild, with `user_id` in place of `user`
    merged_members: [[{ user_id: '1', roles: [], nick: 'me' }]],
  };
  readyHandler(client, { d: data }, shard);
  const me = client.guilds.cache.get('10').members.me;
  assert.equal(me?.id, '1');
  assert.equal(me.nickname, 'me');
});

test('a user READY (full guilds) waits only for the unavailable stubs', () => {
  const client = new Client();
  const shard = new WebSocketShard(client.ws, 0);
  shard.onReadyPacket({
    guilds: [
      { id: '10', properties: { name: 'G' } },
      { id: '11', unavailable: true },
    ],
  });
  assert.deepEqual([...shard.expectedGuilds], ['11']);
});

test('READY caches open DMs, so a message in an existing DM fires messageCreate', () => {
  const client = new Client();
  const data = {
    user: self,
    guilds: [],
    // DEDUPE_USER_OBJECTS: users arrive once in `users`, and private channels name them in `recipient_ids`
    users: [{ id: '2', username: 'friend', discriminator: '0', global_name: null, avatar: null }],
    private_channels: [{ id: '777', type: ChannelType.DM, recipient_ids: ['2'], last_message_id: null }],
  };
  readyHandler(client, { d: data }, { id: 0, checkReady: () => {} });
  assert.equal(client.channels.cache.get('777').recipient.username, 'friend');

  let received;
  client.on(Events.MessageCreate, message => (received = message));
  const message = { id: '50', channel_id: '777', author: { id: '2', username: 'friend' }, content: 'hi', type: 0 };
  messageCreateHandler(client, { d: message });
  assert.equal(received?.content, 'hi');
});

test('READY_SUPPLEMENTAL fills voice states and their members, so a voice channel lists who is in it', () => {
  const client = new Client();
  const ready = {
    user: self,
    guilds: [
      { id: '10', properties: { name: 'G' }, channels: [{ id: '40', type: ChannelType.GuildVoice, name: 'v' }] },
    ],
    merged_members: [[{ user_id: '1', roles: [] }]], // with PRIORITIZED_READY_PAYLOAD, READY carries only your member
    users: [{ id: '5', username: 'talker', discriminator: '0', global_name: null, avatar: null }],
  };
  readyHandler(client, { d: ready }, { id: 0, checkReady: () => {} });
  readySupplementalHandler(client, {
    d: {
      guilds: [{ id: '10', voice_states: [{ user_id: '5', channel_id: '40', session_id: 's' }] }],
      merged_members: [[{ user_id: '5', roles: [] }]],
    },
  });

  const guild = client.guilds.cache.get('10');
  assert.equal(guild.voiceStates.cache.get('5')?.channelId, '40');
  assert.deepEqual([...guild.channels.cache.get('40').members.keys()], ['5']);
  assert.equal(guild.members.cache.get('5').user.username, 'talker');
});

test('READY_SUPPLEMENTAL populates guild presences from merged_presences.guilds', () => {
  const client = new Client();
  const ready = {
    user: self,
    guilds: [{ id: '10', properties: { name: 'G' } }],
    merged_members: [[{ user_id: '1', roles: [] }]],
    users: [{ id: '5', username: 'onlineuser', discriminator: '0', global_name: null, avatar: null }],
  };
  readyHandler(client, { d: ready }, { id: 0, checkReady: () => {} });
  readySupplementalHandler(client, {
    d: {
      guilds: [{ id: '10', voice_states: [] }],
      merged_members: [[{ user_id: '5', roles: [] }]],
      merged_presences: {
        friends: [],
        guilds: [[{ user_id: '5', status: 'dnd', activities: [], client_status: { desktop: 'dnd' } }]],
      },
    },
  });

  const guild = client.guilds.cache.get('10');
  const presence = guild.presences.cache.get('5');
  assert.equal(presence?.status, 'dnd');
  assert.equal(presence?.guild, guild);
  assert.deepEqual(presence?.clientStatus, { desktop: 'dnd' });
});
