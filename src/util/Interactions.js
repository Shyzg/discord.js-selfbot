'use strict';

// Called through the module, not destructured, so tests can mock the timers.
const timers = require('node:timers');
const { DiscordSnowflake } = require('@sapphire/snowflake');
const {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ComponentType,
  InteractionType,
  MessageFlags,
} = require('discord-api-types/v10');
const Events = require('./Events');
const { DiscordjsError, DiscordjsRangeError, DiscordjsTypeError, ErrorCodes } = require('../errors');
const Modal = require('../structures/Modal');

// shortcut: fixed waits, make them options if slow bots need longer. The application must answer within
// RESPONSE_TIMEOUT; once Discord reports success, its reply or edit gets SUCCESS_GRACE to arrive, and a deferred
// ("is thinking...") reply gets DEFERRED_TIMEOUT to be filled in before the placeholder itself is returned.
const RESPONSE_TIMEOUT = 15_000;
const SUCCESS_GRACE = 3_000;
const DEFERRED_TIMEOUT = 60_000;

const SubcommandTypes = [ApplicationCommandOptionType.Subcommand, ApplicationCommandOptionType.SubcommandGroup];
const SelectMenuTypes = [
  ComponentType.StringSelect,
  ComponentType.UserSelect,
  ComponentType.RoleSelect,
  ComponentType.MentionableSelect,
  ComponentType.ChannelSelect,
];

const isPlainObject = value =>
  value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const optionError = (option, problem) => new DiscordjsTypeError(ErrorCodes.InteractionCommandOption, option, problem);

/**
 * Finds a bot's application and its commands in the command index of the channel (its guild's, or the private
 * channel's), then among the apps the user installed. Old bots have an application id that differs from their user
 * id, so `bot_id` matches too.
 * @param {Client} client The client
 * @param {TextBasedChannels} channel The channel the interaction happens in
 * @param {Snowflake} botId The bot's user id or its application id
 * @returns {Promise<?{ application: Object, commands: Object[] }>}
 * @private
 */
async function findApplication(client, channel, botId) {
  const pick = index => {
    const application = index.applications?.find(app => app.id === botId || app.bot_id === botId);
    if (!application) return null;
    const commands = (index.application_commands ?? []).filter(command => command.application_id === application.id);
    return { application, commands };
  };
  const route = channel.guildId
    ? `/guilds/${channel.guildId}/application-command-index`
    : `/channels/${channel.id}/application-command-index`;
  return pick(await client.rest.get(route)) ?? pick(await client.rest.get('/users/@me/application-command-index'));
}

function coerceOption(definition, raw) {
  const choices = definition.choices ?? [];
  if (choices.length) {
    // A choice can be given by its value or by its name.
    const choice =
      choices.find(candidate => candidate.value === raw) ??
      choices.find(candidate => candidate.name === String(raw) || String(candidate.value) === String(raw));
    if (!choice) {
      throw optionError(definition.name, `must be one of ${choices.map(candidate => candidate.name).join(', ')}`);
    }
    return choice.value;
  }
  switch (definition.type) {
    case ApplicationCommandOptionType.String:
      return String(raw);
    case ApplicationCommandOptionType.Integer:
    case ApplicationCommandOptionType.Number: {
      const value = Number(raw);
      const integer = definition.type === ApplicationCommandOptionType.Integer;
      if (integer ? !Number.isInteger(value) : Number.isNaN(value)) {
        throw optionError(definition.name, integer ? 'must be an integer' : 'must be a number');
      }
      return value;
    }
    case ApplicationCommandOptionType.Boolean:
      if (typeof raw === 'boolean') return raw;
      if (raw === 'true' || raw === 'false') return raw === 'true';
      throw optionError(definition.name, 'must be a boolean');
    case ApplicationCommandOptionType.User:
    case ApplicationCommandOptionType.Channel:
    case ApplicationCommandOptionType.Role:
    case ApplicationCommandOptionType.Mentionable: {
      const id = typeof raw === 'string' ? raw : raw?.id;
      if (!id) throw optionError(definition.name, 'must be an id or an object with an id');
      return id;
    }
    default:
      throw optionError(definition.name, 'has a type this library cannot send (attachments are not supported)');
  }
}

