'use strict';

// Go Live: stream keys, the H264 and RTP media path, the stream media connection, and client.streams.
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const crypto = require('node:crypto');
const EventEmitter = require('node:events');
const { Readable } = require('node:stream');
const { test } = require('node:test');
const { setImmediate: tick } = require('node:timers/promises');
const { ChannelType } = require('discord-api-types/v10');
const { Client, Events, GoLiveStream, StreamBroadcast, StreamViewer } = require('../src');
const H264 = require('../src/client/voice/media/H264');
const { MediaConnection, VoiceOpcodes } = require('../src/client/voice/media/MediaConnection');
const { RtpCrypto, rtpHeader, senderReport } = require('../src/client/voice/media/Rtp');
const handlers = require('../src/client/websocket/handlers');

const readyShard = { id: 0, checkReady() {} };
const TRAILER = Buffer.from([0x12, 0x34, 0x00, 0x08, 0xfa, 0xfa]);
// Payload bytes without zeros, so no accidental start codes.
const body = (length, seed = 1) => Buffer.from(Array.from({ length }, (_, index) => ((index * 7 + seed) % 255) + 1));
const SPS = Buffer.from([0x67, 0x42, 0xc0, 0x1e, 0xab]);
const PPS = Buffer.from([0x68, 0xce, 0x3c, 0x80]);
// first_mb_in_slice 0 starts a frame (top bit set); the second slice of a frame has it clear.
const idrSlice = length => Buffer.concat([Buffer.from([0x65, 0x88]), body(length)]);
const idrSecondSlice = Buffer.concat([Buffer.from([0x65, 0x41]), body(40, 3)]);
const pSlice = seed => Buffer.concat([Buffer.from([0x41, 0x9a]), body(60, seed)]);
const annexB = (units, startCode = [0, 0, 0, 1]) =>
  Buffer.concat(units.flatMap(unit => [Buffer.from(startCode), unit]));

const fakeDavey = {
  DAVE_PROTOCOL_VERSION: 1,
  MediaType: { AUDIO: 0, VIDEO: 1 },
  Codec: { H264: 4 },
  DAVESession: class {
    constructor(...args) {
      this.args = args;
      this.ready = true;
      this.voicePrivacyCode = '';
    }
    getSerializedKeyPackage() {
      return Buffer.from('key-package');
    }
    setExternalSender() {}
    processProposals() {
      return { commit: Buffer.from('commit'), welcome: Buffer.from('welcome') };
    }
    processCommit() {}
    processWelcome() {}
    reinit() {}
    reset() {}
    setPassthroughMode() {}
    canPassthrough() {
      return true;
    }
    encrypt(_type, _codec, frame) {
      return Buffer.concat([frame, TRAILER]);
    }
    decrypt(_userId, _type, frame) {
      if (!frame.subarray(-TRAILER.length).equals(TRAILER)) throw new Error('not encrypted');
      return frame.subarray(0, frame.length - TRAILER.length);
    }
  },
};

test('stream keys: guild, call and test keys parse and format, anything else is rejected', () => {
  assert.deepEqual(GoLiveStream.parseKey('guild:1:2:3'), { type: 'guild', guildId: '1', channelId: '2', ownerId: '3' });
  assert.deepEqual(GoLiveStream.parseKey('call:2:3'), { type: 'call', guildId: null, channelId: '2', ownerId: '3' });
  assert.deepEqual(GoLiveStream.parseKey('test:3'), { type: 'test', guildId: null, channelId: null, ownerId: '3' });
  assert.equal(GoLiveStream.formatKey({ type: 'guild', guildId: '1', channelId: '2', ownerId: '3' }), 'guild:1:2:3');
  assert.equal(GoLiveStream.formatKey({ type: 'call', channelId: '2', ownerId: '3' }), 'call:2:3');
  for (const key of ['guild:1:2', 'call:2', 'guild:1::3', 'voice:1:2:3', '', null]) {
    assert.throws(() => GoLiveStream.parseKey(key), { code: 'StreamKeyInvalid' }, String(key));
  }
});

