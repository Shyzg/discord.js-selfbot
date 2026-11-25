'use strict';

const process = require('node:process');
const { Collection } = require('@discordjs/collection');
const { makeURLSearchParams } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const BaseClient = require('./BaseClient');
const ActionsManager = require('./actions/ActionsManager');
const ClientVoiceManager = require('./voice/ClientVoiceManager');
const WebSocketManager = require('./websocket/WebSocketManager');
const { DiscordjsError, DiscordjsTypeError, ErrorCodes } = require('../errors');
const BaseGuildEmojiManager = require('../managers/BaseGuildEmojiManager');
const ChannelManager = require('../managers/ChannelManager');
const GuildManager = require('../managers/GuildManager');
const UserManager = require('../managers/UserManager');
const ClientPresence = require('../structures/ClientPresence');
const GuildPreview = require('../structures/GuildPreview');
const GuildTemplate = require('../structures/GuildTemplate');
const Invite = require('../structures/Invite');
const { SoundboardSound } = require('../structures/SoundboardSound');
const { Sticker } = require('../structures/Sticker');
const StickerPack = require('../structures/StickerPack');
const VoiceRegion = require('../structures/VoiceRegion');
const Webhook = require('../structures/Webhook');
const Widget = require('../structures/Widget');
const { resolveInviteCode, resolveGuildTemplateCode } = require('../util/DataResolver');
const Events = require('../util/Events');
const IntentsBitField = require('../util/IntentsBitField');
const Status = require('../util/Status');
const Sweepers = require('../util/Sweepers');

/**
 * The main hub for interacting with the Discord API, and the starting point for any bot.
 * @extends {BaseClient}
 */
class Client extends BaseClient {
  /**
   * @param {ClientOptions} options Options for the client
   */
  constructor(options) {
    super(options);

    this._validateOptions();

    /**
     * The WebSocket manager of the client
     * @type {WebSocketManager}
     */
    this.ws = new WebSocketManager(this);

    /**
     * The action manager of the client
     * @type {ActionsManager}
     * @private
     */
    this.actions = new ActionsManager(this);

    /**
     * The voice manager of the client
     * @type {ClientVoiceManager}
     */
    this.voice = new ClientVoiceManager(this);

    /**
     * The user manager of this client
     * @type {UserManager}
     */
    this.users = new UserManager(this);

    /**
     * A manager of all the guilds the client is currently handling -
     * as long as sharding isn't being used, this will be *every* guild the bot is a member of
     * @type {GuildManager}
     */
    this.guilds = new GuildManager(this);

    /**
     * All of the {@link BaseChannel}s that the client is currently handling -
     * as long as sharding isn't being used, this will be *every* channel in *every* guild the bot
     * is a member of. Note that DM channels will not be initially cached, and thus not be present
     * in the Manager without their explicit fetching or use.
     * @type {ChannelManager}
     */
    this.channels = new ChannelManager(this);

    /**
     * The sweeping functions and their intervals used to periodically sweep caches
     * @type {Sweepers}
     */
    this.sweepers = new Sweepers(this, this.options.sweepers);

    /**
     * The presence of the Client
     * @private
     * @type {ClientPresence}
     */
    this.presence = new ClientPresence(this, this.options.presence);

    Object.defineProperty(this, 'token', { writable: true });
    if (!this.token && 'DISCORD_TOKEN' in process.env) {
      /**
       * Authorization token for the logged in bot.
       * If present, this defaults to `process.env.DISCORD_TOKEN` when instantiating the client
       * <warn>This should be kept private at all times.</warn>
       * @type {?string}
       */
      this.token = process.env.DISCORD_TOKEN;
    } else {
      this.token = null;
    }

    /**
     * User that the client is logged in as
     * @type {?ClientUser}
     */
    this.user = null;

    /**
     * The application of this bot
     * @type {?ClientApplication}
     */
    this.application = null;

    /**
     * Timestamp of the time the client was last {@link Status.Ready} at
     * @type {?number}
     */
    this.readyTimestamp = null;

    this._destroyed = false;
  }

