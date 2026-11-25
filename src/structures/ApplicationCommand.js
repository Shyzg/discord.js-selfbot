'use strict';

const { DiscordSnowflake } = require('@sapphire/snowflake');
const { ApplicationCommandOptionType } = require('discord-api-types/v10');
const Base = require('./Base');
const PermissionsBitField = require('../util/PermissionsBitField');

/**
 * Represents an application command.
 * @extends {Base}
 */
class ApplicationCommand extends Base {
  constructor(client, data, guild, guildId) {
    super(client);

    /**
     * The command's id
     * @type {Snowflake}
     */
    this.id = data.id;

    /**
     * The parent application's id
     * @type {Snowflake}
     */
    this.applicationId = data.application_id;

    /**
     * The guild this command is part of
     * @type {?Guild}
     */
    this.guild = guild ?? null;

    /**
     * The guild's id this command is part of, this may be non-null when `guild` is `null` if the command
     * was fetched without its guild
     * @type {?Snowflake}
     */
    this.guildId = guild?.id ?? guildId ?? null;

    /**
     * The type of this application command
     * @type {ApplicationCommandType}
     */
    this.type = data.type;

    /**
     * Whether this command is age-restricted (18+)
     * @type {boolean}
     */
    this.nsfw = data.nsfw ?? false;

    this._patch(data);
  }

  _patch(data) {
    if ('name' in data) {
      /**
       * The name of this command
       * @type {string}
       */
      this.name = data.name;
    }

    if ('name_localizations' in data) {
      /**
       * The name localizations for this command
       * @type {?LocalizationMap}
       */
      this.nameLocalizations = data.name_localizations;
    } else {
      this.nameLocalizations ??= null;
    }

    if ('name_localized' in data) {
      /**
       * The localized name for this command
       * @type {?string}
       */
      this.nameLocalized = data.name_localized;
    } else {
      this.nameLocalized ??= null;
    }

    if ('description' in data) {
      /**
       * The description of this command
       * @type {string}
       */
      this.description = data.description;
    }

    if ('description_localizations' in data) {
      /**
       * The description localizations for this command
       * @type {?LocalizationMap}
       */
      this.descriptionLocalizations = data.description_localizations;
    } else {
      this.descriptionLocalizations ??= null;
    }

    if ('description_localized' in data) {
      /**
       * The localized description for this command
       * @type {?string}
       */
      this.descriptionLocalized = data.description_localized;
    } else {
      this.descriptionLocalized ??= null;
    }

    if ('options' in data) {
      /**
       * The options of this command
       * @type {ApplicationCommandOption[]}
       */
      this.options = data.options.map(option => this.constructor.transformOption(option));
    } else {
      this.options ??= [];
    }

    if ('default_member_permissions' in data) {
      /**
       * The default bitfield used to determine whether this command be used in a guild
       * @type {?Readonly<PermissionsBitField>}
       */
      this.defaultMemberPermissions = data.default_member_permissions
        ? new PermissionsBitField(BigInt(data.default_member_permissions)).freeze()
        : null;
    } else {
      this.defaultMemberPermissions ??= null;
    }

    if ('dm_permission' in data) {
      /**
       * Whether the command can be used in DMs
       * <info>This property is always `null` on guild commands</info>
       * @type {?boolean}
       * @deprecated Use {@link ApplicationCommand#contexts} instead.
       */
      this.dmPermission = data.dm_permission;
    } else {
      this.dmPermission ??= null;
    }

    if ('integration_types' in data) {
      /**
       * Installation context(s) where the command is available
       * <info>Only for globally-scoped commands</info>
       * @type {?ApplicationIntegrationType[]}
       */
      this.integrationTypes = data.integration_types;
    } else {
      this.integrationTypes ??= null;
    }

    if ('contexts' in data) {
      /**
       * Interaction context(s) where the command can be used
       * <info>Only for globally-scoped commands</info>
       * @type {?InteractionContextType[]}
       */
      this.contexts = data.contexts;
    } else {
      this.contexts ??= null;
    }

    if ('handler' in data) {
      /**
       * Determines whether the interaction is handled by the app's interactions handler or by Discord.
       * <info>Only available for {@link ApplicationCommandType.PrimaryEntryPoint} commands on
       * applications with the {@link ApplicationFlags.Embedded} flag (i.e, those that have an Activity)</info>
       * @type {?EntryPointCommandHandlerType}
       */
      this.handler = data.handler;
    } else {
      this.handler ??= null;
    }

    if ('version' in data) {
      /**
       * Autoincrementing version identifier updated during substantial record changes
       * @type {Snowflake}
       */
      this.version = data.version;
    }
  }