test('the access unit reader splits an Annex-B stream into frames, whatever the chunk boundaries', () => {
  const stream = Buffer.concat([
    annexB([Buffer.from([0x09, 0xf0]), SPS, PPS, idrSlice(3000), idrSecondSlice]),
    annexB([pSlice(1)], [0, 0, 1]),
    annexB([Buffer.from([0x09, 0xf0]), pSlice(2)]),
  ]);
  for (const size of [1, 2, 3, 5, 64, 4096]) {
    const reader = new H264.AccessUnitReader();
    const frames = [];
    for (let offset = 0; offset < stream.length; offset += size)
      frames.push(...reader.push(stream.subarray(offset, offset + size)));
    frames.push(...reader.end());
    assert.deepEqual(
      frames.map(frame => [frame.keyframe, frame.units.map(H264.nalType)]),
      [
        [true, [7, 8, 5, 5]],
        [false, [1]],
        [false, [1]],
      ],
      `chunks of ${size}`,
    );
  }
});

test('packetizing and depacketizing gives back the exact frame, trailer and sequence wrap included', () => {
  const units = [SPS, PPS, idrSlice(5000)];
  const encrypted = Buffer.concat([H264.toAnnexB(units), TRAILER]);
  const wire = H264.splitByLayout(encrypted, units);
  assert.equal(wire.length, 3);
  assert.ok(wire[2].subarray(-TRAILER.length).equals(TRAILER), 'the trailer stays on the last unit');
  assert.equal(H264.splitByLayout(Buffer.from([1, 2, 3]), units), null);

  const payloads = H264.packetize(wire);
  assert.ok(payloads.length > 3, 'the large slice is fragmented');
  assert.ok(payloads.every(payload => payload.length <= H264.MAX_PAYLOAD));
  const depacketizer = new H264.H264Depacketizer();
  // A frame ends at 65_533, so the next one starts at 65_534 and wraps through 0.
  assert.ok(depacketizer.push({ sequence: 65_533, timestamp: 800, marker: true }, SPS).equals(H264.toAnnexB([SPS])));
  let frame = null;
  // Fully out of order: the marker packet arrives first.
  const order = payloads.map((payload, index) => ({ payload, sequence: (65_534 + index) & 0xffff, index })).reverse();
  for (const { payload, sequence, index } of order) {
    frame = depacketizer.push({ sequence, timestamp: 900, marker: index === payloads.length - 1 }, payload) ?? frame;
  }
  assert.ok(frame.equals(encrypted));
  assert.equal(depacketizer.framesLost, 0);

  // A missing packet drops the frame.
  const lossy = new H264.H264Depacketizer();
  assert.equal(lossy.push({ sequence: 9, timestamp: 1, marker: true }, payloads.at(-1)), null, 'waits for the rest');
  assert.ok(lossy.push({ sequence: 10, timestamp: 2, marker: true }, SPS), 'the next frame still comes out');
  assert.equal(lossy.framesLost, 1);

  // STAP-A aggregates small units.
  const stap = Buffer.concat([Buffer.from([0x78, 0, SPS.length]), SPS, Buffer.from([0, PPS.length]), PPS]);
  const stapFrame = new H264.H264Depacketizer().push({ sequence: 1, timestamp: 2, marker: true }, stap);
  assert.ok(stapFrame.equals(H264.toAnnexB([SPS, PPS])));
});

