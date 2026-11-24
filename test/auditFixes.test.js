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
  cleanContent,
} = require('../src');
const { resolveFile } = require('../src/util/DataResolver');

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
