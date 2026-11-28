'use strict';

const { Buffer } = require('node:buffer');
const Base = require('./Base');
const { DiscordjsTypeError, ErrorCodes } = require('../errors');
const Events = require('../util/Events');
const { WireType, decode, encode } = require('../util/Protobuf');
const { resolvePartialEmoji } = require('../util/Util');

// Field numbers from discord-protos' PreloadedUserSettings.proto. Only these are read or written; every other field
// is carried through untouched.
const SETTINGS_STATUS = 11; // PreloadedUserSettings.status: StatusSettings
const STATUS_STATUS = 1; // StatusSettings.status: google.protobuf.StringValue
const STATUS_CUSTOM_STATUS = 2; // StatusSettings.custom_status: CustomStatus
const CUSTOM_TEXT = 1; // CustomStatus.text: string
const CUSTOM_EMOJI_ID = 2; // CustomStatus.emoji_id: fixed64
const CUSTOM_EMOJI_NAME = 3; // CustomStatus.emoji_name: string
const CUSTOM_EXPIRES_AT_MS = 4; // CustomStatus.expires_at_ms: fixed64
const CUSTOM_CREATED_AT_MS = 5; // CustomStatus.created_at_ms: fixed64

const Statuses = ['online', 'idle', 'dnd', 'invisible'];
const PRELOADED_ROUTE = '/users/@me/settings-proto/1';

const find = (fields, field, wireType) =>
  fields.find(entry => entry.field === field && entry.wireType === wireType)?.value;
const sortedBytes = fields => encode([...fields].sort((a, b) => a.field - b.field));

/**
 * The client user's account settings that sync across their devices (user accounts only), read from and written to
 * Discord's settings protobuf. Covers the status and custom status; every other setting is kept as Discord sent it.
 * @extends {Base}
 */
class ClientUserSettings extends Base {
  constructor(client) {
    super(client);

    /**
     * The top-level fields of the preloaded settings protobuf
     * @type {ProtobufField[]}
     * @private
     */
    this._fields = [];

    /**
     * The tail of the pending edits, so each one starts from the result of the one before
     * @type {?Promise<void>}
     * @private
     */
    Object.defineProperty(this, '_editQueue', { value: null, writable: true });
  }

  /**
   * Applies a base64 settings proto: a full one replaces the cache, a partial one replaces only the top-level fields
   * it carries (Discord always sends a top-level field whole).
   * @param {?string} proto The base64-encoded PreloadedUserSettings
   * @param {boolean} [partial=false] Whether this is a partial update
   * @private
   */
  _patch(proto, partial = false) {
    const fields = decode(Buffer.from(proto ?? '', 'base64'));
    if (partial) {
      const replaced = new Set(fields.map(entry => entry.field));
      this._fields = [...this._fields.filter(entry => !replaced.has(entry.field)), ...fields];
    } else {
      this._fields = fields;
    }
  }

  /**
   * Applies a settings proto and emits {@link Client#event:userSettingsUpdate} if anything changed.
   * @param {?string} proto The base64-encoded PreloadedUserSettings
   * @param {boolean} partial Whether this is a partial update
   * @private
   */
  _apply(proto, partial) {
    const oldSettings = this._clone();
    this._patch(proto, partial);
    if (!sortedBytes(oldSettings._fields).equals(sortedBytes(this._fields))) {
      /**
       * Emitted when the client user's synced settings change, from this client or another device.
       * @event Client#userSettingsUpdate
       * @param {ClientUserSettings} oldSettings The settings before the change
       * @param {ClientUserSettings} newSettings The settings after the change
       */
      this.client.emit(Events.UserSettingsUpdate, oldSettings, this);
    }
  }

  get _statusSettings() {
    const raw = find(this._fields, SETTINGS_STATUS, WireType.LengthDelimited);
    return raw ? decode(raw) : [];
  }

  /**
   * The account's chosen status, shared by all of its devices (`null` if it was never set)
   * @type {?PresenceStatusData}
   * @readonly
   */
  get status() {
    const wrapper = find(this._statusSettings, STATUS_STATUS, WireType.LengthDelimited);
    const status = wrapper && find(decode(wrapper), 1, WireType.LengthDelimited)?.toString();
    return Statuses.includes(status) ? status : null;
  }

  /**
   * A custom status.
   * @typedef {Object} CustomStatus
   * @property {?string} text The text
   * @property {?Object} emoji The emoji, as `{ id, name }` (`id` is `null` for a unicode emoji)
   * @property {?Date} expiresAt When the custom status clears itself, if it does
   */

  /**
   * The account's custom status, if one is set
   * @type {?CustomStatus}
   * @readonly
   */
  get customStatus() {
    const raw = find(this._statusSettings, STATUS_CUSTOM_STATUS, WireType.LengthDelimited);
    if (!raw) return null;
    const fields = decode(raw);
    const emojiId = find(fields, CUSTOM_EMOJI_ID, WireType.Fixed64);
    const emojiName = find(fields, CUSTOM_EMOJI_NAME, WireType.LengthDelimited)?.toString() || null;
    const expiresAtMs = find(fields, CUSTOM_EXPIRES_AT_MS, WireType.Fixed64);
    return {
      text: find(fields, CUSTOM_TEXT, WireType.LengthDelimited)?.toString() || null,
      emoji: emojiId || emojiName ? { id: emojiId ? emojiId.toString() : null, name: emojiName } : null,
      expiresAt: expiresAtMs ? new Date(Number(expiresAtMs)) : null,
    };
  }