  /**
   * A manager of all the custom emojis that the client has access to
   * @type {BaseGuildEmojiManager}
   * @readonly
   */
  get emojis() {
    const emojis = new BaseGuildEmojiManager(this);
    for (const guild of this.guilds.cache.values()) {
      if (guild.available) for (const emoji of guild.emojis.cache.values()) emojis.cache.set(emoji.id, emoji);
    }
    return emojis;
  }

  /**
   * Time at which the client was last regarded as being in the {@link Status.Ready} state
   * (each time the client disconnects and successfully reconnects, this will be overwritten)
   * @type {?Date}
   * @readonly
   */
  get readyAt() {
    return this.readyTimestamp && new Date(this.readyTimestamp);
  }

  /**
   * How long it has been since the client last entered the {@link Status.Ready} state in milliseconds
   * @type {?number}
   * @readonly
   */
  get uptime() {
    return this.readyTimestamp && Date.now() - this.readyTimestamp;
  }

  /**
   * Logs the client in, establishing a WebSocket connection to Discord.
   * @param {string} [token=this.token] Token of the account to log in with
   * @returns {Promise<string>} Token of the account used
   * @example
   * client.login('my token');
   */
  async login(token = this.token) {
    if (!token || typeof token !== 'string') throw new DiscordjsError(ErrorCodes.TokenInvalid);
    this.token = token = token.replace(/^(Bot|Bearer)\s*/i, '');
    this.rest.setToken(token);
    if (this._destroyed) {
      this._destroyed = false;
      this.sweepers = new Sweepers(this, this.options.sweepers);
      this.rest.setupSweepers?.();
    }
    this.emit(Events.Debug, `Provided token: ${this._censoredToken}`);

    if (Object.keys(this.options.presence).length) {
      this.options.ws.presence = this.presence._parse(this.options.presence);
    } else {
      // Match Discord's web client default IDENTIFY presence so connecting doesn't force the account online.
      this.options.ws.presence ??= { activities: [], status: 'unknown', since: 0, afk: false };
    }

    this.emit(Events.Debug, 'Preparing to connect to the gateway...');

    try {
      await this.ws.connect();
      return this.token;
    } catch (error) {
      await this.destroy();
      throw error;
    }
  }

  /**
   * Logs in with an email/phone and password (user accounts only), resolving captcha and MFA challenges
   * through the provided handlers, then connects to the gateway like {@link Client#login}.
   * @param {string} login Email or phone number of the account
   * @param {string} password Password of the account
   * @param {Object} [options] Login options
   * @param {string} [options.totpSecret] A TOTP (authenticator) secret; when MFA is required and TOTP is
   * available, the code is generated automatically, so no `mfa` handler is needed for TOTP.
   * @param {Function} [options.captcha] `async challenge => captchaKey`; resolves a captcha challenge to its
   * solved key. Without it, a captcha challenge throws {@link DiscordjsErrorCodes.CaptchaRequired}.
   * @param {Function} [options.mfa] `async context => ({ method, code })`; returns the MFA method
   * (`'totp'`, `'sms'` or `'backup'`) and its code. `context` exposes `sendSms()` to request an SMS code first.
   * @returns {Promise<string>} Token of the account logged in with
   * @example
   * // email + password + a stored 2FA secret, fully automatic:
   * await client.normalLogin('user@example.com', 'password', { totpSecret: 'JBSWY3DP...' });
   */
  async normalLogin(login, password, { totpSecret, captcha, mfa } = {}) {
    const body = { login, password, undelete: false, login_source: null, gift_code_sku_id: null };
    const token = await this._passwordLogin(body, captcha)
      .then(data => this._completeMfa(data, { totpSecret, mfa }))
      .catch(error => {
        // @discordjs/rest errors keep the request body, so logging one would print the password or MFA ticket/code.
        if (error?.requestBody) delete error.requestBody;
        throw error;
      });
    if (!token) throw new DiscordjsError(ErrorCodes.TokenInvalid);
    return this.login(token);
  }

