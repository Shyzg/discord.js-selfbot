'use strict';

// User accounts cannot send embeds; the message body builder must reject them with a clear error.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Client } = require('../src');
const MessagePayload = require('../src/structures/MessagePayload');

test('a user message with embeds throws a clear error (not Discord 50006)', () => {
  const client = new Client();
  const payload = new MessagePayload({ client }, { content: 'hi', embeds: [{ title: 'x' }] });
  assert.throws(() => payload.resolveBody(), /embed/i);
});

test('a user message without embeds resolves fine', () => {
  const client = new Client();
  const payload = new MessagePayload({ client }, { content: 'hi' });
  assert.doesNotThrow(() => payload.resolveBody());
});
