'use strict';

const { Buffer } = require('node:buffer');

const START_CODE = Buffer.from([0, 0, 0, 1]);
const NalType = { NonIdr: 1, Idr: 5, Sei: 6, Sps: 7, Pps: 8, Aud: 9, Filler: 12, StapA: 24, FuA: 28 };
// RTP payloads above this size are split into FU-A fragments, which keeps each datagram (RTP header, encryption tag
// and nonce included) well under a typical 1200-byte path MTU.
const MAX_PAYLOAD = 1100;

const nalType = unit => unit[0] & 0x1f;
const isVcl = unit => nalType(unit) === NalType.NonIdr || nalType(unit) === NalType.Idr;

/**
 * Joins NAL units into an Annex-B frame with 4-byte start codes, the form the receiving side rebuilds (and the form
 * DAVE encrypts, so both ends agree on byte offsets).
 * @param {Buffer[]} units The NAL units
 * @returns {Buffer}
 * @private
 */
function toAnnexB(units) {
  return Buffer.concat(units.flatMap(unit => [START_CODE, unit]));
}

/**
 * Reads the NAL units of an Annex-B frame that uses 4-byte start codes. Trailing zero bytes are kept, because an
 * end-to-end encrypted unit may legitimately end in one.
 * @param {Buffer} frame The frame
 * @returns {Buffer[]}
 * @private
 */
function splitAnnexB(frame) {
  const units = [];
  let start = -1;
  for (let index = 0; index + 3 < frame.length; index++) {
    if (frame[index] !== 0 || frame[index + 1] !== 0 || frame[index + 2] !== 0 || frame[index + 3] !== 1) continue;
    if (start >= 0) units.push(frame.subarray(start, index));
    start = index + 4;
    index += 3;
  }
  if (start >= 0 && start < frame.length) units.push(frame.subarray(start));
  return units.filter(unit => unit.length);
}

/**
 * Splits an encrypted frame back into its NAL units using the layout of the plaintext units. End-to-end encryption
 * keeps every start code and unit length and appends its trailer, which then belongs to the last unit.
 * @param {Buffer} encrypted The encrypted Annex-B frame
 * @param {Buffer[]} units The plaintext NAL units it was made from
 * @returns {?Buffer[]} `null` if the encrypted frame does not have that layout
 * @private
 */
function splitByLayout(encrypted, units) {
  const result = [];
  let offset = 0;
  for (const [index, unit] of units.entries()) {
    if (!encrypted.subarray(offset, offset + 4).equals(START_CODE)) return null;
    offset += 4;
    const end = index === units.length - 1 ? encrypted.length : offset + unit.length;
    if (end > encrypted.length || end - offset < unit.length) return null;
    result.push(encrypted.subarray(offset, end));
    offset = end;
  }
  return result;
}

/**
 * Splits an H264 Annex-B byte stream (as written by `ffmpeg -f h264`) into access units, one per frame.
 * @private
 */
class AccessUnitReader {
  constructor() {
    this.data = Buffer.alloc(0);
    this.scanFrom = 0;
    this.nalStart = -1;
    this.units = [];
    this.hasVcl = false;
  }

  /**
   * Adds bytes of the stream.
   * @param {Buffer} chunk The bytes
   * @returns {Array<{ units: Buffer[], keyframe: boolean }>} The frames these bytes completed
   */
  push(chunk) {
    this.data = this.data.length ? Buffer.concat([this.data, chunk]) : Buffer.from(chunk);
    const frames = [];
    let index = this.scanFrom;
    while (index + 2 < this.data.length) {
      if (this.data[index] === 0 && this.data[index + 1] === 0 && this.data[index + 2] === 1) {
        if (this.nalStart >= 0) this.addUnit(trimTrailingZeros(this.data.subarray(this.nalStart, index)), frames);
        this.nalStart = index + 3;
        index += 3;
      } else {
        index++;
      }
    }
    // Keep only the unit still being read (or, before the first start code, the bytes that could begin one).
    const keepFrom = this.nalStart >= 0 ? this.nalStart : Math.max(0, this.data.length - 2);
    this.data = this.data.subarray(keepFrom);
    this.scanFrom = Math.max(0, index - keepFrom);
    if (this.nalStart >= 0) this.nalStart = 0;
    return frames;
  }

  /**
   * Ends the stream.
   * @returns {Array<{ units: Buffer[], keyframe: boolean }>} The frames still buffered
   */
  end() {
    const frames = [];
    if (this.nalStart >= 0) this.addUnit(trimTrailingZeros(this.data.subarray(this.nalStart)), frames);
    this.flush(frames);
    this.data = Buffer.alloc(0);
    this.nalStart = -1;
    this.scanFrom = 0;
    return frames;
  }

  addUnit(unit, frames) {
    if (!unit.length) return;
    const type = nalType(unit);
    // A new frame starts at a delimiter, at parameter sets or SEI after a slice, or at a slice whose
    // first_mb_in_slice is 0 (an Exp-Golomb 0 is a single 1 bit).
    const startsFrame =
      type === NalType.Aud ||
      type === NalType.Sei ||
      type === NalType.Sps ||
      type === NalType.Pps ||
      (isVcl(unit) && unit.length > 1 && (unit[1] & 0x80) !== 0);
    if (startsFrame && this.hasVcl) this.flush(frames);
    if (type === NalType.Aud || type === NalType.Filler) return;
    this.units.push(unit);
    if (isVcl(unit)) this.hasVcl = true;
  }

