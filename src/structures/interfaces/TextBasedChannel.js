'use strict';

const { Routes } = require('discord-api-types/v10');
const Interactions = require('../../util/Interactions');
const MessageCollector = require('../MessageCollector');
const MessagePayload = require('../MessagePayload');

/**
 * Interface for classes that have text-channel-like features.
 * @interface
 */
class TextBasedChannel {
  constructor() {
    /**
     * A manager of the messages sent to this channel
     * @type {GuildMessageManager}
     */
    this.messages = new GuildMessageManager(this);

    /**
     * The channel's last message id, if one was sent
     * @type {?Snowflake}
     */
    this.lastMessageId = null;

    /**
     * The timestamp when the last pinned message was pinned, if there was one
     * @type {?number}
     */
    this.lastPinTimestamp = null;
  }

  /**
   * The Message object of the last message in the channel, if one was sent
   * @type {?Message}
   * @readonly
   */
  get lastMessage() {
    return this.messages.resolve(this.lastMessageId);
  }

  /**
   * The date when the last pinned message was pinned, if there was one
   * @type {?Date}
   * @readonly
   */
  get lastPinAt() {
    return this.lastPinTimestamp && new Date(this.lastPinTimestamp);
  }

  /**
   * Represents the data for a poll answer.
   * @typedef {Object} PollAnswerData
   * @property {string} text The text for the poll answer
   * @property {EmojiIdentifierResolvable} [emoji] The emoji for the poll answer
   */

  /**
   * Represents the data for a poll.
   * @typedef {Object} PollData
   * @property {PollQuestionMedia} question The question for the poll
   * @property {PollAnswerData[]} answers The answers for the poll
   * @property {number} duration The duration in hours for the poll
   * @property {boolean} allowMultiselect Whether the poll allows multiple answers
   * @property {PollLayoutType} [layoutType] The layout type for the poll
   */

  /**
   * The base message options for messages.
   * @typedef {Object} BaseMessageOptions
   * @property {?string} [content=''] The content for the message. This can only be `null` when editing a message.
   * @property {Array<(EmbedBuilder|Embed|APIEmbed)>} [embeds] The embeds for the message
   * @property {MessageMentionOptions} [allowedMentions] Which mentions should be parsed from the message content
   * (see {@link https://discord.com/developers/docs/resources/message#allowed-mentions-object here} for more details)
   * @property {Array<(AttachmentBuilder|Attachment|AttachmentPayload|BufferResolvable)>} [files]
   * The files to send with the message.
   * @property {Array<(ActionRowBuilder|MessageTopLevelComponent|APIMessageTopLevelComponent)>} [components]
   * Action rows containing interactive components for the message (buttons, select menus) and other
   * top-level components.
   * <info>When using components v2, the flag {@link MessageFlags.IsComponentsV2} needs to be set
   * and `content`, `embeds`, `stickers`, and `poll` cannot be used.</info>
   */

  /**
   * The base message options for messages including a poll.
   * @typedef {BaseMessageOptions} BaseMessageOptionsWithPoll
   * @property {PollData} [poll] The poll to send with the message
   */

  /**
   * Options for sending a message with a reply.
   * @typedef {Object} ReplyOptions
   * @property {MessageResolvable} messageReference The message to reply to (must be in the same channel and not system)
   * @property {boolean} [failIfNotExists=this.client.options.failIfNotExists] Whether to error if the referenced
   * message does not exist (creates a standard message in this case when false)
   */

  /**
   * The options for sending a message.
   * @typedef {BaseMessageOptionsWithPoll} BaseMessageCreateOptions
   * @property {boolean} [tts=false] Whether the message should be spoken aloud
   * @property {string} [nonce] The nonce for the message
   * <info>This property is required if `enforceNonce` set to `true`.</info>
   * @property {boolean} [enforceNonce] Whether the nonce should be checked for uniqueness in the past few minutes.
   * If another message was created by the same author with the same nonce,
   * that message will be returned and no new message will be created
   * @property {StickerResolvable[]} [stickers=[]] The stickers to send in the message
   * @property {MessageFlags} [flags] Which flags to set for the message.
   * <info>Only {@link MessageFlags.SuppressEmbeds}, {@link MessageFlags.SuppressNotifications},
   * {@link MessageFlags.IsComponentsV2}, and {@link MessageFlags.IsVoiceMessage} can be set.</info>
   * <info>{@link MessageFlags.IsComponentsV2} is required if passing components that aren't action rows</info>
   */

