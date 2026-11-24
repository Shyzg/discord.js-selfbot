'use strict';

const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const { test } = require('node:test');
const { WebSocketShardEvents: WSWebSocketShardEvents } = require('@discordjs/ws');
const { ChannelType, Routes } = require('discord-api-types/v10');
const {
  Client,
  Constants,
  DiscordjsErrorCodes,
  DMChannel,
  Events,
  BaseGuildTextChannel,
  BaseGuildVoiceChannel,
  Status,
  TextChannel,
  ThreadChannel,
  ThreadMemberManager,
  GuildChannelManager,
  GuildMemberManager,
  ThreadManager,
  MessagePayload,
  VoiceChannel,
  VoiceState,
  VoiceStateManager,
  WebhookClient,
  cleanContent,
} = require('../src');
const ClientUser = require('../src/structures/ClientUser');
const { Message } = require('../src/structures/Message');
const { resolveFile, resolveInviteCode } = require('../src/util/DataResolver');
const { toSnakeCase } = require('../src/util/Transformers');

test('Group DM channels can send, fetch, delete, patch updates, and cleanContent without crashing', async () => {
  const client = new Client();
  const calls = [];
  client.rest.get = async route => {
    calls.push(['GET', route]);
    return { id: '500', type: ChannelType.GroupDM, name: 'Renamed', recipients: [{ id: '2', username: 'bob' }] };
  };
  client.rest.post = async (route, opts) => {
    calls.push(['POST', route, opts.body.content]);
    return { id: '900', channel_id: '500', author: { id: '1', username: 'me' }, content: opts.body.content, type: 0 };
  };
  client.rest.delete = async route => {
    calls.push(['DELETE', route]);
  };

  const gdm = client.channels._add({
    id: '500',
    type: ChannelType.GroupDM,
    name: 'Friends',
    recipients: [{ id: '2', username: 'bob' }],
  });
  assert.equal(gdm.isSendable(), true);
  assert.equal(typeof gdm.send, 'function');

  // cleanContent does not crash on role-mention syntax inside a Group DM
  assert.equal(cleanContent('hi <@&123456789012345678>', gdm), 'hi <@&123456789012345678>');

  const sent = await gdm.send('hello group');
  assert.equal(sent.content, 'hello group');

  // fetch() patches name in place through _patch() instead of throwing FetchGroupDMChannel
  const fetched = await gdm.fetch();
  assert.equal(fetched.name, 'Renamed');

  await gdm.delete();
  assert.deepEqual(
    calls.map(([method]) => method),
    ['POST', 'GET', 'DELETE'],
  );
  await client.destroy();
});

test('channel classes no longer expose dead no-op component collector stubs', () => {
  for (const Cls of [DMChannel, BaseGuildTextChannel, BaseGuildVoiceChannel, ThreadChannel]) {
    assert.equal('createMessageComponentCollector' in Cls.prototype, false);
    assert.equal('awaitMessageComponent' in Cls.prototype, false);
  }
});

test('resolveFile rejects non-2xx HTTP responses instead of returning error pages', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => new Response('Not Found', { status: 404 });
  await assert.rejects(() => resolveFile('https://example.com/missing.png'), /HTTP 404/);
});

test('fetchSoundboardSounds returns immediately for an empty guildIds array', async () => {
  const client = new Client();
  const result = await client.guilds.fetchSoundboardSounds({ guildIds: [] });
  assert.equal(result.size, 0);
  await client.destroy();
});

test('resolveInviteCode works after loading index (no circular Invite.InvitesPattern undefined)', () => {
  assert.equal(resolveInviteCode('https://discord.gg/shyzago'), 'shyzago');
  assert.equal(resolveInviteCode('shyzago'), 'shyzago');
});

