'use strict';

// User accounts cannot send embeds or components; the message body builder must reject them with clear errors.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Client, DiscordjsErrorCodes, WebhookClient } = require('../src');
const MessagePayload = require('../src/structures/MessagePayload');

test('a user message with embeds throws a clear error (not Discord 50006)', () => {
  const client = new Client();
  const payload = new MessagePayload({ client }, { content: 'hi', embeds: [{ title: 'x' }] });
  assert.throws(() => payload.resolveBody(), { code: DiscordjsErrorCodes.MessageEmbedsUserAccount });
});

test('a user message with components throws a clear error', () => {
  const client = new Client();
  const payload = new MessagePayload({ client }, { content: 'hi', components: [{ type: 1, components: [] }] });
  assert.throws(() => payload.resolveBody(), { code: DiscordjsErrorCodes.MessageComponentsUserAccount });
});

test('a webhook message allows embeds and components', () => {
  const webhook = new WebhookClient({ id: '1', token: 't' });
  const payload = new MessagePayload(webhook, {
    content: 'hi',
    embeds: [{ title: 'x' }],
    components: [{ type: 1, components: [] }],
  });
  assert.doesNotThrow(() => payload.resolveBody());
});

test('a user message without embeds or components resolves fine', () => {
  const client = new Client();
  const payload = new MessagePayload({ client }, { content: 'hi' });
  assert.doesNotThrow(() => payload.resolveBody());
});
