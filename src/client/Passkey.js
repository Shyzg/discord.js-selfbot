'use strict';

const { createPrivateKey, createHash, sign, KeyObject } = require('node:crypto');
const { Buffer } = require('node:buffer');

const GUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

function resolveKey(privateKey) {
  if (privateKey instanceof KeyObject) return privateKey;
  // A base64url/base64 PKCS8 DER string (e.g. a Bitwarden fido2 `keyValue`).
  if (typeof privateKey === 'string') {
    return createPrivateKey({ key: Buffer.from(privateKey, 'base64url'), format: 'der', type: 'pkcs8' });
  }
  return createPrivateKey(privateKey);
}

/**
 * Builds the WebAuthn assertion (the `conditional/finish` `credential` payload) proving possession of a
 * Discord passkey for a challenge, signed with ES256 (P-256 + SHA-256).
 * @param {Object} passkey The credential: `{ credentialId, privateKey, userHandle }`
 * @param {string} rpId The relying-party id to sign against (from the challenge options; `discord.com`)
 * @param {string} challenge The base64url WebAuthn challenge
 * @returns {string} The JSON-encoded assertion for the `credential` field
 * @private
 */
function buildAssertion(passkey, rpId, challenge) {
  let id = passkey.credentialId.replace(/^b64\./, '');
  // Bitwarden stores passkeys it created as a GUID but registered the GUID's 16 raw bytes as the credential id.
  if (GUID.test(id)) id = Buffer.from(id.replaceAll('-', ''), 'hex').toString('base64url');
  const clientDataJSON = JSON.stringify({
    type: 'webauthn.get',
    challenge,
    origin: 'https://discord.com',
    crossOrigin: false,
  });
  // authenticatorData = sha256(rpId) | flags 0x1d (UP|UV|BE|BS) | counter 0 (synced passkeys don't increment).
  const authData = Buffer.concat([createHash('sha256').update(rpId).digest(), Buffer.from([0x1d]), Buffer.alloc(4)]);
  const toSign = Buffer.concat([authData, createHash('sha256').update(clientDataJSON).digest()]);
  const signature = sign('sha256', toSign, resolveKey(passkey.privateKey)); // DER-encoded ECDSA
  return JSON.stringify({
    id,
    rawId: id,
    type: 'public-key',
    authenticatorAttachment: 'platform',
    clientExtensionResults: {},
    response: {
      authenticatorData: authData.toString('base64url'),
      clientDataJSON: Buffer.from(clientDataJSON).toString('base64url'),
      signature: signature.toString('base64url'),
      userHandle: passkey.userHandle,
    },
  });
}

module.exports = { buildAssertion };
