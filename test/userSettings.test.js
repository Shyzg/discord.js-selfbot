'use strict';

// Synced user settings (status, custom status) over Discord's settings protobuf, and the codec behind them.
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { test } = require('node:test');
const { Client, Events } = require('../src');
const handlers = require('../src/client/websocket/handlers');
const { WireType, decode, encode } = require('../src/util/Protobuf');

const { Varint, Fixed64, LengthDelimited } = WireType;
const readyShard = { id: 0, checkReady() {} };
const bytes = (field, value) => ({ field, wireType: LengthDelimited, value: Buffer.from(value) });
const message = (field, fields) => ({ field, wireType: LengthDelimited, value: encode(fields) });
const find = (fields, field) => fields.find(entry => entry.field === field)?.value;

// StatusSettings with fields this library does not model: show_current_game=false (3) and a future field (9).
const showCurrentGameOff = message(3, [{ field: 1, wireType: Varint, value: 0n }]);
const futureField = { field: 9, wireType: Varint, value: 5n };
const atWork = message(2, [
  bytes(1, 'At work'),
  bytes(3, '💼'),
  { field: 4, wireType: Fixed64, value: 1_893_456_000_000n },
]);
const statusSettings = [message(1, [bytes(1, 'dnd')]), atWork, showCurrentGameOff, futureField];
const preloaded = fields =>
  encode([
    message(1, [{ field: 1, wireType: Varint, value: 7n }]), // versions: owned by Discord
    message(11, fields),
    bytes(13, 'appearance settings'),
  ]).toString('base64');

function readyClient() {
  const client = new Client();
  const user = { id: '1', username: 'me', discriminator: '0' };
  handlers.READY(client, { d: { user, guilds: [], user_settings_proto: preloaded(statusSettings) } }, readyShard);
  return client;
}

// The StatusSettings fields of a PATCH body, after checking it carries nothing but the top-level status field.
function sentStatusSettings(body) {
  const topLevel = decode(Buffer.from(body.settings, 'base64'));
  assert.deepEqual(
    topLevel.map(entry => entry.field),
    [11],
  );
  return decode(topLevel[0].value);
}

test('the protobuf codec round-trips unknown fields and rejects truncated input', () => {
  const vector = Buffer.from([0x08, 0x96, 0x01]); // field 1, varint 150 (protobuf encoding guide)
  assert.deepEqual(decode(vector), [{ field: 1, wireType: Varint, value: 150n }]);
  assert.ok(encode(decode(vector)).equals(vector));

  const nested = encode([
    message(11, statusSettings),
    { field: 99, wireType: Varint, value: 300n },
    { field: 7, wireType: WireType.Fixed32, value: 4_294_967_295 },
    { field: 8, wireType: Fixed64, value: 0xffff_ffff_ffff_ffffn },
  ]);
  assert.ok(encode(decode(nested)).equals(nested));
  assert.throws(() => decode(Buffer.from([0x08])), /Truncated protobuf varint/);
  assert.throws(() => decode(Buffer.from([0x0a, 0x05, 0x01])), /Truncated protobuf length-delimited/);
  assert.throws(() => decode(Buffer.from([0x0b])), /Unsupported protobuf wire type 3/);
});

test('READY settings expose the status and custom status', () => {
  const { settings } = readyClient().user;
  assert.equal(settings.status, 'dnd');
  assert.deepEqual(settings.customStatus, {
    text: 'At work',
    emoji: { id: null, name: '💼' },
    expiresAt: new Date(1_893_456_000_000),
  });
  assert.deepEqual(settings.toJSON(), { status: 'dnd', customStatus: settings.customStatus });
});

test('setStatus sends the whole StatusSettings, keeping the fields it does not model', async () => {
  const client = readyClient();
  const bodies = [];
  client.rest.patch = async (route, options) => {
    bodies.push([route, options.body]);
    return { settings: options.body.settings };
  };
  const events = [];
  client.on(Events.UserSettingsUpdate, (oldSettings, newSettings) =>
    events.push([oldSettings.status, newSettings.status]),
  );

  assert.equal(await client.user.settings.setStatus('idle'), client.user.settings);

  const [[route, body]] = bodies;
  assert.equal(route, '/users/@me/settings-proto/1');
  const sent = sentStatusSettings(body);
  assert.equal(find(decode(find(sent, 1)), 1).toString(), 'idle');
  assert.ok(find(sent, 2).equals(atWork.value), 'custom status unchanged');
  assert.ok(find(sent, 3).equals(showCurrentGameOff.value), 'show_current_game stays off');
  assert.equal(find(sent, 9), 5n, 'unknown field kept');
  assert.equal(client.user.settings.status, 'idle');
  // The response only carried the status field, so the rest of the cached proto survives.
  assert.ok(find(client.user.settings._fields, 13));
  assert.deepEqual(events, [['dnd', 'idle']]);
});