  flush(frames) {
    if (this.hasVcl) {
      frames.push({ units: this.units, keyframe: this.units.some(unit => nalType(unit) === NalType.Idr) });
    }
    this.units = [];
    this.hasVcl = false;
  }
}

function trimTrailingZeros(unit) {
  let end = unit.length;
  while (end > 0 && unit[end - 1] === 0) end--;
  return unit.subarray(0, end);
}

/**
 * Splits the NAL units of a frame into RTP payloads (RFC 6184, non-interleaved mode): small units go whole and large
 * ones as FU-A fragments.
 * @param {Buffer[]} units The NAL units
 * @param {number} [maxPayload] The largest payload
 * @returns {Buffer[]}
 * @private
 */
function packetize(units, maxPayload = MAX_PAYLOAD) {
  const payloads = [];
  for (const unit of units) {
    if (unit.length <= maxPayload) {
      payloads.push(unit);
      continue;
    }
    const header = unit[0];
    const indicator = (header & 0xe0) | NalType.FuA;
    const step = maxPayload - 2;
    for (let offset = 1; offset < unit.length; offset += step) {
      const end = Math.min(offset + step, unit.length);
      const fuHeader = (offset === 1 ? 0x80 : 0) | (end === unit.length ? 0x40 : 0) | (header & 0x1f);
      payloads.push(Buffer.concat([Buffer.from([indicator, fuHeader]), unit.subarray(offset, end)]));
    }
  }
  return payloads;
}

/**
 * Rebuilds frames from H264 RTP payloads (single NAL units, STAP-A and FU-A). Packets of a frame may arrive in any
 * order; a frame is complete once every sequence number from the end of the previous frame to its marker packet has
 * arrived, and it is dropped when the next frame starts first.
 * @private
 */
class H264Depacketizer {
  constructor() {
    this.timestamp = null;
    this.packets = new Map();
    this.markerSequence = null;
    // The marker sequence of the last frame rebuilt, so a missing first packet is noticed.
    this.lastEnd = null;
    this.framesLost = 0;
  }

  /**
   * Adds a packet.
   * @param {{ sequence: number, timestamp: number, marker: boolean }} header The RTP header
   * @param {Buffer} payload The payload
   * @returns {?Buffer} The frame this packet completed, as Annex-B with 4-byte start codes
   */
  push(header, payload) {
    if (this.timestamp !== null && header.timestamp !== this.timestamp) {
      // The next frame started before this one was complete.
      this.framesLost++;
      this.lastEnd = null;
      this.reset();
    }
    this.timestamp = header.timestamp;
    this.packets.set(header.sequence, payload);
    if (header.marker) this.markerSequence = header.sequence;
    if (this.markerSequence === null) return null;
    const frame = this.assemble();
    if (!frame) return null;
    this.lastEnd = this.markerSequence;
    this.reset();
    return frame;
  }

  reset() {
    this.timestamp = null;
    this.packets.clear();
    this.markerSequence = null;
  }

  assemble() {
    const end = this.markerSequence;
    let first = end;
    if (this.lastEnd === null) {
      for (const sequence of this.packets.keys())
        if (((end - sequence) & 0xffff) > ((end - first) & 0xffff)) first = sequence;
    } else {
      first = (this.lastEnd + 1) & 0xffff;
    }
    const count = ((end - first) & 0xffff) + 1;
    if (count !== this.packets.size) return null;
    const payloads = [];
    for (let offset = 0; offset < count; offset++) {
      const payload = this.packets.get((first + offset) & 0xffff);
      if (!payload) return null;
      payloads.push(payload);
    }
    return assemble(payloads);
  }
}

function assemble(payloads) {
  const parts = [];
  let fragment = null;
  for (const payload of payloads) {
    if (!payload.length) continue;
    const type = payload[0] & 0x1f;
    if (type === NalType.StapA) {
      let offset = 1;
      while (offset + 2 <= payload.length) {
        const size = payload.readUInt16BE(offset);
        offset += 2;
        parts.push(START_CODE, payload.subarray(offset, offset + size));
        offset += size;
      }
    } else if (type === NalType.FuA) {
      if (payload.length < 2) return null;
      const fuHeader = payload[1];
      if (fuHeader & 0x80) fragment = [Buffer.from([(payload[0] & 0xe0) | (fuHeader & 0x1f)])];
      if (!fragment) return null;
      fragment.push(payload.subarray(2));
      if (fuHeader & 0x40) {
        parts.push(START_CODE, Buffer.concat(fragment));
        fragment = null;
      }
    } else if (type >= 1 && type <= 23) {
      parts.push(START_CODE, payload);
    }
  }
  if (fragment || !parts.length) return null;
  return Buffer.concat(parts);
}

module.exports = {
  AccessUnitReader,
  H264Depacketizer,
  MAX_PAYLOAD,
  NalType,
  nalType,
  packetize,
  splitAnnexB,
  splitByLayout,
  toAnnexB,
};
