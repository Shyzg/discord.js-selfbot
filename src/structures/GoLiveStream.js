'use strict';

const Base = require('./Base');
const { DiscordjsTypeError, ErrorCodes } = require('../errors');

/**
 * The parts of a stream key: `guild:{guildId}:{channelId}:{ownerId}` for a guild voice channel,
 * `call:{channelId}:{ownerId}` for a DM or group DM call, and `test:{ownerId}` for an RTC speed test.
 * @typedef {Object} StreamKeyData
 * @property {string} type `guild`, `call` or `test`
 * @property {?Snowflake} guildId The guild of a `guild` stream
 * @property {?Snowflake} channelId The channel of a `guild` or `call` stream
 * @property {Snowflake} ownerId The user who is streaming
 */

/**
 * @param {string} key The stream key
 * @returns {?StreamKeyData}
 * @private
 */
function parseStreamKey(key) {
  const parts = typeof key === 'string' ? key.split(':') : [];
  const [type] = parts;
  if (parts.some(part => !part)) return null;
  if (type === 'guild' && parts.length === 4) {
    return { type, guildId: parts[1], channelId: parts[2], ownerId: parts[3] };
  }
  if (type === 'call' && parts.length === 3) return { type, guildId: null, channelId: parts[1], ownerId: parts[2] };
  if (type === 'test' && parts.length === 2) return { type, guildId: null, channelId: null, ownerId: parts[1] };
  return null;
}

/**
 * A Go Live stream this session created or watches (user accounts only). Other members' streams show up as
 * {@link VoiceState#streaming} and {@link VoiceState#streamKey} instead.
 * @extends {Base}
 */
class GoLiveStream extends Base {
  constructor(client, data) {
    super(client);

    /**
     * The stream key
     * @type {string}
     */
    this.key = data.stream_key;

    const parts = parseStreamKey(this.key);

    /**
     * The type of the stream: `guild`, `call` or `test`
     * @type {?string}
     */
    this.type = parts?.type ?? null;

    /**
     * The id of the guild the stream is in
     * @type {?Snowflake}
     */
    this.guildId = parts?.guildId ?? null;

    /**
     * The id of the voice channel or call the stream is in
     * @type {?Snowflake}
     */
    this.channelId = parts?.channelId ?? null;

    /**
     * The id of the user who is streaming
     * @type {?Snowflake}
     */
    this.ownerId = parts?.ownerId ?? null;

    /**
     * The id of the RTC server that carries the stream's media
     * @type {?Snowflake}
     */
    this.rtcServerId = null;

    /**
     * The voice region of the stream
     * @type {?string}
     */
    this.region = null;

    /**
     * The ids of the users watching the stream
     * @type {Snowflake[]}
     */
    this.viewerIds = [];

    /**
     * Whether the stream is paused
     * @type {boolean}
     */
    this.paused = false;

    this._patch(data);
  }

  _patch(data) {
    // Only STREAM_CREATE carries the RTC server; updates keep the one it gave.
    if (data.rtc_server_id) this.rtcServerId = data.rtc_server_id;
    if ('region' in data) this.region = data.region;
    if ('viewer_ids' in data) this.viewerIds = data.viewer_ids ?? [];
    if ('paused' in data) this.paused = Boolean(data.paused);
  }

  /**
   * The guild the stream is in
   * @type {?Guild}
   * @readonly
   */
  get guild() {
    return this.client.guilds.cache.get(this.guildId) ?? null;
  }

  /**
   * The voice channel or call channel the stream is in
   * @type {?(VoiceChannel|StageChannel|DMChannel|PartialGroupDMChannel)}
   * @readonly
   */
  get channel() {
    return this.client.channels.cache.get(this.channelId) ?? null;
  }

  /**
   * The user who is streaming
   * @type {?User}
   * @readonly
   */
  get owner() {
    return this.client.users.cache.get(this.ownerId) ?? null;
  }

  /**
   * Fetches the URL of the stream's preview image.
   * @returns {Promise<string>}
   */
  fetchPreview() {
    return this.client.streams.fetchPreview(this.key);
  }

  /**
   * Reads a stream key.
   * @param {string} key The stream key
   * @returns {StreamKeyData}
   */
  static parseKey(key) {
    const parts = parseStreamKey(key);
    if (!parts) throw new DiscordjsTypeError(ErrorCodes.StreamKeyInvalid, key);
    return parts;
  }

  /**
   * Builds a stream key.
   * @param {StreamKeyData} data The parts of the key
   * @returns {string}
   */
  static formatKey({ type, guildId, channelId, ownerId }) {
    const parts =
      type === 'guild'
        ? [type, guildId, channelId, ownerId]
        : type === 'call'
          ? [type, channelId, ownerId]
          : [type, ownerId];
    const key = parts.join(':');
    GoLiveStream.parseKey(key);
    return key;
  }
}

module.exports = { GoLiveStream, parseStreamKey };
