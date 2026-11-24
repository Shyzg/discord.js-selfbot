'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ChannelType } = require('discord-api-types/v10');
const {
  Client,
  DMChannel,
  BaseGuildTextChannel,
  BaseGuildVoiceChannel,
  ThreadChannel,
  GuildChannelManager,
  GuildMemberManager,
  ThreadManager,
  MessagePayload,
  WebhookClient,
  cleanContent,
} = require('../src');
const { resolveFile, resolveInviteCode } = require('../src/util/DataResolver');

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
