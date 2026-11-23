'use strict';

const { Buffer } = require('node:buffer');
const { randomUUID } = require('node:crypto');

// Discord web-client identity for user-account ("selfbot") auth, captured from the real client on 2026-11-23.
// shortcut: client_build_number is a point-in-time snapshot; refresh it when logins start failing with
// 401 / "client outdated", since Discord rejects a stale build.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36';

/**
 * The web-client fingerprint sent as `x-super-properties` (REST) and the gateway IDENTIFY `properties`.
 * The per-launch ids are generated once per process, so REST and the gateway share one "launch" like a
 * single browser session would.
 * @type {Object}
 * @private
 */
const superProperties = {
  os: 'Mac OS X',
  browser: 'Chrome',
  device: '',
  device_model_name: '',
  system_locale: 'en-US',
  has_client_mods: false,
  browser_user_agent: USER_AGENT,
  browser_version: '158.0.0.0',
  os_version: '10.15.7',
  referrer: 'https://discord.com/',
  referring_domain: 'discord.com',
  referrer_current: 'https://discord.com/',
  referring_domain_current: 'discord.com',
  release_channel: 'stable',
  client_build_number: 679055,
  client_event_source: null,
  client_launch_id: randomUUID(),
  launch_signature: randomUUID(),
  client_heartbeat_session_id: randomUUID(),
  client_app_state: 'focused',
};

/**
 * Static headers the web client attaches to every REST request; set once as REST manager headers.
 * (Authorization and User-Agent are recomputed per-request by @discordjs/rest, so they are fixed in
 * {@link fixUserRequestHeaders} instead.)
 * @type {Object<string, string>}
 * @private
 */
const userHeaders = {
  'x-super-properties': Buffer.from(JSON.stringify(superProperties)).toString('base64'),
  'x-discord-locale': superProperties.system_locale,
  'x-discord-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
};

/**
 * Rewrites the per-request headers @discordjs/rest computes so they match a user account: the token carries
 * no `Bot ` scheme prefix, and the User-Agent must be the spoofed browser rather than `DiscordBot .../discord.js`.
 * Mutates and returns the given headers object.
 * @param {Object<string, string>} headers The mutable headers object passed to `makeRequest`
 * @returns {Object<string, string>}
 * @private
 */
function fixUserRequestHeaders(headers) {
  if (headers) {
    if (typeof headers.Authorization === 'string') {
      headers.Authorization = headers.Authorization.replace(/^Bot /, '');
    }
    headers['User-Agent'] = USER_AGENT;
  }
  return headers;
}

// The web client's gateway IDENTIFY `capabilities` (1767421), which selects the modern (user) event format, minus
// the bits whose events this library has no handler for: AUTH_TOKEN_REFRESH (1 << 8, READY `auth_token`),
// DEBOUNCE_MESSAGE_REACTIONS (1 << 13, MESSAGE_REACTION_ADD_MANY) and PASSIVE_GUILD_UPDATE_V2 (1 << 14,
// PASSIVE_UPDATE_V2 instead of VOICE_STATE_UPDATE). Keep them cleared when refreshing the web value.
// shortcut: point-in-time snapshot; refresh alongside client_build_number if the gateway starts rejecting it.
const CAPABILITIES = 1767421 & ~((1 << 8) | (1 << 13) | (1 << 14));

/**
 * Rewrites a gateway IDENTIFY `d` to match the web client for user accounts: adds `capabilities` and
 * `client_state`, and removes the bot-only `shard` field. Mutates and returns `d`.
 * @param {Object} d The IDENTIFY data object built by @discordjs/ws
 * @returns {Object}
 * @private
 */
function applyUserIdentify(d) {
  d.capabilities = CAPABILITIES;
  d.client_state = { guild_versions: {} };
  delete d.shard;
  return d;
}

module.exports = { USER_AGENT, superProperties, userHeaders, fixUserRequestHeaders, CAPABILITIES, applyUserIdentify };
