'use strict';

const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const { test } = require('node:test');
const { inspect } = require('node:util');
const { DiscordAPIError } = require('@discordjs/rest');
const { WebSocketShardEvents: WSWebSocketShardEvents } = require('@discordjs/ws');
const {
  ActivityType,
  ApplicationCommandOptionType,
  AuditLogEvent,
  ChannelType,
  MessageReferenceType,
  OverwriteType,
  Routes,
} = require('discord-api-types/v10');
const djs = require('../src');
const {
  ApplicationCommand,
  AttachmentBuilder,
  CategoryChannelChildManager,
  Client,
  Collection,
  Constants,
  DiscordjsErrorCodes,
  DMChannel,
  Events,
  BaseGuildTextChannel,
  BaseGuildVoiceChannel,
  LimitedCollection,
  MessageCollector,
  Options,
  PartialGroupDMMessageManager,
  ReactionCollector,
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
  Webhook,
  WebhookClient,
  WebSocketShard,
  cleanContent,
} = djs;
const ClientUser = require('../src/structures/ClientUser');
const GuildAuditLogsEntry = require('../src/structures/GuildAuditLogsEntry');
const GuildEmoji = require('../src/structures/GuildEmoji');
const { GuildOnboardingPromptOption } = require('../src/structures/GuildOnboardingPromptOption');
const Integration = require('../src/structures/Integration');
const Invite = require('../src/structures/Invite');
const { Message } = require('../src/structures/Message');
const WelcomeChannel = require('../src/structures/WelcomeChannel');
const channelPinsUpdateHandler = require('../src/client/websocket/handlers/CHANNEL_PINS_UPDATE');
const handlers = require('../src/client/websocket/handlers');
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

test('ClientUser#edit strips plaintext password from REST errors', async () => {
  const client = new Client();
  client.user = new ClientUser(client, { id: '1', username: 'old' });
  client.rest.patch = async (route, opts) => {
    throw new DiscordAPIError({ message: 'Invalid password', code: 50035 }, 50035, 400, 'PATCH', route, {
      body: opts.body,
    });
  };
  const error = await client.user.setUsername('newname', 'super-secret-password').catch(err => err);
  assert.ok(error instanceof DiscordAPIError);
  assert.ok(!inspect(error).includes('super-secret-password'));
  await client.destroy();
});

test('Guild defaults shardId to 0 when constructed from REST payloads without shardId', async () => {
  const client = new Client();
  const fakeShard = { id: 0, send: () => {} };
  client.ws.shards.set(0, fakeShard);
  const guild = client.guilds._add({ id: '42', name: 'FetchedGuild' });
  assert.equal(guild.shardId, 0);
  assert.equal(guild.shard, fakeShard);
  await client.destroy();
});

test('MessagePayload inherits client.options.enforceNonce when caller passes an explicit nonce', async () => {
  const client = new Client();
  const dm = client.channels._add({ id: '10', type: ChannelType.DM, recipients: [{ id: '2', username: 'bob' }] });

  const withNonce = MessagePayload.create(dm, { content: 'hi', nonce: '123456' }).resolveBody().body;
  assert.equal(withNonce.nonce, '123456');
  assert.equal(withNonce.enforce_nonce, true);

  const explicitOff = MessagePayload.create(dm, { content: 'hi', nonce: '123456', enforceNonce: false }).resolveBody()
    .body;
  assert.equal(explicitOff.nonce, '123456');
  assert.equal(explicitOff.enforce_nonce, undefined);

  const disabledClient = new Client({ enforceNonce: false });
  const dm2 = disabledClient.channels._add({ id: '11', type: ChannelType.DM, recipients: [{ id: '2' }] });
  const disabledBody = MessagePayload.create(dm2, { content: 'hi', nonce: '123456' }).resolveBody().body;
  assert.equal(disabledBody.nonce, '123456');
  assert.equal(disabledBody.enforce_nonce, undefined);
  assert.throws(() => MessagePayload.create(dm2, { content: 'hi', enforceNonce: true }).resolveBody(), {
    code: DiscordjsErrorCodes.MessageNonceRequired,
  });

  await client.destroy();
  await disabledClient.destroy();
});

test('resolveFile rejects null and undefined with ReqResourceType instead of raw TypeError', async () => {
  await assert.rejects(() => resolveFile(null), { code: DiscordjsErrorCodes.ReqResourceType });
  await assert.rejects(() => resolveFile(undefined), { code: DiscordjsErrorCodes.ReqResourceType });
});

