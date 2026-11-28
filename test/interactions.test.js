'use strict';

// Other applications' slash commands, buttons, select menus and modals, run as the user.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { setImmediate: tick } = require('node:timers/promises');
const {
  ApplicationCommandOptionType: Option,
  ChannelType,
  ComponentType,
  MessageFlags,
} = require('discord-api-types/v10');
const { Client, Events, Modal, Options } = require('../src');
const handlers = require('../src/client/websocket/handlers');

const readyShard = { id: 0, checkReady() {} };
const BOT = '50';
// An old bot: its application id differs from its user id.
const APP = '60';

const index = {
  applications: [{ id: APP, bot_id: BOT, name: 'bot' }],
  application_commands: [
    {
      id: '70',
      application_id: APP,
      version: '71',
      type: 1,
      name: 'help',
      options: [{ type: Option.String, name: 'plugin' }],
    },
    {
      id: '72',
      application_id: APP,
      version: '73',
      type: 1,
      name: 'say',
      options: [
        { type: Option.String, name: 'text', required: true },
        {
          type: Option.Integer,
          name: 'times',
          choices: [
            { name: 'once', value: 1 },
            { name: 'twice', value: 2 },
          ],
        },
        { type: Option.Boolean, name: 'loud' },
        { type: Option.User, name: 'target' },
      ],
    },
    // Registered to the guild, not global.
    {
      id: '74',
      application_id: APP,
      guild_id: '10',
      version: '75',
      type: 1,
      name: 'settings',
      options: [
        {
          type: Option.SubcommandGroup,
          name: 'prefix',
          options: [
            { type: Option.Subcommand, name: 'set', options: [{ type: Option.String, name: 'value', required: true }] },
          ],
        },
      ],
    },
    // Another application's command with the same name.
    { id: '76', application_id: '99', version: '77', type: 1, name: 'help' },
  ],
};
const emptyIndex = { applications: [], application_commands: [] };

function readyClient(options) {
  const client = new Client(options);
  handlers.READY(
    client,
    { d: { user: { id: '1', username: 'me' }, guilds: [], users: [{ id: BOT, username: 'bot', bot: true }] } },
    readyShard,
  );
  client.guilds._add({
    id: '10',
    name: 'G',
    channels: [{ id: '11', type: ChannelType.GuildText, name: 'general', guild_id: '10' }],
  });
  client.ws.shards.set(0, { id: 0, sessionInfo: { sessionId: 'session' } });
  return client;
}

function fakeRest(client, { guildIndex = index, userIndex = emptyIndex } = {}) {
  const requests = [];
  client.rest.get = async route => {
    requests.push(['get', route]);
    if (guildIndex instanceof Error) throw guildIndex;
    return route.startsWith('/users/@me/') ? userIndex : guildIndex;
  };
  client.rest.post = async (route, { body }) => {
    requests.push(['post', route, body]);
  };
  return requests;
}

// Plays gateway dispatches the way the WebSocketManager does: the raw packet first, then its handler.
function dispatch(client, ...packets) {
  for (const [t, d] of packets) {
    client.emit(Events.Raw, { t, d }, 0);
    handlers[t]?.(client, { t, d }, readyShard);
  }
}

// Waits for the interaction request, then answers it with the packets `build` makes from its nonce.
async function answer(client, requests, build) {
  await tick();
  const [, , body] = requests.findLast(([method]) => method === 'post');
  dispatch(client, ...build(body.nonce));
  return body;
}

const rawMessage = (id, extra = {}) => ({
  id,
  channel_id: '11',
  guild_id: '10',
  author: { id: BOT, username: 'bot', bot: true },
  content: 'pong',
  edited_timestamp: null,
  mention_everyone: false,
  mentions: [],
  mention_roles: [],
  attachments: [],
  embeds: [],
  type: 0,
  flags: 0,
  ...extra,
});
const replyTo = (interactionId, id, extra = {}) =>
  rawMessage(id, {
    type: 20,
    application_id: APP,
    interaction_metadata: {
      id: interactionId,
      type: 2,
      user: { id: '1', username: 'me' },
      authorizing_integration_owners: { 0: '10' },
    },
    ...extra,
  });

