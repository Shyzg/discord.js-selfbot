'use strict';

const { Collection } = require('@discordjs/collection');
const Base = require('./Base');
const { DiscordjsTypeError, ErrorCodes } = require('../errors');

/**
 * The voice state of someone in a DM or group DM call.
 * @typedef {Object} CallVoiceState
 * @property {Snowflake} userId The id of the user
 * @property {?Snowflake} channelId The id of the call's channel, or `null` once the user left
 * @property {?string} sessionId The voice session id
 * @property {boolean} selfMute Whether the user muted themselves
 * @property {boolean} selfDeaf Whether the user deafened themselves
 * @property {boolean} selfVideo Whether the user's camera is on
 * @property {boolean} streaming Whether the user is screen sharing
 * @property {boolean} serverMute Whether the user is muted by the server
 * @property {boolean} serverDeaf Whether the user is deafened by the server
 */

/**
 * Turns a raw voice state into a {@link CallVoiceState}.
 * @param {Object} data The raw voice state
 * @returns {CallVoiceState}
 * @private
 */
function callVoiceState(data) {
  return {
    userId: data.user_id,
    channelId: data.channel_id ?? null,
    sessionId: data.session_id ?? null,
    selfMute: Boolean(data.self_mute),
    selfDeaf: Boolean(data.self_deaf),
    selfVideo: Boolean(data.self_video),
    streaming: Boolean(data.self_stream),
    serverMute: Boolean(data.mute),
    serverDeaf: Boolean(data.deaf),
  };
}

/**
 * Represents a voice call in a DM or group DM (user accounts only).
 * @extends {Base}
 */
class Call extends Base {
  constructor(client, data) {
    super(client);

    /**
     * The id of the DM or group DM the call is in
     * @type {Snowflake}
     */
    this.channelId = data.channel_id;

    /**
     * Whether the call became unavailable because of an outage (only set on a deleted call)
     * @type {boolean}
     */
    this.unavailable = false;

    /**
     * The voice states of the people in the call, keyed by user id
     * @type {Collection<Snowflake, CallVoiceState>}
     */
    this.voiceStates = new Collection();

    this._patch(data);
  }

  _patch(data) {
    if ('message_id' in data) {
      /**
       * The id of the call message in the channel
       * @type {?Snowflake}
       */
      this.messageId = data.message_id;
    } else {
      this.messageId ??= null;
    }

    if ('region' in data) {
      /**
       * The id of the voice region the call is hosted in
       * @type {?string}
       */
      this.region = data.region;
    } else {
      this.region ??= null;
    }

    if ('ringing' in data) {
      /**
       * The ids of the users being rung
       * @type {Snowflake[]}
       */
      this.ringing = data.ringing ?? [];
    } else {
      this.ringing ??= [];
    }

    if ('voice_states' in data) {
      this.voiceStates = new Collection(
        (data.voice_states ?? []).map(state => [
          state.user_id,
          callVoiceState({ channel_id: this.channelId, ...state }),
        ]),
      );
    }
  }

  /**
   * The DM or group DM the call is in, if cached
   * @type {?(DMChannel|PartialGroupDMChannel)}
   * @readonly
   */
  get channel() {
    return this.client.channels.cache.get(this.channelId) ?? null;
  }

  _recipientIds(recipients) {
    if (recipients === undefined) return undefined;
    return recipients.map(recipient => {
      const id = this.client.users.resolveId(recipient);
      if (!id) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'recipients', 'UserResolvable[]');
      return id;
    });
  }

  /**
   * Rings recipients of the call's channel. Only works while the call is active.
   * @param {UserResolvable[]} [recipients] The recipients to ring (all of them by default)
   * @returns {Promise<Call>}
   */
  async ring(recipients) {
    const body = { recipients: this._recipientIds(recipients) };
    await this.client.rest.post(`/channels/${this.channelId}/call/ring`, { body });
    return this;
  }

  /**
   * Stops ringing recipients of the call's channel. Only works while the call is active.
   * @param {UserResolvable[]} [recipients] The recipients to stop ringing (the client user by default, which
   * declines an incoming call)
   * @returns {Promise<Call>}
   */
  async stopRinging(recipients) {
    const body = { recipients: this._recipientIds(recipients) };
    await this.client.rest.post(`/channels/${this.channelId}/call/stop-ringing`, { body });
    return this;
  }

  /**
   * Moves the call to another voice region. Only works while the call is active.
   * @param {string} region The id of the voice region (see {@link Client#fetchVoiceRegions})
   * @returns {Promise<Call>}
   */
  async setRegion(region) {
    await this.client.rest.patch(`/channels/${this.channelId}/call`, { body: { region } });
    return this;
  }
}

exports.Call = Call;
exports.callVoiceState = callVoiceState;
