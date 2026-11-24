'use strict';

// A user account never has client.application, so reading a custom-emoji reaction must not look up application emojis.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ChannelType } = require('discord-api-types/v10');
const { Client, Events, ReactionEmoji } = require('../src');
const reactionAddHandler = require('../src/client/websocket/handlers/MESSAGE_REACTION_ADD');

test('reaction.emoji on a custom emoji returns a ReactionEmoji instead of throwing', () => {
  const client = new Client();
  client.user = { id: '1' };
  client.guilds._add({
    id: '10',
    properties: { name: 'G' },
    channels: [{ id: '20', type: ChannelType.GuildText, name: 'general' }],
  });
  client.channels.cache
    .get('20')
    .messages._add({ id: '30', channel_id: '20', author: { id: '2', username: 'a' }, content: 'hi', type: 0 });

  let emoji;
  client.on(Events.MessageReactionAdd, reaction => (emoji = reaction.emoji));
  reactionAddHandler(client, {
    d: {
      channel_id: '20',
      message_id: '30',
      guild_id: '10',
      user_id: '2',
      emoji: { id: '99', name: 'pepe' },
      member: { user: { id: '2', username: 'a' }, roles: [] },
    },
  });

  assert.equal(client.application, null);
  assert.ok(emoji instanceof ReactionEmoji);
  assert.equal(emoji.name, 'pepe');
});

test('reaction.emoji looks up guild caches directly without rebuilding client.emojis', () => {
  const client = new Client();
  client.user = { id: '1' };
  const guild = client.guilds._add({
    id: '10',
    properties: { name: 'G' },
    channels: [{ id: '20', type: ChannelType.GuildText, name: 'general' }],
    emojis: [{ id: '77', name: 'local' }],
  });
  client.channels.cache
    .get('20')
    .messages._add({ id: '30', channel_id: '20', author: { id: '2', username: 'a' }, content: 'hi', type: 0 });
  Object.defineProperty(client, 'emojis', {
    get() {
      throw new Error('client.emojis getter should not be called');
    },
  });

  const external = client.channels.cache
    .get('20')
    .messages.cache.get('30')
    .reactions._add({ emoji: { id: '999', name: 'ext' }, count: 1, me: false });
  assert.ok(external.emoji instanceof ReactionEmoji);

  const local = client.channels.cache
    .get('20')
    .messages.cache.get('30')
    .reactions._add({ emoji: { id: '77', name: 'local' }, count: 1, me: false });
  assert.equal(local.emoji, guild.emojis.cache.get('77'));
});
