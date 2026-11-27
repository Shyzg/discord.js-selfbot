'use strict';

// User-account features: relationships, friend presences, invites, guild subscriptions, notes, read state, sessions.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ChannelType, RelationshipType } = require('discord-api-types/v10');
const { Client, Events, Invite, Status } = require('../src');
const handlers = require('../src/client/websocket/handlers');

const readyShard = { id: 0, checkReady() {} };

// A client after a user READY, with a fake gateway shard that records what it sends.
function readyClient(extra = {}) {
  const client = new Client();
  const sent = [];
  client.ws.shards.set(0, {
    id: 0,
    sessionInfo: { sessionId: 'own' },
    send: async payload => {
      sent.push(payload);
    },
  });
  const user = { id: '1', username: 'me', discriminator: '0' };
  handlers.READY(client, { d: { user, guilds: [], users: [], ...extra } }, readyShard);
  return { client, sent };
}

const rawMessage = (id, channelId) => ({
  id,
  channel_id: channelId,
  author: { id: '2', username: 'author' },
  content: 'hi',
  edited_timestamp: null,
  mention_everyone: false,
  mentions: [],
  mention_roles: [],
  attachments: [],
  embeds: [],
  type: 0,
});

test('THREAD_LIST_SYNC without members (a user guild subscription sync) caches threads instead of crashing', () => {
  const { client } = readyClient();
  client.guilds._add({
    id: '10',
    name: 'G',
    channels: [{ id: '11', type: ChannelType.GuildText, name: 'general', guild_id: '10' }],
  });
  const thread = {
    id: '12',
    type: ChannelType.PublicThread,
    guild_id: '10',
    parent_id: '11',
    name: 'thread',
    thread_metadata: { archived: false },
  };
  assert.doesNotThrow(() => handlers.THREAD_LIST_SYNC(client, { d: { guild_id: '10', threads: [thread] } }));
  assert.ok(client.channels.cache.has('12'));
});

test('READY fills relationships from the deduped shape, and a re-identify READY replaces them', () => {
  const { client } = readyClient({
    users: [
      { id: '2', username: 'friend' },
      { id: '3', username: 'pending' },
    ],
    relationships: [
      { id: '2', user_id: '2', type: RelationshipType.Friend, nickname: 'buddy', since: '2026-01-01T00:00:00.000Z' },
      { id: '3', user_id: '3', type: RelationshipType.PendingIncoming, nickname: null },
    ],
  });
  assert.deepEqual([...client.relationships.friends.keys()], ['2']);
  assert.deepEqual([...client.relationships.incoming.keys()], ['3']);
  const friend = client.relationships.cache.get('2');
  assert.equal(friend.nickname, 'buddy');
  assert.equal(friend.user.username, 'friend');
  assert.equal(friend.since.toISOString(), '2026-01-01T00:00:00.000Z');

  const blocked = [{ id: '4', user_id: '4', type: RelationshipType.Blocked }];
  handlers.READY(client, { d: { user: { id: '1', username: 'me' }, guilds: [], relationships: blocked } }, readyShard);
  assert.deepEqual([...client.relationships.cache.keys()], ['4']);
  assert.deepEqual([...client.relationships.blocked.keys()], ['4']);
});

test('RELATIONSHIP_ADD, _UPDATE and _REMOVE keep the cache current and emit events', () => {
  const { client } = readyClient();
  const events = [];
  client.on(Events.RelationshipAdd, (relationship, notify) =>
    events.push(['add', relationship.id, relationship.type, notify]),
  );
  client.on(Events.RelationshipUpdate, (old, updated) => events.push(['update', old?.nickname, updated.nickname]));
  client.on(Events.RelationshipRemove, relationship => events.push(['remove', relationship.id, relationship.type]));

  const user = { id: '5', username: 'new' };
  handlers.RELATIONSHIP_ADD(client, {
    d: { id: '5', type: RelationshipType.PendingIncoming, user, should_notify: true },
  });
  assert.equal(client.users.cache.get('5')?.username, 'new');
  // Accepting the request arrives as another ADD with the new type.
  handlers.RELATIONSHIP_ADD(client, { d: { id: '5', type: RelationshipType.Friend, user } });
  handlers.RELATIONSHIP_UPDATE(client, { d: { id: '5', type: RelationshipType.Friend, nickname: 'pal' } });
  assert.equal(client.relationships.cache.get('5').nickname, 'pal');
  handlers.RELATIONSHIP_REMOVE(client, { d: { id: '5', type: RelationshipType.Friend } });
  handlers.RELATIONSHIP_REMOVE(client, { d: { id: '6', type: RelationshipType.Blocked } });

  assert.equal(client.relationships.cache.size, 0);
  assert.deepEqual(events, [
    ['add', '5', RelationshipType.PendingIncoming, true],
    ['add', '5', RelationshipType.Friend, false],
    ['update', null, 'pal'],
    ['remove', '5', RelationshipType.Friend],
    ['remove', '6', RelationshipType.Blocked],
  ]);
});

