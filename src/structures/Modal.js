'use strict';

const Base = require('./Base');

/**
 * A modal another application opened in response to the client user's interaction (user accounts only).
 * @extends {Base}
 */
class Modal extends Base {
  constructor(client, data) {
    super(client);

    /**
     * The id of the interaction that opened the modal
     * @type {Snowflake}
     */
    this.id = data.id;

    /**
     * The custom id of the modal
     * @type {string}
     */
    this.customId = data.custom_id;

    /**
     * The title of the modal
     * @type {string}
     */
    this.title = data.title;

    /**
     * The id of the channel the modal was opened in
     * @type {Snowflake}
     */
    this.channelId = data.channel_id;

    /**
     * The id of the application that opened the modal
     * @type {?Snowflake}
     */
    this.applicationId = data.application?.id ?? null;

    /**
     * The raw components of the modal (action rows or labels around text inputs and menus, and text displays)
     * @type {Object[]}
     */
    this.components = data.components ?? [];
  }

  /**
   * The channel the modal was opened in, if cached
   * @type {?TextBasedChannels}
   * @readonly
   */
  get channel() {
    return this.client.channels.cache.get(this.channelId) ?? null;
  }

  /**
   * Submits the modal.
   * @param {Object<string, *>} [values={}] The input values keyed by custom id (arrays for multi-value inputs);
   * inputs left out are submitted empty
   * @returns {Promise<?(Message|Modal)>} The application's reply, a follow-up modal, or `null` if it answered with
   * neither
   * @example
   * const modal = await channel.sendSlash(bot, 'feedback');
   * await modal.submit({ feedback_text: 'Great bot!' });
   */
  submit(values = {}) {
    const { submitModal } = require('../util/Interactions');
    return submitModal(this, values);
  }
}

module.exports = Modal;