test('UserManager#fetch uses /users/@me for self and /users/:id/profile for other users', async () => {
  const client = new Client();
  const routes = [];
  client.user = client.users._add({ id: '123', username: 'me' });
  client.rest.get = async route => {
    routes.push(route);
    if (route === '/users/@me') return { id: '123', username: 'me-updated' };
    return { user: { id: '456', username: 'other' } };
  };

  const self = await client.users.fetch('123', { force: true });
  assert.equal(routes[0], '/users/@me');
  assert.equal(self.username, 'me-updated');

  const other = await client.users.fetch('456', { force: true });
  assert.equal(routes[1], '/users/456/profile');
  assert.equal(other.username, 'other');
  await client.destroy();
});

test('MessagePayload auto-generates a snowflake nonce on user sends but not on edits, webhooks, or opt-out', async () => {
  const client = new Client();
  const dm = client.channels._add({ id: '10', type: ChannelType.DM, recipients: [{ id: '2', username: 'bob' }] });

  const sendBody = MessagePayload.create(dm, 'hi').resolveBody().body;
  assert.match(sendBody.nonce, /^\d+$/);
  assert.equal(sendBody.enforce_nonce, true);

  const optOutBody = MessagePayload.create(dm, { content: 'hi', enforceNonce: false }).resolveBody().body;
  assert.equal(optOutBody.nonce, undefined);
  assert.equal(optOutBody.enforce_nonce, undefined);

  const editBody = MessagePayload.create(dm.messages, 'edited').resolveBody().body;
  assert.equal(editBody.nonce, undefined);
  assert.equal(editBody.enforce_nonce, undefined);

  const webhook = new WebhookClient({ id: '1', token: 'tok' });
  const webhookBody = MessagePayload.create(webhook, 'hook').resolveBody().body;
  assert.equal(webhookBody.nonce, undefined);
  assert.equal(webhookBody.enforce_nonce, undefined);

  webhook.destroy();
  await client.destroy();
});

test('bot-only thread/member REST endpoints are removed', () => {
  assert.equal('fetchActiveThreads' in GuildChannelManager.prototype, false);
  assert.equal('fetchActive' in ThreadManager.prototype, false);
  assert.equal('list' in GuildMemberManager.prototype, false);
  assert.equal('search' in GuildMemberManager.prototype, false);
});

test('MessageManager#fetch(id) queries ?around=:id&limit=1 and rejects missing targets with MessageNotFound', async () => {
  const client = new Client();
  const channel = client.channels._add({ id: '100', type: ChannelType.DM, recipients: [{ id: '2' }] });
  const calls = [];
  client.rest = {
    get: async (route, opts) => {
      calls.push({ route, query: opts.query.toString() });
      return calls.length === 1
        ? [{ id: '555', channel_id: '100', author: { id: '2', username: 'u' }, content: 'found', type: 0 }]
        : [{ id: '554', channel_id: '100', author: { id: '2', username: 'u' }, content: 'neighbor', type: 0 }];
    },
  };

  const msg = await channel.messages.fetch('555');
  assert.equal(calls[0].route, Routes.channelMessages('100'));
  assert.equal(calls[0].query, 'around=555&limit=1');
  assert.equal(msg.id, '555');
  assert.equal(msg.content, 'found');

  await assert.rejects(() => channel.messages.fetch('999'), { code: DiscordjsErrorCodes.MessageNotFound });
});

test('GuildScheduledEventManager#fetchSubscribers passes upgrade_response_type=true', async () => {
  const client = new Client();
  const guild = client.guilds._add({ id: '1', properties: { name: 'G' } });
  let captured;
  client.rest = {
    get: async (route, opts) => {
      captured = { route, query: opts.query.toString() };
      return [
        {
          guild_scheduled_event_id: '77',
          user: { id: '9', username: 'sub' },
          member: { roles: [] },
        },
      ];
    },
  };

  const subs = await guild.scheduledEvents.fetchSubscribers('77', { withMember: true, limit: 10 });
  assert.equal(captured.route, Routes.guildScheduledEventUsers('1', '77'));
  assert.equal(new URLSearchParams(captured.query).get('upgrade_response_type'), 'true');
  assert.equal(subs.get('9')?.user.username, 'sub');
});