test('rtpsize encryption authenticates the header and extension header, and RTCP keeps 8 bytes clear', () => {
  const key = crypto.randomBytes(32);
  const sender = new RtpCrypto(key);
  const receiver = new RtpCrypto(key);
  const header = rtpHeader({ payloadType: 101, sequence: 7, timestamp: 9000, ssrc: 42, marker: true });
  const packet = sender.encryptRtp(header, Buffer.from('payload'));
  const opened = receiver.decryptRtp(packet);
  assert.deepEqual(
    { ...opened.header, payload: opened.payload.toString() },
    {
      padding: false,
      extension: false,
      csrcCount: 0,
      marker: true,
      payloadType: 101,
      sequence: 7,
      timestamp: 9000,
      ssrc: 42,
      payload: 'payload',
    },
  );
  const tampered = Buffer.from(packet);
  tampered[3] ^= 1;
  assert.equal(receiver.decryptRtp(tampered), null);

  // With a one-byte header extension: the 0xBEDE header is authenticated, its body is encrypted and then dropped.
  const extended = Buffer.from(header);
  extended[0] |= 0x10;
  const extensionHeader = Buffer.from([0xbe, 0xde, 0, 1]);
  const extensionBody = Buffer.from([0x60, 0, 0, 0]);
  const withExtension = sender.seal(
    Buffer.concat([extended, extensionHeader]),
    Buffer.concat([extensionBody, Buffer.from('video')]),
  );
  assert.equal(receiver.decryptRtp(withExtension).payload.toString(), 'video');

  const report = senderReport({ ssrc: 42, rtpTimestamp: 9000, packetCount: 3, octetCount: 99, now: 0 });
  assert.equal(report[1], 200);
  assert.equal(report.readUInt32BE(4), 42);
  assert.equal(report.readUInt32BE(8), 2_208_988_800);
  const sealed = sender.encryptRtcp(report);
  assert.ok(sealed.subarray(0, 8).equals(report.subarray(0, 8)));
  assert.equal(sealed.length, report.length + 16 + 4);
});

function mediaConnection(role) {
  const connection = new MediaConnection({
    endpoint: 'rtc.example',
    token: 'token',
    serverId: '500',
    sessionId: 'voice-session',
    userId: '1',
    daveGroupId: '499',
    role,
    video: { width: 640, height: 360, fps: 15, maxBitrate: 1_000_000 },
    davey: fakeDavey,
  });
  const sent = [];
  connection.send = (op, data) => sent.push([op, data]);
  connection.sendBinary = (op, payload) => sent.push([op, payload.toString()]);
  connection.udpSent = [];
  connection.sendUdp = packet => connection.udpSent.push(packet);
  Object.assign(connection, {
    audioSsrc: 11,
    videoSsrc: 12,
    rtxSsrc: 13,
    layer: { type: 'video', rid: '100', ssrc: 12, rtx_ssrc: 13 },
  });
  return { connection, sent };
}

const description = {
  mode: 'aead_aes256_gcm_rtpsize',
  secret_key: [...Buffer.alloc(32, 7)],
  video_codec: 'H264',
  dave_protocol_version: 1,
};

test('a stream owner identifies with video, announces stream audio and its layer, then sends encrypted frames', () => {
  const { connection, sent } = mediaConnection('owner');
  connection.identify();
  assert.deepEqual(sent.shift(), [
    VoiceOpcodes.Identify,
    {
      server_id: '500',
      user_id: '1',
      session_id: 'voice-session',
      token: 'token',
      video: true,
      streams: [{ type: 'screen', rid: '100', quality: 100 }],
      max_dave_protocol_version: 1,
    },
  ]);
  let ready = null;
  connection.on('ready', info => {
    ready = info;
  });
  connection.onSessionDescription(description);
  assert.deepEqual(ready, { videoCodec: 'H264', audioCodec: null, daveProtocolVersion: 1 });
  assert.deepEqual(connection.dave.session.args, [1, '1', '499'], 'the stream group, not the channel');
  assert.deepEqual(
    sent.map(([op]) => op),
    [VoiceOpcodes.DaveMlsKeyPackage, VoiceOpcodes.Speaking, VoiceOpcodes.Video],
  );
  assert.deepEqual(sent[1][1], { speaking: 2, delay: 0, ssrc: 11 });
  assert.deepEqual(sent[2][1], {
    audio_ssrc: 11,
    video_ssrc: 12,
    rtx_ssrc: 13,
    streams: [
      {
        type: 'video',
        rid: '100',
        ssrc: 12,
        rtx_ssrc: 13,
        active: true,
        quality: 100,
        max_bitrate: 1_000_000,
        max_framerate: 15,
        max_resolution: { type: 'fixed', width: 640, height: 360 },
      },
    ],
  });
  clearInterval(connection.senderReports);

  const units = [SPS, PPS, idrSlice(3000)];
  assert.equal(connection.sendFrame(units, 3000), true);
  const receiver = new RtpCrypto(Buffer.alloc(32, 7));
  const depacketizer = new H264.H264Depacketizer();
  let frame = null;
  for (const packet of connection.udpSent) {
    const { header, payload } = receiver.decryptRtp(packet);
    assert.equal(header.ssrc, 12);
    assert.equal(header.payloadType, 101);
    frame = depacketizer.push(header, payload) ?? frame;
  }
  assert.ok(frame.equals(Buffer.concat([H264.toAnnexB(units), TRAILER])), 'the frame went out end-to-end encrypted');
  assert.equal(connection.stats.framesEncrypted, 1);
  assert.equal(connection.stats.layoutFallbacks, 0);
  connection.destroy();
});

