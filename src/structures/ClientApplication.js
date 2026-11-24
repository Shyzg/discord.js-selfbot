'use strict';

const Team = require('./Team');
const Application = require('./interfaces/Application');
const ApplicationFlagsBitField = require('../util/ApplicationFlagsBitField');
const PermissionsBitField = require('../util/PermissionsBitField');

/**
 * @typedef {Object} ClientApplicationInstallParams
 * @property {OAuth2Scopes[]} scopes Scopes that will be set upon adding this application
 * @property {Readonly<PermissionsBitField>} permissions Permissions that will be requested for the integrated role
 */

/**
 * Represents a client application.
 * @extends {Application}
 */
class ClientApplication extends Application {
  _patch(data) {
    super._patch(data);

    /**
     * The tags this application has (max of 5)
     * @type {string[]}
     */
    this.tags = data.tags ?? [];

    if ('install_params' in data) {
      /**
       * Settings for this application's default in-app authorization
       * @type {?ClientApplicationInstallParams}
       */
      this.installParams = {
        scopes: data.install_params.scopes,
        permissions: new PermissionsBitField(data.install_params.permissions).freeze(),
      };
    } else {
      this.installParams ??= null;
    }

    /**
     * OAuth2 installation parameters.
     * @typedef {Object} IntegrationTypesConfigurationParameters
     * @property {OAuth2Scopes[]} scopes Scopes that will be set upon adding this application
     * @property {Readonly<PermissionsBitField>} permissions Permissions that will be requested for the integrated role
     */

    /**
     * The application's supported installation context data.
     * @typedef {Object} IntegrationTypesConfigurationContext
     * @property {?IntegrationTypesConfigurationParameters} oauth2InstallParams
     * Scopes and permissions regarding the installation context
     */

    /**
     * The application's supported installation context data.
     * @typedef {Object} IntegrationTypesConfiguration
     * @property {IntegrationTypesConfigurationContext} [0] Scopes and permissions
     * regarding the guild-installation context
     * @property {IntegrationTypesConfigurationContext} [1] Scopes and permissions
     * regarding the user-installation context
     */

    if ('integration_types_config' in data) {
      /**
       * Default scopes and permissions for each supported installation context.
       * The keys are stringified variants of {@link ApplicationIntegrationType}.
       * @type {?IntegrationTypesConfiguration}
       */
      this.integrationTypesConfig = Object.fromEntries(
        Object.entries(data.integration_types_config).map(([key, config]) => {
          let oauth2InstallParams = null;
          if (config.oauth2_install_params) {
            oauth2InstallParams = {
              scopes: config.oauth2_install_params.scopes,
              permissions: new PermissionsBitField(config.oauth2_install_params.permissions).freeze(),
            };
          }

          const context = {
            oauth2InstallParams,
          };

          return [key, context];
        }),
      );
    } else {
      this.integrationTypesConfig ??= null;
    }

    if ('custom_install_url' in data) {
      /**
       * This application's custom installation URL
       * @type {?string}
       */
      this.customInstallURL = data.custom_install_url;
    } else {
      this.customInstallURL = null;
    }

    if ('flags' in data) {
      /**
       * The flags this application has
       * @type {ApplicationFlagsBitField}
       */
      this.flags = new ApplicationFlagsBitField(data.flags).freeze();
    }

    if ('approximate_guild_count' in data) {
      /**
       * An approximate amount of guilds this application is in.
       * @type {?number}
       */
      this.approximateGuildCount = data.approximate_guild_count;
    } else {
      this.approximateGuildCount ??= null;
    }

    if ('approximate_user_install_count' in data) {
      /**
       * An approximate amount of users that have installed this application.
       * @type {?number}
       */
      this.approximateUserInstallCount = data.approximate_user_install_count;
    } else {
      this.approximateUserInstallCount ??= null;
    }

    if ('approximate_user_authorization_count' in data) {
      /**
       * An approximate amount of users that have OAuth2 authorizations for this application.
       *
       * @type {?number}
       */
      this.approximateUserAuthorizationCount = data.approximate_user_authorization_count;
    } else {
      this.approximateUserAuthorizationCount ??= null;
    }

    if ('guild_id' in data) {
      /**
       * The id of the guild associated with this application.
       * @type {?Snowflake}
       */
      this.guildId = data.guild_id;
    } else {
      this.guildId ??= null;
    }

    if ('bot_require_code_grant' in data) {
      /**
       * If this application's bot requires a code grant when using the OAuth2 flow
       * @type {?boolean}
       */
      this.botRequireCodeGrant = data.bot_require_code_grant;
    } else {
      this.botRequireCodeGrant ??= null;
    }

    if ('bot' in data) {
      /**
       * The bot associated with this application.
       * @type {?User}
       */
      this.bot = this.client.users._add(data.bot);
    } else {
      this.bot ??= null;
    }

    if ('bot_public' in data) {
      /**
       * If this application's bot is public
       * @type {?boolean}
       */
      this.botPublic = data.bot_public;
    } else {
      this.botPublic ??= null;
    }

    if ('interactions_endpoint_url' in data) {
      /**
       * This application's interaction endpoint URL.
       * @type {?string}
       */
      this.interactionsEndpointURL = data.interactions_endpoint_url;
    } else {
      this.interactionsEndpointURL ??= null;
    }

    if ('role_connections_verification_url' in data) {
      /**
       * This application's role connection verification entry point URL
       * @type {?string}
       */
      this.roleConnectionsVerificationURL = data.role_connections_verification_url;
    } else {
      this.roleConnectionsVerificationURL ??= null;
    }

    if ('event_webhooks_url' in data) {
      /**
       * This application's URL to receive event webhooks
       * @type {?string}
       */
      this.eventWebhooksURL = data.event_webhooks_url;
    } else {
      this.eventWebhooksURL ??= null;
    }

    if ('event_webhooks_status' in data) {
      /**
       * This application's event webhooks status
       * @type {?ApplicationWebhookEventStatus}
       */
      this.eventWebhooksStatus = data.event_webhooks_status;
    } else {
      this.eventWebhooksStatus ??= null;
    }

    if ('event_webhooks_types' in data) {
      /**
       * List of event webhooks types this application subscribes to
       * @type {?ApplicationWebhookEventType[]}
       */
      this.eventWebhooksTypes = data.event_webhooks_types;
    } else {
      this.eventWebhooksTypes ??= null;
    }

    /**
     * The owner of this OAuth application
     * @type {?(User|Team)}
     */
    this.owner = data.team
      ? new Team(this.client, data.team)
      : data.owner
        ? this.client.users._add(data.owner)
        : (this.owner ?? null);
  }

  /**
   * The guild associated with this application.
   * @type {?Guild}
   * @readonly
   */
  get guild() {
    return this.client.guilds.cache.get(this.guildId) ?? null;
  }

  /**
   * Whether this application is partial
   * @type {boolean}
   * @readonly
   */
  get partial() {
    return !this.name;
  }
}

module.exports = ClientApplication;
