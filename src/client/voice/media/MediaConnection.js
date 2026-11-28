'use strict';

const { Buffer } = require('node:buffer');
const crypto = require('node:crypto');
const dgram = require('node:dgram');
const EventEmitter = require('node:events');
const { isIPv4 } = require('node:net');
const { clearInterval, clearTimeout, setInterval, setTimeout } = require('node:timers');
const { DaveSession, loadDavey } = require('./Dave');
const { H264Depacketizer, NalType, nalType, packetize, splitAnnexB, splitByLayout, toAnnexB } = require('./H264');
const { RtpCrypto, rtpHeader, senderReport } = require('./Rtp');

const VoiceOpcodes = {
  Identify: 0,
  SelectProtocol: 1,
  Ready: 2,
  Heartbeat: 3,
  SessionDescription: 4,
  Speaking: 5,
  Hello: 8,
  ClientsConnect: 11,
  Video: 12,
  ClientDisconnect: 13,
  MediaSinkWants: 15,
  DavePrepareTransition: 21,
  DaveExecuteTransition: 22,
  DaveTransitionReady: 23,
  DavePrepareEpoch: 24,
  DaveMlsExternalSender: 25,
  DaveMlsKeyPackage: 26,
  DaveMlsProposals: 27,
  DaveMlsCommitWelcome: 28,
  DaveMlsAnnounceCommitTransition: 29,
  DaveMlsWelcome: 30,
  DaveMlsInvalidCommitWelcome: 31,
};

const ENCRYPTION_MODE = 'aead_aes256_gcm_rtpsize';
const OPUS_PAYLOAD_TYPE = 120;
const H264_PAYLOAD_TYPE = 101;
const H264_RTX_PAYLOAD_TYPE = 102;
const VIDEO_CLOCK_RATE = 90_000;
const KEEP_ALIVE_INTERVAL = 5_000;
const SENDER_REPORT_INTERVAL = 5_000;
const DISCOVERY_TIMEOUT = 10_000;
const SpeakingFlags = { None: 0, Soundshare: 1 << 1 };
// What the official client offers on a stream connection: one screen layer at full quality.
const STREAM_LAYERS = [{ type: 'screen', rid: '100', quality: 100 }];
const CODECS = [
  { name: 'opus', type: 'audio', priority: 1000, payload_type: OPUS_PAYLOAD_TYPE },
  {
    name: 'H264',
    type: 'video',
    priority: 1000,
    payload_type: H264_PAYLOAD_TYPE,
    rtx_payload_type: H264_RTX_PAYLOAD_TYPE,
    encode: true,
    decode: true,
  },
];

/**
 * A media connection to one RTC server: its voice gateway WebSocket, the UDP transport and the end-to-end encrypted
 * (DAVE) group. The owner of a stream sends H264 frames over it and a viewer receives them.
 * @private
 */
class MediaConnection extends EventEmitter {
  /**
   * @param {Object} options The connection options
   * @param {string} options.endpoint The RTC server host
   * @param {string} options.token The RTC server token
   * @param {string} options.serverId The RTC server id
   * @param {string} options.sessionId The voice session id
   * @param {string} options.userId The client user's id
   * @param {string} options.daveGroupId The id of the DAVE (MLS) group
   * @param {'owner'|'viewer'} options.role Whether this connection sends or receives the stream
   * @param {Object} [options.video] For the owner: `width`, `height`, `fps` and `maxBitrate`
   * @param {Object} [options.davey] The `@snazzah/davey` module
   */
  constructor(options) {
    super();
    this.options = options;
    this.davey = options.davey ?? loadDavey();
    this.ws = null;
    this.udp = null;
    this.remote = null;
    this.sequenceAck = -1;
    this.heartbeat = null;
    this.keepAlive = null;
    this.keepAliveCounter = 0;
    this.senderReports = null;
    this.pendingDiscovery = null;
    this.ready = false;
    this.audioSsrc = 0;
    this.videoSsrc = 0;
    this.rtxSsrc = 0;
    this.layer = null;
    this.crypto = null;
    this.dave = null;
    this.description = null;
    this.connectedClients = new Set();
    this.videoUsers = new Map();
    this.depacketizers = new Map();
    // SSRCs whose next frame must be a keyframe: at the start, and after a lost or undecryptable frame.
    this.awaitingKeyframe = new Set();
    this.sequence = crypto.randomInt(0, 2 ** 16);
    this.packetCount = 0;
    this.octetCount = 0;
    this.lastFrame = null;
    this.closed = false;
    this.stats = {
      framesSent: 0,
      framesEncrypted: 0,
      layoutFallbacks: 0,
      packetsReceived: 0,
      framesReceived: 0,
      framesLost: 0,
      framesUndecryptable: 0,
      framesSkipped: 0,
      framesHeld: 0,
    };
  }