test('exports match runtime and dead deprecated wrappers are removed', () => {
  assert.equal(typeof CategoryChannelChildManager, 'function');
  assert.equal(typeof PartialGroupDMMessageManager, 'function');
  assert.equal('SelectMenuComponent' in djs, false);
  assert.equal('fetchPremiumStickerPacks' in Client.prototype, false);
  assert.equal('emitClose' in WebSocketShard.prototype, false);
});

test('null timestamps in Message#equals, ThreadChannel, Integration, and Invite resolve to null (not NaN)', async () => {
  const client = new Client();
  const guild = client.guilds._add({ id: '1', name: 'G' });
  const rawMsg = {
    id: '10',
    channel_id: '20',
    author: { id: '2', username: 'u' },
    content: 'hi',
    edited_timestamp: null,
    mention_everyone: false,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    type: 0,
  };
  const msg = new Message(client, rawMsg);
  rawMsg.timestamp = new Date(msg.createdTimestamp).toISOString();
  assert.equal(msg.equals(msg, rawMsg), true);

  const thread = client.channels._add(
    {
      id: '30',
      type: ChannelType.PublicThread,
      guild_id: '1',
      name: 'old-thread',
      thread_metadata: {
        archived: false,
        auto_archive_duration: 60,
        archive_timestamp: '2025-01-01T00:00:00.000Z',
        locked: false,
        create_timestamp: null,
      },
    },
    guild,
  );
  assert.equal(thread.createdTimestamp, null);

  const integration = new Integration(
    client,
    { id: '40', name: 'int', type: 'discord', synced_at: null, account: { id: '1', name: 'a' } },
    guild,
  );
  assert.equal(integration.syncedTimestamp, null);

  const invite = new Invite(client, { code: 'abc', created_at: null });
  assert.equal(invite.createdTimestamp, null);
  await client.destroy();
});

test('CachedManager emits UnsupportedCacheOverwriteWarning once for bounded core managers', async t => {
  const warnings = [];
  const onWarning = w => warnings.push(w);
  process.on('warning', onWarning);
  t.after(() => process.off('warning', onWarning));

  const client = new Client({ makeCache: () => new LimitedCollection({ maxSize: 1 }) });
  // Trigger another GuildManager / ChannelManager check indirectly by checking warning emitted
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(warnings.some(w => w.name === 'UnsupportedCacheOverwriteWarning' && w.message.includes('GuildManager')));
  assert.ok(warnings.some(w => w.name === 'UnsupportedCacheOverwriteWarning' && w.message.includes('ChannelManager')));
  await client.destroy();
});

