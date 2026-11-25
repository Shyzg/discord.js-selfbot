'use strict';

const { Buffer } = require('node:buffer');
const { createHmac } = require('node:crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function decodeBase32(secret) {
  const clean = secret.replace(/[\s=]+/g, '').toUpperCase();
  if (!clean.length) throw new Error('Invalid base32 TOTP secret');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('Invalid base32 TOTP secret');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  if (!bytes.length) throw new Error('Invalid base32 TOTP secret');
  return Buffer.from(bytes);
}

/**
 * Generates a 6-digit RFC 6238 SHA-1 TOTP code (30-second step) from a base32 secret.
 * @param {string} secret The base32-encoded TOTP secret (spaces and `=` padding are ignored)
 * @param {number} [timestamp=Date.now()] Unix timestamp in milliseconds
 * @returns {string} Zero-padded 6-digit TOTP code
 * @private
 */
function generateTotp(secret, timestamp = Date.now()) {
  const key = decodeBase32(secret);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(timestamp / 30_000)));
  const digest = createHmac('sha1', key).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    (((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3]) %
    1_000_000;
  return String(code).padStart(6, '0');
}

module.exports = { generateTotp };