test('a viewer announces nothing, asks for the owner’s video, and gets decrypted frames', () => {
  const { connection, sent } = mediaConnection('viewer');
  connection.onSessionDescription(description);
  assert.deepEqual(sent.slice(1), [
    [VoiceOpcodes.Speaking, { speaking: 0, delay: 0, ssrc: 11 }],
    [VoiceOpcodes.Video, { audio_ssrc: 11, video_ssrc: 0, rtx_ssrc: 0, streams: [] }],
    [VoiceOpcodes.MediaSinkWants, { any: 100 }],
  ]);
  connection.onPacket({
    op: VoiceOpcodes.Video,
    d: { user_id: '2', audio_ssrc: 20, video_ssrc: 21, streams: [{ ssrc: 21, active: true }] },
  });
  assert.deepEqual(sent.at(-1), [VoiceOpcodes.MediaSinkWants, { any: 100, 21: 100 }]);

  const frames = [];
  connection.on('frame', frame => frames.push(frame));
  const owner = new RtpCrypto(Buffer.alloc(32, 7));
  const units = [SPS, PPS, idrSlice(2500)];
  const payloads = H264.packetize(H264.splitByLayout(Buffer.concat([H264.toAnnexB(units), TRAILER]), units));
  for (const [index, payload] of payloads.entries()) {
    const header = rtpHeader({
      payloadType: 101,
      sequence: index,
      timestamp: 90,
      ssrc: 21,
      marker: index === payloads.length - 1,
    });
    connection.onUdp(owner.encryptRtp(header, payload));
  }
  // An SSRC nobody announced is ignored.
  connection.onUdp(
    owner.encryptRtp(rtpHeader({ payloadType: 101, sequence: 1, timestamp: 1, ssrc: 99, marker: true }), SPS),
  );
  // After a lost frame, frames wait for the next keyframe.
  const sendFrame = (frameUnits, sequence, timestamp) => {
    const parts = H264.packetize(H264.splitByLayout(Buffer.concat([H264.toAnnexB(frameUnits), TRAILER]), frameUnits));
    for (const [index, payload] of parts.entries()) {
      const header = rtpHeader({
        payloadType: 101,
        sequence: sequence + index,
        timestamp,
        ssrc: 21,
        marker: index === parts.length - 1,
      });
      connection.onUdp(owner.encryptRtp(header, payload));
    }
    return sequence + parts.length;
  };
  let next = sendFrame([pSlice(1)], payloads.length, 180);
  // One packet (so one frame) goes missing here.
  next = sendFrame([pSlice(2)], next + 1, 270);
  next = sendFrame([pSlice(3)], next, 360);
  sendFrame([SPS, PPS, idrSlice(100)], next, 450);
  assert.deepEqual(
    frames.map(frame => [frame.userId, frame.timestamp, frame.keyframe]),
    [
      ['2', 90, true],
      ['2', 180, false],
      ['2', 450, true],
    ],
  );
  assert.ok(frames[0].frame.equals(H264.toAnnexB(units)));
  assert.deepEqual([connection.stats.framesLost, connection.stats.framesSkipped], [1, 1]);

  connection.onPacket({ op: VoiceOpcodes.ClientDisconnect, d: { user_id: '2' } });
  assert.equal(connection.videoUsers.size, 0);
  connection.destroy();
});