test('ReactionCollector only empties when MessageReactionRemoveAll targets its own message', async () => {
  const client = new Client();
  const channel = client.channels._add({ id: '10', type: ChannelType.DM, recipients: [{ id: '2' }] });
  const msgA = channel.messages._add({ id: '100', channel_id: '10', author: { id: '2', username: 'u' }, content: 'a' });
  const msgB = channel.messages._add({ id: '200', channel_id: '10', author: { id: '2', username: 'u' }, content: 'b' });

  const collector = new ReactionCollector(msgA);
  const reaction = msgA.reactions._add({ count: 1, me: false, emoji: { id: null, name: '👍' } });
  client.emit(Events.MessageReactionAdd, reaction, client.users._add({ id: '2', username: 'u' }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(collector.collected.size, 1);
  assert.equal(collector.total, 1);

  // Clearing reactions on an unrelated message must not wipe msgA's collector
  client.emit(Events.MessageReactionRemoveAll, msgB);
  assert.equal(collector.collected.size, 1);
  assert.equal(collector.total, 1);

  // Clearing reactions on msgA itself empties the collector
  client.emit(Events.MessageReactionRemoveAll, msgA);
  assert.equal(collector.collected.size, 0);
  assert.equal(collector.total, 0);

  collector.stop();
  await client.destroy();
});

test('forwarded message_snapshots do not overwrite or pollute source channel message cache', async () => {
  const client = new Client();
  const channel = client.channels._add({ id: '10', type: ChannelType.DM, recipients: [{ id: '2' }] });
  const original = channel.messages._add({
    id: '100',
    channel_id: '10',
    author: { id: '2', username: 'alice' },
    content: 'latest edited text',
    type: 0,
  });

  // Forward of cached message 100 with older snapshot content
  const fwd1 = new Message(client, {
    id: '500',
    channel_id: '10',
    author: { id: '3', username: 'bob' },
    content: '',
    type: 0,
    message_reference: { type: MessageReferenceType.Forward, channel_id: '10', message_id: '100' },
    message_snapshots: [{ message: { content: 'old snapshot text', type: 0, embeds: [], attachments: [] } }],
  });
  assert.equal(original.content, 'latest edited text');
  assert.equal(channel.messages.cache.get('100')?.content, 'latest edited text');
  assert.equal(fwd1.messageSnapshots.get('100')?.content, 'old snapshot text');

  // Forward of uncached message 101 must not insert a partial author-less entry into channel cache
  const fwd2 = new Message(client, {
    id: '501',
    channel_id: '10',
    author: { id: '3', username: 'bob' },
    content: '',
    type: 0,
    message_reference: { type: MessageReferenceType.Forward, channel_id: '10', message_id: '101' },
    message_snapshots: [{ message: { content: 'uncached snapshot', type: 0, embeds: [], attachments: [] } }],
  });
  assert.equal(channel.messages.cache.has('101'), false);
  assert.equal(fwd2.messageSnapshots.get('101')?.content, 'uncached snapshot');

  await client.destroy();
});

test('partial Message getters/equals and Role#editable with uncached me do not throw TypeError', async () => {
  const client = new Client();
  client.user = new ClientUser(client, { id: '1', username: 'me' });
  const dm = client.channels._add({ id: '10', type: ChannelType.DM, recipients: [{ id: '2' }] });
  const partialDmMsg = new Message(client, { id: '100', channel_id: dm.id });
  assert.equal(partialDmMsg.partial, true);
  assert.equal(partialDmMsg.editable, false);
  assert.equal(partialDmMsg.deletable, false);
  assert.equal(partialDmMsg.crosspostable, false);
  assert.equal(partialDmMsg.equals(new Message(client, { id: '100', channel_id: dm.id, author: { id: '2' } })), false);

  const guild = client.guilds._add({
    id: '50',
    properties: { name: 'G', owner_id: '999' },
    roles: [
      { id: '50', name: '@everyone', position: 0, permissions: '0' },
      { id: '51', name: 'mod', position: 1, permissions: '0', managed: false },
    ],
    channels: [{ id: '60', type: ChannelType.GuildText, name: 'general', permission_overwrites: [] }],
  });
  assert.equal(guild.roles.cache.get('51').editable, false);

  await client.destroy();
});

test('MessagePayload.resolveFile rejects null/undefined cleanly and resolveBody/ClientPresence do not mutate inputs', async () => {
  await assert.rejects(() => MessagePayload.resolveFile(null), { code: DiscordjsErrorCodes.ReqResourceType });
  await assert.rejects(() => MessagePayload.resolveFile(undefined), { code: DiscordjsErrorCodes.ReqResourceType });
  await assert.rejects(() => MessagePayload.resolveFile({ attachment: null }), {
    code: DiscordjsErrorCodes.ReqResourceType,
  });

  const client = new Client();
  const dm = client.channels._add({ id: '10', type: ChannelType.DM, recipients: [{ id: '2' }] });
  const keepList = [{ id: 'existing' }];
  const payload = MessagePayload.create(dm, {
    content: 'hi',
    attachments: keepList,
    files: [{ attachment: Buffer.from('a'), name: 'a.txt', description: 'desc' }],
  }).resolveBody();
  assert.equal(keepList.length, 1);
  assert.equal(payload.body.attachments.length, 2);

  const customActivity = { name: 'Busy', type: ActivityType.Custom };
  const parsed = client.presence._parse({ activities: [customActivity] });
  assert.deepEqual(customActivity, { name: 'Busy', type: ActivityType.Custom });
  assert.equal(parsed.activities[0].name, 'Custom Status');
  assert.equal(parsed.activities[0].state, 'Busy');

  await client.destroy();
});

test('GuildManager#create ignores unrelated GuildCreate events and resolves when its own guild arrives', async () => {
  const client = new Client();
  client.rest.post = async () => ({ id: 'new-guild', name: 'New', roles: [], channels: [], emojis: [] });

  const creating = client.guilds.create({ name: 'New' });
  await new Promise(resolve => setImmediate(resolve));

  // Unrelated guild arrives first — must NOT consume the listener
  const unrelated = client.guilds._add({ id: 'other-guild', name: 'Other' });
  client.emit(Events.GuildCreate, unrelated);

  const created = client.guilds._add({ id: 'new-guild', name: 'New' });
  client.emit(Events.GuildCreate, created);

  const resolved = await creating;
  assert.equal(resolved.id, 'new-guild');
  await client.destroy();
});

test('UserManager#fetch and createDM reject invalid null/undefined users locally without REST calls', async () => {
  const client = new Client();
  let calls = 0;
  client.rest.get = async () => {
    calls++;
    return {};
  };
  client.rest.post = async () => {
    calls++;
    return {};
  };

  await assert.rejects(() => client.users.fetch(null), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => client.users.fetch(undefined), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => client.users.createDM(null), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => client.users.createDM(undefined), { code: DiscordjsErrorCodes.InvalidType });
  assert.equal(calls, 0);
  await client.destroy();
});

test('dead options, deprecated DeletableMessageTypes, and bot-only ApplicationCommand diffing are removed', () => {
  assert.equal('closeTimeout' in Options.createDefault(), false);
  assert.equal('DeletableMessageTypes' in Constants, false);
  assert.equal('equals' in ApplicationCommand.prototype, false);
  assert.equal('optionsEqual' in ApplicationCommand, false);

  const client = new Client();
  const cmd = new ApplicationCommand(client, {
    id: '1',
    application_id: '2',
    name: 'ping',
    description: 'ping',
    version: '1',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'msg',
        description: 'text',
        min_length: 1,
        max_length: 10,
      },
    ],
  });
  assert.equal(cmd.options[0].minLength, 1);
  assert.equal(cmd.options[0].maxLength, 10);
  client.destroy();
});

