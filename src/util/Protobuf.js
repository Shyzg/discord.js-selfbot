'use strict';

const { Buffer } = require('node:buffer');

// A minimal protobuf wire-format codec for Discord's settings protos. It decodes a message into its raw fields,
// unknown ones included, and encodes them back unchanged, so editing one field never drops or resets the others.

/**
 * Protobuf wire types used by proto3 messages.
 * @enum {number}
 * @private
 */
const WireType = {
  Varint: 0,
  Fixed64: 1,
  LengthDelimited: 2,
  Fixed32: 5,
};

/**
 * A decoded protobuf field. Varint and fixed64 values are BigInts, length-delimited values are Buffers (strings,
 * bytes and nested messages alike) and fixed32 values are unsigned numbers.
 * @typedef {Object} ProtobufField
 * @property {number} field The field number
 * @property {number} wireType The wire type
 * @property {bigint|Buffer|number} value The raw value
 * @private
 */

function readVarint(buffer, offset) {
  let value = 0n;
  let shift = 0n;
  let byte;
  do {
    if (offset >= buffer.length) throw new RangeError('Truncated protobuf varint');
    byte = buffer[offset++];
    value |= BigInt(byte & 0x7f) << shift;
    shift += 7n;
  } while (byte & 0x80);
  return [value, offset];
}

function writeVarint(value) {
  let remaining = BigInt.asUintN(64, BigInt(value));
  const bytes = [];
  do {
    const low = Number(remaining & 0x7fn);
    remaining >>= 7n;
    bytes.push(remaining ? low | 0x80 : low);
  } while (remaining);
  return Buffer.from(bytes);
}

/**
 * Decodes a protobuf message into its fields, in wire order.
 * @param {Buffer} buffer The serialized message
 * @returns {ProtobufField[]}
 * @private
 */
function decode(buffer) {
  const fields = [];
  let offset = 0;
  while (offset < buffer.length) {
    let key;
    [key, offset] = readVarint(buffer, offset);
    const field = Number(key >> 3n);
    const wireType = Number(key & 7n);
    let value;
    switch (wireType) {
      case WireType.Varint:
        [value, offset] = readVarint(buffer, offset);
        break;
      case WireType.Fixed64:
        if (offset + 8 > buffer.length) throw new RangeError('Truncated protobuf fixed64');
        value = buffer.readBigUInt64LE(offset);
        offset += 8;
        break;
      case WireType.LengthDelimited: {
        let length;
        [length, offset] = readVarint(buffer, offset);
        const end = offset + Number(length);
        if (end > buffer.length) throw new RangeError('Truncated protobuf length-delimited field');
        value = buffer.subarray(offset, end);
        offset = end;
        break;
      }
      case WireType.Fixed32:
        if (offset + 4 > buffer.length) throw new RangeError('Truncated protobuf fixed32');
        value = buffer.readUInt32LE(offset);
        offset += 4;
        break;
      default:
        throw new RangeError(`Unsupported protobuf wire type ${wireType}`);
    }
    fields.push({ field, wireType, value });
  }
  return fields;
}

/**
 * Encodes fields (as {@link decode} returns them) into a protobuf message.
 * @param {ProtobufField[]} fields The fields to encode, in order
 * @returns {Buffer}
 * @private
 */
function encode(fields) {
  const parts = [];
  for (const { field, wireType, value } of fields) {
    parts.push(writeVarint((BigInt(field) << 3n) | BigInt(wireType)));
    switch (wireType) {
      case WireType.Varint:
        parts.push(writeVarint(value));
        break;
      case WireType.Fixed64: {
        const bytes = Buffer.alloc(8);
        bytes.writeBigUInt64LE(BigInt.asUintN(64, BigInt(value)));
        parts.push(bytes);
        break;
      }
      case WireType.LengthDelimited: {
        const bytes = Buffer.from(value);
        parts.push(writeVarint(bytes.length), bytes);
        break;
      }
      case WireType.Fixed32: {
        const bytes = Buffer.alloc(4);
        bytes.writeUInt32LE(value);
        parts.push(bytes);
        break;
      }
      default:
        throw new RangeError(`Unsupported protobuf wire type ${wireType}`);
    }
  }
  return Buffer.concat(parts);
}

module.exports = { WireType, decode, encode };