test('sendSlash finds the command through the bot id and resolves with the reply to its own interaction', async () => {
  const client = readyClient();
  const requests = fakeRest(client);
  const channel = client.channels.cache.get('11');
  const pending = channel.sendSlash(BOT, 'say', 'hi', 'twice', 'true', client.users.cache.get(BOT));
  const body = await answer(client, requests, nonce => [
    ['INTERACTION_CREATE', { id: '900', nonce }],
    // Another interaction's reply in the same channel.
    ['MESSAGE_CREATE', replyTo('800', '801')],
    ['MESSAGE_CREATE', replyTo('900', '901')],
  ]);

  assert.equal((await pending).id, '901');
  assert.deepEqual(requests[0], ['get', '/guilds/10/application-command-index']);
  assert.equal(requests[1][1], '/interactions');
  assert.match(body.nonce, /^\d{17,20}$/);
  assert.deepEqual(
    { ...body, nonce: undefined, data: { ...body.data, application_command: undefined } },
    {
      type: 2,
      application_id: APP,
      guild_id: '10',
      channel_id: '11',
      analytics_location: 'slash_ui',
      session_id: 'session',
      nonce: undefined,
      data: {
        version: '73',
        id: '72',
        name: 'say',
        type: 1,
        options: [
          { type: Option.String, name: 'text', value: 'hi' },
          { type: Option.Integer, name: 'times', value: 2 },
          { type: Option.Boolean, name: 'loud', value: true },
          { type: Option.User, name: 'target', value: BOT },
        ],
        application_command: undefined,
        attachments: [],
      },
    },
  );
  assert.equal(body.data.application_command, index.application_commands[1]);
});

test('options by name, subcommand groups, and the mistakes rejected before anything is sent', async () => {
  const client = readyClient();
  const requests = fakeRest(client);
  const channel = client.channels.cache.get('11');

  const named = channel.sendSlash(BOT, 'say', { text: 'hi', loud: false });
  const namedBody = await answer(client, requests, nonce => [
    ['INTERACTION_FAILURE', { id: '1', nonce, reason_code: 4 }],
  ]);
  await assert.rejects(named, { code: 'InteractionFailed', message: /reason code 4/ });
  assert.deepEqual(namedBody.data.options, [
    { type: Option.String, name: 'text', value: 'hi' },
    { type: Option.Boolean, name: 'loud', value: false },
  ]);

  // The application id works as well as the bot id.
  const nested = channel.sendSlash(APP, 'settings prefix set', '!');
  const nestedBody = await answer(client, requests, nonce => [
    ['INTERACTION_FAILURE', { id: '2', nonce, reason_code: 1 }],
  ]);
  await assert.rejects(nested, { code: 'InteractionFailed' });
  assert.equal(nestedBody.data.guild_id, '10', 'a guild command names its guild');
  assert.equal('guild_id' in namedBody.data, false, 'a global command does not');
  assert.deepEqual(nestedBody.data.options, [
    {
      type: Option.SubcommandGroup,
      name: 'prefix',
      options: [
        { type: Option.Subcommand, name: 'set', options: [{ type: Option.String, name: 'value', value: '!' }] },
      ],
    },
  ]);

  const posts = requests.filter(([method]) => method === 'post').length;
  await assert.rejects(channel.sendSlash(BOT, 'say'), {
    code: 'InteractionCommandOption',
    message: /"text" is required/,
  });
  await assert.rejects(channel.sendSlash(BOT, 'say', 'hi', 3), { message: /must be one of once, twice/ });
  await assert.rejects(channel.sendSlash(BOT, 'say', { txt: 'hi' }), { message: /"txt" does not exist/ });
  await assert.rejects(channel.sendSlash(BOT, 'help', 'a', 'b'), { message: /"#2" does not exist/ });
  await assert.rejects(channel.sendSlash(BOT, 'settings'), { message: /needs one of its subcommands: prefix/ });
  await assert.rejects(channel.sendSlash(BOT, 'settings prefix get'), { code: 'InteractionCommandNotFound' });
  await assert.rejects(channel.sendSlash(BOT, 'nope'), { code: 'InteractionCommandNotFound' });
  await assert.rejects(channel.sendSlash('55', 'help'), { code: 'InteractionApplicationNotFound' });
  assert.equal(requests.filter(([method]) => method === 'post').length, posts, 'no interaction was sent');
  assert.deepEqual(requests.at(-1), ['get', '/users/@me/application-command-index'], 'user-installed apps are checked');
});

test('a reply that arrives before INTERACTION_CREATE still resolves, and a DM uses its own command index', async () => {
  const client = readyClient();
  const requests = fakeRest(client);
  const dm = client.channels._add({ id: '100', type: ChannelType.DM, recipients: [{ id: BOT, username: 'bot' }] });
  const pending = dm.sendSlash(BOT, 'help');
  const body = await answer(client, requests, nonce => [
    ['MESSAGE_CREATE', replyTo('900', '901', { channel_id: '100', guild_id: undefined })],
    ['INTERACTION_CREATE', { id: '900', nonce }],
  ]);
  assert.equal((await pending).id, '901');
  assert.equal(body.guild_id, undefined);
  assert.deepEqual(requests[0], ['get', '/channels/100/application-command-index']);
});

