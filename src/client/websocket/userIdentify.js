'use strict';

const { GatewayOpcodes } = require('discord-api-types/v10');
const { WebSocketShard, WebSocketShardEvents } = require('@discordjs/ws');
const { applyUserIdentify } = require('../../util/UserProperties');

// User-account gateway close code for exceeding the concurrent session limit; @discordjs/ws does not list it.
const TOO_MANY_SESSIONS_CLOSE_CODE = 4015;

function isUserShard(options) {
  return options?.intents === undefined && Boolean(options?.identifyProperties);
}

/**
 * Whether a gateway payload is a user-account IDENTIFY: op 2, no intents, and web-client properties set
 * (only user mode passes `identifyProperties` without `intents`).
 * @param {?Object} payload The outgoing gateway payload
 * @param {?Object} options The shard strategy options (the @discordjs/ws manager options)
 * @returns {boolean}
 * @private
 */
function isUserIdentify(payload, options) {
  return payload?.op === GatewayOpcodes.Identify && isUserShard(options);
}

let patched = false;

/**
 * Patches @discordjs/ws so user-account IDENTIFY payloads match the web client (adds `capabilities` /
 * `client_state`, drops `shard`) and stops auto-reconnecting on user close code 4015 (Too Many Sessions).
 * @discordjs/ws 2.x builds IDENTIFY inline and has no hook for extra fatal close codes, so the shard's `send`
 * and `onClose` are wrapped once. Bot clients in the same process are untouched.
 * @returns {void}
 * @private
 */
function patchUserIdentify() {
  if (patched) return;
  patched = true;
  const originalSend = WebSocketShard.prototype.send;
  WebSocketShard.prototype.send = function send(payload) {
    if (isUserIdentify(payload, this.strategy?.options)) applyUserIdentify(payload.d);
    return originalSend.call(this, payload);
  };
  const originalOnClose = WebSocketShard.prototype.onClose;
  WebSocketShard.prototype.onClose = function onClose(code) {
    if (code === TOO_MANY_SESSIONS_CLOSE_CODE && isUserShard(this.strategy?.options)) {
      this.emit(WebSocketShardEvents.Closed, code);
      this.emit(WebSocketShardEvents.Error, new Error('Too many sessions'));
      return this.destroy({ code });
    }
    return originalOnClose.call(this, code);
  };
}

module.exports = { patchUserIdentify, isUserIdentify, TOO_MANY_SESSIONS_CLOSE_CODE };