  /**
   * Opens the voice gateway WebSocket.
   */
  connect() {
    const ws = new WebSocket(`wss://${this.options.endpoint}/?v=8`);
    ws.binaryType = 'arraybuffer';
    ws.addEventListener('open', () => this.identify());
    ws.addEventListener('message', event => this.onMessage(event.data));
    ws.addEventListener('close', event => this.onClose(event.code));
    // A close event always follows an error.
    ws.addEventListener('error', () => {});
    this.ws = ws;
  }

  send(op, data) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ op, d: data }));
  }

  sendBinary(op, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(Buffer.concat([Buffer.from([op]), payload]));
  }

  identify() {
    this.send(VoiceOpcodes.Identify, {
      server_id: this.options.serverId,
      user_id: this.options.userId,
      session_id: this.options.sessionId,
      token: this.options.token,
      video: true,
      streams: STREAM_LAYERS,
      max_dave_protocol_version: this.davey.DAVE_PROTOCOL_VERSION,
    });
  }

  onMessage(data) {
    if (typeof data === 'string') {
      let packet;
      try {
        packet = JSON.parse(data);
      } catch {
        return;
      }
      if (typeof packet.seq === 'number') this.sequenceAck = packet.seq;
      this.onPacket(packet);
      return;
    }
    const buffer = Buffer.from(data);
    if (buffer.length < 3) return;
    this.sequenceAck = buffer.readUInt16BE(0);
    this.onBinary(buffer.readUInt8(2), buffer.subarray(3));
  }

  onPacket({ op, d: data }) {
    switch (op) {
      case VoiceOpcodes.Hello:
        clearInterval(this.heartbeat);
        this.heartbeat = setInterval(
          () => this.send(VoiceOpcodes.Heartbeat, { t: Date.now(), seq_ack: this.sequenceAck }),
          data.heartbeat_interval,
        ).unref();
        break;
      case VoiceOpcodes.Ready:
        this.onReady(data);
        break;
      case VoiceOpcodes.SessionDescription:
        this.onSessionDescription(data);
        break;
      case VoiceOpcodes.ClientsConnect:
        for (const id of data.user_ids ?? []) this.connectedClients.add(id);
        break;
      case VoiceOpcodes.ClientDisconnect:
        this.connectedClients.delete(data.user_id);
        for (const [ssrc, id] of this.videoUsers) {
          if (id !== data.user_id) continue;
          this.videoUsers.delete(ssrc);
          this.depacketizers.delete(ssrc);
          this.awaitingKeyframe.delete(ssrc);
        }
        break;
      case VoiceOpcodes.Video:
        this.onVideo(data);
        break;
      case VoiceOpcodes.DavePrepareTransition:
        if (this.dave?.prepareTransition(data)) {
          this.send(VoiceOpcodes.DaveTransitionReady, { transition_id: data.transition_id });
        }
        if (data.transition_id === 0) this.emit('transitioned', 0);
        break;
      case VoiceOpcodes.DaveExecuteTransition:
        if (this.dave?.executeTransition(data.transition_id)) this.emit('transitioned', data.transition_id);
        break;
      case VoiceOpcodes.DavePrepareEpoch:
        this.dave?.prepareEpoch(data);
        break;
      default:
    }
  }

  onBinary(op, payload) {
    if (!this.dave) return;
    switch (op) {
      case VoiceOpcodes.DaveMlsExternalSender:
        this.dave.setExternalSender(payload);
        break;
      case VoiceOpcodes.DaveMlsProposals: {
        const reply = this.dave.processProposals(payload, this.connectedClients);
        if (reply) this.sendBinary(VoiceOpcodes.DaveMlsCommitWelcome, reply);
        break;
      }
      case VoiceOpcodes.DaveMlsAnnounceCommitTransition:
      case VoiceOpcodes.DaveMlsWelcome: {
        const { transitionId, success } =
          op === VoiceOpcodes.DaveMlsWelcome ? this.dave.processWelcome(payload) : this.dave.processCommit(payload);
        if (!success) break;
        if (transitionId === 0) this.emit('transitioned', 0);
        else this.send(VoiceOpcodes.DaveTransitionReady, { transition_id: transitionId });
        break;
      }
      default:
    }
  }

  onReady({ ssrc, ip, port, modes, streams }) {
    if (!modes?.includes(ENCRYPTION_MODE)) {
      this.fail(new Error(`The RTC server offers no supported encryption mode (needs ${ENCRYPTION_MODE}).`));
      return;
    }
    this.audioSsrc = ssrc;
    this.layer = streams?.[0] ?? null;
    this.videoSsrc = this.layer?.ssrc ?? 0;
    this.rtxSsrc = this.layer?.rtx_ssrc ?? (this.videoSsrc ? this.videoSsrc + 1 : 0);
    this.remote = { ip, port };
    const udp = dgram.createSocket('udp4');
    udp.on('message', message => this.onUdp(message));
    udp.on('error', error => this.emit('error', error));
    this.udp = udp;
    this.keepAlive = setInterval(() => this.sendKeepAlive(), KEEP_ALIVE_INTERVAL).unref();
    this.discoverAddress(ssrc).then(
      local =>
        this.send(VoiceOpcodes.SelectProtocol, {
          protocol: 'udp',
          data: { address: local.ip, port: local.port, mode: ENCRYPTION_MODE },
          codecs: CODECS,
          rtc_connection_id: crypto.randomUUID(),
        }),
      error => this.fail(error),
    );
  }

  discoverAddress(ssrc) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingDiscovery = null;
        reject(new Error('The RTC server did not answer IP discovery.'));
      }, DISCOVERY_TIMEOUT).unref();
      this.pendingDiscovery = { resolve, reject, timer };
      const request = Buffer.alloc(74);
      request.writeUInt16BE(1, 0);
      request.writeUInt16BE(70, 2);
      request.writeUInt32BE(ssrc, 4);
      this.sendUdp(request);
    });
  }

  onSessionDescription(data) {
    if (this.ready) return;
    this.crypto = new RtpCrypto(data.secret_key);
    this.description = {
      videoCodec: data.video_codec ?? null,
      audioCodec: data.audio_codec ?? null,
      daveProtocolVersion: data.dave_protocol_version ?? 0,
    };
    if (this.description.daveProtocolVersion > 0) {
      const dave = new DaveSession(
        this.davey,
        this.description.daveProtocolVersion,
        this.options.userId,
        this.options.daveGroupId,
      );
      dave.on('keyPackage', keyPackage => this.sendBinary(VoiceOpcodes.DaveMlsKeyPackage, keyPackage));
      dave.on('invalidateTransition', transitionId =>
        this.send(VoiceOpcodes.DaveMlsInvalidCommitWelcome, { transition_id: transitionId }),
      );
      this.dave = dave;
      dave.reinit();
    }
    if (this.options.role === 'owner') {
      // Announce the audio SSRC (as stream audio) and the video layer before sending any media.
      this.send(VoiceOpcodes.Speaking, { speaking: SpeakingFlags.Soundshare, delay: 0, ssrc: this.audioSsrc });
      const { width, height, fps, maxBitrate } = this.options.video;
      this.send(VoiceOpcodes.Video, {
        audio_ssrc: this.audioSsrc,
        video_ssrc: this.videoSsrc,
        rtx_ssrc: this.rtxSsrc,
        streams: [
          {
            type: this.layer?.type ?? 'video',
            rid: this.layer?.rid ?? '100',
            ssrc: this.videoSsrc,
            rtx_ssrc: this.rtxSsrc,
            active: true,
            quality: 100,
            max_bitrate: maxBitrate,
            max_framerate: fps,
            max_resolution: { type: 'fixed', width, height },
          },
        ],
      });
      this.senderReports = setInterval(() => this.sendSenderReport(), SENDER_REPORT_INTERVAL).unref();
    } else {
      // A viewer sends no media: announce nothing, then ask for the streams.
      this.send(VoiceOpcodes.Speaking, { speaking: SpeakingFlags.None, delay: 0, ssrc: this.audioSsrc });
      this.send(VoiceOpcodes.Video, { audio_ssrc: this.audioSsrc, video_ssrc: 0, rtx_ssrc: 0, streams: [] });
      this.sendWants();
    }
    this.ready = true;
    this.emit('ready', this.description);
  }

  onVideo(data) {
    if (!data.user_id || data.user_id === this.options.userId) return;
    const layers = data.streams?.length ? data.streams.filter(layer => layer.active !== false) : [];
    const ssrcs = (layers.length ? layers.map(layer => layer.ssrc) : [data.video_ssrc]).filter(Boolean);
    for (const [ssrc, id] of this.videoUsers) {
      if (id === data.user_id && !ssrcs.includes(ssrc)) this.videoUsers.delete(ssrc);
    }
    for (const ssrc of ssrcs) this.videoUsers.set(ssrc, data.user_id);
    this.emit('video', { userId: data.user_id, ssrcs });
    if (this.options.role === 'viewer' && this.ready) this.sendWants();
  }

  sendWants() {
    const wants = { any: 100 };
    for (const ssrc of this.videoUsers.keys()) wants[ssrc] = 100;
    this.send(VoiceOpcodes.MediaSinkWants, wants);
  }

  onUdp(message) {
    if (this.pendingDiscovery && message.length >= 74 && message.readUInt16BE(0) === 2) {
      const { resolve, reject, timer } = this.pendingDiscovery;
      this.pendingDiscovery = null;
      clearTimeout(timer);
      const ip = message.subarray(8, message.indexOf(0, 8)).toString('utf8');
      if (isIPv4(ip)) resolve({ ip, port: message.readUInt16BE(message.length - 2) });
      else reject(new Error('The RTC server sent a malformed IP discovery answer.'));
      return;
    }
    if (this.options.role !== 'viewer' || !this.crypto || message.length < 12) return;
    const ssrc = message.readUInt32BE(8);
    const userId = this.videoUsers.get(ssrc);
    if (!userId) return;
    const packet = this.crypto.decryptRtp(message);
    if (packet?.header.payloadType !== H264_PAYLOAD_TYPE) return;
    this.stats.packetsReceived++;
    let depacketizer = this.depacketizers.get(ssrc);
    if (!depacketizer) {
      depacketizer = new H264Depacketizer();
      this.depacketizers.set(ssrc, depacketizer);
      this.awaitingKeyframe.add(ssrc);
    }
    const lostBefore = depacketizer.framesLost;
    const assembled = depacketizer.push(packet.header, packet.payload);
    const lost = depacketizer.framesLost - lostBefore;
    if (lost) {
      this.stats.framesLost += lost;
      this.awaitingKeyframe.add(ssrc);
    }
    if (!assembled) return;
    const frame = this.dave ? this.dave.decrypt(this.davey.MediaType.VIDEO, assembled, userId) : assembled;
    if (!frame) {
      this.stats.framesUndecryptable++;
      this.awaitingKeyframe.add(ssrc);
      return;
    }
    this.stats.framesReceived++;
    const keyframe = splitAnnexB(frame).some(unit => nalType(unit) === NalType.Idr);
    // Frames that refer to a frame this viewer never got would only decode as artefacts.
    if (this.awaitingKeyframe.has(ssrc)) {
      if (!keyframe) {
        this.stats.framesSkipped++;
        return;
      }
      this.awaitingKeyframe.delete(ssrc);
    }
    this.emit('frame', { userId, frame, keyframe, timestamp: packet.header.timestamp });
  }

  /**
   * Sends one H264 frame (owner only).
   * @param {Buffer[]} units The NAL units of the frame
   * @param {number} timestamp The RTP timestamp, on the 90 kHz video clock
   * @returns {boolean} Whether the frame was sent
   */
  sendFrame(units, timestamp) {
    if (!this.ready || this.closed || this.options.role !== 'owner') return false;
    // Never send video in the clear on an end-to-end encrypted stream: hold it until the group is ready.
    if (this.dave && this.dave.protocolVersion > 0 && !this.dave.ready) {
      this.stats.framesHeld++;
      return false;
    }
    let wireUnits = units;
    if (this.dave?.ready) {
      const encrypted = this.dave.encrypt(this.davey.MediaType.VIDEO, this.davey.Codec.H264, toAnnexB(units));
      wireUnits = splitByLayout(encrypted, units);
      if (!wireUnits) {
        this.stats.layoutFallbacks++;
        wireUnits = splitAnnexB(encrypted);
      }
      this.stats.framesEncrypted++;
    }
    const payloads = packetize(wireUnits);
    for (const [index, payload] of payloads.entries()) {
      const header = rtpHeader({
        payloadType: H264_PAYLOAD_TYPE,
        sequence: this.sequence,
        timestamp,
        ssrc: this.videoSsrc,
        marker: index === payloads.length - 1,
      });
      this.sequence = (this.sequence + 1) & 0xffff;
      this.sendUdp(this.crypto.encryptRtp(header, payload));
      this.packetCount++;
      this.octetCount += payload.length;
    }
    this.stats.framesSent++;
    this.lastFrame = { timestamp, time: Date.now() };
    return true;
  }

  sendSenderReport() {
    if (!this.lastFrame || !this.crypto) return;
    const now = Date.now();
    const elapsed = Math.round(((now - this.lastFrame.time) * VIDEO_CLOCK_RATE) / 1000);
    const report = senderReport({
      ssrc: this.videoSsrc,
      rtpTimestamp: this.lastFrame.timestamp + elapsed,
      packetCount: this.packetCount,
      octetCount: this.octetCount,
      now,
    });
    this.sendUdp(this.crypto.encryptRtcp(report));
  }

  sendKeepAlive() {
    const packet = Buffer.alloc(8);
    packet.writeUInt32LE(this.keepAliveCounter, 0);
    this.keepAliveCounter = (this.keepAliveCounter + 1) >>> 0;
    this.sendUdp(packet);
  }

  sendUdp(packet) {
    if (this.udp && this.remote && !this.closed) this.udp.send(packet, this.remote.port, this.remote.ip);
  }

  fail(error) {
    this.emit('error', error);
    this.destroy();
  }

  onClose(code) {
    this.destroy(code);
  }

  /**
   * Closes the connection.
   * @param {number} [code] The WebSocket close code, when the server closed it
   */
  destroy(code = null) {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    clearInterval(this.heartbeat);
    clearInterval(this.keepAlive);
    clearInterval(this.senderReports);
    if (this.pendingDiscovery) clearTimeout(this.pendingDiscovery.timer);
    try {
      if (this.ws && this.ws.readyState <= WebSocket.OPEN) this.ws.close(1000);
    } catch {
      // Already closing.
    }
    try {
      this.udp?.close();
    } catch {
      // Already closed.
    }
    this.dave?.destroy();
    this.emit('close', code);
  }
}

module.exports = { CODECS, H264_PAYLOAD_TYPE, MediaConnection, VIDEO_CLOCK_RATE, VoiceOpcodes };