test('a deferred reply resolves once it is filled in, even when messages are not cached', async () => {
  const client = readyClient({ makeCache: Options.cacheWithLimits({ MessageManager: 0 }) });
  const requests = fakeRest(client);
  const pending = client.channels.cache.get('11').sendSlash(BOT, 'help');
  await answer(client, requests, nonce => [
    ['INTERACTION_CREATE', { id: '900', nonce }],
    ['INTERACTION_SUCCESS', { id: '900', nonce }],
    ['MESSAGE_CREATE', replyTo('900', '901', { content: '', flags: MessageFlags.Loading })],
    // Unrelated edits are ignored.
    ['MESSAGE_UPDATE', rawMessage('555', { content: 'other' })],
    ['MESSAGE_UPDATE', replyTo('900', '901', { content: 'done', flags: 0 })],
  ]);
  const reply = await pending;
  assert.equal(reply.content, 'done');
  assert.equal(reply.flags.has(MessageFlags.Loading), false);
});

test('waits end: no answer rejects, a bare success resolves null, an unfilled placeholder is returned', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const client = readyClient();
  const requests = fakeRest(client);
  const channel = client.channels.cache.get('11');
  const listeners = client.listenerCount(Events.Raw);
  const maxListeners = client.getMaxListeners();

  const silent = channel.sendSlash(BOT, 'help');
  await answer(client, requests, () => []);
  t.mock.timers.tick(15_000);
  await assert.rejects(silent, { code: 'InteractionTimeout' });

  const bare = channel.sendSlash(BOT, 'help');
  await answer(client, requests, nonce => [['INTERACTION_SUCCESS', { id: '900', nonce }]]);
  t.mock.timers.tick(3_000);
  assert.equal(await bare, null);

  const deferred = channel.sendSlash(BOT, 'help');
  await answer(client, requests, nonce => [
    ['INTERACTION_CREATE', { id: '910', nonce }],
    ['INTERACTION_SUCCESS', { id: '910', nonce }],
    ['MESSAGE_CREATE', replyTo('910', '911', { content: '', flags: MessageFlags.Loading })],
  ]);
  t.mock.timers.tick(3_000);
  t.mock.timers.tick(57_000);
  assert.equal((await deferred).flags.has(MessageFlags.Loading), true);

  const failed = channel.sendSlash(BOT, 'help');
  client.rest.post = async () => {
    throw new Error('Missing Permissions');
  };
  await assert.rejects(failed, { message: 'Missing Permissions' });

  assert.equal(client.listenerCount(Events.Raw), listeners, 'every wait removed its listeners');
  assert.equal(client.listenerCount(Events.MessageCreate), 0);
  assert.equal(client.getMaxListeners(), maxListeners);
});

test('a modal opens as a Modal, and submitting it sends its inputs filled in', async () => {
  const client = readyClient();
  const requests = fakeRest(client);
  const pending = client.channels.cache.get('11').sendSlash(BOT, 'help');
  await answer(client, requests, nonce => [
    ['INTERACTION_CREATE', { id: '900', nonce }],
    [
      'INTERACTION_MODAL_CREATE',
      {
        id: '950',
        nonce,
        channel_id: '11',
        custom_id: 'feedback',
        title: 'Feedback',
        application: { id: APP, name: 'bot' },
        components: [
          { type: 1, components: [{ type: 4, custom_id: 'text', style: 1, label: 'Text', value: 'prefilled' }] },
          {
            type: 18,
            label: 'Tags',
            component: { type: 3, custom_id: 'tags', options: [{ label: 'A', value: 'a' }] },
          },
          { type: 1, components: [{ type: 4, custom_id: 'note', style: 2, label: 'Note' }] },
          { type: 10, content: 'Thanks!' },
        ],
      },
    ],
  ]);
  const modal = await pending;
  assert.ok(modal instanceof Modal);
  assert.equal(modal.channel.id, '11');
  assert.equal(modal.title, 'Feedback');

  const submitted = modal.submit({ tags: 'a', note: 'hello' });
  const body = await answer(client, requests, nonce => [
    ['INTERACTION_CREATE', { id: '960', nonce }],
    ['MESSAGE_CREATE', replyTo('960', '961')],
  ]);
  assert.equal((await submitted).id, '961');
  assert.deepEqual(
    { ...body, nonce: undefined },
    {
      type: 5,
      application_id: APP,
      guild_id: '10',
      channel_id: '11',
      session_id: 'session',
      nonce: undefined,
      data: {
        id: '950',
        custom_id: 'feedback',
        components: [
          { type: 1, components: [{ type: 4, custom_id: 'text', value: 'prefilled' }] },
          { type: 18, component: { type: 3, custom_id: 'tags', values: ['a'] } },
          { type: 1, components: [{ type: 4, custom_id: 'note', value: 'hello' }] },
        ],
      },
    },
  );
  await assert.rejects(modal.submit('hello'), { code: 'InvalidType' });
});

