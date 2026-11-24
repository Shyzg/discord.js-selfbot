'use strict';

const { createHash, generateKeyPairSync, privateDecrypt, constants } = require('node:crypto');
const { Buffer } = require('node:buffer');
const { setInterval, clearInterval, setTimeout, clearTimeout } = require('node:timers');
const { DiscordjsError, ErrorCodes } = require('../errors');
const { USER_AGENT } = require('../util/UserProperties');

const REMOTE_AUTH_GATEWAY = 'wss://remote-auth-gateway.discord.gg/?v=2';

/**
 * Drives Discord's remote-auth ("log in with QR code") flow for a user account: generates an RSA key,
 * proves ownership of it to the gateway, surfaces a QR URL for the Discord mobile app to scan, then
 * decrypts the token the phone approves. One instance performs a single login attempt.
 * @private
 */
class RemoteAuth {
  constructor(client) {
    this.client = client;
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    this.privateKey = privateKey;
    const spki = publicKey.export({ type: 'spki', format: 'der' });
    this.encodedPublicKey = spki.toString('base64');
    this.fingerprint = createHash('sha256').update(spki).digest('base64url');
    this.ws = null;
    this.heartbeat = null;
    this.timeout = null;
    this.heartbeatAcked = true;
    this.loggingIn = false;
  }

  /**
   * Runs the handshake to completion.
   * @param {Object} [handlers] Login UI handlers
   * @param {Function} [handlers.onQRCode] Called with the QR URL (`https://discord.com/ra/<fingerprint>`) to render
   * @param {Function} [handlers.onUserData] Called with the account preview once the QR has been scanned
   * @returns {Promise<string>} The user token
   */
  run(handlers = {}) {
    return new Promise((resolve, reject) => {
      const fail = reason => {
        this.destroy();
        reject(reason instanceof Error ? reason : new DiscordjsError(ErrorCodes.RemoteAuthFailed, reason));
      };
      this.ws = new WebSocket(REMOTE_AUTH_GATEWAY, {
        headers: { Origin: 'https://discord.com', 'User-Agent': USER_AGENT },
      });
      this.ws.addEventListener('error', () => {
        if (!this.loggingIn) fail('gateway connection error');
      });
      // Discord closes the socket right after pending_login; from then on the ticket exchange decides the outcome.
      this.ws.addEventListener('close', () => {
        if (!this.loggingIn) fail('gateway closed before login completed');
      });
      this.ws.addEventListener('message', ({ data }) => {
        let message;
        try {
          message = JSON.parse(data);
        } catch {
          return;
        }
        this._handle(message, { ...handlers, resolve, fail }).catch(fail);
      });
    });
  }

  /**
   * Handles a single decoded gateway message.
   * @param {Object} message The parsed message
   * @param {Object} context Handlers plus the promise `resolve`/`fail`
   * @returns {Promise<void>}
   * @private
   */
  async _handle(message, { onQRCode, onUserData, resolve, fail }) {
    switch (message.op) {
      case 'hello':
        clearInterval(this.heartbeat);
        clearTimeout(this.timeout);
        this.heartbeatAcked = true;
        this.heartbeat = setInterval(() => {
          if (!this.heartbeatAcked) {
            fail('gateway heartbeat timed out');
            return;
          }
          this.heartbeatAcked = false;
          this._send({ op: 'heartbeat' });
        }, message.heartbeat_interval);
        if (message.timeout_ms) {
          this.timeout = setTimeout(() => fail('remote auth session timed out'), message.timeout_ms);
        }
        this._send({ op: 'init', encoded_public_key: this.encodedPublicKey });
        break;
      case 'heartbeat_ack':
        this.heartbeatAcked = true;
        break;
      case 'nonce_proof':
        // The proof is the decrypted nonce itself, base64url-encoded (not a hash of it).
        this._send({ op: 'nonce_proof', nonce: this._decrypt(message.encrypted_nonce).toString('base64url') });
        break;
      case 'pending_remote_init': {
        if (message.fingerprint !== this.fingerprint) {
          fail('public key fingerprint mismatch');
          break;
        }
        const url = `https://discord.com/ra/${message.fingerprint}`;
        if (onQRCode) {
          await onQRCode(url);
        } else {
          // No handler: render a scannable QR to the terminal by default.
          const { default: encodeQR } = await import('qr');
          console.log(`${encodeQR(url, 'ascii')}\nScan with the Discord mobile app · ${url}`);
        }
        break;
      }
      case 'pending_ticket':
        await onUserData?.(this._parseUser(this._decrypt(message.encrypted_user_payload).toString()));
        break;
      case 'pending_login': {
        this.loggingIn = true;
        clearInterval(this.heartbeat);
        clearTimeout(this.timeout);
        const { encrypted_token: encryptedToken } = await this.client.rest.post('/users/@me/remote-auth/login', {
          body: { ticket: message.ticket },
          auth: false,
        });
        this.destroy();
        resolve(this._decrypt(encryptedToken).toString());
        break;
      }
      case 'cancel':
        fail('login was cancelled on the device');
        break;
      default:
        break;
    }
  }

  /**
   * Decrypts a base64 RSA-OAEP(SHA-256) payload with this session's private key.
   * @param {string} base64 The encrypted payload
   * @returns {Buffer}
   * @private
   */
  _decrypt(base64) {
    return privateDecrypt(
      { key: this.privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      Buffer.from(base64, 'base64'),
    );
  }

  _send(payload) {
    this.ws?.send(JSON.stringify(payload));
  }

  // shortcut: user payload layout is `id:discriminator:avatar:username`; revisit if Discord changes the format.
  _parseUser(payload) {
    const [id, discriminator, avatar, username] = payload.split(':');
    return { id, username, discriminator, avatar: avatar === '0' ? null : avatar, raw: payload };
  }

  /**
   * Closes the gateway connection and stops heartbeating.
   * @returns {void}
   */
  destroy() {
    clearInterval(this.heartbeat);
    clearTimeout(this.timeout);
    try {
      this.ws?.close();
    } catch {
      // the socket was never opened or is already closed
    }
  }
}

module.exports = RemoteAuth;
