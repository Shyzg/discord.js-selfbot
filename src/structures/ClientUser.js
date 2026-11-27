'use strict';

const { Collection } = require('@discordjs/collection');
const { Routes } = require('discord-api-types/v10');
const User = require('./User');
const { resolveImage } = require('../util/DataResolver');
const { stripRequestBody } = require('../util/UserProperties');

/**
 * Represents the logged in client's Discord user.
 * @extends {User}
 */
class ClientUser extends User {
  constructor(client, data) {
    super(client, data);

    /**
     * A gateway session of the client user: one logged-in client (app, browser tab or this library).
     * @typedef {Object} ClientSession
     * @property {string} id The session id; `all` is the combined presence other users see
     * @property {string} status The status of the session
     * @property {?boolean} active Whether the session is active, if Discord says
     * @property {Object} clientInfo The kind of client: `client` (desktop, web, mobile, ...), `os` and `version`
     * @property {APIActivity[]} activities The raw activities of the session
     */

    /**
     * The client user's active gateway sessions, keyed by session id (user accounts only). Kept current by Discord's
     * session list at READY and on every change.
     * @type {Collection<string, ClientSession>}
     */
    this.sessions = new Collection();
  }

  /**
   * The client user's overall status as other users see it, from {@link ClientUser#sessions}. Unlike
   * {@link ClientPresence#status}, which is what this client asks for (`unknown` until a status is set), this is the
   * status Discord settled on across all of the account's sessions.
   * @type {?PresenceStatus}
   * @readonly
   */
  get status() {
    const own = this.client.ws.shards.first()?.sessionInfo?.sessionId;
    return (this.sessions.get('all') ?? this.sessions.get(own) ?? this.sessions.first())?.status ?? null;
  }

  /**
   * Replaces the session list.
   * @param {Object[]} sessions The raw session objects
   * @returns {Collection<string, ClientSession>} The previous sessions
   * @private
   */
  _setSessions(sessions) {
    const oldSessions = this.sessions;
    this.sessions = new Collection(
      sessions.map(session => [
        session.session_id,
        {
          id: session.session_id,
          status: session.status,
          active: session.active ?? null,
          clientInfo: {
            client: session.client_info?.client ?? 'unknown',
            os: session.client_info?.os ?? 'unknown',
            version: session.client_info?.version ?? 0,
          },
          activities: session.activities ?? [],
        },
      ]),
    );
    return oldSessions;
  }

  _patch(data) {
    super._patch(data);

    if ('verified' in data) {
      /**
       * Whether or not this account has been verified
       * @type {boolean}
       */
      this.verified = data.verified;
    }

    if ('mfa_enabled' in data) {
      /**
       * If the bot's {@link ClientApplication#owner Owner} has MFA enabled on their account
       * @type {?boolean}
       */
      this.mfaEnabled = typeof data.mfa_enabled === 'boolean' ? data.mfa_enabled : null;
    } else {
      this.mfaEnabled ??= null;
    }

    if ('token' in data) {
      this.client.token = data.token;
      this.client.rest.setToken(data.token);
    }
  }

  /**
   * Represents the client user's presence
   * @type {ClientPresence}
   * @readonly
   */
  get presence() {
    return this.client.presence;
  }

  /**
   * Data used to edit the logged in client
   * @typedef {Object} ClientUserEditOptions
   * @property {string} [username] The new username
   * @property {?(BufferResolvable|Base64Resolvable)} [avatar] The new avatar
   * @property {?(BufferResolvable|Base64Resolvable)} [banner] The new banner
   * @property {string} [password] Current password (required by Discord when changing username)
   */

  /**
   * Edits the logged in client.
   * @param {ClientUserEditOptions} options The options to provide
   * @returns {Promise<ClientUser>}
   */
  async edit({ username, avatar, banner, password }) {
    const data = await this.client.rest
      .patch(Routes.user(), {
        body: {
          username,
          avatar: avatar && (await resolveImage(avatar)),
          banner: banner && (await resolveImage(banner)),
          password,
        },
      })
      .catch(stripRequestBody);

    const { updated } = this.client.actions.UserUpdate.handle(data);
    return updated ?? this;
  }