test('clickButton answers with the message the application edited, also when that message is not cached', async () => {
  const client = readyClient();
  const requests = fakeRest(client);
  const channel = client.channels.cache.get('11');
  const buttons = [
    { type: 2, style: 1, custom_id: 'confirm', label: 'OK' },
    { type: 2, style: 1, custom_id: 'off', label: 'Off', disabled: true },
    { type: 2, style: 5, url: 'https://example.com', label: 'Link' },
  ];
  const raw = replyTo('800', '500', { components: [{ type: 1, components: buttons }], flags: MessageFlags.Ephemeral });
  const message = channel.messages._add(raw, false);

  const pending = message.clickButton(message.components[0].components[0]);
  const body = await answer(client, requests, nonce => [
    ['INTERACTION_CREATE', { id: '900', nonce }],
    // UPDATE_MESSAGE: the edit can come before Discord reports success.
    ['MESSAGE_UPDATE', { ...raw, content: 'confirmed', components: [] }],
    ['INTERACTION_SUCCESS', { id: '900', nonce }],
  ]);
  const updated = await pending;
  assert.equal(updated.id, '500');
  assert.equal(updated.content, 'confirmed');
  assert.equal(requests[0][0], 'post', 'the reply names its application, so no lookup');
  assert.deepEqual(
    { ...body, nonce: undefined },
    {
      type: 3,
      application_id: APP,
      guild_id: '10',
      channel_id: '11',
      message_id: '500',
      message_flags: MessageFlags.Ephemeral,
      session_id: 'session',
      nonce: undefined,
      data: { component_type: ComponentType.Button, custom_id: 'confirm' },
    },
  );

  for (const button of ['off', 'missing', undefined]) {
    await assert.rejects(message.clickButton(button), { code: 'InteractionComponentNotFound' });
  }
});

test('components on a plain bot message go to the application in the command index, or to the bot id', async () => {
  const client = readyClient();
  const requests = fakeRest(client);
  const channel = client.channels.cache.get('11');
  const components = [{ type: 1, components: [{ type: 2, style: 1, custom_id: 'go', label: 'Go' }] }];
  const message = channel.messages._add(rawMessage('500', { components }));

  const viaIndex = message.clickButton('go');
  const indexed = await answer(client, requests, nonce => [
    ['INTERACTION_FAILURE', { id: '1', nonce, reason_code: 1 }],
  ]);
  await assert.rejects(viaIndex);
  assert.equal(indexed.application_id, APP);

  client.rest.get = async () => {
    throw new Error('Missing Access');
  };
  const viaBot = message.clickButton('go');
  const fallback = await answer(client, requests, nonce => [
    ['INTERACTION_FAILURE', { id: '2', nonce, reason_code: 1 }],
  ]);
  await assert.rejects(viaBot);
  assert.equal(fallback.application_id, BOT);
});

test('selectMenu sends the chosen values and checks them against the menu first', async () => {
  const client = readyClient();
  const requests = fakeRest(client);
  const channel = client.channels.cache.get('11');
  const menus = [
    {
      type: 1,
      components: [
        {
          type: ComponentType.StringSelect,
          custom_id: 'color',
          min_values: 1,
          max_values: 2,
          options: [
            { label: 'Red', value: 'red' },
            { label: 'Blue', value: 'blue' },
          ],
        },
      ],
    },
    { type: 1, components: [{ type: ComponentType.UserSelect, custom_id: 'who' }] },
  ];
  const message = channel.messages._add(replyTo('800', '500', { components: menus }));

  const colors = message.selectMenu('color', ['red', 'blue']);
  const body = await answer(client, requests, nonce => [
    ['INTERACTION_CREATE', { id: '900', nonce }],
    ['MESSAGE_CREATE', replyTo('900', '901')],
  ]);
  assert.equal((await colors).id, '901');
  assert.deepEqual(body.data, {
    component_type: ComponentType.StringSelect,
    custom_id: 'color',
    type: ComponentType.StringSelect,
    values: ['red', 'blue'],
  });

  const users = message.selectMenu('who', [client.users.cache.get(BOT)]);
  const userBody = await answer(client, requests, nonce => [
    ['INTERACTION_FAILURE', { id: '1', nonce, reason_code: 1 }],
  ]);
  await assert.rejects(users);
  assert.deepEqual(userBody.data.values, [BOT]);

  await assert.rejects(message.selectMenu('color', ['green']), { code: 'InteractionSelectValues', message: /"green"/ });
  await assert.rejects(message.selectMenu('color', []), { message: /choose 1 to 2/ });
  await assert.rejects(message.selectMenu('who', ['1', '2']), { message: /choose 1 to 1/ });
  await assert.rejects(message.selectMenu('color', 'red'), { code: 'InvalidType' });
  await assert.rejects(message.selectMenu('missing', ['red']), { code: 'InteractionComponentNotFound' });
});