  /**
   * The timestamp the command was created at
   * @type {number}
   * @readonly
   */
  get createdTimestamp() {
    return DiscordSnowflake.timestampFrom(this.id);
  }

  /**
   * The time the command was created at
   * @type {Date}
   * @readonly
   */
  get createdAt() {
    return new Date(this.createdTimestamp);
  }

  /**
   * Data for creating or editing an application command.
   * @typedef {Object} ApplicationCommandData
   * @property {string} name The name of the command, must be in all lowercase if type is
   * {@link ApplicationCommandType.ChatInput}
   * @property {LocalizationMap} [nameLocalizations] The localizations for the command name
   * @property {string} description The description of the command,
   * if type is {@link ApplicationCommandType.ChatInput} or {@link ApplicationCommandType.PrimaryEntryPoint}
   * @property {boolean} [nsfw] Whether the command is age-restricted
   * @property {LocalizationMap} [descriptionLocalizations] The localizations for the command description,
   * if type is {@link ApplicationCommandType.ChatInput} or {@link ApplicationCommandType.PrimaryEntryPoint}
   * @property {ApplicationCommandType} [type=ApplicationCommandType.ChatInput] The type of the command
   * @property {ApplicationCommandOptionData[]} [options] Options for the command
   * @property {?PermissionResolvable} [defaultMemberPermissions] The bitfield used to determine the default permissions
   * a member needs in order to run the command
   * @property {boolean} [dmPermission] Whether the command is enabled in DMs
   * @property {ApplicationIntegrationType[]} [integrationTypes] Installation contexts where the command is available
   * @property {InteractionContextType[]} [contexts] Interaction contexts where the command can be used
   * @property {EntryPointCommandHandlerType} [handler] Whether the interaction is handled by the app's
   * interactions handler or by Discord.
   */

  /**
   * An option for an application command or subcommand.
   * <info>In addition to the listed properties, when used as a parameter,
   * API style `snake_case` properties can be used for compatibility with generators like `@discordjs/builders`.</info>
   * <warn>Note that providing a value for the `camelCase` counterpart for any `snake_case` property
   * will discard the provided `snake_case` property.</warn>
   * @typedef {Object} ApplicationCommandOptionData
   * @property {ApplicationCommandOptionType} type The type of the option
   * @property {string} name The name of the option
   * @property {LocalizationMap} [nameLocalizations] The name localizations for the option
   * @property {string} description The description of the option
   * @property {LocalizationMap} [descriptionLocalizations] The description localizations for the option
   * @property {boolean} [autocomplete] Whether the autocomplete interaction is enabled for a
   * {@link ApplicationCommandOptionType.String}, {@link ApplicationCommandOptionType.Integer} or
   * {@link ApplicationCommandOptionType.Number} option
   * @property {boolean} [required] Whether the option is required
   * @property {ApplicationCommandOptionChoiceData[]} [choices] The choices of the option for the user to pick from
   * @property {ApplicationCommandOptionData[]} [options] Additional options if this option is a subcommand (group)
   * @property {ChannelType[]} [channelTypes] When the option type is channel,
   * the allowed types of channels that can be selected
   * @property {FileUploadType[]} [fileTypes] When the option type is attachment,
   * the allowed types of files that can be uploaded. When only using extensions, include `.jpg`
   * for images and both `.mp4` and `.mov` for videos for mobile compatibility
   * @property {number} [minValue] The minimum value for an {@link ApplicationCommandOptionType.Integer} or
   * {@link ApplicationCommandOptionType.Number} option
   * @property {number} [maxValue] The maximum value for an {@link ApplicationCommandOptionType.Integer} or
   * {@link ApplicationCommandOptionType.Number} option
   * @property {number} [minLength] The minimum length for an {@link ApplicationCommandOptionType.String} option
   * (maximum of `6000`)
   * @property {number} [maxLength] The maximum length for an {@link ApplicationCommandOptionType.String} option
   * (maximum of `6000`)
   */

