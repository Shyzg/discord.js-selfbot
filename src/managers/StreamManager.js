'use strict';

const { Collection } = require('@discordjs/collection');
const { PermissionFlagsBits } = require('discord-api-types/v10');
const { clearTimeout, setTimeout } = require('node:timers');
const BaseManager = require('./BaseManager');
const { loadDavey } = require('../client/voice/media/Dave');
const { MediaConnection } = require('../client/voice/media/MediaConnection');
const { StreamBroadcast, StreamViewer } = require('../client/voice/media/StreamSessions');
const { DiscordjsError, DiscordjsTypeError, ErrorCodes } = require('../errors');
const { GoLiveStream } = require('../structures/GoLiveStream');
const { VoiceBasedChannelTypes } = require('../util/Constants');
const Events = require('../util/Events');

const REQUEST_TIMEOUT = 15_000;
const StreamOpcodes = { Create: 18, Delete: 19, Watch: 20 };

/**
 * Manages Go Live streams (user accounts only): the streams this session created or watches, going live, and
 * watching.
 * <info>Go Live needs a voice connection in the channel first (with `@discordjs/voice`, see
 * {@link Guild#voiceAdapterCreator}) and the `@snazzah/davey` package for end-to-end encryption. Video is H264 only,
 * with no stream audio.</info>
 * @extends {BaseManager}
 */
class StreamManager extends BaseManager {
  constructor(client) {
    super(client);

    /**
     * The streams this session created or watches, keyed by stream key
     * @type {Collection<string, GoLiveStream>}
     */
    this.cache = new Collection();

    /**
     * Requests waiting for their stream to open, keyed by stream key
     * @type {Map<string, Object>}
     * @private
     */
    this._pending = new Map();

    /**
     * Open broadcasts and viewers, keyed by stream key
     * @type {Map<string, StreamSession>}
     * @private
     */
    this._sessions = new Map();
  }

  /**
   * Options for going live.
   * @typedef {Object} GoLiveOptions
   * @property {number} [width=1280] The width of the video
   * @property {number} [height=720] The height of the video
   * @property {number} [fps=30] The frame rate of the video, which the input must keep
   * @property {number} [maxBitrate=2500000] The highest bitrate of the video, in bits per second
   * @property {?string} [preferredRegion=null] The voice region to prefer for the stream
   */

  /**
   * Goes live in a guild voice channel the client user is connected to. Play video on the returned broadcast.
   * @param {GuildVoiceChannelResolvable} channel The voice channel
   * @param {GoLiveOptions} [options={}] The video options
   * @returns {Promise<StreamBroadcast>}
   * @example
   * const connection = joinVoiceChannel({ channelId, guildId, adapterCreator: guild.voiceAdapterCreator });
   * await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
   * const broadcast = await client.streams.goLive(channelId, { width: 1280, height: 720, fps: 30 });
   * await broadcast.play(ffmpeg.stdout);
   * broadcast.end();
   */
  async goLive(channel, { width = 1280, height = 720, fps = 30, maxBitrate = 2_500_000, preferredRegion = null } = {}) {
    const { voiceChannel, sessionId } = this._voiceConnection(channel);
    const permissions = voiceChannel.permissionsFor(this.client.user);
    if (permissions && !permissions.has(PermissionFlagsBits.Stream)) {
      throw new DiscordjsError(ErrorCodes.StreamMissingPermission);
    }
    const davey = this._loadDavey();
    const { guild } = voiceChannel;
    const key = GoLiveStream.formatKey({
      type: 'guild',
      guildId: guild.id,
      channelId: voiceChannel.id,
      ownerId: this.client.user.id,
    });
    const { created, server } = await this._request(guild, key, {
      op: StreamOpcodes.Create,
      d: { type: 'guild', guild_id: guild.id, channel_id: voiceChannel.id, preferred_region: preferredRegion },
    });
    return this._open(
      new StreamBroadcast(this, {
        key,
        guild,
        rtcServerId: created.rtc_server_id,
        sessionId,
        davey,
        video: { width, height, fps, maxBitrate },
      }),
      server,
    );
  }

  /**
   * Watches another member's Go Live stream in a guild voice channel the client user is connected to. Its frames
   * arrive as `frame` events on the returned viewer.
   * @param {GoLiveStream|VoiceState|string} stream The stream, the streaming member's voice state, or the stream key
   * @returns {Promise<StreamViewer>}
   * @example
   * const viewer = await client.streams.watch(member.voice);
   * viewer.on('frame', ({ frame }) => ffplay.stdin.write(frame));
   */
  async watch(stream) {
    const key = this._resolveKey(stream);
    const parts = GoLiveStream.parseKey(key);
    if (parts.type !== 'guild') throw new DiscordjsError(ErrorCodes.StreamTypeUnsupported, parts.type);
    if (parts.ownerId === this.client.user.id) throw new DiscordjsError(ErrorCodes.StreamWatchOwn);
    const { voiceChannel, sessionId } = this._voiceConnection(parts.channelId);
    const davey = this._loadDavey();
    const { created, server } = await this._request(voiceChannel.guild, key, {
      op: StreamOpcodes.Watch,
      d: { stream_key: key },
    });
    return this._open(
      new StreamViewer(this, { key, guild: voiceChannel.guild, rtcServerId: created.rtc_server_id, sessionId, davey }),
      server,
    );
  }

