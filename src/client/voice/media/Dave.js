'use strict';

const EventEmitter = require('node:events');
const { Buffer } = require('node:buffer');

// Adapted from @discordjs/voice's DAVESession (Apache-2.0) to encrypt and decrypt any media type, video included.
const TRANSITION_EXPIRY = 10;
const TRANSITION_EXPIRY_PENDING_DOWNGRADE = 24;
const FAILURE_TOLERANCE = 36;

let davey;

// Every DAVE-encrypted frame ends with this marker.
const isEncrypted = frame => frame.length >= 2 && frame[frame.length - 2] === 0xfa && frame[frame.length - 1] === 0xfa;

/**
 * Loads `@snazzah/davey`, the DAVE (end-to-end encryption) library. It is an optional dependency, only needed for
 * Go Live media.
 * @returns {Object}
 * @private
 */
function loadDavey() {
  if (davey === undefined) {
    try {
      davey = require('@snazzah/davey');
    } catch {
      davey = null;
    }
  }
  if (!davey) {
    throw new Error(
      'Go Live media needs the @snazzah/davey package (end-to-end encryption); install it next to this one.',
    );
  }
  return davey;
}

/**
 * One end-to-end encrypted (DAVE) MLS group, such as a stream's.
 * @private
 */
class DaveSession extends EventEmitter {
  constructor(library, protocolVersion, userId, groupId) {
    super();
    this.davey = library;
    this.protocolVersion = protocolVersion;
    this.userId = userId;
    this.groupId = groupId;
    this.lastTransitionId = undefined;
    this.pendingTransitions = new Map();
    this.downgraded = false;
    this.consecutiveFailures = 0;
    this.reinitializing = false;
    this.session = null;
  }

  get ready() {
    return Boolean(this.session?.ready);
  }

  get voicePrivacyCode() {
    if (this.protocolVersion === 0 || !this.session?.voicePrivacyCode) return null;
    return this.session.voicePrivacyCode;
  }

  reinit() {
    if (this.protocolVersion > 0) {
      if (this.session) this.session.reinit(this.protocolVersion, this.userId, this.groupId);
      else this.session = new this.davey.DAVESession(this.protocolVersion, this.userId, this.groupId);
      this.emit('keyPackage', this.session.getSerializedKeyPackage());
    } else if (this.session) {
      this.session.reset();
      this.session.setPassthroughMode(true, TRANSITION_EXPIRY);
    }
  }

  setExternalSender(payload) {
    this.session?.setExternalSender(payload);
  }

  /**
   * @returns {boolean} Whether to tell the voice server this client is ready for the transition
   */
  prepareTransition({ transition_id: transitionId, protocol_version: protocolVersion }) {
    this.pendingTransitions.set(transitionId, protocolVersion);
    if (transitionId === 0) {
      this.executeTransition(transitionId);
      return false;
    }
    if (protocolVersion === 0) this.session?.setPassthroughMode(true, TRANSITION_EXPIRY_PENDING_DOWNGRADE);
    return true;
  }

  executeTransition(transitionId) {
    if (!this.pendingTransitions.has(transitionId)) return false;
    const oldVersion = this.protocolVersion;
    this.protocolVersion = this.pendingTransitions.get(transitionId);
    if (oldVersion !== this.protocolVersion && this.protocolVersion === 0) {
      this.downgraded = true;
    } else if (transitionId > 0 && this.downgraded) {
      this.downgraded = false;
      this.session?.setPassthroughMode(true, TRANSITION_EXPIRY);
    }
    this.reinitializing = false;
    this.lastTransitionId = transitionId;
    this.pendingTransitions.delete(transitionId);
    return true;
  }

  prepareEpoch({ epoch, protocol_version: protocolVersion }) {
    if (epoch === 1) {
      this.protocolVersion = protocolVersion;
      this.reinit();
    }
  }

  recoverFromInvalidTransition(transitionId) {
    if (this.reinitializing) return;
    this.reinitializing = true;
    this.consecutiveFailures = 0;
    this.emit('invalidateTransition', transitionId);
    this.reinit();
  }

  /**
   * @returns {?Buffer} The commit (and welcome) to send back, if any
   */
  processProposals(payload, connectedClients) {
    if (!this.session) return null;
    const { commit, welcome } = this.session.processProposals(payload.readUInt8(0), payload.subarray(1), [
      ...connectedClients,
    ]);
    if (!commit) return null;
    return welcome ? Buffer.concat([commit, welcome]) : commit;
  }

  processCommit(payload) {
    return this.processHandshake(payload, data => this.session.processCommit(data));
  }

  processWelcome(payload) {
    return this.processHandshake(payload, data => this.session.processWelcome(data));
  }

  processHandshake(payload, process) {
    const transitionId = payload.readUInt16BE(0);
    if (!this.session) return { transitionId, success: false };
    try {
      process(payload.subarray(2));
      if (transitionId === 0) {
        this.reinitializing = false;
        this.lastTransitionId = transitionId;
      } else {
        this.pendingTransitions.set(transitionId, this.protocolVersion);
      }
      return { transitionId, success: true };
    } catch {
      this.recoverFromInvalidTransition(transitionId);
      return { transitionId, success: false };
    }
  }

  /**
   * Encrypts a frame end to end, or returns it as is while the group is not ready.
   * @param {number} mediaType The davey media type
   * @param {number} codec The davey codec
   * @param {Buffer} frame The frame
   * @returns {Buffer}
   */
  encrypt(mediaType, codec, frame) {
    if (this.protocolVersion === 0 || !this.session?.ready) return frame;
    return this.session.encrypt(mediaType, codec, frame);
  }

  /**
   * Decrypts a frame from a user.
   * @param {number} mediaType The davey media type
   * @param {Buffer} frame The frame
   * @param {string} userId The sender
   * @returns {?Buffer} The frame, or `null` if it could not be decrypted
   */
  decrypt(mediaType, frame, userId) {
    const canDecrypt = this.session?.ready && (this.protocolVersion !== 0 || this.session.canPassthrough(userId));
    // An end-to-end encrypted frame (it ends with the DAVE marker) is useless until the group is ready.
    if (!canDecrypt) return isEncrypted(frame) ? null : frame;
    try {
      const plain = this.session.decrypt(userId, mediaType, frame);
      this.consecutiveFailures = 0;
      return plain;
    } catch {
      if (!this.reinitializing && this.pendingTransitions.size === 0) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures > FAILURE_TOLERANCE && this.lastTransitionId !== undefined) {
          this.recoverFromInvalidTransition(this.lastTransitionId);
        }
      }
      return null;
    }
  }

  destroy() {
    try {
      this.session?.reset();
    } catch {
      // The session is going away either way.
    }
  }
}

module.exports = { DaveSession, loadDavey };