function resolveOptions(definitions, args) {
  const named = args.length === 1 && isPlainObject(args[0]) ? args[0] : null;
  if (named) {
    const unknown = Object.keys(named).find(name => !definitions.some(definition => definition.name === name));
    if (unknown) throw optionError(unknown, 'does not exist on this command');
  } else if (args.length > definitions.length) {
    throw optionError(`#${definitions.length + 1}`, `does not exist (the command takes ${definitions.length})`);
  }
  const options = [];
  for (const [index, definition] of definitions.entries()) {
    const value = named ? named[definition.name] : args[index];
    if (value === undefined || value === null) {
      if (definition.required) throw optionError(definition.name, 'is required');
      continue;
    }
    options.push({ type: definition.type, name: definition.name, value: coerceOption(definition, value) });
  }
  return options;
}

/**
 * Builds the `data` of an APPLICATION_COMMAND interaction for a chat input command.
 * @param {Object} command The command from the command index
 * @param {string[]} path The subcommand group and/or subcommand names
 * @param {Array<*>} args The option values: positional, or one object keyed by option name
 * @returns {Object}
 * @private
 */
function buildCommandData(command, path, args) {
  let definitions = command.options ?? [];
  const nesting = [];
  for (const name of path) {
    const subcommand = definitions.find(option => SubcommandTypes.includes(option.type) && option.name === name);
    if (!subcommand) throw new DiscordjsError(ErrorCodes.InteractionCommandNotFound, [command.name, ...path].join(' '));
    nesting.push(subcommand);
    definitions = subcommand.options ?? [];
  }
  const subcommands = definitions.filter(option => SubcommandTypes.includes(option.type));
  if (subcommands.length) {
    const fullName = [command.name, ...path].join(' ');
    throw optionError(fullName, `needs one of its subcommands: ${subcommands.map(option => option.name).join(', ')}`);
  }
  let options = resolveOptions(definitions, args);
  for (const subcommand of nesting.reverse()) options = [{ type: subcommand.type, name: subcommand.name, options }];
  return {
    version: command.version,
    id: command.id,
    name: command.name,
    type: command.type,
    // A command registered to a guild is only found there; without it Discord answers 10005 Unknown Integration.
    ...(command.guild_id && { guild_id: command.guild_id }),
    options,
    application_command: command,
    attachments: [],
  };
}

/**
 * Creates an interaction as the user and waits for the application's answer. Discord only acknowledges the request,
 * so the answer is matched over the gateway: our nonce names the interaction in INTERACTION_CREATE, and the reply
 * carries that interaction's id in `interaction_metadata`.
 * @param {Client} client The client
 * @param {Object} body The interaction, without `nonce` and `session_id`
 * @param {Object} [options] Options
 * @param {?Message} [options.message] For components, the message whose edit counts as the answer
 * @returns {Promise<?(Message|Modal)>} The reply, the edited message, the opened modal, or `null` when the application
 * answered without any of them
 * @private
 */
