'use strict';

const EventEmitter = require('node:events');
const { clearTimeout, setTimeout } = require('node:timers');
const { setTimeout: sleep } = require('node:timers/promises');
const { AccessUnitReader } = require('./H264');
const { VIDEO_CLOCK_RATE } = require('./MediaConnection');
const { DiscordjsError, ErrorCodes } = require('../../../errors');
const Events = require('../../../util/Events');
const { resolveImage } = require('../../../util/DataResolver');

const CONNECT_TIMEOUT = 20_000;
const StreamOpcodes = { Delete: 19, SetPaused: 22 };

/**
 * The media side of a Go Live stream: its own connection to the stream's RTC server.
 * @extends {EventEmitter}
 * @abstract
 */
class StreamSession extends EventEmitter {
  constructor(manager, { key, guild, rtcServerId, sessionId, davey, role, video = null }) {
    super();

    /**
     * The manager of this session
     * @type {StreamManager}
     */
    this.manager = manager;

    /**
     * The stream key
     * @type {string}
     */
    this.key = key;

    /**
     * The guild the stream is in
     * @type {Guild}
     */
    this.guild = guild;

    /**
     * Whether the session has ended
     * @type {boolean}
     */
    this.ended = false;

    this.rtcServerId = rtcServerId;
    this.sessionId = sessionId;
    this.davey = davey;
    this.role = role;
    this.video = video;
    this.connection = null;
    this.server = null;
  }

  /**
   * The stream, as cached by {@link StreamManager}
   * @type {?GoLiveStream}
   * @readonly
   */
  get stream() {
    return this.manager.cache.get(this.key) ?? null;
  }

  /**
   * Counters of the media connection
   * @type {Object}
   * @readonly
   */
  get stats() {
    return { ...this.connection?.stats };
  }

  /**
   * The voice privacy code of the stream's end-to-end encrypted group, which every member of the stream sees
   * @type {?string}
   * @readonly
   */
  get voicePrivacyCode() {
    return this.connection?.dave?.voicePrivacyCode ?? null;
  }

  /**
   * Opens a media connection to the RTC server and waits until it is ready.
   * @param {Object} server The STREAM_SERVER_UPDATE data
   * @returns {Promise<this>}
   * @private
   */
  _connect(server) {
    this.server = server;
    const previous = this.connection;
    if (previous) {
      previous.removeAllListeners();
      previous.destroy();
    }
    const connection = this.manager._createConnection({
      endpoint: server.endpoint,
      token: server.token,
      serverId: this.rtcServerId,
      sessionId: this.sessionId,
      userId: this.manager.client.user.id,
      // A stream's end-to-end encrypted group is its media session, one below the RTC server id.
      daveGroupId: (BigInt(this.rtcServerId) - 1n).toString(),
      role: this.role,
      video: this.video,
      davey: this.davey,
    });
    this.connection = connection;
    let lastError = null;
    connection.on('error', error => {
      lastError = error;
      this.manager.client.emit(Events.Debug, `[STREAM] ${this.role} media error: ${error.message}`);
    });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        connection.destroy();
        reject(new DiscordjsError(ErrorCodes.StreamTimeout));
      }, CONNECT_TIMEOUT).unref();
      const onReady = description => {
        cleanup();
        if (this.role === 'owner' && description.videoCodec && description.videoCodec !== 'H264') {
          connection.destroy();
          reject(new DiscordjsError(ErrorCodes.StreamCodecUnsupported, description.videoCodec));
          return;
        }
        connection.on('close', code => {
          if (this.connection === connection && !this.ended)
            this._end(code === 4014 ? 'disconnected' : `closed_${code}`);
        });
        if (this.role === 'viewer') connection.on('frame', frame => this.emit('frame', frame));
        resolve(this);
      };
      const onClose = code => {
        cleanup();
        reject(new DiscordjsError(ErrorCodes.StreamConnectionFailed, code ?? lastError?.message ?? 'unknown'));
      };
      const cleanup = () => {
        clearTimeout(timer);
        connection.off('ready', onReady);
        connection.off('close', onClose);
      };
      connection.once('ready', onReady);
      connection.once('close', onClose);
      connection.connect();
    });
  }

  /**
   * Handles a STREAM_SERVER_UPDATE for this stream.
   * @param {Object} server The update
   * @private
   */
  _onServer(server) {
    if (this.ended) return;
    if (!server.endpoint) {
      // The server went away; another update brings the next one.
      this.connection?.removeAllListeners();
      this.connection?.destroy();
      this.connection = null;
      this.server = server;
      return;
    }
    // Pausing also sends an update; only a new server or token means reconnecting.
    if (this.connection && server.endpoint === this.server?.endpoint && server.token === this.server?.token) return;
    this._connect(server).catch(error => this._end(error.message));
  }

  /**
   * Ends the session.
   * @param {string} reason Why it ended
   * @private
   */
  _end(reason) {
    if (this.ended) return;
    this.ended = true;
    this.connection?.removeAllListeners();
    this.connection?.destroy();
    this.manager._sessions.delete(this.key);
    /**
     * Emitted when the session ends: it was ended or stopped, the stream was deleted, or its connection closed.
     * @event StreamSession#end
     * @param {string} reason Why it ended, such as `user_requested` or `stream_ended`
     */
    this.emit('end', reason);
  }

  _close() {
    if (this.ended) return;
    this.manager._send(this.guild, { op: StreamOpcodes.Delete, d: { stream_key: this.key } });
    this._end('user_requested');
  }
}

