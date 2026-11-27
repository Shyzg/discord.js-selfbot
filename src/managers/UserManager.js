'use strict';

const { Collection } = require('@discordjs/collection');
const { ChannelType, Routes } = require('discord-api-types/v10');
const CachedManager = require('./CachedManager');
const { DiscordjsError, DiscordjsTypeError, ErrorCodes } = require('../errors');
const { GuildMember } = require('../structures/GuildMember');
const { Message } = require('../structures/Message');
const ThreadMember = require('../structures/ThreadMember');
const User = require('../structures/User');
const Events = require('../util/Events');
const { emitDeprecationWarningForUserFetchFlags } = require('../util/Util');

/**
 * Manages API methods for users and stores their cache.
 * @extends {CachedManager}
 */
class UserManager extends CachedManager {
  constructor(client, iterable) {
    super(client, User, iterable);

    /**
     * The private notes the client user wrote about other users, keyed by user id. Filled by
     * {@link UserManager#fetchNote}, {@link UserManager#setNote} and note changes made on other devices.
     * @type {Collection<Snowflake, string>}
     */
    this.notes = new Collection();
  }

  /**
   * Fetches the private note the client user wrote about a user (user accounts only).
   * @param {UserResolvable} user The user
   * @param {Object} [options] Options for this fetch
   * @param {boolean} [options.force=false] Whether to skip the note cache and request the API
   * @returns {Promise<?string>} The note, or `null` if there is none
   */
  async fetchNote(user, { force = false } = {}) {
    const id = this.resolveId(user);
    if (!id) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'user', 'UserResolvable');
    if (!force && this.notes.has(id)) return this.notes.get(id);
    let note;
    try {
      ({ note } = await this.client.rest.get(`/users/@me/notes/${id}`));
    } catch (error) {
      // Discord answers 404 when there is no note for this user.
      if (error?.status !== 404) throw error;
    }
    if (note) this.notes.set(id, note);
    else this.notes.delete(id);
    return note || null;
  }

  /**
   * Sets or clears the private note the client user keeps about a user (user accounts only).
   * @param {UserResolvable} user The user
   * @param {?string} note The note (up to 256 characters); `null` or an empty string clears it
   * @returns {Promise<?string>} The new note
   */
  async setNote(user, note) {
    const id = this.resolveId(user);
    if (!id) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'user', 'UserResolvable');
    await this.client.rest.put(`/users/@me/notes/${id}`, { body: { note: note || null } });
    return this._patchNote(id, note);
  }

  /**
   * Stores a note change and emits {@link Client#event:userNoteUpdate} if the note actually changed.
   * @param {Snowflake} id The id of the user the note is about
   * @param {?string} note The new note
   * @returns {?string}
   * @private
   */
  _patchNote(id, note) {
    const oldNote = this.notes.get(id) ?? null;
    const newNote = note || null;
    if (newNote) this.notes.set(id, newNote);
    else this.notes.delete(id);
    if (oldNote !== newNote) {
      /**
       * Emitted when a private note the client user keeps about a user changes, from this client or another device.
       * @event Client#userNoteUpdate
       * @param {User} user The user the note is about (partial if uncached)
       * @param {?string} oldNote The note before the change
       * @param {?string} newNote The note after the change
       */
      this.client.emit(Events.UserNoteUpdate, this.cache.get(id) ?? this._add({ id }, false), oldNote, newNote);
    }
    return newNote;
  }

  /**
   * The cache of this manager
   * @type {Collection<Snowflake, User>}
   * @name UserManager#cache
   */

  /**
   * Data that resolves to give a User object. This can be:
   * * A User object
   * * A Snowflake
   * * A Message object (resolves to the message author)
   * * A GuildMember object
   * * A ThreadMember object
   * @typedef {User|Snowflake|Message|GuildMember|ThreadMember} UserResolvable
   */

  /**
   * The DM between the client's user and a user
   * @param {Snowflake} userId The user id
   * @returns {?DMChannel}
   * @private
   */
  dmChannel(userId) {
    const expectedRecipientIds = [userId, this.client.user.id];
    return (
      this.client.channels.cache.find(
        channel =>
          channel.type === ChannelType.DM &&
          channel.recipientId === userId &&
          channel.recipientIds.every(id => expectedRecipientIds.includes(id)),
      ) ?? null
    );
  }

  /**
   * Creates a {@link DMChannel} between the client and a user.
   * @param {UserResolvable} user The UserResolvable to identify
   * @param {BaseFetchOptions} [options] Additional options for this fetch
   * @returns {Promise<DMChannel>}
   */
  async createDM(user, { cache = true, force = false } = {}) {
    const id = this.resolveId(user);
    if (!id) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'user', 'UserResolvable');

    if (!force) {
      const dmChannel = this.dmChannel(id);
      if (dmChannel && !dmChannel.partial) return dmChannel;
    }

    const data = await this.client.rest.post(Routes.userChannels(), { body: { recipients: [id] } });
    return this.client.channels._add(data, null, { cache });
  }

  /**
   * Deletes a {@link DMChannel} (if one exists) between the client and a user. Resolves with the channel if successful.
   * @param {UserResolvable} user The UserResolvable to identify
   * @returns {Promise<DMChannel>}
   */
  async deleteDM(user) {
    const id = this.resolveId(user);
    const dmChannel = this.dmChannel(id);
    if (!dmChannel) throw new DiscordjsError(ErrorCodes.UserNoDMChannel);
    await this.client.rest.delete(Routes.channel(dmChannel.id));
    this.client.channels._remove(dmChannel.id);
    return dmChannel;
  }

  /**
   * Obtains a user from Discord, or the user cache if it's already available.
   * @param {UserResolvable} user The user to fetch
   * @param {BaseFetchOptions} [options] Additional options for this fetch
   * @returns {Promise<User>}
   */
  async fetch(user, { cache = true, force = false } = {}) {
    const id = this.resolveId(user);
    if (!id) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'user', 'UserResolvable');
    if (!force) {
      const existing = this.cache.get(id);
      if (existing && !existing.partial) return existing;
    }

    // Discord blocks GET /users/:id for user tokens: use /users/@me for self and /users/:id/profile for others.
    const data =
      id === this.client.user?.id
        ? await this.client.rest.get(Routes.user())
        : (await this.client.rest.get(`/users/${id}/profile`)).user;
    return this._add(data, cache);
  }

  /**
   * Fetches a user's flags.
   * @param {UserResolvable} user The UserResolvable to identify
   * @param {BaseFetchOptions} [options] Additional options for this fetch
   * @returns {Promise<UserFlagsBitField>}
   * @deprecated <warn>This method is deprecated and will be removed in the next major version.
   * Flags may still be retrieved via {@link UserManager#fetch}.</warn>
   */
  async fetchFlags(user, options) {
    emitDeprecationWarningForUserFetchFlags(this.constructor.name);
    return (await this.fetch(user, options)).flags;
  }

  /**
   * Sends a message to a user.
   * @param {UserResolvable} user The UserResolvable to identify
   * @param {string|MessagePayload|MessageCreateOptions} options The options to provide
   * @returns {Promise<Message>}
   */
  async send(user, options) {
    return (await this.createDM(user)).send(options);
  }

  /**
   * Resolves a {@link UserResolvable} to a {@link User} object.
   * @param {UserResolvable} user The UserResolvable to identify
   * @returns {?User}
   */
  resolve(user) {
    if (user instanceof GuildMember || user instanceof ThreadMember) return user.user;
    if (user instanceof Message) return user.author;
    return super.resolve(user);
  }

  /**
   * Resolves a {@link UserResolvable} to a {@link User} id.
   * @param {UserResolvable} user The UserResolvable to identify
   * @returns {?Snowflake}
   */
  resolveId(user) {
    if (user instanceof ThreadMember) return user.id;
    if (user instanceof GuildMember) return user.user.id;
    if (user instanceof Message) return user.author?.id ?? null;
    return super.resolveId(user);
  }
}

module.exports = UserManager;