  /**
   * Sets the username of the logged in client.
   * <info>Changing usernames in Discord is heavily rate limited, with only 2 requests
   * every hour. Use this sparingly!</info>
   * @param {string} username The new username
   * @param {string} [password] Current account password (required by Discord for user accounts)
   * @returns {Promise<ClientUser>}
   * @example
   * // Set username
   * client.user.setUsername('discordjs', 'current-password')
   *   .then(user => console.log(`My new username is ${user.username}`))
   *   .catch(console.error);
   */
  setUsername(username, password) {
    return this.edit({ username, password });
  }

  /**
   * Sets the avatar of the logged in client.
   * @param {?(BufferResolvable|Base64Resolvable)} avatar The new avatar
   * @returns {Promise<ClientUser>}
   * @example
   * // Set avatar
   * client.user.setAvatar('./avatar.png')
   *   .then(user => console.log(`New avatar set!`))
   *   .catch(console.error);
   */
  setAvatar(avatar) {
    return this.edit({ avatar });
  }

  /**
   * Sets the banner of the logged in client.
   * @param {?(BufferResolvable|Base64Resolvable)} banner The new banner
   * @returns {Promise<ClientUser>}
   * @example
   * // Set banner
   * client.user.setBanner('./banner.png')
   *   .then(user => console.log(`New banner set!`))
   *   .catch(console.error);
   */
  setBanner(banner) {
    return this.edit({ banner });
  }

  /**
   * Options for setting activities
   * @typedef {Object} ActivitiesOptions
   * @property {string} name Name of the activity
   * @property {string} [state] State of the activity
   * @property {ActivityType} [type] Type of the activity
   * @property {string} [url] Twitch / YouTube stream URL
   */

  /**
   * Data resembling a raw Discord presence.
   * @typedef {Object} PresenceData
   * @property {PresenceStatusData} [status] Status of the user
   * @property {boolean} [afk] Whether the user is AFK
   * @property {ActivitiesOptions[]} [activities] Activity the user is playing
   * @property {number|number[]} [shardId] Shard id(s) to have the activity set on
   */

  /**
   * Sets the full presence of the client user.
   * @param {PresenceData} data Data for the presence
   * @returns {ClientPresence}
   * @example
   * // Set the client user's presence
   * client.user.setPresence({ activities: [{ name: 'with discord.js' }], status: 'idle' });
   */
  setPresence(data) {
    return this.client.presence.set(data);
  }

  /**
   * A user's status. Must be one of:
   * * `online`
   * * `idle`
   * * `invisible`
   * * `dnd` (do not disturb)
   * @typedef {string} PresenceStatusData
   */

  /**
   * Sets the status of the client user.
   * @param {PresenceStatusData} status Status to change to
   * @param {number|number[]} [shardId] Shard id(s) to have the activity set on
   * @returns {ClientPresence}
   * @example
   * // Set the client user's status
   * client.user.setStatus('idle');
   */
  setStatus(status, shardId) {
    return this.setPresence({ status, shardId });
  }

  /**
   * Options for setting an activity.
   * @typedef {Object} ActivityOptions
   * @property {string} name Name of the activity
   * @property {string} [state] State of the activity
   * @property {string} [url] Twitch / YouTube stream URL
   * @property {ActivityType} [type] Type of the activity
   * @property {number|number[]} [shardId] Shard Id(s) to have the activity set on
   */

  /**
   * Sets the activity the client user is playing.
   * @param {string|ActivityOptions} name Activity being played, or options for setting the activity
   * @param {ActivityOptions} [options] Options for setting the activity
   * @returns {ClientPresence}
   * @example
   * // Set the client user's activity
   * client.user.setActivity('discord.js', { type: ActivityType.Watching });
   */
  setActivity(name, options = {}) {
    if (!name) return this.setPresence({ activities: [], shardId: options.shardId });

    const activity = Object.assign({}, options, typeof name === 'object' ? name : { name });
    return this.setPresence({ activities: [activity], shardId: activity.shardId });
  }

  /**
   * Sets/removes the AFK flag for the client user.
   * @param {boolean} [afk=true] Whether or not the user is AFK
   * @param {number|number[]} [shardId] Shard Id(s) to have the AFK flag set on
   * @returns {ClientPresence}
   */
  setAFK(afk = true, shardId) {
    return this.setPresence({ afk, shardId });
  }
}

module.exports = ClientUser;
