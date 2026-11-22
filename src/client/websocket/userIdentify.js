'use strict';

const { GatewayOpcodes } = require('discord-api-types/v10');
const { WebSocketShard } = require('@discordjs/ws');
const { applyUserIdentify } = require('../../util/UserProperties');

/**
 * Whether a gateway payload is a user-account IDENTIFY: op 2, no intents, and web-client properties set
 * (only user mode passes `identifyProperties` without `intents`).
 * @param {?Object} payload The outgoing gateway payload
 * @param {?Object} options The shard strategy options (the @discordjs/ws manager options)
 * @returns {boolean}
 * @private
 */
function isUserIdentify(payload, options) {
  return (
    payload?.op === GatewayOpcodes.Identify && options?.intents === undefined && Boolean(options?.identifyProperties)
  );
}

let patched = false;

/**
 * Patches @discordjs/ws so user-account IDENTIFY payloads match the web client (adds `capabilities` /
 * `client_state`, drops `shard`). @discordjs/ws 2.x builds the IDENTIFY inline with no hook, so the shard's
 * `send` is wrapped once. A `patch-package` patch can't be used here: it would not ship to consumers of this
 * package. The wrapper only rewrites user-mode IDENTIFYs, so bot clients in the same process are untouched.
 * @returns {void}
 * @private
 */
function patchUserIdentify() {
  if (patched) return;
  patched = true;
  const original = WebSocketShard.prototype.send;
  WebSocketShard.prototype.send = function send(payload) {
    if (isUserIdentify(payload, this.strategy?.options)) applyUserIdentify(payload.d);
    return original.call(this, payload);
  };
}

module.exports = { patchUserIdentify, isUserIdentify };