test('the stream connection answers DAVE proposals, transitions and welcomes', () => {
  const { connection, sent } = mediaConnection('viewer');
  connection.onSessionDescription(description);
  sent.length = 0;
  const transitions = [];
  connection.on('transitioned', id => transitions.push(id));
  connection.onPacket({ op: VoiceOpcodes.ClientsConnect, d: { user_ids: ['2'] } });
  connection.onBinary(VoiceOpcodes.DaveMlsProposals, Buffer.from([0, 1, 2]));
  connection.onPacket({ op: VoiceOpcodes.DavePrepareTransition, d: { transition_id: 4, protocol_version: 1 } });
  connection.onPacket({ op: VoiceOpcodes.DaveExecuteTransition, d: { transition_id: 4 } });
  connection.onBinary(VoiceOpcodes.DaveMlsWelcome, Buffer.from([0, 0, 9]));
  assert.deepEqual(sent, [
    [VoiceOpcodes.DaveMlsCommitWelcome, 'commitwelcome'],
    [VoiceOpcodes.DaveTransitionReady, { transition_id: 4 }],
  ]);
  assert.deepEqual(transitions, [4, 0]);
  connection.destroy();
});

// A logged-in client in a guild with a voice channel, connected to it.
function streamingClient({ ownerStreaming = false } = {}) {
  const client = new Client();
  handlers.READY(
    client,
    { d: { user: { id: '1', username: 'me' }, guilds: [], users: [{ id: '2', username: 'friend' }] } },
    readyShard,
  );
  client.guilds._add({
    id: '10',
    name: 'G',
    channels: [{ id: '11', type: ChannelType.GuildVoice, name: 'voice', guild_id: '10' }],
    voice_states: [
      { user_id: '1', channel_id: '11', session_id: 'voice-session', self_video: false, self_stream: false },
      { user_id: '2', channel_id: '11', session_id: 'other', self_video: false, self_stream: ownerStreaming },
    ],
  });
  const ops = [];
  client.ws.shards.set(0, { id: 0, send: payload => ops.push(payload) });
  client.streams._davey = fakeDavey;
  const media = [];
  client.streams._createConnection = options => {
    const connection = new EventEmitter();
    Object.assign(connection, {
      options,
      frames: [],
      destroyed: false,
      stats: { framesSent: 0 },
      connect() {
        setImmediate(() =>
          connection.emit('ready', { videoCodec: 'H264', audioCodec: 'opus', daveProtocolVersion: 1 }),
        );
      },
      sendFrame(units, timestamp) {
        connection.frames.push({ types: units.map(H264.nalType), timestamp });
        return true;
      },
      destroy() {
        connection.destroyed = true;
      },
    });
    media.push(connection);
    return connection;
  };
  const dispatch = (t, d) => handlers[t](client, { t, d }, readyShard);
  return { client, ops, media, dispatch };
}

const created = key => ({
  stream_key: key,
  rtc_server_id: '900',
  rtc_channel_id: '901',
  region: 'rotterdam',
  viewer_ids: [],
  paused: false,
});
const server = (key, endpoint = 'rtc-1.example') => ({
  stream_key: key,
  endpoint,
  token: 'stream-token',
  guild_id: null,
});