  /**
   * @typedef {Object} ApplicationCommandOptionChoiceData
   * @property {string} name The name of the choice
   * @property {LocalizationMap} [nameLocalizations] The localized names for this choice
   * @property {string|number} value The value of the choice
   */

  /**
   * An option for an application command or subcommand.
   * @typedef {Object} ApplicationCommandOption
   * @property {ApplicationCommandOptionType} type The type of the option
   * @property {string} name The name of the option
   * @property {LocalizationMap} [nameLocalizations] The localizations for the option name
   * @property {string} [nameLocalized] The localized name for this option
   * @property {string} description The description of the option
   * @property {LocalizationMap} [descriptionLocalizations] The localizations for the option description
   * @property {string} [descriptionLocalized] The localized description for this option
   * @property {boolean} [required] Whether the option is required
   * @property {boolean} [autocomplete] Whether the autocomplete interaction is enabled for a
   * {@link ApplicationCommandOptionType.String}, {@link ApplicationCommandOptionType.Integer} or
   * {@link ApplicationCommandOptionType.Number} option
   * @property {ApplicationCommandOptionChoice[]} [choices] The choices of the option for the user to pick from
   * @property {ApplicationCommandOption[]} [options] Additional options if this option is a subcommand (group)
   * @property {ApplicationCommandOptionAllowedChannelTypes[]} [channelTypes] When the option type is channel,
   * the allowed types of channels that can be selected
   * @property {FileUploadType[]} [fileTypes] When the option type is attachment,
   * the allowed types of files that can be uploaded. When only using extensions, include `.jpg`
   * for images and both `.mp4` and `.mov` for videos for mobile compatibility
   * @property {number} [minValue] The minimum value for an {@link ApplicationCommandOptionType.Integer} or
   * {@link ApplicationCommandOptionType.Number} option
   * @property {number} [maxValue] The maximum value for an {@link ApplicationCommandOptionType.Integer} or
   * {@link ApplicationCommandOptionType.Number} option
   * @property {number} [minLength] The minimum length for an {@link ApplicationCommandOptionType.String} option
   * (maximum of `6000`)
   * @property {number} [maxLength] The maximum length for an {@link ApplicationCommandOptionType.String} option
   * (maximum of `6000`)
   */

  /**
   * A choice for an application command option.
   * @typedef {Object} ApplicationCommandOptionChoice
   * @property {string} name The name of the choice
   * @property {?string} nameLocalized The localized name of the choice in the provided locale, if any
   * @property {?Object<string, string>} [nameLocalizations] The localized names for this choice
   * @property {string|number} value The value of the choice
   */

  /**
   * Transforms a received API application command option into camelCase structure fields.
   * @param {APIApplicationCommandOption} option The raw option from Discord
   * @returns {ApplicationCommandOption}
   * @private
   */
  static transformOption(option) {
    return {
      type: option.type,
      name: option.name,
      nameLocalizations: option.nameLocalizations ?? option.name_localizations,
      nameLocalized: option.nameLocalized ?? option.name_localized,
      description: option.description,
      descriptionLocalizations: option.descriptionLocalizations ?? option.description_localizations,
      descriptionLocalized: option.descriptionLocalized ?? option.description_localized,
      required:
        option.required ??
        (option.type === ApplicationCommandOptionType.Subcommand ||
        option.type === ApplicationCommandOptionType.SubcommandGroup
          ? undefined
          : false),
      autocomplete: option.autocomplete,
      choices: option.choices?.map(choice => ({
        name: choice.name,
        nameLocalized: choice.nameLocalized ?? choice.name_localized,
        nameLocalizations: choice.nameLocalizations ?? choice.name_localizations,
        value: choice.value,
      })),
      options: option.options?.map(opt => this.transformOption(opt)),
      channelTypes: option.channelTypes ?? option.channel_types,
      fileTypes: option.fileTypes ?? option.file_types,
      minValue: option.minValue ?? option.min_value,
      maxValue: option.maxValue ?? option.max_value,
      minLength: option.minLength ?? option.min_length,
      maxLength: option.maxLength ?? option.max_length,
    };
  }
}

module.exports = ApplicationCommand;

/**
 * @external ApplicationCommandOptionAllowedChannelTypes
 * @see {@link https://discord.js.org/docs/packages/builders/stable/ApplicationCommandOptionAllowedChannelTypes:TypeAlias}
 */