test('Poll#fetch forces a REST reload and updates cached poll vote counts in place', async () => {
  const client = new Client();
  const dm = client.channels._add({ id: '10', type: ChannelType.DM, recipients: [{ id: '2' }] });
  const msg = dm.messages._add({
    id: '100',
    channel_id: '10',
    author: { id: '2', username: 'u' },
    content: '',
    type: 0,
    poll: {
      question: { text: 'Q?' },
      answers: [{ answer_id: 1, poll_media: { text: 'A' } }],
      allow_multiselect: false,
      layout_type: 1,
      expiry: null,
    },
  });

  let restCalls = 0;
  client.rest.get = async () => {
    restCalls++;
    return [
      {
        id: '100',
        channel_id: '10',
        author: { id: '2', username: 'u' },
        content: '',
        type: 0,
        poll: {
          question: { text: 'Q?' },
          answers: [{ answer_id: 1, poll_media: { text: 'A' } }],
          results: { is_finalized: true, answer_counts: [{ id: 1, count: 7, me_voted: false }] },
          allow_multiselect: false,
          layout_type: 1,
          expiry: null,
        },
      },
    ];
  };

  const refreshed = await msg.poll.fetch();
  assert.equal(restCalls, 1);
  assert.equal(refreshed, msg.poll);
  assert.equal(refreshed.answers.get(1).voteCount, 7);
  assert.equal(refreshed.resultsFinalized, true);
  await client.destroy();
});

test('Client#destroy tears down active voice adapters and MessageCollector captures async bulk-delete filter errors', async () => {
  const client = new Client();
  let adapterDestroyed = false;
  client.voice.adapters.set('1', {
    destroy() {
      adapterDestroyed = true;
    },
  });

  const dm = client.channels._add({ id: '10', type: ChannelType.DM, recipients: [{ id: '2' }] });
  const errors = [];
  client.on(Events.Error, err => errors.push(err));
  const collector = new MessageCollector(dm, {
    dispose: true,
    filter: async () => {
      throw new Error('async filter failed');
    },
  });
  const msg = dm.messages._add({ id: '777', channel_id: '10', author: { id: '2', username: 'u' }, content: 'x' });
  collector.collected.set(msg.id, msg);
  client.emit(Events.MessageBulkDelete, new Collection([[msg.id, msg]]));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /async filter failed/);
  collector.stop();

  await client.destroy();
  assert.equal(adapterDestroyed, true);
  assert.equal(client.voice.adapters.size, 0);
});

test('Webhook handles null source_guild and empty edit(), null options throw InvalidType, and null dates resolve to null', async () => {
  const client = new Client();
  const webhook = new Webhook(client, { id: '1', token: 'tok', name: 'w', source_guild: null, source_channel: null });
  assert.equal(webhook.sourceGuild, null);
  client.rest.patch = async () => ({ id: '1', name: 'w', avatar: null, channel_id: '2' });
  await webhook.edit();

  assert.throws(() => new Client({ sweepers: { threads: null } }), { code: DiscordjsErrorCodes.InvalidType });
  const guild = client.guilds._add({ id: '1', properties: { name: 'G' }, joined_at: null });
  assert.equal(guild.joinedTimestamp, null);
  assert.equal(guild.joinedAt, null);

  await assert.rejects(() => guild.bans.create('123', null), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => guild.bans.bulkCreate(['123'], null), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => guild.scheduledEvents.create(null), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => guild.stageInstances.create('1', null), { code: DiscordjsErrorCodes.InvalidType });

  const thread = client.channels._add(
    {
      id: '99',
      type: ChannelType.PublicThread,
      guild_id: '1',
      name: 't',
      thread_metadata: { archived: false, auto_archive_duration: 60, archive_timestamp: null, locked: false },
    },
    guild,
  );
  assert.equal(thread.archiveTimestamp, null);
  assert.equal(thread.archivedAt, null);

  await client.destroy();
});