function sendInteraction(client, body, { message = null } = {}) {
  const nonce = DiscordSnowflake.generate().toString();
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;
    let interactionId = null;
    let acknowledged = false;
    // A deferred reply ("is thinking...") that an edit will fill in.
    let placeholder = null;
    // An edit of the component's message that arrived before Discord reported success.
    let edited = null;
    // Replies that arrived before INTERACTION_CREATE told us the interaction's id.
    const early = new Map();

    const wait = (ms, onTimeout) => {
      timers.clearTimeout(timer);
      timer = timers.setTimeout(onTimeout, ms).unref();
    };
    const finish = (error, result = null) => {
      if (settled) return;
      settled = true;
      timers.clearTimeout(timer);
      client.off(Events.Raw, onRaw);
      client.off(Events.MessageCreate, onMessage);
      client.decrementMaxListeners();
      client.decrementMaxListeners();
      if (error) reject(error);
      else resolve(result);
    };
    const onReply = reply => {
      if (!reply.flags.has(MessageFlags.Loading)) {
        finish(null, reply);
        return;
      }
      placeholder = reply;
      wait(DEFERRED_TIMEOUT, () => finish(null, placeholder));
    };
    // The messageUpdate event only fires for cached messages, so edits are read from the packet.
    const onEdit = data => {
      if (placeholder?.id === data.id) {
        if (!(data.flags & MessageFlags.Loading)) finish(null, placeholder.channel.messages._add(data, false));
        return;
      }
      if (message?.id !== data.id) return;
      const updated = client.channels.cache.get(data.channel_id)?.messages._add(data, false);
      if (!updated) return;
      if (acknowledged) finish(null, updated);
      else edited = updated;
    };
    const ours = data => data.nonce === nonce || (interactionId !== null && data.id === interactionId);
    const onRaw = ({ t: event, d: data }) => {
      switch (event) {
        case 'INTERACTION_CREATE':
          if (data.nonce !== nonce) return;
          interactionId = data.id;
          if (early.has(interactionId)) onReply(early.get(interactionId));
          early.clear();
          break;
        case 'INTERACTION_SUCCESS':
          if (acknowledged || !ours(data)) return;
          interactionId ??= data.id;
          acknowledged = true;
          if (edited) finish(null, edited);
          else if (!placeholder) wait(SUCCESS_GRACE, () => finish(null, null));
          break;
        case 'INTERACTION_FAILURE':
          if (ours(data)) finish(new DiscordjsError(ErrorCodes.InteractionFailed, data.reason_code));
          break;
        case 'INTERACTION_MODAL_CREATE':
          if (ours(data)) finish(null, new Modal(client, data));
          break;
        case 'MESSAGE_UPDATE':
          onEdit(data);
          break;
        default:
      }
    };
    const onMessage = reply => {
      const id = reply.interactionMetadata?.id;
      if (!id) return;
      if (id === interactionId) onReply(reply);
      else if (interactionId === null) early.set(id, reply);
    };

    wait(RESPONSE_TIMEOUT, () => finish(new DiscordjsError(ErrorCodes.InteractionTimeout)));
    client.incrementMaxListeners();
    client.incrementMaxListeners();
    client.on(Events.Raw, onRaw);
    client.on(Events.MessageCreate, onMessage);

    const sessionId = client.ws.shards.first()?.sessionInfo?.sessionId;
    client.rest
      .post('/interactions', { body: { ...body, nonce, session_id: sessionId } })
      .catch(error => finish(error));
  });
}

/**
 * Runs another application's slash command in a channel.
 * @param {TextBasedChannels} channel The channel
 * @param {UserResolvable} bot The bot, or its application id
 * @param {string} command The command name, with its subcommand group and subcommand if any
 * @param {Array<*>} args The option values
 * @returns {Promise<?(Message|Modal)>}
 * @private
 */
async function sendSlash(channel, bot, command, args) {
  const botId = channel.client.users.resolveId(bot);
  if (!botId) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'bot', 'UserResolvable');
  if (typeof command !== 'string' || !command.trim()) {
    throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'command', 'non-empty string');
  }
  const [name, ...path] = command.trim().split(/\s+/);
  const found = await findApplication(channel.client, channel, botId);
  if (!found) throw new DiscordjsError(ErrorCodes.InteractionApplicationNotFound, botId);
  const slash = found.commands.find(
    candidate => candidate.type === ApplicationCommandType.ChatInput && candidate.name === name,
  );
  if (!slash) throw new DiscordjsError(ErrorCodes.InteractionCommandNotFound, command.trim());
  return sendInteraction(channel.client, {
    type: InteractionType.ApplicationCommand,
    application_id: found.application.id,
    guild_id: channel.guildId ?? undefined,
    channel_id: channel.id,
    data: buildCommandData(slash, path, args),
    analytics_location: 'slash_ui',
  });
}

/**
 * The application behind a message's components. Interaction replies name it; other bot messages only name the bot
 * user, whose id is not the application id for old bots, so the command index is asked.
 * @param {Message} message The message
 * @returns {Promise<Snowflake>}
 * @private
 */