  /**
   * @typedef {Object} ForwardOptions
   * @property {MessageResolvable} message The originating message
   * @property {TextBasedChannelResolvable} [channel] The channel of the originating message
   * @property {GuildResolvable} [guild] The guild of the originating message
   */

  /**
   * The options for sending a message.
   * @typedef {BaseMessageCreateOptions} MessageCreateOptions
   * @property {ReplyOptions} [reply] The options for replying to a message
   * @property {ForwardOptions} [forward] The options for forwarding a message
   */

  /**
   * Options provided to control parsing of mentions by Discord
   * @typedef {Object} MessageMentionOptions
   * @property {MessageMentionTypes[]} [parse] Types of mentions to be parsed
   * @property {Snowflake[]} [users] Snowflakes of Users to be parsed as mentions
   * @property {Snowflake[]} [roles] Snowflakes of Roles to be parsed as mentions
   * @property {boolean} [repliedUser=true] Whether the author of the Message being replied to should be pinged
   */

  /**
   * Types of mentions to enable in MessageMentionOptions.
   * - `roles`
   * - `users`
   * - `everyone`
   * @typedef {string} MessageMentionTypes
   */

  /**
   * Sends a message to this channel.
   * @param {string|MessagePayload|MessageCreateOptions} options The options to provide
   * @returns {Promise<Message>}
   * @example
   * // Send a basic message
   * channel.send('hello!')
   *   .then(message => console.log(`Sent message: ${message.content}`))
   *   .catch(console.error);
   * @example
   * // Send a remote file
   * channel.send({
   *   files: ['https://cdn.discordapp.com/icons/222078108977594368/6e1019b3179d71046e463a75915e7244.png?size=2048']
   * })
   *   .then(console.log)
   *   .catch(console.error);
   * @example
   * // Send a local file
   * channel.send({
   *   files: [{
   *     attachment: 'entire/path/to/file.jpg',
   *     name: 'file.jpg',
   *     description: 'A description of the file'
   *   }]
   * })
   *   .then(console.log)
   *   .catch(console.error);
   */
  async send(options) {
    const User = require('../User');
    const { GuildMember } = require('../GuildMember');

    if (this instanceof User || this instanceof GuildMember) {
      const dm = await this.createDM();
      return dm.send(options);
    }

    let messagePayload;

    if (options instanceof MessagePayload) {
      messagePayload = options.resolveBody();
    } else {
      messagePayload = MessagePayload.create(this, options).resolveBody();
    }

    const { body, files } = await messagePayload.resolveFiles();
    const d = await this.client.rest.post(Routes.channelMessages(this.id), { body, files });

    return this.messages.cache.get(d.id) ?? this.messages._add(d);
  }

  /**
   * Sends a typing indicator in the channel.
   * @returns {Promise<void>} Resolves upon the typing status being sent
   * @example
   * // Start typing in a channel
   * channel.sendTyping();
   */
  async sendTyping() {
    await this.client.rest.post(Routes.channelTyping(this.id));
  }

  /**
   * Marks the channel as read up to its last message (user accounts only). Does nothing if the channel has no
   * known last message.
   * @returns {Promise<this>}
   * @example
   * // Clear the unread badge of a channel
   * await channel.markRead();
   */
  async markRead() {
    if (this.lastMessageId) await this.messages._ack(this.lastMessageId);
    return this;
  }

  /**
   * Runs another application's slash command in this channel, the way the official client does (user accounts
   * only).
   * <info>Give the options in the command's order, or as one object keyed by option name; a choice can be given by
   * its name or its value. Subcommands go in the command name, like `'settings set'`. Attachment options are not
   * supported.</info>
   * @param {UserResolvable} bot The bot, or its application id
   * @param {string} command The command name, with its subcommand group and subcommand if any
   * @param {...*} [options] The option values
   * @returns {Promise<?(Message|Modal)>} The application's reply, the modal it opened, or `null` if it answered with
   * neither in time. A deferred reply ("is thinking...") is returned once the application fills it in, or as the
   * placeholder itself after a minute.
   * @example
   * // Run a bot's /help and read the reply
   * const reply = await channel.sendSlash(botId, 'help');
   * console.log(reply?.content);
   * @example
   * // Options by name, with a subcommand
   * await channel.sendSlash(botId, 'settings set', { key: 'prefix', value: '!' });
   */
  sendSlash(bot, command, ...options) {
    return Interactions.sendSlash(this, bot, command, options);
  }