test('goLive checks the voice connection and permission, then opens the stream and its media', async () => {
  const { client, ops, media, dispatch } = streamingClient();
  const events = [];
  client.on(Events.StreamCreate, stream => events.push(['create', stream.key]));

  client.guilds.cache.get('10').voiceStates.cache.get('1').channelId = null;
  await assert.rejects(client.streams.goLive('11'), { code: 'StreamNotInVoiceChannel' });
  client.guilds.cache.get('10').voiceStates.cache.get('1').channelId = '11';
  const channel = client.channels.cache.get('11');
  channel.permissionsFor = () => ({ has: () => false });
  await assert.rejects(client.streams.goLive(channel), { code: 'StreamMissingPermission' });
  delete channel.permissionsFor;

  const live = client.streams.goLive(channel, { width: 640, height: 360, fps: 15 });
  await tick();
  assert.deepEqual(ops.shift(), {
    op: 18,
    d: { type: 'guild', guild_id: '10', channel_id: '11', preferred_region: null },
  });
  const key = 'guild:10:11:1';
  // The server update may come first.
  dispatch('STREAM_SERVER_UPDATE', server(key));
  dispatch('STREAM_CREATE', created(key));
  const broadcast = await live;
  assert.ok(broadcast instanceof StreamBroadcast);
  assert.equal(broadcast.stream.rtcServerId, '900');
  assert.deepEqual(events, [['create', key]]);
  assert.deepEqual(
    {
      ...media[0].options,
      davey: undefined,
    },
    {
      endpoint: 'rtc-1.example',
      token: 'stream-token',
      serverId: '900',
      sessionId: 'voice-session',
      userId: '1',
      daveGroupId: '899',
      role: 'owner',
      video: { width: 640, height: 360, fps: 15, maxBitrate: 2_500_000 },
      davey: undefined,
    },
  );
  await assert.rejects(client.streams.goLive(channel), { code: 'StreamAlreadyOpen' });

  // Pausing brings a server update for the same server: no reconnect. A new server: reconnect.
  broadcast.setPaused(true);
  assert.deepEqual(ops.shift(), { op: 22, d: { stream_key: key, paused: true } });
  dispatch('STREAM_SERVER_UPDATE', server(key));
  assert.equal(media.length, 1);
  dispatch('STREAM_SERVER_UPDATE', server(key, 'rtc-2.example'));
  assert.equal(media.length, 2);
  assert.equal(media[0].destroyed, true);
  await tick();

  const ended = [];
  broadcast.on('end', reason => ended.push(reason));
  broadcast.end();
  assert.deepEqual(ops.shift(), { op: 19, d: { stream_key: key } });
  assert.deepEqual(ended, ['user_requested']);
  dispatch('STREAM_DELETE', { stream_key: key, reason: 'user_requested' });
  assert.equal(client.streams.cache.size, 0);
});

test('play paces H264 frames by fps, starts at a keyframe, and skips video while paused', async () => {
  const { client, media, dispatch } = streamingClient();
  const live = client.streams.goLive('11', { fps: 1000 });
  await tick();
  dispatch('STREAM_CREATE', created('guild:10:11:1'));
  dispatch('STREAM_SERVER_UPDATE', server('guild:10:11:1'));
  const broadcast = await live;
  const video = Buffer.concat([
    annexB([pSlice(1)]),
    annexB([SPS, PPS, idrSlice(200)]),
    annexB([pSlice(2)]),
    annexB([pSlice(3)]),
  ]);
  await broadcast.play(Readable.from([video.subarray(0, 50), video.subarray(50)]));
  const frames = media[0].frames;
  assert.deepEqual(
    frames.map(frame => frame.types),
    [[7, 8, 5], [1], [1]],
    'the leading non-keyframe is skipped',
  );
  // 90 kHz / 1000 fps = 90 ticks per frame, counting the skipped one.
  assert.deepEqual(
    frames.slice(1).map((frame, index) => (frame.timestamp - frames[index].timestamp) >>> 0),
    [90, 90],
  );
  const second = broadcast.play(Readable.from([video]));
  await assert.rejects(broadcast.play(Readable.from([])), { code: 'StreamAlreadyPlaying' });
  await second;
  broadcast.setPaused(true);
  await broadcast.play(Readable.from([video]));
  assert.equal(frames.length, 3 + 3, 'each input starts again at its keyframe, and nothing is sent while paused');
  broadcast.end();
  client.destroy();
});

