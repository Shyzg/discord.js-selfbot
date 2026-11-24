'use strict';

const { Buffer } = require('node:buffer');
const { randomUUID } = require('node:crypto');

// Discord web-client identity for user-account ("selfbot") auth, captured from the real client on 2026-11-23.
// shortcut: client_build_number is a point-in-time snapshot; refresh it when logins start failing with
// 401 / "client outdated", since Discord rejects a stale build.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36';

// The web client sets these launch_signature bits only when it detects a client mod (Vencord, BetterDiscord, ...),
// so a fully random UUID reports mods: https://docs.discord.food/reference#launch-signature
const LAUNCH_SIGNATURE_MOD_BITS = [119, 108, 100, 91, 84, 75, 61, 55, 48, 38, 24, 11].reduce(
  (mask, bit) => mask | (1n << BigInt(bit)),
  0n,
);

function launchSignature() {
  const hex = (BigInt(`0x${randomUUID().replaceAll('-', '')}`) & ~LAUNCH_SIGNATURE_MOD_BITS)
    .toString(16)
    .padStart(32, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Builds a fresh web-client fingerprint (`x-super-properties` for REST and `properties` for gateway IDENTIFY)
 * with its own per-launch UUIDs, so separate `Client` instances in one process do not share session ids.
 * @returns {{ superProperties: Object, userHeaders: Object<string, string> }}
 * @private
 */
function createUserProperties() {
  const props = {
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
    launch_signature: launchSignature(),
    client_heartbeat_session_id: randomUUID(),
    client_app_state: 'focused',
  };
  const headers = {
    'x-super-properties': Buffer.from(JSON.stringify(props)).toString('base64'),
    'x-discord-locale': props.system_locale,
    'x-discord-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  return { superProperties: props, userHeaders: headers };
}

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
// four bits whose behavior this library can't apply correctly. Keep them cleared when refreshing the web value:
// - AUTH_TOKEN_REFRESH (1 << 8): @discordjs/ws can't switch tokens, so later resumes would send the discarded one.
// - DEBOUNCE_MESSAGE_REACTIONS (1 << 13): reaction bursts carry user ids only, so uncached reactors would be lost.
// - PASSIVE_GUILD_UPDATE_V2 (1 << 14): batched voice updates drop a join and leave that fall between two batches.
// - CHANNEL_OBFUSCATION (1 << 15): obfuscates channels without VIEW_CHANNEL, corrupting channel cache entries.
// shortcut: point-in-time snapshot; refresh alongside client_build_number if the gateway starts rejecting it.
const CAPABILITIES = 1767421 & ~((1 << 8) | (1 << 13) | (1 << 14) | (1 << 15));

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

module.exports = {
  USER_AGENT,
  createUserProperties,
  fixUserRequestHeaders,
  CAPABILITIES,
  applyUserIdentify,
};