  /**
   * Posts credentials to the login endpoint, retrying once through the captcha handler if challenged.
   * @param {Object} body The login request body
   * @param {?Function} captcha The captcha handler
   * @returns {Promise<Object>} The login response
   * @private
   */
  async _passwordLogin(body, captcha) {
    try {
      return await this.rest.post('/auth/login', { body, auth: false });
    } catch (error) {
      const challenge = error?.rawError;
      if (!challenge?.captcha_service) throw error;
      if (!captcha) throw new DiscordjsError(ErrorCodes.CaptchaRequired, challenge.captcha_service);
      // shortcut: a single captcha retry; a second challenge rethrows. Upgrade if Discord chains captchas.
      const headers = { 'x-captcha-key': await captcha(challenge) };
      if (challenge.captcha_rqtoken) headers['x-captcha-rqtoken'] = challenge.captcha_rqtoken;
      if (challenge.captcha_session_id) headers['x-captcha-session-id'] = challenge.captcha_session_id;
      return this.rest.post('/auth/login', { body, auth: false, headers });
    }
  }

  /**
   * Redeems an MFA ticket for a token when the login response requires two-factor authentication.
   * @param {Object} data The login response
   * @param {Object} options `{ totpSecret, mfa }`
   * @returns {Promise<string>} The account token
   * @private
   */
  async _completeMfa(data, { totpSecret, mfa }) {
    if (!data.mfa) return data.token;
    // A stored TOTP secret resolves the common case automatically, without an mfa handler.
    if (totpSecret && data.totp) {
      const { generateTotp } = require('./Totp');
      return this._submitMfa('totp', generateTotp(totpSecret), data);
    }
    if (!mfa) {
      const available = ['totp', 'sms', 'backup', 'webauthn'].filter(name => data[name]);
      throw new DiscordjsError(ErrorCodes.MFARequired, available.join(', '));
    }
    const { method, code } = await mfa({
      ticket: data.ticket,
      totp: Boolean(data.totp),
      sms: Boolean(data.sms),
      backup: Boolean(data.backup),
      webauthn: Boolean(data.webauthn),
      sendSms: () =>
        this.rest.post('/auth/mfa/sms/send', { body: { ticket: data.ticket }, auth: false }).catch(error => {
          if (error?.requestBody) delete error.requestBody;
          throw error;
        }),
    });
    if (!['totp', 'sms', 'backup'].includes(method)) {
      throw new DiscordjsTypeError(ErrorCodes.ClientInvalidOption, 'mfa method', "one of 'totp', 'sms', 'backup'");
    }
    return this._submitMfa(method, code, data);
  }

  /**
   * Redeems an MFA method and code for a token.
   * @param {string} method The MFA method (`totp`, `sms` or `backup`)
   * @param {string} code The MFA code
   * @param {Object} data The login response carrying the ticket
   * @returns {Promise<string>} The account token
   * @private
   */
  async _submitMfa(method, code, data) {
    const { token } = await this.rest.post(`/auth/mfa/${method}`, {
      body: {
        code,
        ticket: data.ticket,
        login_instance_id: data.login_instance_id,
        login_source: null,
        gift_code_sku_id: null,
      },
      auth: false,
    });
    return token;
  }

  /**
   * Logs in by QR code (user accounts only) using Discord's remote-auth flow, then connects like
   * {@link Client#login}. The returned promise resolves once the code is scanned and approved on a device.
   * @param {Object} [handlers] Handlers for the QR login UI
   * @param {Function} [handlers.onQRCode] `url => void`; render this URL as a QR code for the Discord app to scan
   * @param {Function} [handlers.onUserData] `user => void`; optional preview of the account once the QR is scanned
   * @returns {Promise<string>} Token of the account logged in with
   * @example
   * await client.QRLogin({ onQRCode: url => console.log('Scan to log in:', url) });
   */
  async QRLogin(handlers = {}) {
    const RemoteAuth = require('./RemoteAuth');
    const token = await new RemoteAuth(this).run(handlers);
    if (!token) throw new DiscordjsError(ErrorCodes.TokenInvalid);
    return this.login(token);
  }