test('setCustomStatus clears or writes the custom status, with custom emoji and expiry', async () => {
  const client = readyClient();
  const bodies = [];
  client.rest.patch = async (_route, options) => {
    bodies.push(options.body);
    return { settings: options.body.settings };
  };

  await client.user.settings.setCustomStatus(null);
  const cleared = sentStatusSettings(bodies[0]);
  assert.equal(find(cleared, 2), undefined);
  assert.equal(find(decode(find(cleared, 1)), 1).toString(), 'dnd');
  assert.equal(client.user.settings.customStatus, null);

  const before = BigInt(Date.now());
  await client.user.settings.setCustomStatus({
    text: 'Gaming',
    emoji: '<:pepe:123456789012345678>',
    expiresAt: new Date('2031-01-01T00:00:00.000Z'),
  });
  const custom = decode(find(sentStatusSettings(bodies[1]), 2));
  assert.equal(find(custom, 1).toString(), 'Gaming');
  assert.equal(find(custom, 2), 123456789012345678n);
  assert.equal(find(custom, 3).toString(), 'pepe');
  assert.equal(find(custom, 4), BigInt(Date.parse('2031-01-01T00:00:00.000Z')));
  assert.ok(find(custom, 5) >= before, 'created_at_ms is set');
  assert.deepEqual(client.user.settings.customStatus, {
    text: 'Gaming',
    emoji: { id: '123456789012345678', name: 'pepe' },
    expiresAt: new Date('2031-01-01T00:00:00.000Z'),
  });
});

test('overlapping edits run in order, so a later edit does not undo an earlier one', async () => {
  const client = readyClient();
  const bodies = [];
  client.rest.patch = async (_route, options) => {
    bodies.push(options.body);
    await new Promise(resolve => setImmediate(resolve)); // both calls are made before the first response arrives
    return { settings: options.body.settings };
  };

  await Promise.all([client.user.settings.setStatus('idle'), client.user.settings.setCustomStatus({ text: 'brb' })]);

  const second = sentStatusSettings(bodies[1]);
  assert.equal(find(decode(find(second, 1)), 1).toString(), 'idle', "the second edit keeps the first one's status");
  assert.equal(find(decode(find(second, 2)), 1).toString(), 'brb');
  assert.equal(client.user.settings.status, 'idle');
  assert.equal(client.user.settings.customStatus.text, 'brb');

  // A failed edit does not block the queue.
  client.rest.patch = async () => {
    throw new Error('rate limited');
  };
  await assert.rejects(client.user.settings.setStatus('dnd'), /rate limited/);
  client.rest.patch = async (_route, options) => ({ settings: options.body.settings });
  assert.equal((await client.user.settings.setStatus('invisible')).status, 'invisible');
});

test('an edit without a cached proto fetches the settings first instead of resetting them', async () => {
  const client = new Client();
  handlers.READY(client, { d: { user: { id: '1', username: 'me' }, guilds: [] } }, readyShard);
  const calls = [];
  let body;
  client.rest.get = async route => {
    calls.push(['get', route]);
    return { settings: preloaded(statusSettings) };
  };
  client.rest.patch = async (route, options) => {
    calls.push(['patch', route]);
    body = options.body;
    return { settings: options.body.settings };
  };

  await client.user.settings.setStatus('idle');

  assert.deepEqual(
    calls.map(([method]) => method),
    ['get', 'patch'],
  );
  const sent = sentStatusSettings(body);
  assert.ok(find(sent, 3).equals(showCurrentGameOff.value), 'show_current_game was not reset');
  assert.ok(find(sent, 2).equals(atWork.value), 'the custom status was not wiped');
});

test('invalid settings input rejects before any request', async () => {
  const client = readyClient();
  let requests = 0;
  client.rest.patch = async () => {
    requests++;
  };
  await assert.rejects(client.user.settings.setStatus('unknown'), { code: 'InvalidType' });
  await assert.rejects(client.user.settings.setCustomStatus({ text: 'x', expiresAt: 'not a date' }), {
    code: 'InvalidType',
  });
  await assert.rejects(client.user.settings.setCustomStatus({ emoji: {} }), { code: 'InvalidType' });
  assert.equal(requests, 0);
});

test('USER_SETTINGS_PROTO_UPDATE merges partial updates, replaces full ones, and only emits on change', () => {
  const client = readyClient();
  const events = [];
  client.on(Events.UserSettingsUpdate, (oldSettings, newSettings) =>
    events.push([oldSettings.status, newSettings.status]),
  );
  const update = (proto, partial, type = 1) =>
    handlers.USER_SETTINGS_PROTO_UPDATE(client, { d: { settings: { type, proto }, partial } });

  // A partial update carrying only StatusSettings keeps the other top-level fields.
  update(encode([message(11, [message(1, [bytes(1, 'online')])])]).toString('base64'), true);
  assert.equal(client.user.settings.status, 'online');
  assert.ok(find(client.user.settings._fields, 13));

  // The same full proto twice: the second (an echo) emits nothing.
  const full = encode([message(11, [message(1, [bytes(1, 'invisible')])])]).toString('base64');
  update(full, false);
  update(full, false);
  assert.equal(find(client.user.settings._fields, 13), undefined, 'a full update replaces everything');

  // Other settings types (frecency) are not cached.
  update(encode([bytes(1, 'frecency')]).toString('base64'), false, 2);
  assert.equal(client.user.settings.status, 'invisible');
  assert.deepEqual(events, [
    ['dnd', 'online'],
    ['online', 'invisible'],
  ]);
});

test('fetch reads the preloaded settings proto', async () => {
  const client = readyClient();
  const routes = [];
  client.rest.get = async route => {
    routes.push(route);
    return { settings: preloaded([message(1, [bytes(1, 'idle')])]) };
  };
  assert.equal((await client.user.settings.fetch()).status, 'idle');
  assert.deepEqual(routes, ['/users/@me/settings-proto/1']);
  assert.equal(client.user.settings.customStatus, null);
});
