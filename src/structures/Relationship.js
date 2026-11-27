'use strict';

const Base = require('./Base');

/**
 * Represents the client user's relationship with another user: a friend, a blocked user, or a pending friend request.
 * <info>User accounts only.</info>
 * @extends {Base}
 */
class Relationship extends Base {
  constructor(client, data) {
    super(client);

    /**
     * The id of the other user
     * @type {Snowflake}
     */
    this.id = data.id;

    this._patch(data);
  }

  _patch(data) {
    if ('type' in data) {
      /**
       * The type of the relationship
       * @type {RelationshipType}
       */
      this.type = data.type;
    }

    if ('nickname' in data) {
      /**
       * The nickname the client user gave this friend
       * @type {?string}
       */
      this.nickname = data.nickname;
    } else {
      this.nickname ??= null;
    }

    if ('since' in data) {
      /**
       * The timestamp the relationship was requested at
       * @type {?number}
       */
      this.sinceTimestamp = data.since ? Date.parse(data.since) : null;
    } else {
      this.sinceTimestamp ??= null;
    }
  }

  /**
   * The time the relationship was requested at
   * @type {?Date}
   * @readonly
   */
  get since() {
    return this.sinceTimestamp && new Date(this.sinceTimestamp);
  }

  /**
   * The other user, if cached
   * @type {?User}
   * @readonly
   */
  get user() {
    return this.client.users.resolve(this.id);
  }
}

module.exports = Relationship;