test('manager ID validation, sticker edit body, soundboard MIME sniffing, and Formatters removal work cleanly', async () => {
  const client = new Client();
  const guild = client.guilds._add({ id: '1', properties: { name: 'G' } });

  let restCalls = 0;
  client.rest.put = async () => {
    restCalls++;
  };
  client.rest.delete = async () => {
    restCalls++;
  };
  client.rest.patch = async () => {
    restCalls++;
    return {};
  };

  await assert.rejects(() => guild.members.addRole({ user: null, role: '2' }), {
    code: DiscordjsErrorCodes.InvalidType,
  });
  await assert.rejects(() => guild.members.removeRole({ user: '1', role: null }), {
    code: DiscordjsErrorCodes.InvalidType,
  });
  await assert.rejects(() => guild.roles.delete(null), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => guild.autoModerationRules.edit(null, {}), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => guild.autoModerationRules.delete(null), { code: DiscordjsErrorCodes.InvalidType });
  assert.equal(restCalls, 0);

  let stickerPatch;
  client.rest.patch = async (_route, opts) => {
    stickerPatch = opts;
    return { id: '5', name: 'new', tags: 'tag', format_type: 1 };
  };
  await guild.stickers.edit('5', { name: 'new', tags: 'tag', reason: 'audit note' });
  assert.equal('reason' in stickerPatch.body, false);
  assert.equal(stickerPatch.reason, 'audit note');

  const sounds = [];
  client.rest.post = async (_route, opts) => {
    sounds.push(opts.body.sound);
    return { sound_id: '9', name: opts.body.name, volume: 1, available: true };
  };
  await guild.soundboardSounds.create({ file: Buffer.from([0x4f, 0x67, 0x67, 0x53, 0x00]), name: 'ogg' });
  await guild.soundboardSounds.create({ file: Buffer.from([0x49, 0x44, 0x33, 0x03]), name: 'id3' });
  await guild.soundboardSounds.create({ file: Buffer.from([0xff, 0xfb, 0x90, 0x00]), name: 'mp3' });
  assert.ok(sounds[0].startsWith('data:audio/ogg;base64,'));
  assert.ok(sounds[1].startsWith('data:audio/mpeg;base64,'));
  assert.ok(sounds[2].startsWith('data:audio/mpeg;base64,'));

  assert.equal('Formatters' in djs, false);
  await client.destroy();
});

test('AttachmentBuilder spoiler edge cases, non-mutating role-manager clone, and remaining null-ID / PATCH guards', async () => {
  const unnamed = new AttachmentBuilder(Buffer.from('hi'));
  assert.equal(unnamed.spoiler, false);
  unnamed.setSpoiler(false);
  assert.equal(unnamed.name, null);
  unnamed.setSpoiler(true);
  assert.equal(unnamed.name, 'SPOILER_file.jpg');
  assert.equal(unnamed.spoiler, true);

  const nested = new AttachmentBuilder(Buffer.from('hi'), { name: 'folder12/SPOILER_pic.png' });
  assert.equal(nested.spoiler, true);
  nested.setSpoiler(false);
  assert.equal(nested.name, 'folder12/pic.png');
  assert.equal(nested.spoiler, false);
  nested.setSpoiler(true);
  assert.equal(nested.name, 'folder12/SPOILER_pic.png');

  const client = new Client();
  client.user = new ClientUser(client, { id: '999', username: 'me' });
  const guild = client.guilds._add({
    id: '1',
    properties: { name: 'G' },
    roles: [{ id: '1', name: '@everyone', permissions: '0' }],
  });
  const ch = client.channels._add(
    { id: '10', type: ChannelType.GuildText, guild_id: '1', name: 'general', permission_overwrites: [] },
    guild,
  );

  // clone() must not mutate original member._roles or emoji._roles
  const member = guild.members._add({ user: { id: '2', username: 'u' }, roles: ['uncached-role'] });
  const clonedMemberRoles = member.roles.clone();
  assert.deepEqual(member._roles, ['uncached-role']);
  assert.notEqual(clonedMemberRoles.member, member);

  const emoji = guild.emojis._add({ id: '50', name: 'e', roles: ['uncached-role'] });
  const clonedEmojiRoles = emoji.roles.clone();
  assert.deepEqual(emoji._roles, ['uncached-role']);
  assert.notEqual(clonedEmojiRoles.emoji, emoji);

  let restCalls = 0;
  client.rest.put = async () => {
    restCalls++;
    return {};
  };
  client.rest.post = async () => {
    restCalls++;
    return {};
  };
  await assert.rejects(
    () => ch.permissionOverwrites.create(null, { ViewChannel: false }, { type: OverwriteType.Role }),
    { code: DiscordjsErrorCodes.InvalidType },
  );
  await assert.rejects(() => client.guilds.setIncidentActions(null, {}), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => guild.bans.bulkCreate([null]), { code: DiscordjsErrorCodes.InvalidElement });
  assert.equal(restCalls, 0);

  let memberPatchBody;
  client.rest.patch = async (_route, opts) => {
    memberPatchBody = opts.body;
    return { user: { id: '2', username: 'u' }, roles: [] };
  };
  await guild.members.edit('2', { communicationDisabledUntil: new Date('2030-01-01T00:00:00Z') });
  assert.equal('communicationDisabledUntil' in memberPatchBody, false);
  assert.equal(memberPatchBody.communication_disabled_until, '2030-01-01T00:00:00.000Z');

  await client.destroy();
});

