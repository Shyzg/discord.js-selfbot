'use strict';

const process = require('node:process');
const { Routes } = require('discord-api-types/v10');
const CachedManager = require('./CachedManager');
const { DiscordjsTypeError, ErrorCodes } = require('../errors');
const ThreadMember = require('../structures/ThreadMember');
const { emitDeprecationWarningForRemoveThreadMember } = require('../util/Util');

let deprecationEmittedForAdd = false;

/**
 * Manages API methods for GuildMembers and stores their cache.
 * @extends {CachedManager}
 */
class ThreadMemberManager extends CachedManager {
  constructor(thread, iterable) {
    super(thread.client, ThreadMember, iterable);

    /**
     * The thread this manager belongs to
     * @type {ThreadChannel}
     */
    this.thread = thread;
  }

  /**
   * The cache of this Manager
   * @type {Collection<Snowflake, ThreadMember>}
   * @name ThreadMemberManager#cache
   */

  _add(data, cache = true) {
    const existing = this.cache.get(data.user_id);
    if (cache) existing?._patch(data, { cache });
    if (existing) return existing;

    const member = new ThreadMember(this.thread, data, { cache });
    if (cache) this.cache.set(data.user_id, member);
    return member;
  }

  /**
   * The client user as a ThreadMember of this ThreadChannel
   * @type {?ThreadMember}
   * @readonly
   */
  get me() {
    return this.cache.get(this.client.user.id) ?? null;
  }

  /**
   * Data that resolves to give a ThreadMember object. This can be:
   * * A ThreadMember object
   * * A User resolvable
   * @typedef {ThreadMember|UserResolvable} ThreadMemberResolvable
   */

  /**
   * Resolves a {@link ThreadMemberResolvable} to a {@link ThreadMember} object.
   * @param {ThreadMemberResolvable} member The user that is part of the thread
   * @returns {?GuildMember}
   */
  resolve(member) {
    const memberResolvable = super.resolve(member);
    if (memberResolvable) return memberResolvable;
    const userId = this.client.users.resolveId(member);
    if (userId) return super.cache.get(userId) ?? null;
    return null;
  }

  /**
   * Resolves a {@link ThreadMemberResolvable} to a {@link ThreadMember} id string.
   * @param {ThreadMemberResolvable} member The user that is part of the guild
   * @returns {?Snowflake}
   */
  resolveId(member) {
    const memberResolvable = super.resolveId(member);
    if (memberResolvable) return memberResolvable;
    const userResolvable = this.client.users.resolveId(member);
    return this.cache.has(userResolvable) ? userResolvable : null;
  }

  /**
   * Adds a member to the thread.
   * @param {UserResolvable|'@me'} member The member to add
   * @param {string} [reason] The reason for adding this member
   * <warn>This parameter is **deprecated**. Reasons cannot be used.</warn>
   * @returns {Promise<Snowflake>}
   */
  async add(member, reason) {
    if (reason !== undefined && !deprecationEmittedForAdd) {
      process.emitWarning(
        'The reason parameter of ThreadMemberManager#add() is deprecated as Discord does not parse them. It will be removed in the next major version.',
        'DeprecationWarning',
      );

      deprecationEmittedForAdd = true;
    }

    const id = member === '@me' ? member : this.client.users.resolveId(member);
    if (!id) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'member', 'UserResolvable');
    await this.client.rest.put(Routes.threadMembers(this.thread.id, id), { reason });
    return id;
  }

  /**
   * Remove a user from the thread.
   * @param {UserResolvable|'@me'} member The member to remove
   * @param {string} [reason] The reason for removing this member from the thread
   * <warn>This parameter is **deprecated**. Reasons cannot be used.</warn>
   * @returns {Promise<Snowflake>}
   */
  async remove(member, reason) {
    if (reason !== undefined) {
      emitDeprecationWarningForRemoveThreadMember(this.constructor.name);
    }

    const id = member === '@me' ? member : this.client.users.resolveId(member);
    if (!id) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'member', 'UserResolvable');
    await this.client.rest.delete(Routes.threadMembers(this.thread.id, id), { reason });
    return id;
  }
}

module.exports = ThreadMemberManager;
