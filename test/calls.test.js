'use strict';

// DM and group DM calls: CALL_* events, call voice states, and the ring / stop-ringing / region endpoints.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ChannelType } = require('discord-api-types/v10');
const { Client, Events } = require('../src');
const handlers = require('../src/client/websocket/handlers');

const readyShard = { id: 0, checkReady() {} };
const voiceState = (userId, extra = {}) => ({
  user_id: userId,
  session_id: `session-${userId}`,
  self_mute: false,
  self_deaf: false,
  self_video: false,
  mute: false,
  deaf: false,
  ...extra,
});

function readyClient() {
  const client = new Client();
  const user = { id: '1', username: 'me', discriminator: '0' };
  handlers.READY(
    client,
    {
      d: {
        user,
        guilds: [],
        users: [{ id: '2', username: 'friend' }],
        private_channels: [{ id: '100', type: ChannelType.DM, recipient_ids: ['2'] }],
      },
    },
    readyShard,
  );
  return client;
}

test('CALL_CREATE caches the call with its voice states, and CALL_UPDATE tracks who is being rung', () => {
  const client = readyClient();
  const events = [];
  client.on(Events.CallCreate, call => events.push(['create', call.ringing]));
  client.on(Events.CallUpdate, (oldCall, newCall) => events.push(['update', oldCall.ringing, newCall.ringing]));

  handlers.CALL_CREATE(client, {
    d: { channel_id: '100', message_id: '500', region: 'rotterdam', ringing: ['2'], voice_states: [voiceState('1')] },
  });
  const call = client.channels.cache.get('100').call;
  assert.equal(call, client.calls.get('100'));
  assert.equal(call.messageId, '500');
  assert.equal(call.region, 'rotterdam');
  assert.equal(call.voiceStates.get('1').channelId, '100');
  assert.equal(call.channel.id, '100');

  handlers.CALL_UPDATE(client, { d: { channel_id: '100', message_id: '500', region: 'rotterdam', ringing: [] } });
  assert.deepEqual(call.ringing, []);
  assert.equal(call.voiceStates.size, 1, 'an update without voice_states keeps them');
  assert.deepEqual(events, [
    ['create', ['2']],
    ['update', ['2'], []],
  ]);
});

test('voice states without a guild go to the call and callVoiceStateUpdate, never voiceStateUpdate', () => {
  const client = readyClient();
  handlers.CALL_CREATE(client, { d: { channel_id: '100', message_id: '500', ringing: [], voice_states: [] } });
  const updates = [];
  client.on(Events.CallVoiceStateUpdate, (oldState, newState, call) =>
    updates.push([oldState?.selfMute ?? null, newState.selfMute, newState.channelId, call.channelId]),
  );
  // A handler ported from a bot that assumes a guild must never see a call voice state.
  client.on(Events.VoiceStateUpdate, (_old, state) => updates.push(['guild', state.guild.id]));

  handlers.VOICE_STATE_UPDATE(client, { d: voiceState('2', { channel_id: '100' }) });
  handlers.VOICE_STATE_UPDATE(client, { d: voiceState('2', { channel_id: '100', self_mute: true }) });
  assert.equal(client.calls.get('100').voiceStates.get('2').selfMute, true);
  handlers.VOICE_STATE_UPDATE(client, { d: voiceState('2', { channel_id: null }) });
  // A voice state for a call that is not cached is ignored.
  handlers.VOICE_STATE_UPDATE(client, { d: voiceState('3', { channel_id: '999' }) });

  assert.equal(client.calls.get('100').voiceStates.has('2'), false);
  assert.deepEqual(updates, [
    [null, false, '100', '100'],
    [false, true, '100', '100'],
    [true, false, null, '100'],
  ]);
});

test('CALL_DELETE removes the call and reports an outage', () => {
  const client = readyClient();
  const deleted = [];
  client.on(Events.CallDelete, call => deleted.push([call.channelId, call.unavailable]));
  handlers.CALL_CREATE(client, { d: { channel_id: '100', message_id: '500', ringing: [] } });
  handlers.CALL_DELETE(client, { d: { channel_id: '100' } });
  handlers.CALL_DELETE(client, { d: { channel_id: '101', unavailable: true } });
  assert.equal(client.calls.size, 0);
  assert.equal(client.channels.cache.get('100').call, null);
  assert.deepEqual(deleted, [
    ['100', false],
    ['101', true],
  ]);
});

test('ring, stopRinging and setRegion send the documented call requests', async () => {
  const client = readyClient();
  handlers.CALL_CREATE(client, { d: { channel_id: '100', message_id: '500', ringing: [] } });
  const calls = [];
  for (const method of ['post', 'patch']) {
    client.rest[method] = async (route, options) => {
      calls.push([method, route, options.body]);
    };
  }
  const call = client.calls.get('100');

  assert.equal(await call.ring([client.users.cache.get('2')]), call);
  await call.ring();
  await call.stopRinging(['2']);
  await call.stopRinging();
  await call.setRegion('singapore');

  assert.deepEqual(calls, [
    ['post', '/channels/100/call/ring', { recipients: ['2'] }],
    ['post', '/channels/100/call/ring', { recipients: undefined }],
    ['post', '/channels/100/call/stop-ringing', { recipients: ['2'] }],
    ['post', '/channels/100/call/stop-ringing', { recipients: undefined }],
    ['patch', '/channels/100/call', { region: 'singapore' }],
  ]);
  await assert.rejects(call.ring([null]), { code: 'InvalidType' });
});

test('a READY and an account switch forget the calls of the old session', () => {
  const client = readyClient();
  handlers.CALL_CREATE(client, { d: { channel_id: '100', message_id: '500', ringing: [] } });
  handlers.READY(client, { d: { user: { id: '1', username: 'me' }, guilds: [] } }, readyShard);
  assert.equal(client.calls.size, 0);

  handlers.CALL_UPDATE(client, { d: { channel_id: '100', message_id: '500', ringing: ['2'] } });
  assert.deepEqual(client.calls.get('100').ringing, ['2'], 'an update for an unknown call starts tracking it');
  client._clearAccountState();
  assert.equal(client.calls.size, 0);
});