  /**
   * Logs in with a passkey (user accounts only) via Discord's WebAuthn "conditional" flow, then connects
   * like {@link Client#login}. The library signs the challenge itself, so the passkey's private key must be
   * available (a synced/exported software passkey, e.g. a password manager export).
   * @param {Object} passkey The passkey credential
   * @param {string} passkey.credentialId The credential id (a Bitwarden GUID, a `b64.`-prefixed or a base64url id)
   * @param {string|KeyObject} passkey.privateKey The P-256 private key: a PKCS8 DER base64url string (such as a
   * Bitwarden fido2 `keyValue`) or a Node `KeyObject`
   * @param {string} passkey.userHandle The base64url user handle
   * @returns {Promise<string>} Token of the account logged in with
   * @example
   * const pk = bitwardenExport.items[0].login.fido2Credentials[0];
   * await client.passkeyLogin({ credentialId: pk.credentialId, privateKey: pk.keyValue, userHandle: pk.userHandle });
   */
  async passkeyLogin(passkey) {
    const { buildAssertion } = require('./Passkey');
    const start = await this.rest.post('/auth/conditional/start', { auth: false });
    const { challenge, rpId } = JSON.parse(start.challenge).publicKey;
    const credential = buildAssertion(passkey, rpId ?? 'discord.com', challenge);
    const { token } = await this.rest
      .post('/auth/conditional/finish', {
        auth: false,
        body: { credential, ticket: start.ticket },
      })
      .catch(error => {
        if (error?.requestBody) delete error.requestBody;
        throw error;
      });
    if (!token) throw new DiscordjsError(ErrorCodes.TokenInvalid);
    return this.login(token);
  }

  /**
   * Returns whether the client has logged in, indicative of being able to access
   * properties such as `user` and `application`.
   * @returns {boolean}
   */
  isReady() {
    return !this.ws.destroyed && this.ws.status === Status.Ready;
  }

  /**
   * Logs out, terminates the connection to Discord, and destroys the client.
   * @returns {Promise<void>}
   */
  async destroy() {
    super.destroy();

    this.sweepers.destroy();
    this.voice.destroy();
    await this.ws.destroy();
    this.token = null;
    this.readyTimestamp = null;
    this.user = null;
    this.application = null;
    this.guilds.cache.clear();
    this.channels.cache.clear();
    this.users.cache.clear();
    this.rest.setToken(null);
    this._destroyed = true;
  }

  /**
   * Options used when fetching an invite from Discord.
   * @typedef {Object} ClientFetchInviteOptions
   * @property {Snowflake} [guildScheduledEventId] The id of the guild scheduled event to include with
   * the invite
   */

  /**
   * Obtains an invite from Discord.
   * @param {InviteResolvable} invite Invite code or URL
   * @param {ClientFetchInviteOptions} [options] Options for fetching the invite
   * @returns {Promise<Invite>}
   * @example
   * client.fetchInvite('https://discord.gg/djs')
   *   .then(invite => console.log(`Obtained invite with code: ${invite.code}`))
   *   .catch(console.error);
   */
  async fetchInvite(invite, options) {
    const code = resolveInviteCode(invite);
    const query = makeURLSearchParams({
      with_counts: true,
      guild_scheduled_event_id: options?.guildScheduledEventId,
    });
    const data = await this.rest.get(Routes.invite(code), { query });
    return new Invite(this, data);
  }

  /**
   * Obtains a template from Discord.
   * @param {GuildTemplateResolvable} template Template code or URL
   * @returns {Promise<GuildTemplate>}
   * @example
   * client.fetchGuildTemplate('https://discord.new/FKvmczH2HyUf')
   *   .then(template => console.log(`Obtained template with code: ${template.code}`))
   *   .catch(console.error);
   */
  async fetchGuildTemplate(template) {
    const code = resolveGuildTemplateCode(template);
    const data = await this.rest.get(Routes.template(code));
    return new GuildTemplate(this, data);
  }

  /**
   * Obtains a webhook from Discord.
   * @param {Snowflake} id The webhook's id
   * @param {string} [token] Token for the webhook
   * @returns {Promise<Webhook>}
   * @example
   * client.fetchWebhook('id', 'token')
   *   .then(webhook => console.log(`Obtained webhook with name: ${webhook.name}`))
   *   .catch(console.error);
   */
  async fetchWebhook(id, token) {
    const data = await this.rest.get(Routes.webhook(id, token), { auth: token === undefined });
    return new Webhook(this, { token, ...data });
  }