async function applicationIdOf(message) {
  if (message.applicationId) return message.applicationId;
  const found =
    message.channel && (await findApplication(message.client, message.channel, message.author.id).catch(() => null));
  return found?.application.id ?? message.author.id;
}

function findUsableComponent(message, component, types) {
  const customId = typeof component === 'string' ? component : component?.customId;
  const found = customId ? message.resolveComponent(customId) : null;
  if (!types.includes(found?.type) || found.disabled) {
    throw new DiscordjsError(ErrorCodes.InteractionComponentNotFound, customId);
  }
  return found;
}

async function sendComponent(message, data) {
  return sendInteraction(
    message.client,
    {
      type: InteractionType.MessageComponent,
      application_id: await applicationIdOf(message),
      guild_id: message.guildId ?? undefined,
      channel_id: message.channelId,
      message_id: message.id,
      message_flags: message.flags.bitfield,
      data,
    },
    { message },
  );
}

/**
 * Clicks a button on a message.
 * @param {Message} message The message
 * @param {string|ButtonComponent} button The button, or its custom id
 * @returns {Promise<?(Message|Modal)>}
 * @private
 */
async function clickButton(message, button) {
  const component = findUsableComponent(message, button, [ComponentType.Button]);
  return sendComponent(message, { component_type: ComponentType.Button, custom_id: component.customId });
}

/**
 * Chooses values in a select menu on a message.
 * @param {Message} message The message
 * @param {string|BaseSelectMenuComponent} menu The select menu, or its custom id
 * @param {Array<string|{ id: Snowflake }>} values The option values, or the ids of users, roles and channels
 * @returns {Promise<?(Message|Modal)>}
 * @private
 */
async function selectMenu(message, menu, values) {
  const component = findUsableComponent(message, menu, SelectMenuTypes);
  if (!Array.isArray(values)) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'values', 'Array');
  const resolved = values.map(value => (typeof value === 'string' ? value : value?.id));
  const min = component.minValues ?? 1;
  const max = component.maxValues ?? 1;
  if (resolved.length < min || resolved.length > max || resolved.some(value => typeof value !== 'string')) {
    throw new DiscordjsRangeError(ErrorCodes.InteractionSelectValues, `choose ${min} to ${max} of them`);
  }
  const unknown =
    component.type === ComponentType.StringSelect &&
    resolved.find(value => !component.options.some(option => option.value === value));
  if (unknown) throw new DiscordjsRangeError(ErrorCodes.InteractionSelectValues, `"${unknown}" is not an option`);
  return sendComponent(message, {
    component_type: component.type,
    custom_id: component.customId,
    type: component.type,
    values: resolved,
  });
}

function fillModalComponent(component, values) {
  if (component.components) {
    const children = component.components.map(child => fillModalComponent(child, values)).filter(Boolean);
    return children.length ? { type: component.type, components: children } : null;
  }
  if (component.component) {
    const inner = fillModalComponent(component.component, values);
    return inner && { type: component.type, component: inner };
  }
  // Text displays and other components without a custom id are not part of the submission.
  if (!component.custom_id) return null;
  const value = values[component.custom_id];
  if (SelectMenuTypes.includes(component.type)) {
    return { type: component.type, custom_id: component.custom_id, values: value === undefined ? [] : [value].flat() };
  }
  return { type: component.type, custom_id: component.custom_id, value: value ?? component.value ?? '' };
}

/**
 * Submits a modal an application opened.
 * @param {Modal} modal The modal
 * @param {Object<string, string|string[]>} values The input values keyed by custom id
 * @returns {Promise<?(Message|Modal)>}
 * @private
 */
async function submitModal(modal, values) {
  if (!isPlainObject(values)) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'values', 'object');
  return sendInteraction(modal.client, {
    type: InteractionType.ModalSubmit,
    application_id: modal.applicationId,
    guild_id: modal.channel?.guildId ?? undefined,
    channel_id: modal.channelId,
    data: {
      id: modal.id,
      custom_id: modal.customId,
      components: modal.components.map(component => fillModalComponent(component, values)).filter(Boolean),
    },
  });
}

module.exports = { clickButton, selectMenu, sendSlash, submitModal };
