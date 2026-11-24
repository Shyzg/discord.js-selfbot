'use strict';

const { BaseChannel } = require('./BaseChannel');
const TextBasedChannel = require('./interfaces/TextBasedChannel');
const { DiscordjsError, ErrorCodes } = require('../errors');
const PartialGroupDMMessageManager = require('../managers/PartialGroupDMMessageManager');

/**
 * Represents a Partial Group DM Channel on Discord.
 * @extends {BaseChannel}
 * @implements {TextBasedChannel}
 */
class PartialGroupDMChannel extends BaseChannel {
  constructor(client, data) {
    super(client, data);

    /**
     * A manager of the messages belonging to this channel
     * @type {PartialGroupDMMessageManager}
     */
    this.messages = new PartialGroupDMMessageManager(this);
  }

  _patch(data) {
    super._patch(data);

    // No flags are present when fetching partial group DM channels.
    this.flags = null;

    if ('name' in data) {
      /**
       * The name of this Group DM Channel
       * @type {?string}
       */
      this.name = data.name;
    } else {
      this.name ??= null;
    }

    if ('icon' in data) {
      /**
       * The hash of the channel icon
       * @type {?string}
       */
      this.icon = data.icon ?? null;
    } else {
      this.icon ??= null;
    }

    /**
     * Recipient data received in a {@link PartialGroupDMChannel}.
     * @typedef {Object} PartialRecipient
     * @property {string} username The username of the recipient
     */

    if ('recipients' in data) {
      /**
       * The recipients of this Group DM Channel.
       * @type {PartialRecipient[]}
       */
      this.recipients = data.recipients ?? [];
    } else {
      this.recipients ??= [];
    }

    if ('owner_id' in data) {
      /**
       * The user id of the owner of this Group DM Channel
       * @type {?Snowflake}
       */
      this.ownerId = data.owner_id;
    } else {
      this.ownerId ??= null;
    }

    if ('last_message_id' in data) {
      /**
       * The channel's last message id, if one was sent
       * @type {?Snowflake}
       */
      this.lastMessageId = data.last_message_id;
    } else {
      this.lastMessageId ??= null;
    }

    if ('last_pin_timestamp' in data) {
      /**
       * The timestamp when the last pinned message was pinned, if there was one
       * @type {?number}
       */
      this.lastPinTimestamp = data.last_pin_timestamp ? Date.parse(data.last_pin_timestamp) : null;
    } else {
      this.lastPinTimestamp ??= null;
    }
  }

  /**
   * The URL to this channel's icon.
   * @param {ImageURLOptions} [options={}] Options for the image URL
   * @returns {?string}
   */
  iconURL(options = {}) {
    return this.icon && this.client.rest.cdn.channelIcon(this.id, this.icon, options);
  }

  /**
   * Fetches the owner of this Group DM Channel.
   * @param {BaseFetchOptions} [options] The options for fetching the user
   * @returns {Promise<User>}
   */
  async fetchOwner(options) {
    if (!this.ownerId) {
      throw new DiscordjsError(ErrorCodes.FetchOwnerId, 'group DM');
    }

    return this.client.users.fetch(this.ownerId, options);
  }

  // These are here only for documentation purposes - they are implemented by TextBasedChannel
  get lastMessage() {}
  get lastPinAt() {}
  send() {}
  sendTyping() {}
  createMessageCollector() {}
  awaitMessages() {}
}

TextBasedChannel.applyToClass(PartialGroupDMChannel, true, [
  'bulkDelete',
  'fetchWebhooks',
  'createWebhook',
  'setRateLimitPerUser',
  'setNSFW',
]);

module.exports = PartialGroupDMChannel;