test('watch opens another member’s stream, relays its frames, and stop leaves it', async () => {
  const { client, ops, media, dispatch } = streamingClient({ ownerStreaming: true });
  const ownerState = client.guilds.cache.get('10').voiceStates.cache.get('2');
  assert.equal(ownerState.streamKey, 'guild:10:11:2');
  assert.equal(client.guilds.cache.get('10').voiceStates.cache.get('1').streamKey, null);
  await assert.rejects(client.streams.watch('guild:10:11:1'), { code: 'StreamWatchOwn' });
  await assert.rejects(client.streams.watch('call:5:2'), { code: 'StreamTypeUnsupported' });

  const watching = client.streams.watch(ownerState);
  await tick();
  assert.deepEqual(ops.shift(), { op: 20, d: { stream_key: 'guild:10:11:2' } });
  dispatch('STREAM_CREATE', created('guild:10:11:2'));
  dispatch('STREAM_SERVER_UPDATE', server('guild:10:11:2'));
  const viewer = await watching;
  assert.ok(viewer instanceof StreamViewer);
  assert.equal(media[0].options.role, 'viewer');
  const frames = [];
  viewer.on('frame', frame => frames.push(frame.userId));
  media[0].emit('frame', { userId: '2', frame: Buffer.alloc(1), keyframe: true, timestamp: 0 });
  assert.deepEqual(frames, ['2']);

  const updates = [];
  client.on(Events.StreamUpdate, (oldStream, newStream) => updates.push([oldStream.viewerIds, newStream.viewerIds]));
  dispatch('STREAM_UPDATE', { stream_key: 'guild:10:11:2', viewer_ids: ['1'], paused: false, region: 'rotterdam' });
  assert.deepEqual(updates, [[[], ['1']]]);
  assert.equal(client.streams.cache.get('guild:10:11:2').rtcServerId, '900', 'updates keep the RTC server');

  viewer.stop();
  assert.deepEqual(ops.shift(), { op: 19, d: { stream_key: 'guild:10:11:2' } });
  assert.equal(viewer.ended, true);
});

test('a refused stream rejects with its reason, and a failed media connection ends the stream', async () => {
  const { client, ops, media, dispatch } = streamingClient();
  const refused = client.streams.goLive('11');
  await tick();
  dispatch('STREAM_DELETE', { stream_key: 'guild:10:11:1', reason: 'unauthorized' });
  await assert.rejects(refused, { code: 'StreamRefused', message: /unauthorized/ });

  client.streams._createConnection = () => {
    const connection = new EventEmitter();
    connection.connect = () => setImmediate(() => connection.emit('close', 4017));
    connection.destroy = () => {};
    media.push(connection);
    return connection;
  };
  ops.length = 0;
  const failing = client.streams.goLive('11');
  await tick();
  dispatch('STREAM_CREATE', created('guild:10:11:1'));
  dispatch('STREAM_SERVER_UPDATE', server('guild:10:11:1'));
  await assert.rejects(failing, { code: 'StreamConnectionFailed', message: /4017/ });
  assert.deepEqual(ops.at(-1), { op: 19, d: { stream_key: 'guild:10:11:1' } }, 'no stream is left without media');

  client.streams._davey = undefined;
  client.streams._requireDavey = () => {
    throw new Error("Cannot find module '@snazzah/davey'");
  };
  await assert.rejects(client.streams.goLive('11'), { code: 'StreamDaveMissing' });
});