test('Group DM invites, voice routing/eviction, and voiceAdapterCreator shard errors are handled safely', async () => {
  const client = new Client();
  client.user = new ClientUser(client, { id: '100', username: 'me' });
  client.channels._add({ id: '500', type: ChannelType.GroupDM, recipients: [] });

  const emitted = [];
  client.on(Events.InviteCreate, invite => emitted.push(['create', invite]));
  client.on(Events.InviteDelete, invite => emitted.push(['delete', invite]));
  client.actions.InviteCreate.handle({ channel_id: '500', code: 'gdm123' });
  client.actions.InviteDelete.handle({ channel_id: '500', code: 'gdm123' });
  assert.equal(emitted.length, 2);
  assert.equal(emitted[0][0], 'create');
  assert.ok(emitted[0][1] instanceof Invite);
  assert.equal(emitted[0][1].code, 'gdm123');
  assert.equal(emitted[1][0], 'delete');
  assert.equal(emitted[1][1].code, 'gdm123');

  const guild = client.guilds._add({ id: '1', properties: { name: 'G' }, shardId: 0 });
  const voiceUpdates = [];
  client.voice.onVoiceStateUpdate = payload => voiceUpdates.push(payload);

  // Client's own guild member is NOT cached, yet voice state updates still route to client.voice
  client.actions.VoiceStateUpdate.handle({ guild_id: '1', channel_id: '20', user_id: '100', session_id: 'sess-1' });
  assert.equal(voiceUpdates.length, 1);
  assert.equal(guild.voiceStates.cache.has('100'), true);

  // Disconnecting (channel_id: null) evicts the stale voice state from cache
  client.actions.VoiceStateUpdate.handle({ guild_id: '1', channel_id: null, user_id: '100', session_id: 'sess-1' });
  assert.equal(voiceUpdates.length, 2);
  assert.equal(guild.voiceStates.cache.has('100'), false);

  // voiceAdapterCreator returns false when shard is absent and routes send rejections to ShardError
  const adapter = guild.voiceAdapterCreator({ destroy: () => {} });
  assert.equal(adapter.sendPayload({ op: 4, d: {} }), false);

  const shardErrors = [];
  client.on(Events.ShardError, (error, shardId) => shardErrors.push([error.message, shardId]));
  client.ws.shards.set(0, { status: Status.Ready, send: () => Promise.reject(new Error('socket closed')) });
  assert.equal(adapter.sendPayload({ op: 4, d: {} }), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(shardErrors, [['socket closed', 0]]);

  await client.destroy();
});

test('WebSocketManager#handlePacket replays queued startup events in strict FIFO order', async t => {
  const client = new Client();
  const order = [];
  handlers.__AUDIT_FIFO_TEST = (_c, packet) => order.push(packet.d.seq);
  t.after(() => {
    delete handlers.__AUDIT_FIFO_TEST;
  });

  client.ws.status = Status.Connecting;
  client.ws.handlePacket({ t: '__AUDIT_FIFO_TEST', d: { seq: 1 } }, { id: 0 });
  client.ws.handlePacket({ t: '__AUDIT_FIFO_TEST', d: { seq: 2 } }, { id: 0 });
  // Whitelisted pre-ready packets must not shift or scramble queued events
  client.ws.handlePacket({ t: 'RESUMED', d: {} }, { id: 0 });
  client.ws.handlePacket({ t: '__AUDIT_FIFO_TEST', d: { seq: 3 } }, { id: 0 });

  client.ws.status = Status.Ready;
  client.ws.handlePacket({ t: '__AUDIT_FIFO_TEST', d: { seq: 4 } }, { id: 0 });

  await new Promise(resolve => setTimeout(resolve, 25));
  assert.deepEqual(order, [1, 2, 3, 4]);
  await client.destroy();
});

test('Poll#fetch after eviction, Guild#edit reason, InviteUpdate audit log, and channelPinsUpdate Date', async () => {
  const client = new Client();
  const ch = client.channels._add({ id: '200', type: ChannelType.DM, recipients: [{ id: '2', username: 'u' }] });
  const msg = ch.messages._add({
    id: '300',
    channel_id: '200',
    author: { id: '2', username: 'u' },
    content: '',
    timestamp: new Date().toISOString(),
    poll: {
      question: { text: 'Q' },
      answers: [{ answer_id: 1, poll_media: { text: 'A' } }],
      expiry: new Date(Date.now() + 60_000).toISOString(),
      allow_multiselect: false,
      layout_type: 1,
      results: { is_finalized: false, answer_counts: [{ id: 1, count: 1, me_voted: false }] },
    },
  });
  const stalePoll = msg.poll;
  ch.messages.cache.delete('300');
  client.rest.get = async () => [
    {
      id: '300',
      channel_id: '200',
      author: { id: '2', username: 'u' },
      content: '',
      timestamp: new Date().toISOString(),
      poll: {
        question: { text: 'Q' },
        answers: [{ answer_id: 1, poll_media: { text: 'A' } }],
        expiry: new Date(Date.now() + 60_000).toISOString(),
        allow_multiselect: false,
        layout_type: 1,
        results: { is_finalized: true, answer_counts: [{ id: 1, count: 42, me_voted: true }] },
      },
    },
  ];
  const freshPoll = await stalePoll.fetch();
  assert.equal(freshPoll.answers.get(1).voteCount, 42);
  assert.equal(freshPoll.resultsFinalized, true);

  const guild = client.guilds._add({ id: '1', properties: { name: 'Old' } });
  let guildPatch;
  client.rest.patch = async (_route, opts) => {
    guildPatch = opts;
    return { id: '1', name: 'New' };
  };
  await guild.edit({ name: 'New', reason: 'rename guild' });
  assert.equal('reason' in guildPatch.body, false);
  assert.equal(guildPatch.reason, 'rename guild');

  const logs = {
    webhooks: new Map(),
    integrations: new Map(),
    applicationCommands: new Map(),
    autoModerationRules: new Map(),
    threads: new Map(),
  };
  const entry = new GuildAuditLogsEntry(
    guild,
    { id: '99', action_type: AuditLogEvent.InviteUpdate, changes: [{ key: 'max_uses', old_value: 1, new_value: 5 }] },
    logs,
  );
  assert.ok(entry.target instanceof Invite);
  assert.equal(entry.target.maxUses, 5);

  const pinEvents = [];
  client.on(Events.ChannelPinsUpdate, (_channel, date) => pinEvents.push(date));
  channelPinsUpdateHandler(client, { d: { channel_id: '200', last_pin_timestamp: '2025-01-01T00:00:00.000Z' } });
  channelPinsUpdateHandler(client, { d: { channel_id: '200', last_pin_timestamp: null } });
  assert.ok(pinEvents[0] instanceof Date);
  assert.equal(pinEvents[0].toISOString(), '2025-01-01T00:00:00.000Z');
  assert.equal(pinEvents[1], null);
  assert.equal(ch.lastPinTimestamp, null);

  await client.destroy();
});

test('emoji getters, uncached user role edits, Presence#member, invite/template guards, resolveFile signal, and payload/emoji edge cases', async t => {
  const client = new Client();
  const guild = client.guilds._add({
    id: '1',
    properties: { name: 'G' },
    channels: [],
    roles: [{ id: '10', name: 'r' }],
    emojis: [{ id: '555', name: 'custom', roles: [] }],
  });

  // Direct guild emoji lookup without rebuilding client.emojis
  Object.defineProperty(client, 'emojis', {
    get() {
      throw new Error('client.emojis getter should not be called');
    },
  });
  const ch = client.channels._add({ id: '200', type: ChannelType.DM, recipients: [{ id: '2', username: 'u' }] });
  const pollMsg = ch.messages._add({
    id: '301',
    channel_id: '200',
    author: { id: '2', username: 'u' },
    content: '',
    timestamp: new Date().toISOString(),
    poll: {
      question: { text: 'Q' },
      answers: [{ answer_id: 1, poll_media: { emoji: { id: '555', name: 'custom' } } }],
      expiry: new Date(Date.now() + 60_000).toISOString(),
      allow_multiselect: false,
      layout_type: 1,
    },
  });
  const answer = pollMsg.poll.answers.get(1);
  assert.equal(answer.partial, false);
  assert.equal(answer.emoji, guild.emojis.cache.get('555'));

  const onboardingOpt = new GuildOnboardingPromptOption(
    client,
    { id: '1', channel_ids: [], role_ids: [], emoji: { id: '555', name: 'custom' }, title: 'T', description: null },
    '1',
  );
  assert.equal(onboardingOpt.emoji, guild.emojis.cache.get('555'));

  const welcomeCh = new WelcomeChannel(guild, {
    channel_id: '200',
    description: 'd',
    emoji_id: '555',
    emoji_name: 'custom',
  });
  assert.equal(welcomeCh.emoji, guild.emojis.cache.get('555'));

  // Presence#member on ClientPresence (guild === null)
  assert.equal(client.presence.member, null);

  // addRole / removeRole accept uncached User instances
  const user = client.users._add({ id: '999', username: 'bob', discriminator: '0' });
  const roleRoutes = [];
  client.rest.put = async route => roleRoutes.push(['PUT', route]);
  client.rest.delete = async route => roleRoutes.push(['DELETE', route]);
  const added = await guild.members.addRole({ user, role: '10' });
  const removed = await guild.members.removeRole({ user, role: '10' });
  assert.equal(added, user);
  assert.equal(removed, user);
  assert.deepEqual(roleRoutes, [
    ['PUT', Routes.guildMemberRole('1', '999', '10')],
    ['DELETE', Routes.guildMemberRole('1', '999', '10')],
  ]);

  // Invalid invite/template inputs reject locally without REST calls
  let restCalls = 0;
  client.rest.get = async () => {
    restCalls++;
    return {};
  };
  client.rest.delete = async () => {
    restCalls++;
  };
  client.rest.put = async () => {
    restCalls++;
  };
  await assert.rejects(() => client.fetchInvite(null), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => client.fetchGuildTemplate(null), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => guild.invites.delete(null), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => guild.invites.fetchTargetUsers(null), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => guild.invites.updateTargetUsers(null, ['1']), { code: DiscordjsErrorCodes.InvalidType });
  await assert.rejects(() => guild.invites.fetchTargetUsersJobStatus(null), { code: DiscordjsErrorCodes.InvalidType });
  assert.equal(restCalls, 0);

  // fetchSoundboardSounds does not extend timeout on unrelated guilds
  client.ws.shards.set(0, { send: () => {} });
  const unrelatedGuild = client.guilds._add({ id: '2', properties: { name: 'Other' } });
  const soundPromise = client.guilds.fetchSoundboardSounds({ guildIds: ['1'], time: 35 });
  const spam = setInterval(() => {
    client.emit(Events.SoundboardSounds, new Collection(), unrelatedGuild);
  }, 10);
  t.after(() => clearInterval(spam));
  await assert.rejects(() => soundPromise, { code: DiscordjsErrorCodes.GuildSoundboardSoundsTimeout });
  clearInterval(spam);

  // DataResolver.resolveFile passes an AbortSignal timeout to fetch
  const origFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = origFetch;
  });
  let fetchInit;
  globalThis.fetch = async (_url, init) => {
    fetchInit = init;
    return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
  };
  await resolveFile('https://example.com/a.txt');
  assert.ok(fetchInit?.signal instanceof AbortSignal);

  // MessagePayload tolerates explicit null reply/forward
  const payload = MessagePayload.create(ch, { content: 'hi', reply: null, forward: null }).resolveBody();
  assert.equal(payload.body.content, 'hi');
  assert.equal(payload.body.message_reference, undefined);

  // GuildEmoji#equals tolerates raw API emoji without roles array
  const emoji = new GuildEmoji(client, { id: '10', name: 'e', roles: [] }, guild);
  assert.equal(emoji.equals({ id: '10', name: 'e' }), true);

  await client.destroy();
});