  /**
   * Obtains the available voice regions from Discord.
   * @returns {Promise<Collection<string, VoiceRegion>>}
   * @example
   * client.fetchVoiceRegions()
   *   .then(regions => console.log(`Available regions are: ${regions.map(region => region.name).join(', ')}`))
   *   .catch(console.error);
   */
  async fetchVoiceRegions() {
    const apiRegions = await this.rest.get(Routes.voiceRegions());
    const regions = new Collection();
    for (const region of apiRegions) regions.set(region.id, new VoiceRegion(region));
    return regions;
  }

  /**
   * Obtains a sticker from Discord.
   * @param {Snowflake} id The sticker's id
   * @returns {Promise<Sticker>}
   * @example
   * client.fetchSticker('id')
   *   .then(sticker => console.log(`Obtained sticker with name: ${sticker.name}`))
   *   .catch(console.error);
   */
  async fetchSticker(id) {
    const data = await this.rest.get(Routes.sticker(id));
    return new Sticker(this, data);
  }

  /**
   * Options for fetching sticker packs.
   * @typedef {Object} StickerPackFetchOptions
   * @property {Snowflake} [packId] The id of the sticker pack to fetch
   */

  /**
   * Obtains the list of available sticker packs.
   * @param {StickerPackFetchOptions} [options={}] Options for fetching sticker packs
   * @returns {Promise<Collection<Snowflake, StickerPack>|StickerPack>}
   * A collection of sticker packs, or a single sticker pack if a packId was provided
   * @example
   * client.fetchStickerPacks()
   *   .then(packs => console.log(`Available sticker packs are: ${packs.map(pack => pack.name).join(', ')}`))
   *   .catch(console.error);
   * @example
   * client.fetchStickerPacks({ packId: '751604115435421716' })
   *   .then(pack => console.log(`Sticker pack name: ${pack.name}`))
   *   .catch(console.error);
   */
  async fetchStickerPacks({ packId } = {}) {
    if (packId) {
      const data = await this.rest.get(Routes.stickerPack(packId));
      return new StickerPack(this, data);
    }

    const data = await this.rest.get(Routes.stickerPacks());
    return new Collection(data.sticker_packs.map(stickerPack => [stickerPack.id, new StickerPack(this, stickerPack)]));
  }

  /**
   * Obtains the list of default soundboard sounds.
   * @returns {Promise<Collection<string, SoundboardSound>>}
   * @example
   * client.fetchDefaultSoundboardSounds()
   *  .then(sounds => console.log(`Available soundboard sounds are: ${sounds.map(sound => sound.name).join(', ')}`))
   *  .catch(console.error);
   */
  async fetchDefaultSoundboardSounds() {
    const data = await this.rest.get(Routes.soundboardDefaultSounds());
    return new Collection(data.map(sound => [sound.sound_id, new SoundboardSound(this, sound)]));
  }