  /**
   * Creates a Message Collector.
   * @param {MessageCollectorOptions} [options={}] The options to pass to the collector
   * @returns {MessageCollector}
   * @example
   * // Create a message collector
   * const filter = message => message.content.includes('discord');
   * const collector = channel.createMessageCollector({ filter, time: 15_000 });
   * collector.on('collect', message => console.log(`Collected ${message.content}`));
   * collector.on('end', collected => console.log(`Collected ${collected.size} items`));
   */
  createMessageCollector(options = {}) {
    return new MessageCollector(this, options);
  }

  /**
   * An object containing the same properties as CollectorOptions, but a few more:
   * @typedef {MessageCollectorOptions} AwaitMessagesOptions
   * @property {string[]} [errors] Stop/end reasons that cause the promise to reject
   */

  /**
   * Similar to createMessageCollector but in promise form.
   * Resolves with a collection of messages that pass the specified filter.
   * @param {AwaitMessagesOptions} [options={}] Optional options to pass to the internal collector
   * @returns {Promise<Collection<Snowflake, Message>>}
   * @example
   * // Await !vote messages
   * const filter = m => m.content.startsWith('!vote');
   * // Errors: ['time'] treats ending because of the time limit as an error
   * channel.awaitMessages({ filter, max: 4, time: 60_000, errors: ['time'] })
   *   .then(collected => console.log(collected.size))
   *   .catch(collected => console.log(`After a minute, only ${collected.size} out of 4 voted.`));
   */
  awaitMessages(options = {}) {
    return new Promise((resolve, reject) => {
      const collector = this.createMessageCollector(options);
      collector.once('end', (collection, reason) => {
        if (options.errors?.includes(reason)) {
          reject(collection);
        } else {
          resolve(collection);
        }
      });
    });
  }

  /**
   * Fetches all webhooks for the channel.
   * @returns {Promise<Collection<Snowflake, Webhook>>}
   * @example
   * // Fetch webhooks
   * channel.fetchWebhooks()
   *   .then(hooks => console.log(`This channel has ${hooks.size} hooks`))
   *   .catch(console.error);
   */
  fetchWebhooks() {
    return this.guild.channels.fetchWebhooks(this.id);
  }

  /**
   * Options used to create a {@link Webhook}.
   * @typedef {Object} ChannelWebhookCreateOptions
   * @property {string} name The name of the webhook
   * @property {?(BufferResolvable|Base64Resolvable)} [avatar] Avatar for the webhook
   * @property {string} [reason] Reason for creating the webhook
   */

  /**
   * Creates a webhook for the channel.
   * @param {ChannelWebhookCreateOptions} [options] Options for creating the webhook
   * @returns {Promise<Webhook>} Returns the created Webhook
   * @example
   * // Create a webhook for the current channel
   * channel.createWebhook({
   *   name: 'Snek',
   *   avatar: 'https://i.imgur.com/mI8XcpG.jpg',
   *   reason: 'Needed a cool new Webhook'
   * })
   *   .then(console.log)
   *   .catch(console.error)
   */
  createWebhook(options) {
    return this.guild.channels.createWebhook({ channel: this.id, ...options });
  }

  /**
   * Sets the rate limit per user (slowmode) for this channel.
   * @param {number} rateLimitPerUser The new rate limit in seconds
   * @param {string} [reason] Reason for changing the channel's rate limit
   * @returns {Promise<this>}
   */
  setRateLimitPerUser(rateLimitPerUser, reason) {
    return this.edit({ rateLimitPerUser, reason });
  }

  /**
   * Sets whether this channel is flagged as NSFW.
   * @param {boolean} [nsfw=true] Whether the channel should be considered NSFW
   * @param {string} [reason] Reason for changing the channel's NSFW flag
   * @returns {Promise<this>}
   */
  setNSFW(nsfw = true, reason) {
    return this.edit({ nsfw, reason });
  }

  static applyToClass(structure, full = false, ignore = []) {
    const props = ['send'];
    if (full) {
      props.push(
        'lastMessage',
        'lastPinAt',
        'sendTyping',
        'markRead',
        'sendSlash',
        'createMessageCollector',
        'awaitMessages',
        'fetchWebhooks',
        'createWebhook',
        'setRateLimitPerUser',
        'setNSFW',
      );
    }
    for (const prop of props) {
      if (ignore.includes(prop)) continue;
      Object.defineProperty(
        structure.prototype,
        prop,
        Object.getOwnPropertyDescriptor(TextBasedChannel.prototype, prop),
      );
    }
  }
}

module.exports = TextBasedChannel;

// Fixes Circular
const GuildMessageManager = require('../../managers/GuildMessageManager');