  /**
   * Fetches the URL of a stream's preview image. Needs the Connect permission in the stream's channel.
   * @param {GoLiveStream|VoiceState|string} stream The stream, the streaming member's voice state, or the stream key
   * @returns {Promise<string>}
   */
  async fetchPreview(stream) {
    const key = this._resolveKey(stream);
    GoLiveStream.parseKey(key);
    const { url } = await this.client.rest.get(`/streams/${key}/preview`);
    return url;
  }

  _resolveKey(stream) {
    if (typeof stream === 'string') return stream;
    if (stream instanceof GoLiveStream) return stream.key;
    const key = stream?.streamKey;
    if (!key) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'stream', 'Stream, a streaming VoiceState or a key');
    return key;
  }

  _voiceConnection(channel) {
    const voiceChannel = this.client.channels.resolve(channel);
    if (!VoiceBasedChannelTypes.includes(voiceChannel?.type) || !voiceChannel.guild) {
      throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'channel', 'guild voice channel');
    }
    const state = voiceChannel.guild.voiceStates.cache.get(this.client.user.id);
    if (state?.channelId !== voiceChannel.id || !state.sessionId) {
      throw new DiscordjsError(ErrorCodes.StreamNotInVoiceChannel);
    }
    return { voiceChannel, sessionId: state.sessionId };
  }

  _loadDavey() {
    if (this._davey) return this._davey;
    try {
      return this._requireDavey();
    } catch {
      throw new DiscordjsError(ErrorCodes.StreamDaveMissing);
    }
  }

  _requireDavey() {
    return loadDavey();
  }

  _createConnection(options) {
    return new MediaConnection(options);
  }

  async _open(session, server) {
    this._sessions.set(session.key, session);
    try {
      return await session._connect(server);
    } catch (error) {
      // Do not leave a stream (or a viewer) behind without media.
      session._close();
      throw error;
    }
  }

  _send(guild, payload) {
    const shard = guild.shard;
    Promise.resolve(shard.send(payload)).catch(error => {
      if (!this.client.ws.destroyed) this.client.emit(Events.ShardError, error, guild.shardId);
    });
  }

  /**
   * Sends a stream op and waits for STREAM_CREATE and STREAM_SERVER_UPDATE (in either order) or STREAM_DELETE.
   * @param {Guild} guild The guild
   * @param {string} key The stream key
   * @param {Object} payload The op
   * @returns {Promise<{ created: Object, server: Object }>}
   * @private
   */
  _request(guild, key, payload) {
    if (this._pending.has(key) || this._sessions.has(key)) {
      return Promise.reject(new DiscordjsError(ErrorCodes.StreamAlreadyOpen));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(key);
        reject(new DiscordjsError(ErrorCodes.StreamTimeout));
      }, REQUEST_TIMEOUT).unref();
      this._pending.set(key, { created: null, server: null, resolve, reject, timer });
      this._send(guild, payload);
    });
  }

  _settle(key) {
    const pending = this._pending.get(key);
    if (!pending?.created || !pending.server?.endpoint) return;
    clearTimeout(pending.timer);
    this._pending.delete(key);
    pending.resolve({ created: pending.created, server: pending.server });
  }

  _onCreate(data) {
    const pending = this._pending.get(data.stream_key);
    if (!pending) return;
    pending.created = data;
    this._settle(data.stream_key);
  }

  _onServerUpdate(data) {
    const pending = this._pending.get(data.stream_key);
    if (pending) {
      pending.server = data;
      this._settle(data.stream_key);
      return;
    }
    this._sessions.get(data.stream_key)?._onServer(data);
  }

  _onDelete(data) {
    const pending = this._pending.get(data.stream_key);
    if (pending) {
      clearTimeout(pending.timer);
      this._pending.delete(data.stream_key);
      pending.reject(new DiscordjsError(ErrorCodes.StreamRefused, data.reason ?? 'unknown'));
    }
    this._sessions.get(data.stream_key)?._end(data.reason ?? 'stream_ended');
  }

  /**
   * Ends every session and forgets every stream, for a destroyed client or an account switch.
   * @private
   */
  _clear(reason = 'client_destroyed') {
    for (const pending of this._pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new DiscordjsError(ErrorCodes.StreamEnded));
    }
    this._pending.clear();
    for (const session of [...this._sessions.values()]) session._end(reason);
    this.cache.clear();
  }
}

module.exports = StreamManager;