  /**
   * Obtains a guild preview from Discord, available for all guilds the bot is in and all Discoverable guilds.
   * @param {GuildResolvable} guild The guild to fetch the preview for
   * @returns {Promise<GuildPreview>}
   */
  async fetchGuildPreview(guild) {
    const id = this.guilds.resolveId(guild);
    if (!id) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'guild', 'GuildResolvable');
    const data = await this.rest.get(Routes.guildPreview(id));
    return new GuildPreview(this, data);
  }

  /**
   * Obtains the widget data of a guild from Discord, available for guilds with the widget enabled.
   * @param {GuildResolvable} guild The guild to fetch the widget data for
   * @returns {Promise<Widget>}
   */
  async fetchGuildWidget(guild) {
    const id = this.guilds.resolveId(guild);
    if (!id) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'guild', 'GuildResolvable');
    const data = await this.rest.get(Routes.guildWidgetJSON(id));
    return new Widget(this, data);
  }

  toJSON() {
    return super.toJSON({
      actions: false,
      presence: false,
    });
  }

  /**
   * Partially censored client token for debug logging purposes.
   * @type {?string}
   * @readonly
   * @private
   */
  get _censoredToken() {
    if (!this.token) return null;

    const parts = this.token.split('.');
    // User MFA tokens have two parts (`mfa.<secret>`) instead of three (`id.ts.hmac`); keep only non-secret prefix parts.
    const keep = parts.length >= 3 ? 2 : parts.length === 2 ? 1 : 0;
    return parts.map((val, i) => (i >= keep ? val.replace(/./g, '*') : val)).join('.');
  }

  /**
   * Validates the client options.
   * @param {ClientOptions} [options=this.options] Options to validate
   * @private
   */
  _validateOptions(options = this.options) {
    // User accounts have no intents; the gateway IDENTIFY omits the field and the library never reads it. Keep a
    // frozen bitfield (empty when none is given) so code ported from bots that reads `options.intents` still works.
    options.intents = new IntentsBitField(options.intents ?? 0).freeze();
    if (typeof options.makeCache !== 'function') {
      throw new DiscordjsTypeError(ErrorCodes.ClientInvalidOption, 'makeCache', 'a function');
    }
    if (typeof options.sweepers !== 'object' || options.sweepers === null) {
      throw new DiscordjsTypeError(ErrorCodes.ClientInvalidOption, 'sweepers', 'an object');
    }
    if (!Array.isArray(options.partials)) {
      throw new DiscordjsTypeError(ErrorCodes.ClientInvalidOption, 'partials', 'an Array');
    }
    if (typeof options.failIfNotExists !== 'boolean') {
      throw new DiscordjsTypeError(ErrorCodes.ClientInvalidOption, 'failIfNotExists', 'a boolean');
    }
    if (typeof options.enforceNonce !== 'boolean') {
      throw new DiscordjsTypeError(ErrorCodes.ClientInvalidOption, 'enforceNonce', 'a boolean');
    }
    if (
      (typeof options.allowedMentions !== 'object' && options.allowedMentions !== undefined) ||
      options.allowedMentions === null
    ) {
      throw new DiscordjsTypeError(ErrorCodes.ClientInvalidOption, 'allowedMentions', 'an object');
    }
    if (typeof options.presence !== 'object' || options.presence === null) {
      throw new DiscordjsTypeError(ErrorCodes.ClientInvalidOption, 'presence', 'an object');
    }
    if (typeof options.ws !== 'object' || options.ws === null) {
      throw new DiscordjsTypeError(ErrorCodes.ClientInvalidOption, 'ws', 'an object');
    }
    if (typeof options.rest !== 'object' || options.rest === null) {
      throw new DiscordjsTypeError(ErrorCodes.ClientInvalidOption, 'rest', 'an object');
    }
    if (typeof options.jsonTransformer !== 'function') {
      throw new DiscordjsTypeError(ErrorCodes.ClientInvalidOption, 'jsonTransformer', 'a function');
    }
  }
}

module.exports = Client;

/**
 * @class SnowflakeUtil
 * @classdesc This class is an alias for {@link https://www.npmjs.com/package/@sapphire/snowflake @sapphire/snowflake}'s
 * `DiscordSnowflake` class.
 *
 * Check their documentation
 * {@link https://www.sapphirejs.dev/docs/Documentation/api-utilities/classes/sapphire_snowflake.Snowflake here}
 * ({@link https://www.sapphirejs.dev/docs/Guide/utilities/snowflake guide})
 * to see what you can do.
 * @hideconstructor
 */

/**
 * A {@link https://docs.x.com/resources/fundamentals/x-ids Twitter snowflake},
 * except the epoch is 2015-01-01T00:00:00.000Z.
 *
 * If we have a snowflake '266241948824764416' we can represent it as binary:
 * ```
 * 64                                          22     17     12          0
 *  000000111011000111100001101001000101000000  00001  00000  000000000000
 *  number of milliseconds since Discord epoch  worker  pid    increment
 * ```
 * @typedef {string} Snowflake
 */

/**
 * Emitted for general debugging information.
 * @event Client#debug
 * @param {string} info The debug information
 */

/**
 * Emitted for general warnings.
 * @event Client#warn
 * @param {string} info The warning
 */

/**
 * @external Collection
 * @see {@link https://discord.js.org/docs/packages/collection/stable/Collection:Class}
 */

/**
 * @external ImageURLOptions
 * @see {@link https://discord.js.org/docs/packages/rest/stable/ImageURLOptions:Interface}
 */

/**
 * @external EmojiURLOptions
 * @see {@link https://discord.js.org/docs/packages/rest/stable/EmojiURLOptions:TypeAlias}
 */

/**
 * @external BaseImageURLOptions
 * @see {@link https://discord.js.org/docs/packages/rest/stable/BaseImageURLOptions:Interface}
 */