/**
 * Your own Go Live stream (user accounts only). Created by {@link StreamManager#goLive}.
 * @extends {StreamSession}
 */
class StreamBroadcast extends StreamSession {
  constructor(manager, options) {
    super(manager, { ...options, role: 'owner' });

    /**
     * Whether the stream is paused
     * @type {boolean}
     */
    this.paused = false;

    /**
     * Whether an input is being played
     * @type {boolean}
     */
    this.playing = false;

    this.timestamp = Math.floor(Math.random() * 2 ** 32);
    this.awaitKeyframe = true;
  }

  /**
   * Streams H264 video until the input ends. The input is an H264 Annex-B byte stream at a constant frame rate equal
   * to the `fps` given to {@link StreamManager#goLive}, without B-frames, such as the output of
   * `ffmpeg -c:v libx264 -tune zerolatency -bf 0 -bsf:v h264_mp4toannexb -f h264 -`.
   * @param {ReadableStream|AsyncIterable<Buffer>} input The video
   * @returns {Promise<void>}
   */
  async play(input) {
    if (this.ended) throw new DiscordjsError(ErrorCodes.StreamEnded);
    if (this.playing) throw new DiscordjsError(ErrorCodes.StreamAlreadyPlaying);
    this.playing = true;
    // A new input is a new encoder session: start it at a keyframe.
    this.awaitKeyframe = true;
    const reader = new AccessUnitReader();
    const pacing = { start: Date.now(), index: 0 };
    try {
      for await (const chunk of input) {
        if (this.ended) break;
        await this._sendFrames(reader.push(chunk), pacing);
      }
      if (!this.ended) await this._sendFrames(reader.end(), pacing);
    } finally {
      this.playing = false;
    }
  }

  async _sendFrames(frames, pacing) {
    const { fps } = this.video;
    for (const frame of frames) {
      if (this.ended) return;
      const wait = pacing.start + (pacing.index * 1000) / fps - Date.now();
      // biome-ignore lint/performance/noAwaitInLoops: frames go out one at a time, at the frame rate
      if (wait > 0) await sleep(wait);
      pacing.index++;
      const timestamp = this.timestamp;
      this.timestamp = (this.timestamp + Math.round(VIDEO_CLOCK_RATE / fps)) >>> 0;
      // Viewers need a keyframe to start decoding: skip frames until one comes (at the start and after a pause).
      if (this.paused || (this.awaitKeyframe && !frame.keyframe)) continue;
      // A frame that could not go out means viewers need the next keyframe.
      this.awaitKeyframe = !this.connection?.sendFrame(frame.units, timestamp);
    }
  }

  /**
   * Pauses or resumes the stream. While paused, the input keeps being read but no video is sent; on resume video
   * starts again at the next keyframe.
   * @param {boolean} [paused=true] Whether to pause
   * @returns {this}
   */
  setPaused(paused = true) {
    if (this.ended) throw new DiscordjsError(ErrorCodes.StreamEnded);
    this.manager._send(this.guild, { op: StreamOpcodes.SetPaused, d: { stream_key: this.key, paused } });
    this.paused = paused;
    if (!paused) this.awaitKeyframe = true;
    return this;
  }

  /**
   * Sets the preview image other members see for the stream.
   * @param {BufferResolvable|Base64Resolvable} image The image (JPEG is what the official client uploads)
   * @returns {Promise<this>}
   */
  async setPreview(image) {
    await this.manager.client.rest.post(`/streams/${this.key}/preview`, {
      body: { thumbnail: await resolveImage(image) },
    });
    return this;
  }

  /**
   * Ends the stream.
   * @returns {this}
   */
  end() {
    this._close();
    return this;
  }
}

/**
 * A Go Live stream you are watching (user accounts only). Created by {@link StreamManager#watch}. Each frame arrives
 * end-to-end decrypted, as H264 Annex-B, ready to write to a decoder such as `ffmpeg -f h264 -i -`.
 * @extends {StreamSession}
 */
class StreamViewer extends StreamSession {
  constructor(manager, options) {
    super(manager, { ...options, role: 'viewer' });
  }

  /**
   * Stops watching the stream.
   * @returns {this}
   */
  stop() {
    this._close();
    return this;
  }
}

/**
 * Emitted for every video frame of the stream.
 * @event StreamViewer#frame
 * @param {StreamFrame} frame The frame
 */

/**
 * A decrypted video frame.
 * @typedef {Object} StreamFrame
 * @property {Snowflake} userId The user who sent it
 * @property {Buffer} frame The frame, as H264 Annex-B
 * @property {boolean} keyframe Whether it is a keyframe (an IDR)
 * @property {number} timestamp Its RTP timestamp, on the 90 kHz video clock
 */

module.exports = { StreamBroadcast, StreamSession, StreamViewer };