test('RelationshipManager sends the documented relationship requests', async () => {
  const { client } = readyClient();
  const calls = [];
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    client.rest[method] = async (route, options) => {
      calls.push([method, route, options?.body]);
      return method === 'get'
        ? [{ id: '8', type: RelationshipType.Friend, user: { id: '8', username: 'eight' } }]
        : null;
    };
  }

  await client.relationships.sendFriendRequest('someone');
  await client.relationships.sendFriendRequest('legacy#1234');
  await client.relationships.addFriend('8');
  await client.relationships.block('9');
  await client.relationships.setNickname('8', 'nick');
  await client.relationships.remove('9');
  const fetched = await client.relationships.fetch();

  assert.deepEqual(calls, [
    ['post', '/users/@me/relationships', { username: 'someone', discriminator: null }],
    ['post', '/users/@me/relationships', { username: 'legacy', discriminator: '1234' }],
    ['put', '/users/@me/relationships/8', {}],
    ['put', '/users/@me/relationships/9', { type: RelationshipType.Blocked }],
    ['patch', '/users/@me/relationships/8', { nickname: 'nick' }],
    ['delete', '/users/@me/relationships/9', undefined],
    ['get', '/users/@me/relationships', undefined],
  ]);
  assert.equal(fetched.get('8').user.username, 'eight');
  await assert.rejects(client.relationships.addFriend(null), { code: 'InvalidType' });
  await assert.rejects(client.relationships.sendFriendRequest(''), { code: 'InvalidType' });
});

test('a captcha challenge is solved through the handler and retried once, or rejects without one', async () => {
  const { client } = readyClient();
  const headers = [];
  let challenge = true;
  client.rest.put = async (_route, options) => {
    headers.push(options.headers);
    if (challenge) {
      challenge = false;
      throw Object.assign(new Error('captcha'), {
        rawError: { captcha_service: 'hcaptcha', captcha_sitekey: 'site', captcha_rqtoken: 'rq' },
      });
    }
  };

  await client.relationships.addFriend('8', { captcha: async ({ captcha_sitekey: site }) => `solved-${site}` });
  assert.deepEqual(headers, [undefined, { 'x-captcha-key': 'solved-site', 'x-captcha-rqtoken': 'rq' }]);

  challenge = true;
  await assert.rejects(client.relationships.addFriend('8'), { code: 'CaptchaRequired' });
});

test('presences outside guilds land in client.presences and emit userPresenceUpdate, never presenceUpdate', () => {
  const { client } = readyClient({ users: [{ id: '2', username: 'friend' }] });
  client.guilds._add({ id: '20', name: 'Shared' });
  const userUpdates = [];
  const guildUpdates = [];
  client.on(Events.UserPresenceUpdate, (old, presence) =>
    userUpdates.push([old?.status ?? null, presence.status, presence.guild]),
  );
  // A handler ported from a bot that assumes a guild must never see a guildless presence.
  client.on(Events.PresenceUpdate, (_old, presence) => guildUpdates.push([presence.guild.id, presence.status]));

  const friends = [{ user_id: '2', status: 'idle', activities: [], client_status: {} }];
  handlers.READY_SUPPLEMENTAL(client, { d: { guilds: [], merged_presences: { friends } } });
  assert.equal(client.presences.cache.get('2').status, 'idle');

  handlers.PRESENCE_UPDATE(client, {
    d: { user: { id: '2' }, status: 'online', activities: [], client_status: { desktop: 'online' } },
  });
  handlers.PRESENCE_UPDATE(client, { d: { user: { id: '2' }, guild_id: '20', status: 'online', activities: [] } });
  // A guild presence for a guild that is not cached is still ignored.
  handlers.PRESENCE_UPDATE(client, { d: { user: { id: '2' }, guild_id: '404', status: 'dnd', activities: [] } });

  assert.deepEqual(userUpdates, [['idle', 'online', null]]);
  assert.deepEqual(guildUpdates, [['20', 'online']]);
  assert.equal(client.presences.cache.get('2').status, 'online');
});

