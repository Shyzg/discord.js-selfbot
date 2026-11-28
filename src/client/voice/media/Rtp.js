'use strict';

const { Buffer } = require('node:buffer');
const crypto = require('node:crypto');

const RTP_VERSION = 2;
const AUTH_TAG_LENGTH = 16;
const NONCE_LENGTH = 4;
// RTCP packet types 200-206 read as payload types 72-78 once the marker bit is masked off.
const RTCP_PAYLOAD_TYPES = new Set([72, 73, 74, 75, 76, 77, 78]);
// Seconds between 1900 (NTP) and 1970 (Unix).
const NTP_EPOCH_OFFSET = 2_208_988_800;

/**
 * Builds a 12-byte RTP header (RFC 3550) without CSRCs or extensions.
 * @param {Object} fields The header fields
 * @param {number} fields.payloadType The payload type
 * @param {number} fields.sequence The sequence number
 * @param {number} fields.timestamp The RTP timestamp
 * @param {number} fields.ssrc The SSRC
 * @param {boolean} [fields.marker=false] Whether the marker bit is set
 * @returns {Buffer}
 * @private
 */
function rtpHeader({ payloadType, sequence, timestamp, ssrc, marker = false }) {
  const header = Buffer.alloc(12);
  header[0] = RTP_VERSION << 6;
  header[1] = (marker ? 0x80 : 0) | payloadType;
  header.writeUInt16BE(sequence & 0xffff, 2);
  header.writeUInt32BE(timestamp >>> 0, 4);
  header.writeUInt32BE(ssrc >>> 0, 8);
  return header;
}

/**
 * Reads an RTP header. Returns `null` for RTCP and anything that is not RTP.
 * @param {Buffer} packet The packet
 * @returns {?Object}
 * @private
 */
function parseRtpHeader(packet) {
  if (packet.length < 12 || packet[0] >> 6 !== RTP_VERSION) return null;
  const payloadType = packet[1] & 0x7f;
  if (RTCP_PAYLOAD_TYPES.has(payloadType)) return null;
  return {
    padding: Boolean(packet[0] & 0x20),
    extension: Boolean(packet[0] & 0x10),
    csrcCount: packet[0] & 0x0f,
    marker: Boolean(packet[1] & 0x80),
    payloadType,
    sequence: packet.readUInt16BE(2),
    timestamp: packet.readUInt32BE(4),
    ssrc: packet.readUInt32BE(8),
  };
}

/**
 * Transport encryption of Discord's `aead_aes256_gcm_rtpsize` mode. The RTP header (with its CSRCs and the 4-byte
 * extension header) is authenticated but not encrypted, the extension body and the payload are encrypted, and the
 * packet ends with the 16-byte tag and a 4-byte big-endian nonce counter.
 * @private
 */
class RtpCrypto {
  constructor(secretKey) {
    this.key = Buffer.from(secretKey);
    this.counter = 0;
  }

  nextNonce() {
    this.counter = (this.counter + 1) >>> 0;
    const nonce = Buffer.alloc(12);
    nonce.writeUInt32BE(this.counter, 0);
    return nonce;
  }

  seal(additionalData, plaintext) {
    const nonce = this.nextNonce();
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, nonce);
    cipher.setAAD(additionalData);
    return Buffer.concat([
      additionalData,
      cipher.update(plaintext),
      cipher.final(),
      cipher.getAuthTag(),
      nonce.subarray(0, NONCE_LENGTH),
    ]);
  }

  open(packet, headerLength) {
    if (packet.length < headerLength + AUTH_TAG_LENGTH + NONCE_LENGTH) return null;
    const nonce = Buffer.alloc(12);
    packet.copy(nonce, 0, packet.length - NONCE_LENGTH);
    const tagStart = packet.length - NONCE_LENGTH - AUTH_TAG_LENGTH;
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, nonce);
    decipher.setAAD(packet.subarray(0, headerLength));
    decipher.setAuthTag(packet.subarray(tagStart, tagStart + AUTH_TAG_LENGTH));
    try {
      return Buffer.concat([decipher.update(packet.subarray(headerLength, tagStart)), decipher.final()]);
    } catch {
      return null;
    }
  }

  /**
   * Encrypts an RTP packet.
   * @param {Buffer} header The RTP header, from {@link rtpHeader}
   * @param {Buffer} payload The payload
   * @returns {Buffer}
   */
  encryptRtp(header, payload) {
    return this.seal(header, payload);
  }

  /**
   * Decrypts an RTP packet.
   * @param {Buffer} packet The packet
   * @returns {?{ header: Object, payload: Buffer }} `null` if it is not RTP or does not authenticate
   */
  decryptRtp(packet) {
    const header = parseRtpHeader(packet);
    if (!header) return null;
    let headerLength = 12 + header.csrcCount * 4;
    let extensionWords = 0;
    if (header.extension) {
      if (packet.length < headerLength + 4) return null;
      extensionWords = packet.readUInt16BE(headerLength + 2);
      headerLength += 4;
    }
    let payload = this.open(packet, headerLength);
    if (!payload) return null;
    payload = payload.subarray(extensionWords * 4);
    if (header.padding && payload.length) {
      const padding = payload[payload.length - 1];
      if (padding <= payload.length) payload = payload.subarray(0, payload.length - padding);
    }
    return { header, payload };
  }

  /**
   * Encrypts an RTCP packet: its first 8 bytes (header and sender SSRC) are authenticated, the rest encrypted.
   * @param {Buffer} packet The RTCP packet
   * @returns {Buffer}
   */
  encryptRtcp(packet) {
    return this.seal(packet.subarray(0, 8), packet.subarray(8));
  }
}

/**
 * Builds an RTCP Sender Report (RFC 3550 section 6.4.1) without report blocks.
 * @param {Object} fields The report fields
 * @param {number} fields.ssrc The sender SSRC
 * @param {number} fields.rtpTimestamp The RTP timestamp matching `now`
 * @param {number} fields.packetCount The packets sent so far
 * @param {number} fields.octetCount The payload bytes sent so far
 * @param {number} [fields.now=Date.now()] The wall clock time, in milliseconds
 * @returns {Buffer}
 * @private
 */
function senderReport({ ssrc, rtpTimestamp, packetCount, octetCount, now = Date.now() }) {
  const report = Buffer.alloc(28);
  report[0] = RTP_VERSION << 6;
  report[1] = 200;
  // Length in 32-bit words, minus one.
  report.writeUInt16BE(6, 2);
  report.writeUInt32BE(ssrc >>> 0, 4);
  const seconds = Math.floor(now / 1000) + NTP_EPOCH_OFFSET;
  const fraction = Math.floor(((now % 1000) / 1000) * 2 ** 32);
  report.writeUInt32BE(seconds >>> 0, 8);
  report.writeUInt32BE(fraction >>> 0, 12);
  report.writeUInt32BE(rtpTimestamp >>> 0, 16);
  report.writeUInt32BE(packetCount >>> 0, 20);
  report.writeUInt32BE(octetCount >>> 0, 24);
  return report;
}

module.exports = { RtpCrypto, parseRtpHeader, rtpHeader, senderReport };