test('stream previews, and an account switch ends every session', async () => {
  const { client, dispatch } = streamingClient({ ownerStreaming: true });
  const routes = [];
  client.rest.get = async route => {
    routes.push(['get', route]);
    return { url: 'https://cdn.example/preview.jpg' };
  };
  client.rest.post = async (route, { body: payload }) => routes.push(['post', route, payload.thumbnail.slice(0, 11)]);
  assert.equal(
    await client.streams.fetchPreview(client.guilds.cache.get('10').voiceStates.cache.get('2')),
    'https://cdn.example/preview.jpg',
  );

  const live = client.streams.goLive('11');
  await tick();
  dispatch('STREAM_CREATE', created('guild:10:11:1'));
  dispatch('STREAM_SERVER_UPDATE', server('guild:10:11:1'));
  const broadcast = await live;
  await broadcast.setPreview(Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
  assert.deepEqual(routes, [
    ['get', '/streams/guild:10:11:2/preview'],
    ['post', '/streams/guild:10:11:1/preview', 'data:image/'],
  ]);

  const ended = [];
  broadcast.on('end', reason => ended.push(reason));
  client._clearAccountState();
  assert.deepEqual(ended, ['client_destroyed']);
  assert.equal(client.streams.cache.size, 0);
});

test('before the stream group is ready, encrypted video is neither shown nor sent in the clear', () => {
  const { connection: viewer } = mediaConnection('viewer');
  viewer.onSessionDescription(description);
  viewer.onPacket({ op: VoiceOpcodes.Video, d: { user_id: '2', video_ssrc: 21 } });
  viewer.dave.session.ready = false;
  const frames = [];
  viewer.on('frame', frame => frames.push(frame.keyframe));
  const owner = new RtpCrypto(Buffer.alloc(32, 7));
  let sequence = 0;
  const receive = units => {
    for (const [index, payload] of H264.packetize(units).entries()) {
      const marker = index === H264.packetize(units).length - 1;
      viewer.onUdp(
        owner.encryptRtp(
          rtpHeader({ payloadType: 101, sequence: sequence++, timestamp: sequence, ssrc: 21, marker }),
          payload,
        ),
      );
    }
  };
  const keyframe = [SPS, PPS, idrSlice(300)];
  // Encrypted (it ends with the DAVE marker): dropped while the group is not ready, even though the IDR header shows.
  receive(H264.splitByLayout(Buffer.concat([H264.toAnnexB(keyframe), TRAILER]), keyframe));
  assert.deepEqual(frames, []);
  assert.equal(viewer.stats.framesUndecryptable, 1);
  viewer.dave.session.ready = true;
  receive(H264.splitByLayout(Buffer.concat([H264.toAnnexB(keyframe), TRAILER]), keyframe));
  assert.deepEqual(frames, [true]);
  viewer.destroy();

  const { connection: sender } = mediaConnection('owner');
  sender.onSessionDescription(description);
  clearInterval(sender.senderReports);
  sender.dave.session.ready = false;
  assert.equal(sender.sendFrame(keyframe, 0), false);
  assert.deepEqual([sender.udpSent.length, sender.stats.framesHeld], [0, 1]);
  sender.dave.session.ready = true;
  assert.equal(sender.sendFrame(keyframe, 0), true);
  sender.destroy();
});

test('a held frame makes the broadcast wait for the next keyframe, and READY ends the old session’s streams', async () => {
  const { client, media, dispatch } = streamingClient();
  const live = client.streams.goLive('11', { fps: 1000 });
  await tick();
  dispatch('STREAM_CREATE', created('guild:10:11:1'));
  dispatch('STREAM_SERVER_UPDATE', server('guild:10:11:1'));
  const broadcast = await live;
  const connection = media[0];
  let refuse = 1;
  const send = connection.sendFrame;
  connection.sendFrame = (units, timestamp) => (refuse-- > 0 ? false : send(units, timestamp));
  await broadcast.play(
    Readable.from([
      Buffer.concat([
        annexB([SPS, PPS, idrSlice(100)]),
        annexB([pSlice(1)]),
        annexB([SPS, PPS, idrSlice(120)]),
        annexB([pSlice(2)]),
      ]),
    ]),
  );
  assert.deepEqual(
    connection.frames.map(frame => frame.types),
    [[7, 8, 5], [1]],
    'the P frame after the held keyframe is skipped',
  );

  const ended = [];
  broadcast.on('end', reason => ended.push(reason));
  handlers.READY(client, { d: { user: { id: '1', username: 'me' }, guilds: [] } }, readyShard);
  assert.deepEqual(ended, ['session_replaced']);
  assert.equal(client.streams.cache.size, 0);
});