test('acceptInvite sends the session id and returns the joined guild once GUILD_CREATE arrives', async () => {
  const { client } = readyClient();
  client.ws.status = Status.Ready;
  const posts = [];
  client.rest.post = async (route, options) => {
    posts.push([route, options.body]);
    return {
      code: 'abc',
      type: 0,
      guild: { id: '50', name: 'Joined' },
      channel: { id: '51', type: 0 },
      new_member: true,
    };
  };

  const pending = client.acceptInvite('https://discord.gg/abc');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(client.guilds.cache.has('50'), false);
  handlers.GUILD_CREATE(
    client,
    { d: { id: '50', properties: { name: 'Joined' }, channels: [], roles: [] } },
    readyShard,
  );

  const guild = await pending;
  assert.equal(guild.id, '50');
  assert.equal(guild.name, 'Joined');
  assert.deepEqual(posts, [['/invites/abc', { session_id: 'own' }]]);
});

test('acceptInvite returns an already cached guild at once, a group DM after CHANNEL_CREATE, else the Invite', async () => {
  const { client } = readyClient();
  client.guilds._add({ id: '55', name: 'Member already' });
  const responses = [
    { code: 'a', type: 0, guild: { id: '55', name: 'Member already' }, new_member: false },
    { code: 'b', type: 1, channel: { id: '70', type: ChannelType.GroupDM, name: 'group' } },
    { code: 'c', type: 0, guild: { id: '60', name: 'Slow' }, channel: { id: '61', type: 0 } },
  ];
  client.rest.post = async () => responses.shift();

  assert.equal(await client.acceptInvite('a'), client.guilds.cache.get('55'));

  const groupPending = client.acceptInvite('b');
  await new Promise(resolve => setImmediate(resolve));
  handlers.CHANNEL_CREATE(client, {
    d: { id: '70', type: ChannelType.GroupDM, name: 'group', recipients: [{ id: '2', username: 'friend' }] },
  });
  assert.equal((await groupPending).id, '70');

  // Nothing arrives in time: the accepted Invite comes back and the partial invite guild is not cached.
  client._waitForCreate = async () => null;
  const invite = await client.acceptInvite('c');
  assert.ok(invite instanceof Invite);
  assert.equal(client.guilds.cache.has('60'), false);
  await assert.rejects(client.acceptInvite(null), { code: 'InvalidType' });
});

test('guilds.subscribe sends op 37 in 100-guild frames and a re-identify READY sends them again', async () => {
  const { client, sent } = readyClient();
  for (let index = 0; index < 150; index++) client.guilds._add({ id: String(1000 + index), name: `G${index}` });

  await client.guilds.subscribe(client.guilds.cache, { threads: false });
  assert.deepEqual(
    sent.map(frame => [frame.op, Object.keys(frame.d.subscriptions).length]),
    [
      [37, 100],
      [37, 50],
    ],
  );
  assert.deepEqual(sent[0].d.subscriptions['1000'], { typing: true, threads: false, activities: true });

  sent.length = 0;
  handlers.READY(client, { d: { user: { id: '1', username: 'me' }, guilds: [] } }, readyShard);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent.length, 2);

  await assert.rejects(client.guilds.subscribe('999'), { code: 'InvalidType' });
});

test("fetchMemberList keeps a subscribed guild's flags in its frames and restores them on cleanup", async () => {
  const { client, sent } = readyClient();
  const guild = client.guilds._add({ id: '80', name: 'Big' });
  await guild.subscribe();

  const pending = guild.members.fetchMemberList('81', { limit: 1, time: 1_000 });
  client.emit(Events.Raw, {
    t: 'GUILD_MEMBER_LIST_UPDATE',
    d: { guild_id: '80', ops: [{ op: 'SYNC', items: [{ member: { user: { id: '2', username: 'a' }, roles: [] } }] }] },
  });
  await pending;

  const flags = { typing: true, threads: true, activities: true };
  assert.deepEqual(
    sent.map(frame => frame.d.subscriptions['80']),
    [flags, { ...flags, channels: { 81: [[0, 99]] } }, { ...flags, channels: {} }],
  );
});