  /**
   * Fetches the settings from Discord.
   * @returns {Promise<ClientUserSettings>}
   */
  async fetch() {
    const { settings } = await this.client.rest.get(PRELOADED_ROUTE);
    this._apply(settings, false);
    return this;
  }

  /**
   * Data for setting a custom status.
   * @typedef {Object} CustomStatusData
   * @property {string} [text] The text (up to 128 characters)
   * @property {EmojiIdentifierResolvable} [emoji] The emoji: a unicode emoji, a custom emoji or its id
   * @property {DateResolvable} [expiresAt] When the custom status should clear itself
   */

  /**
   * Options for editing the settings.
   * @typedef {Object} ClientUserSettingsEditOptions
   * @property {PresenceStatusData} [status] The status to show on every device
   * @property {?CustomStatusData} [customStatus] The custom status, or `null` to clear it
   */

  /**
   * Edits the settings in one request. Discord rate limits settings updates heavily, so change several at once.
   * Overlapping edits run one after another, each starting from the result of the previous one.
   * <info>The gateway applies a new status to this client's session too; no presence update is needed.</info>
   * @param {ClientUserSettingsEditOptions} options The settings to change
   * @returns {Promise<ClientUserSettings>}
   * @example
   * await client.user.settings.edit({ status: 'dnd', customStatus: { text: 'Busy', emoji: '🔕' } });
   */
  edit(options = {}) {
    // Every PATCH replaces StatusSettings whole: two edits built from the same snapshot would undo each other.
    const queued = (this._editQueue ?? Promise.resolve()).then(() => this._edit(options));
    this._editQueue = queued.catch(() => {});
    return queued;
  }

  async _edit({ status, customStatus }) {
    // Without a cached proto, an edit would reset every StatusSettings field it does not set.
    if (!this._fields.length) await this.fetch();
    // shortcut: no required_data_version is sent, so a change made on another device after the last
    // update this client saw can be overwritten. Send it if edits from several devices start clashing.
    let statusSettings = this._statusSettings;
    if (status !== undefined) {
      if (!Statuses.includes(status)) {
        throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'status', `one of ${Statuses.join(', ')}`);
      }
      const wrapper = encode([{ field: 1, wireType: WireType.LengthDelimited, value: Buffer.from(status) }]);
      statusSettings = [
        ...statusSettings.filter(entry => entry.field !== STATUS_STATUS),
        { field: STATUS_STATUS, wireType: WireType.LengthDelimited, value: wrapper },
      ];
    }
    if (customStatus !== undefined) {
      statusSettings = statusSettings.filter(entry => entry.field !== STATUS_CUSTOM_STATUS);
      if (customStatus) {
        statusSettings.push({
          field: STATUS_CUSTOM_STATUS,
          wireType: WireType.LengthDelimited,
          value: encodeCustomStatus(customStatus),
        });
      }
    }
    // A PATCH replaces every top-level field it carries, so StatusSettings goes out whole, unknown fields included.
    const settings = encode([
      { field: SETTINGS_STATUS, wireType: WireType.LengthDelimited, value: encode(statusSettings) },
    ]).toString('base64');
    const data = await this.client.rest.patch(PRELOADED_ROUTE, { body: { settings } });
    this._apply(data?.settings ?? settings, true);
    return this;
  }

  /**
   * Sets the status shown on every device.
   * @param {PresenceStatusData} status The status
   * @returns {Promise<ClientUserSettings>}
   */
  setStatus(status) {
    return this.edit({ status });
  }

  /**
   * Sets or clears the custom status.
   * @param {?CustomStatusData} customStatus The custom status, or `null` to clear it
   * @returns {Promise<ClientUserSettings>}
   */
  setCustomStatus(customStatus) {
    return this.edit({ customStatus });
  }

  toJSON() {
    return { status: this.status, customStatus: this.customStatus };
  }
}

function encodeCustomStatus({ text, emoji, expiresAt }) {
  const fields = [];
  if (text) fields.push({ field: CUSTOM_TEXT, wireType: WireType.LengthDelimited, value: Buffer.from(text) });
  const resolved = emoji ? resolvePartialEmoji(emoji) : null;
  if (emoji && !resolved) {
    throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'customStatus.emoji', 'EmojiIdentifierResolvable');
  }
  if (resolved?.id) fields.push({ field: CUSTOM_EMOJI_ID, wireType: WireType.Fixed64, value: BigInt(resolved.id) });
  if (resolved?.name) {
    fields.push({ field: CUSTOM_EMOJI_NAME, wireType: WireType.LengthDelimited, value: Buffer.from(resolved.name) });
  }
  if (expiresAt !== undefined && expiresAt !== null) {
    const time = new Date(expiresAt).getTime();
    if (Number.isNaN(time))
      throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'customStatus.expiresAt', 'DateResolvable');
    fields.push({ field: CUSTOM_EXPIRES_AT_MS, wireType: WireType.Fixed64, value: BigInt(time) });
  }
  fields.push({ field: CUSTOM_CREATED_AT_MS, wireType: WireType.Fixed64, value: BigInt(Date.now()) });
  return encode(fields);
}

module.exports = ClientUserSettings;