test('UserManager#createDM sends recipients array instead of bot-only recipient_id', async () => {
  const client = new Client();
  client.user = new ClientUser(client, { id: '1', username: 'me' });
  let body;
  client.rest = {
    post: async (route, opts) => {
      assert.equal(route, Routes.userChannels());
      body = opts.body;
      return { id: '50', type: ChannelType.DM, recipients: [{ id: '2', username: 'other' }], last_message_id: null };
    },
  };

  const dm = await client.users.createDM('2');
  assert.deepEqual(body, { recipients: ['2'] });
  assert.equal(dm.id, '50');
});

test('DMChannel#_patch sets lastPinTimestamp to null (not NaN) when last_pin_timestamp is null', () => {
  const client = new Client();
  const dm = client.channels._add({
    id: '50',
    type: ChannelType.DM,
    recipients: [{ id: '2' }],
    last_pin_timestamp: null,
  });
  assert.equal(dm.lastPinTimestamp, null);
  assert.equal(dm.lastPinAt, null);
});

test('bot-only bulkDelete, thread member fetch, and voice state fetch APIs are removed', () => {
  assert.equal('bulkDelete' in TextChannel.prototype, false);
  assert.equal('bulkDelete' in VoiceChannel.prototype, false);
  assert.equal('bulkDelete' in ThreadChannel.prototype, false);
  assert.equal('bulkDeletable' in Message.prototype, false);
  assert.equal('MaxBulkDeletableMessageAge' in Constants, false);
  assert.equal('fetch' in ThreadMemberManager.prototype, false);
  assert.equal('fetchMe' in ThreadMemberManager.prototype, false);
  assert.equal('fetchOwner' in ThreadChannel.prototype, false);
  assert.equal('fetch' in VoiceStateManager.prototype, false);
  assert.equal('fetch' in VoiceState.prototype, false);
});

test('ClientUser#setUsername forwards password and _patch syncs rotated token to rest', async () => {
  const client = new Client();
  client.user = new ClientUser(client, { id: '1', username: 'old' });
  let sentBody;
  let restToken;
  client.rest = {
    setToken: token => {
      restToken = token;
    },
    patch: async (route, opts) => {
      assert.equal(route, Routes.user());
      sentBody = opts.body;
      return { id: '1', username: 'newname', token: 'ROTATED_TOKEN' };
    },
  };

  await client.user.setUsername('newname', 'hunter2');
  assert.equal(sentBody.username, 'newname');
  assert.equal(sentBody.password, 'hunter2');
  assert.equal(client.token, 'ROTATED_TOKEN');
  assert.equal(restToken, 'ROTATED_TOKEN');
});

test('WebSocketManager treats close code 4015 as unrecoverable (emits ShardDisconnect, not ShardReconnecting)', () => {
  const client = new Client();
  const fakeWs = new EventEmitter();
  client.ws._ws = fakeWs;
  const fakeShard = Object.assign(new EventEmitter(), { id: 0, status: Status.Ready });
  client.ws.shards.set(0, fakeShard);
  client.ws.attachEvents();

  let disconnected;
  let reconnecting = false;
  client.on(Events.ShardDisconnect, event => (disconnected = event));
  client.on(Events.ShardReconnecting, () => (reconnecting = true));

  fakeWs.emit(WSWebSocketShardEvents.Closed, 4015, 0);
  assert.equal(disconnected?.code, 4015);
  assert.equal(reconnecting, false);
  assert.equal(fakeShard.status, Status.Disconnected);
});

test('toSnakeCase converts camelCase and acronym keys without lodash.snakecase', () => {
  const result = toSnakeCase({
    avatarURL: 'https://x',
    customId: 'btn',
    minValues: 1,
    nestedItem: [{ maxLength: 10, HTTPStatus: 200 }],
  });
  assert.deepEqual(result, {
    avatar_url: 'https://x',
    custom_id: 'btn',
    min_values: 1,
    nested_item: [{ max_length: 10, http_status: 200 }],
  });
});