test('notes: fetchNote caches and returns null on 404, setNote clears with null, and changes emit once', async () => {
  const { client } = readyClient({ users: [{ id: '2', username: 'friend' }] });
  const calls = [];
  client.rest.get = async route => {
    calls.push(['get', route]);
    if (route.endsWith('/3')) throw Object.assign(new Error('Unknown User'), { status: 404 });
    return { note: 'likes cats', note_user_id: '2', user_id: '1' };
  };
  client.rest.put = async (route, options) => {
    calls.push(['put', route, options.body]);
  };
  const updates = [];
  client.on(Events.UserNoteUpdate, (user, oldNote, newNote) => updates.push([user.id, oldNote, newNote]));

  assert.equal(await client.users.fetchNote('2'), 'likes cats');
  assert.equal(client.users.cache.get('2').note, 'likes cats');
  assert.equal(await client.users.fetchNote('2'), 'likes cats');
  assert.equal(await client.users.fetchNote('3'), null);
  assert.equal(await client.users.cache.get('2').setNote(''), null);
  // The gateway echo of this client's own change emits nothing new; a change from another device does.
  handlers.USER_NOTE_UPDATE(client, { d: { id: '2', note: '' } });
  handlers.USER_NOTE_UPDATE(client, { d: { id: '2', note: 'from phone' } });

  assert.deepEqual(calls, [
    ['get', '/users/@me/notes/2'],
    ['get', '/users/@me/notes/3'],
    ['put', '/users/@me/notes/2', { note: null }],
  ]);
  assert.deepEqual(updates, [
    ['2', 'likes cats', null],
    ['2', null, 'from phone'],
  ]);
});

test('markRead acks a channel up to its last message or up to a message; forum channels have no markRead', async () => {
  const { client } = readyClient();
  const posts = [];
  client.rest.post = async (route, options) => {
    posts.push([route, options.body]);
  };
  client.guilds._add({
    id: '90',
    name: 'G',
    channels: [
      { id: '91', type: ChannelType.GuildText, name: 'text', guild_id: '90', last_message_id: '95' },
      { id: '92', type: ChannelType.GuildText, name: 'empty', guild_id: '90', last_message_id: null },
      { id: '93', type: ChannelType.GuildForum, name: 'forum', guild_id: '90' },
    ],
  });

  const thread = client.channels._add({
    id: '96',
    type: ChannelType.PublicThread,
    guild_id: '90',
    parent_id: '91',
    name: 'thread',
    last_message_id: '97',
    thread_metadata: { archived: false },
  });
  const groupDm = client.channels._add({ id: '98', type: ChannelType.GroupDM, recipients: [], last_message_id: '99' });

  const text = client.channels.cache.get('91');
  assert.equal(await text.markRead(), text);
  await client.channels.cache.get('92').markRead();
  await text.messages._add(rawMessage('94', '91')).markRead();
  await thread.markRead();
  await groupDm.markRead();

  // Read-state flags: IS_GUILD_CHANNEL (1 << 0) for guild channels, plus IS_THREAD (1 << 1) for threads.
  assert.deepEqual(posts, [
    ['/channels/91/messages/95/ack', { token: null, flags: 1 }],
    ['/channels/91/messages/94/ack', { token: null, flags: 1 }],
    ['/channels/96/messages/97/ack', { token: null, flags: 3 }],
    ['/channels/98/messages/99/ack', { token: null, flags: 0 }],
  ]);
  assert.equal('markRead' in client.channels.cache.get('93'), false);
});

test("client.user.status follows Discord's session list: the `all` entry, else this session", () => {
  const own = { session_id: 'own', status: 'online', client_info: { client: 'web', os: 'osx', version: 0 } };
  const { client } = readyClient({ sessions: [{ ...own, activities: [] }] });
  assert.equal(client.user.status, 'online');
  assert.equal(client.user.sessions.get('own').clientInfo.client, 'web');

  const updates = [];
  client.on(Events.SessionsUpdate, (oldSessions, newSessions) => updates.push([oldSessions.size, newSessions.size]));
  handlers.SESSIONS_REPLACE(client, {
    d: [
      { session_id: 'all', status: 'invisible', activities: [] },
      { ...own, activities: [] },
      { session_id: 'phone', status: 'invisible', client_info: { client: 'mobile', os: 'ios', version: 0 } },
    ],
  });

  assert.equal(client.user.status, 'invisible');
  assert.deepEqual(updates, [[1, 3]]);
  // What this client asks for is unchanged: op 3 keeps sending `unknown`.
  assert.equal(client.presence.status, 'unknown');
});
