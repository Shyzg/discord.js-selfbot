'use strict';

const { RelationshipType } = require('discord-api-types/v10');
const CachedManager = require('./CachedManager');
const { DiscordjsTypeError, ErrorCodes } = require('../errors');
const Relationship = require('../structures/Relationship');

/**
 * Manages the client user's relationships (friends, blocked users and pending friend requests) and holds their cache.
 * <info>User accounts only. Discord may flag suspicious friend request activity and answer with a captcha challenge;
 * pass a `captcha` handler to retry with the solved key.</info>
 * @extends {CachedManager}
 */
class RelationshipManager extends CachedManager {
  constructor(client, iterable) {
    super(client, Relationship, iterable);
  }

  /**
   * The cache of relationships, keyed by the other user's id
   * @type {Collection<Snowflake, Relationship>}
   * @name RelationshipManager#cache
   */

  _add(data, cache) {
    if (data.user) this.client.users._add(data.user);
    return super._add(data, cache);
  }

  /**
   * Replaces the cache with a full relationship list (READY or a REST fetch).
   * @param {APIRelationship[]} relationships The raw relationships
   * @private
   */
  _setAll(relationships) {
    this.cache.clear();
    for (const relationship of relationships) this._add(relationship);
  }

  /**
   * The relationships that are friends
   * @type {Collection<Snowflake, Relationship>}
   * @readonly
   */
  get friends() {
    return this.cache.filter(relationship => relationship.type === RelationshipType.Friend);
  }

  /**
   * The relationships that are blocked users
   * @type {Collection<Snowflake, Relationship>}
   * @readonly
   */
  get blocked() {
    return this.cache.filter(relationship => relationship.type === RelationshipType.Blocked);
  }

  /**
   * The friend requests other users sent to the client user
   * @type {Collection<Snowflake, Relationship>}
   * @readonly
   */
  get incoming() {
    return this.cache.filter(relationship => relationship.type === RelationshipType.PendingIncoming);
  }

  /**
   * The friend requests the client user sent
   * @type {Collection<Snowflake, Relationship>}
   * @readonly
   */
  get outgoing() {
    return this.cache.filter(relationship => relationship.type === RelationshipType.PendingOutgoing);
  }

  /**
   * Resolves a {@link Relationship} or {@link UserResolvable} to the other user's id.
   * @param {Relationship|UserResolvable} user The relationship or user to resolve
   * @returns {?Snowflake}
   */
  resolveId(user) {
    return super.resolveId(user) ?? this.client.users.resolveId(user);
  }

  _requireUserId(user) {
    const id = this.resolveId(user);
    if (!id) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'user', 'UserResolvable');
    return id;
  }

  /**
   * Fetches every relationship from Discord and replaces the cache with them.
   * @returns {Promise<Collection<Snowflake, Relationship>>}
   */
  async fetch() {
    this._setAll(await this.client.rest.get('/users/@me/relationships'));
    return this.cache;
  }

  /**
   * Options for a request Discord may protect with a captcha.
   * @typedef {Object} CaptchaRequestOptions
   * @property {Function} [captcha] `async challenge => captchaKey`; solves a captcha challenge so the request is
   * retried once with the key. Without it, a challenge rejects with {@link DiscordjsErrorCodes.CaptchaRequired}.
   */

  /**
   * Sends a friend request by username.
   * @param {string} username The username, or `name#1234` for an account that still has a discriminator
   * @param {CaptchaRequestOptions} [options] Options for the request
   * @returns {Promise<void>}
   */
  async sendFriendRequest(username, { captcha } = {}) {
    if (typeof username !== 'string' || !username) {
      throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'username', 'string');
    }
    const [name, discriminator] = username.split('#');
    await this.client._captchaRequest(
      'post',
      '/users/@me/relationships',
      // Migrated (unique) usernames have no discriminator, which Discord expects as null.
      { body: { username: name, discriminator: discriminator && discriminator !== '0' ? discriminator : null } },
      captcha,
    );
  }

  /**
   * Sends a friend request to a user, or accepts the one they sent.
   * @param {UserResolvable} user The user
   * @param {CaptchaRequestOptions} [options] Options for the request
   * @returns {Promise<void>}
   */
  async addFriend(user, { captcha } = {}) {
    await this.client._captchaRequest(
      'put',
      `/users/@me/relationships/${this._requireUserId(user)}`,
      { body: {} },
      captcha,
    );
  }

  /**
   * Blocks a user.
   * @param {UserResolvable} user The user
   * @returns {Promise<void>}
   */
  async block(user) {
    await this.client.rest.put(`/users/@me/relationships/${this._requireUserId(user)}`, {
      body: { type: RelationshipType.Blocked },
    });
  }

  /**
   * Removes a relationship: unfriends, cancels or declines a friend request, or unblocks.
   * @param {UserResolvable} user The user
   * @returns {Promise<void>}
   */
  async remove(user) {
    await this.client.rest.delete(`/users/@me/relationships/${this._requireUserId(user)}`);
  }

  /**
   * Sets the nickname of a friend (only visible to the client user).
   * @param {UserResolvable} user The friend
   * @param {string} nickname The nickname (1-32 characters)
   * @returns {Promise<void>}
   */
  async setNickname(user, nickname) {
    await this.client.rest.patch(`/users/@me/relationships/${this._requireUserId(user)}`, { body: { nickname } });
  }
}

module.exports = RelationshipManager;
