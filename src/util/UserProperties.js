'use strict';

const { Buffer } = require('node:buffer');

// Discord web-client identity for user-account ("selfbot") auth, captured from the real client on 2026-11-22.
// shortcut: client_build_number is a point-in-time snapshot; refresh it when logins start failing with
// 401 / "client outdated", since Discord rejects a stale build.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36';

/**
 * The web-client fingerprint sent as `x-super-properties` (REST) and the gateway IDENTIFY `properties`.
 * @type {Object}
 * @private
 */
const superProperties = {
  os: 'Mac OS X',
  browser: 'Chrome',
  device: '',
  system_locale: 'en-US',
  browser_user_agent: USER_AGENT,
  browser_version: '158.0.0.0',
  os_version: '10.15.7',
  referrer: '',
  referring_domain: '',
  referrer_current: '',
  referring_domain_current: '',
  release_channel: 'stable',
  client_build_number: 678976,
  client_event_source: null,
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

module.exports = { USER_AGENT, superProperties, userHeaders, fixUserRequestHeaders };
