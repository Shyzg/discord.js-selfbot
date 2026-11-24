import { EventEmitter } from 'node:events';
import { Stream } from 'node:stream';
import {
  AnyComponentBuilder,
  ApplicationCommandOptionAllowedChannelTypes,
  ActionRowBuilder as BuilderActionRow,
  ButtonBuilder as BuilderButtonComponent,
  ChannelSelectMenuBuilder as BuilderChannelSelectMenuComponent,
  MentionableSelectMenuBuilder as BuilderMentionableSelectMenuComponent,
  RoleSelectMenuBuilder as BuilderRoleSelectMenuComponent,
  StringSelectMenuBuilder as BuilderStringSelectMenuComponent,
  EmbedBuilder as BuildersEmbed,
  SelectMenuOptionBuilder as BuildersSelectMenuOption,
  UserSelectMenuBuilder as BuilderUserSelectMenuComponent,
  MessageActionRowComponentBuilder,
  type RestOrArray,
} from '@discordjs/builders';
import { Collection, ReadonlyCollection } from '@discordjs/collection';
import {
  blockQuote,
  bold,
  channelMention,
  codeBlock,
  formatEmoji,
  hideLinkEmbed,
  hyperlink,
  inlineCode,
  italic,
  quote,
  roleMention,
  spoiler,
  strikethrough,
  TimestampStyles,
  time,
  underscore,
  userMention,
} from '@discordjs/formatters';
import {
  BaseImageURLOptions,
  EmojiURLOptions,
  ImageSize,
  ImageURLOptions,
  RawFile,
  REST,
  RESTOptions,
} from '@discordjs/rest';
import { Awaitable, JSONEncodable } from '@discordjs/util';
import {
  IIdentifyThrottler,
  IShardingStrategy,
  SessionInfo,
  WebSocketManager as WSWebSocketManager,
} from '@discordjs/ws';
import {
  ActivityFlags,
  ActivityType,
  APIActionRowComponent,
  APIApplicationCommandInteractionData,
  APIApplicationCommandOption,
  APIAttachment,
  APIAuditLogChange,
  APIAuthorizingIntegrationOwnersMap,
  APIAutoModerationRule,
  APIButtonComponent,
  APIChannel,
  APIChannelSelectComponent,
  APIChatInputApplicationCommandInteractionData,
  APIComponentInActionRow,
  APIComponentInContainer,
  APIComponentInMessageActionRow,
  APIComponentInModalActionRow,
  APIContainerComponent,
  APIContextMenuInteractionData,
  APIEmbed,
  APIEmbedAuthor,
  APIEmbedField,
  APIEmbedFooter,
  APIEmbedImage,
  APIEmbedProvider,
  APIEmoji,
  APIFileComponent,
  APIGuildOnboardingPrompt,
  APIGuildOnboardingPromptOption,
  APIInteractionDataResolvedChannel,
  APIInteractionDataResolvedGuildMember,
  APIInviteRole,
  APILabelComponent,
  APIMediaGalleryComponent,
  APIMediaGalleryItem,
  APIMentionableSelectComponent,
  APIMessage,
  APIMessageComponent,
  APIMessageComponentEmoji,
  APIMessageSharedClientTheme,
  APIMessageTopLevelComponent,
  APIModalComponent,
  APIModalInteractionResponseCallbackData,
  APIOverwrite,
  APIPartialChannel,
  APIPartialEmoji,
  APIPartialGuild,
  APIPoll,
  APIPollAnswer,
  APIRole,
  APIRoleSelectComponent,
  APISectionComponent,
  APISelectMenuComponent,
  APISelectMenuDefaultValue,
  APISelectMenuOption,
  APISeparatorComponent,
  APISoundboardSound,
  APIStringSelectComponent,
  APITemplateSerializedSourceGuild,
  APITextDisplayComponent,
  APITextInputComponent,
  APIThumbnailComponent,
  APIUnfurledMediaItem,
  APIUser,
  APIUserSelectComponent,
  ApplicationCommandOptionType,
  ApplicationCommandPermissionType,
  ApplicationCommandType,
  ApplicationFlags,
  ApplicationIntegrationType,
  ApplicationWebhookEventStatus,
  ApplicationWebhookEventType,
  AttachmentFlags,
  AuditLogEvent,
  AuditLogOptionsType,
  AuditLogRuleTriggerType,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleKeywordPresetType,
  AutoModerationRuleTriggerType,
  BaseThemeType,
  ButtonStyle,
  ChannelFlags,
  ChannelType,
  ComponentType,
  EmbedType,
  EntryPointCommandHandlerType,
  FileUploadType,
  FormattingPatterns,
  ForumLayoutType,
  GatewayAutoModerationActionExecutionDispatchData,
  GatewayDispatchEvents,
  GatewayIntentBits,
  GatewayVoiceChannelEffectSendDispatchData,
  GatewayVoiceServerUpdateDispatchData,
  GatewayVoiceStateUpdateDispatchData,
  GuildDefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildFeature,
  GuildMemberFlags,
  GuildMFALevel,
  GuildNSFWLevel,
  GuildOnboardingMode,
  GuildOnboardingPromptType,
  GuildPremiumTier,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventRecurrenceRuleFrequency,
  GuildScheduledEventRecurrenceRuleMonth,
  GuildScheduledEventRecurrenceRuleWeekday,
  GuildScheduledEventStatus,
  GuildSystemChannelFlags,
  GuildVerificationLevel,
  GuildWidgetStyle,
  ImageFormat,
  IntegrationExpireBehavior,
  InteractionContextType,
  InteractionType,
  InviteFlags,
  InviteTargetType,
  InviteTargetUsersJobStatus,
  InviteType,
  Locale,
  LocalizationMap,
  MessageActivityType,
  MessageFlags,
  MessageReferenceType,
  MessageType,
  NameplatePalette,
  OAuth2Scopes,
  OverwriteType,
  PermissionFlagsBits,
  PollLayoutType,
  RESTGetAPIGuildOnboardingResult,
  RESTPostAPIApplicationCommandsJSONBody,
  ReactionType,
  RoleFlags,
  SelectMenuDefaultValueType,
  SeparatorSpacingSize,
  Snowflake,
  SortOrderType,
  StageInstancePrivacyLevel,
  StickerFormatType,
  StickerType,
  TeamMemberMembershipState,
  TeamMemberRole,
  TextChannelType,
  TextInputStyle,
  ThreadAutoArchiveDuration,
  ThreadMemberFlags,
  UserFlags,
  VideoQualityMode,
  VoiceChannelEffectSendAnimationType,
  WebhookType,
} from 'discord-api-types/v10';
import {
  RawActivityData,
  RawAnonymousGuildData,
  RawApplicationCommandData,
  RawApplicationData,
  RawBaseGuildData,
  RawChannelData,
  RawClientApplicationData,
  RawDMChannelData,
  RawEmojiData,
  RawGuildAuditLogData,
  RawGuildAuditLogEntryData,
  RawGuildBanData,
  RawGuildChannelData,
  RawGuildData,
  RawGuildEmojiData,
  RawGuildMemberData,
  RawGuildPreviewData,
  RawGuildScheduledEventData,
  RawGuildTemplateData,
  RawIntegrationApplicationData,
  RawIntegrationData,
  RawInviteData,
  RawInviteGuildData,
  RawInviteStageInstance,
  RawMessageData,
  RawMessagePayloadData,
  RawMessageReactionData,
  RawOAuth2GuildData,
  RawPartialGroupDMChannelData,
  RawPartialMessageData,
  RawPermissionOverwriteData,
  RawPresenceData,
  RawReactionEmojiData,
  RawRichPresenceAssets,
  RawRoleData,
  RawStageInstanceData,
  RawStickerData,
  RawStickerPackData,
  RawTeamData,
  RawTeamMemberData,
  RawThreadChannelData,
  RawThreadMemberData,
  RawTypingData,
  RawUserData,
  RawVoiceRegionData,
  RawVoiceStateData,
  RawWebhookData,
  RawWelcomeChannelData,
  RawWelcomeScreenData,
  RawWidgetData,
  RawWidgetMemberData,
} from './rawDataTypes.js';

//#region Classes

export class Activity {
  private constructor(presence: Presence, data?: RawActivityData);
  public readonly presence: Presence;
  public applicationId: Snowflake | null;
  public assets: RichPresenceAssets | null;
  public buttons: string[];
  public get createdAt(): Date;
  public createdTimestamp: number;
  public details: string | null;
  public emoji: Emoji | null;
  public flags: Readonly<ActivityFlagsBitField>;
  public name: string;
  public party: {
    id: string | null;
    size: [number, number];
  } | null;
  public state: string | null;
  public syncId: string | null;
  public timestamps: {
    start: Date | null;
    end: Date | null;
  } | null;
  public type: ActivityType;
  public url: string | null;
  public equals(activity: Activity): boolean;
  public toString(): string;
}

export type ActivityFlagsString = keyof typeof ActivityFlags;

export interface BaseComponentData {
  id?: number;
  type: ComponentType;
}

export type MessageActionRowComponentData =
  | JSONEncodable<APIComponentInMessageActionRow>
  | ButtonComponentData
  | StringSelectMenuComponentData
  | UserSelectMenuComponentData
  | RoleSelectMenuComponentData
  | MentionableSelectMenuComponentData
  | ChannelSelectMenuComponentData;

export type ModalActionRowComponentData = JSONEncodable<APIComponentInModalActionRow> | TextInputComponentData;

export type ActionRowComponentData = MessageActionRowComponentData | ModalActionRowComponentData;

export type ActionRowComponent = MessageActionRowComponent | ModalActionRowComponent;

export interface ActionRowData<ComponentType extends JSONEncodable<APIComponentInActionRow> | ActionRowComponentData>
  extends BaseComponentData {
  components: readonly ComponentType[];
}

export class ActionRowBuilder<
  ComponentType extends AnyComponentBuilder = AnyComponentBuilder,
> extends BuilderActionRow<ComponentType> {
  public constructor(
    data?: Partial<
      | ActionRowData<ActionRowComponentData | JSONEncodable<APIComponentInActionRow>>
      | APIActionRowComponent<APIComponentInMessageActionRow | APIComponentInModalActionRow>
    >,
  );
  public static from<ComponentType extends AnyComponentBuilder = AnyComponentBuilder>(
    other:
      | JSONEncodable<APIActionRowComponent<ReturnType<ComponentType['toJSON']>>>
      | APIActionRowComponent<ReturnType<ComponentType['toJSON']>>,
  ): ActionRowBuilder<ComponentType>;
}

export type ComponentInLabelData =
  | CheckboxComponentData
  | CheckboxGroupComponentData
  | RadioGroupComponentData
  | StringSelectMenuComponentData
  | TextInputComponentData
  | UserSelectMenuComponentData
  | ChannelSelectMenuComponentData
  | RoleSelectMenuComponentData
  | MentionableSelectMenuComponentData
  | FileUploadComponentData;

export interface LabelComponentData extends BaseComponentData {
  type: ComponentType.Label;
  component: ComponentInLabelData;
  description?: string;
  label: string;
}

export type MessageActionRowComponent =
  | ButtonComponent
  | StringSelectMenuComponent
  | UserSelectMenuComponent
  | RoleSelectMenuComponent
  | MentionableSelectMenuComponent
  | ChannelSelectMenuComponent;
export type ModalActionRowComponent = TextInputComponent;

export class ActionRow<ComponentType extends MessageActionRowComponent | ModalActionRowComponent> extends Component<
  APIActionRowComponent<APIComponentInMessageActionRow | APIComponentInModalActionRow>
> {
  private constructor(data: APIActionRowComponent<APIComponentInMessageActionRow | APIComponentInModalActionRow>);
  public readonly components: ComponentType[];
  public toJSON(): APIActionRowComponent<ReturnType<ComponentType['toJSON']>>;
}

export class ActivityFlagsBitField extends BitField<ActivityFlagsString> {
  public static Flags: typeof ActivityFlags;
  public static resolve(bit?: BitFieldResolvable<ActivityFlagsString, number>): number;
}

export abstract class AnonymousGuild extends BaseGuild {
  protected constructor(client: Client<true>, data: RawAnonymousGuildData, immediatePatch?: boolean);
  public banner: string | null;
  public description: string | null;
  public nsfwLevel: GuildNSFWLevel;
  public premiumSubscriptionCount: number | null;
  public splash: string | null;
  public vanityURLCode: string | null;
  public verificationLevel: GuildVerificationLevel;
  public bannerURL(options?: ImageURLOptions): string | null;
  public splashURL(options?: ImageURLOptions): string | null;
}

export class AutoModerationActionExecution {
  private constructor(data: GatewayAutoModerationActionExecutionDispatchData, guild: Guild);
  public guild: Guild;
  public action: AutoModerationAction;
  public ruleId: Snowflake;
  public ruleTriggerType: AutoModerationRuleTriggerType;
  public get user(): User | null;
  public userId: Snowflake;
  public get channel(): GuildTextBasedChannel | ForumChannel | MediaChannel | null;
  public channelId: Snowflake | null;
  public get member(): GuildMember | null;
  public messageId: Snowflake | null;
  public alertSystemMessageId: Snowflake | null;
  public content: string;
  public matchedKeyword: string | null;
  public matchedContent: string | null;
  public get autoModerationRule(): AutoModerationRule | null;
}

export class AutoModerationRule extends Base {
  private constructor(client: Client<true>, data: APIAutoModerationRule, guild: Guild);
  public id: Snowflake;
  public guild: Guild;
  public name: string;
  public creatorId: Snowflake;
  public eventType: AutoModerationRuleEventType;
  public triggerType: AutoModerationRuleTriggerType;
  public triggerMetadata: AutoModerationTriggerMetadata;
  public actions: AutoModerationAction[];
  public enabled: boolean;
  public exemptRoles: Collection<Snowflake, Role>;
  public exemptChannels: Collection<Snowflake, GuildBasedChannel>;
  public edit(options: AutoModerationRuleEditOptions): Promise<AutoModerationRule>;
  public delete(reason?: string): Promise<void>;
  public setName(name: string, reason?: string): Promise<AutoModerationRule>;
  public setEventType(eventType: AutoModerationRuleEventType, reason?: string): Promise<AutoModerationRule>;
  public setKeywordFilter(keywordFilter: readonly string[], reason?: string): Promise<AutoModerationRule>;
  public setRegexPatterns(regexPatterns: readonly string[], reason?: string): Promise<AutoModerationRule>;
  public setPresets(
    presets: readonly AutoModerationRuleKeywordPresetType[],
    reason?: string,
  ): Promise<AutoModerationRule>;
  public setAllowList(allowList: readonly string[], reason?: string): Promise<AutoModerationRule>;
  public setMentionTotalLimit(mentionTotalLimit: number, reason?: string): Promise<AutoModerationRule>;
  public setMentionRaidProtectionEnabled(
    mentionRaidProtectionEnabled: boolean,
    reason?: string,
  ): Promise<AutoModerationRule>;
  public setActions(actions: readonly AutoModerationActionOptions[], reason?: string): Promise<AutoModerationRule>;
  public setEnabled(enabled?: boolean, reason?: string): Promise<AutoModerationRule>;
  public setExemptRoles(
    roles: ReadonlyCollection<Snowflake, Role> | readonly RoleResolvable[],
    reason?: string,
  ): Promise<AutoModerationRule>;
  public setExemptChannels(
    channels: ReadonlyCollection<Snowflake, GuildBasedChannel> | readonly GuildChannelResolvable[],
    reason?: string,
  ): Promise<AutoModerationRule>;
}

export abstract class Application extends Base {
  protected constructor(client: Client<true>, data: RawApplicationData);
  public get createdAt(): Date;
  public get createdTimestamp(): number;
  public description: string | null;
  public icon: string | null;
  public id: Snowflake;
  public name: string | null;
  public termsOfServiceURL: string | null;
  public privacyPolicyURL: string | null;
  public rpcOrigins: string[];
  public cover: string | null;
  public verifyKey: string | null;
  public coverURL(options?: ImageURLOptions): string | null;
  public iconURL(options?: ImageURLOptions): string | null;
  public toJSON(): unknown;
  public toString(): string | null;
}

export class ApplicationCommand<PermissionsFetchType = {}> extends Base {
  private constructor(client: Client<true>, data: RawApplicationCommandData, guild?: Guild, guildId?: Snowflake);
  public applicationId: Snowflake;
  public contexts: InteractionContextType[] | null;
  public get createdAt(): Date;
  public get createdTimestamp(): number;
  public defaultMemberPermissions: Readonly<PermissionsBitField> | null;
  public description: string;
  public descriptionLocalizations: LocalizationMap | null;
  public descriptionLocalized: string | null;
  /** @deprecated Use {@link ApplicationCommand.contexts} instead */
  public dmPermission: boolean | null;
  public guild: Guild | null;
  public guildId: Snowflake | null;
  public id: Snowflake;
  public integrationTypes: ApplicationIntegrationType[] | null;
  public handler: EntryPointCommandHandlerType | null;
  public name: string;
  public nameLocalizations: LocalizationMap | null;
  public nameLocalized: string | null;
  public options: (ApplicationCommandOption & { nameLocalized?: string; descriptionLocalized?: string })[];
  public type: ApplicationCommandType;
  public version: Snowflake;
  public nsfw: boolean;
  public equals(
    command: ApplicationCommand | ApplicationCommandData | RawApplicationCommandData,
    enforceOptionOrder?: boolean,
  ): boolean;
  public static optionsEqual(
    existing: readonly ApplicationCommandOption[],
    options:
      | readonly ApplicationCommandOption[]
      | readonly ApplicationCommandOptionData[]
      | readonly APIApplicationCommandOption[],
    enforceOptionOrder?: boolean,
  ): boolean;
  private static _optionEquals(
    existing: ApplicationCommandOption,
    options: ApplicationCommandOption | ApplicationCommandOptionData | APIApplicationCommandOption,
    enforceOptionOrder?: boolean,
  ): boolean;
  private static transformOption(option: ApplicationCommandOptionData, received?: boolean): unknown;
  private static transformCommand(command: ApplicationCommandData): RESTPostAPIApplicationCommandsJSONBody;
  private static isAPICommandData(command: object): command is RESTPostAPIApplicationCommandsJSONBody;
}

export type ApplicationResolvable = Application | Activity | Snowflake;

export class ApplicationFlagsBitField extends BitField<ApplicationFlagsString> {
  public static Flags: typeof ApplicationFlags;
  public static resolve(bit?: BitFieldResolvable<ApplicationFlagsString, number>): number;
}

export type ApplicationFlagsResolvable = BitFieldResolvable<ApplicationFlagsString, number>;

export type AutoModerationRuleResolvable = AutoModerationRule | Snowflake;

export abstract class Base {
  public constructor(client: Client<true>);
  public readonly client: Client<true>;
  public toJSON(...props: Record<string, boolean | string>[]): unknown;
  public valueOf(): string;
}

export class BaseClient extends EventEmitter implements AsyncDisposable {
  public constructor(options?: ClientOptions | WebhookClientOptions);
  private decrementMaxListeners(): void;
  private incrementMaxListeners(): void;

  public options: ClientOptions | WebhookClientOptions;
  public rest: REST;
  public destroy(): void;
  public toJSON(...props: Record<string, boolean | string>[]): unknown;
  public [Symbol.asyncDispose](): Promise<void>;
}

export type GuildCacheMessage<Cached extends CacheType> = CacheTypeReducer<
  Cached,
  Message<true>,
  APIMessage,
  Message | APIMessage,
  Message | APIMessage
>;

export abstract class BaseGuild extends Base {
  protected constructor(client: Client<true>, data: RawBaseGuildData);
  public get createdAt(): Date;
  public get createdTimestamp(): number;
  public features: `${GuildFeature}`[];
  public icon: string | null;
  public id: Snowflake;
  public name: string;
  public get nameAcronym(): string;
  public get partnered(): boolean;
  public get verified(): boolean;
  public fetch(): Promise<Guild>;
  public iconURL(options?: ImageURLOptions): string | null;
  public toString(): string;
}

export class BaseGuildEmoji extends Emoji {
  protected constructor(client: Client<true>, data: RawGuildEmojiData, guild: Guild | GuildPreview);
  public imageURL(options?: EmojiURLOptions): string;
  public get url(): string;
  public available: boolean | null;
  public get createdAt(): Date;
  public get createdTimestamp(): number;
  public guild: Guild | GuildPreview;
  public id: Snowflake;
  public name: string;
  public animated: boolean;
  public managed: boolean;
  public requiresColons: boolean | null;
}

// tslint:disable-next-line no-empty-interface
export interface BaseGuildTextChannel extends TextBasedChannelFields<true> {}
export class BaseGuildTextChannel extends GuildChannel {
  protected constructor(guild: Guild, data?: RawGuildChannelData, client?: Client<true>, immediatePatch?: boolean);
  public defaultAutoArchiveDuration?: ThreadAutoArchiveDuration;
  public defaultThreadRateLimitPerUser: number | null;
  public rateLimitPerUser: number | null;
  public nsfw: boolean;
  public threads: GuildTextThreadManager<AllowedThreadTypeForTextChannel | AllowedThreadTypeForNewsChannel>;
  public topic: string | null;
  public createInvite(options?: InviteCreateOptions): Promise<Invite>;
  public fetchInvites(cache?: boolean): Promise<Collection<string, Invite>>;
  public setDefaultAutoArchiveDuration(
    defaultAutoArchiveDuration: ThreadAutoArchiveDuration,
    reason?: string,
  ): Promise<this>;
  public setTopic(topic: string | null, reason?: string): Promise<this>;
  public setType(type: ChannelType.GuildText, reason?: string): Promise<TextChannel>;
  public setType(type: ChannelType.GuildAnnouncement, reason?: string): Promise<NewsChannel>;
}

// tslint:disable-next-line no-empty-interface
export interface BaseGuildVoiceChannel extends Omit<TextBasedChannelFields<true>, 'lastPinTimestamp' | 'lastPinAt'> {}
export class BaseGuildVoiceChannel extends GuildChannel {
  public constructor(guild: Guild, data?: RawGuildChannelData);
  public bitrate: number;
  public get full(): boolean;
  public get joinable(): boolean;
  public get members(): Collection<Snowflake, GuildMember>;
  public nsfw: boolean;
  public rateLimitPerUser: number | null;
  public rtcRegion: string | null;
  public userLimit: number;
  public videoQualityMode: VideoQualityMode | null;
  public createInvite(options?: InviteCreateOptions): Promise<Invite>;
  public fetchInvites(cache?: boolean): Promise<Collection<string, Invite>>;
  public setBitrate(bitrate: number, reason?: string): Promise<this>;
  public setRTCRegion(rtcRegion: string | null, reason?: string): Promise<this>;
  public setUserLimit(userLimit: number, reason?: string): Promise<this>;
  public setVideoQualityMode(videoQualityMode: VideoQualityMode, reason?: string): Promise<this>;
}

export type EnumLike<Enum, Value> = Record<keyof Enum, Value>;

export class BitField<Flags extends string, Type extends number | bigint = number> {
  public constructor(bits?: BitFieldResolvable<Flags, Type>);
  public bitfield: Type;
  public add(...bits: BitFieldResolvable<Flags, Type>[]): BitField<Flags, Type>;
  public any(bit: BitFieldResolvable<Flags, Type>): boolean;
  public equals(bit: BitFieldResolvable<Flags, Type>): boolean;
  public freeze(): Readonly<BitField<Flags, Type>>;
  public has(bit: BitFieldResolvable<Flags, Type>): boolean;
  public missing(bits: BitFieldResolvable<Flags, Type>, ...hasParams: readonly unknown[]): Flags[];
  public remove(...bits: BitFieldResolvable<Flags, Type>[]): BitField<Flags, Type>;
  public serialize(...hasParams: readonly unknown[]): Record<Flags, boolean>;
  public toArray(...hasParams: readonly unknown[]): Flags[];
  public toJSON(): Type extends number ? number : string;
  public valueOf(): Type;
  public [Symbol.iterator](): IterableIterator<Flags>;
  public static Flags: EnumLike<unknown, number | bigint>;
  public static resolve(bit?: BitFieldResolvable<string, number | bigint>): number | bigint;
}

export type AnyComponent =
  | APIMessageComponent
  | APIModalComponent
  | APIActionRowComponent<APIComponentInMessageActionRow | APIComponentInModalActionRow>
  | AnyComponentV2;

export class Component<RawComponentData extends AnyComponent = AnyComponent> {
  public readonly data: Readonly<RawComponentData>;
  public get id(): RawComponentData['id'];
  public get type(): RawComponentData['type'];
  public toJSON(): RawComponentData;
  public equals(other: this | RawComponentData): boolean;
}

export type AnyComponentV2 = APIComponentInContainer | APIContainerComponent | APIThumbnailComponent;

export type TopLevelComponent =
  | ActionRow<MessageActionRowComponent>
  | ContainerComponent
  | FileComponent
  | MediaGalleryComponent
  | SectionComponent
  | SeparatorComponent
  | TextDisplayComponent;

export type TopLevelComponentData =
  | ActionRowData<MessageActionRowComponentData>
  | ContainerComponentData
  | FileComponentData
  | MediaGalleryComponentData
  | SectionComponentData
  | SeparatorComponentData
  | TextDisplayComponentData;

export class ButtonComponent extends Component<APIButtonComponent> {
  private constructor(data: APIButtonComponent);
  public get style(): ButtonStyle;
  public get label(): string | null;
  public get emoji(): APIMessageComponentEmoji | null;
  public get disabled(): boolean;
  public get customId(): string | null;
  public get url(): string | null;
}

export type ComponentEmojiResolvable = APIMessageComponentEmoji | string;

export class ButtonBuilder extends BuilderButtonComponent {
  public constructor(data?: Partial<ButtonComponentData> | Partial<APIButtonComponent>);
  public static from(other: JSONEncodable<APIButtonComponent> | APIButtonComponent): ButtonBuilder;
  public override setEmoji(emoji: ComponentEmojiResolvable): this;
}

export class StringSelectMenuBuilder extends BuilderStringSelectMenuComponent {
  public constructor(data?: Partial<StringSelectMenuComponentData | APIStringSelectComponent>);
  private static normalizeEmoji(
    selectMenuOption: JSONEncodable<APISelectMenuOption> | SelectMenuComponentOptionData,
  ): (APISelectMenuOption | StringSelectMenuOptionBuilder)[];
  public override addOptions(
    ...options: RestOrArray<BuildersSelectMenuOption | SelectMenuComponentOptionData | APISelectMenuOption>
  ): this;
  public override setOptions(
    ...options: RestOrArray<BuildersSelectMenuOption | SelectMenuComponentOptionData | APISelectMenuOption>
  ): this;
  public static from(
    other: JSONEncodable<APIStringSelectComponent> | APIStringSelectComponent,
  ): StringSelectMenuBuilder;
}

export {
  /** @deprecated Use {@link StringSelectMenuBuilder} instead */
  StringSelectMenuBuilder as SelectMenuBuilder,
  /** @deprecated Use {@link StringSelectMenuOptionBuilder} instead */
  StringSelectMenuOptionBuilder as SelectMenuOptionBuilder,
};

export class UserSelectMenuBuilder extends BuilderUserSelectMenuComponent {
  public constructor(data?: Partial<UserSelectMenuComponentData | APIUserSelectComponent>);
  public static from(other: JSONEncodable<APIUserSelectComponent> | APIUserSelectComponent): UserSelectMenuBuilder;
}

export class RoleSelectMenuBuilder extends BuilderRoleSelectMenuComponent {
  public constructor(data?: Partial<RoleSelectMenuComponentData | APIRoleSelectComponent>);
  public static from(other: JSONEncodable<APIRoleSelectComponent> | APIRoleSelectComponent): RoleSelectMenuBuilder;
}

export class MentionableSelectMenuBuilder extends BuilderMentionableSelectMenuComponent {
  public constructor(data?: Partial<MentionableSelectMenuComponentData | APIMentionableSelectComponent>);
  public static from(
    other: JSONEncodable<APIMentionableSelectComponent> | APIMentionableSelectComponent,
  ): MentionableSelectMenuBuilder;
}

export class ChannelSelectMenuBuilder extends BuilderChannelSelectMenuComponent {
  public constructor(data?: Partial<ChannelSelectMenuComponentData | APIChannelSelectComponent>);
  public static from(
    other: JSONEncodable<APIChannelSelectComponent> | APIChannelSelectComponent,
  ): ChannelSelectMenuBuilder;
}

export class StringSelectMenuOptionBuilder extends BuildersSelectMenuOption {
  public constructor(data?: SelectMenuComponentOptionData | APISelectMenuOption);
  public override setEmoji(emoji: ComponentEmojiResolvable): this;
  public static from(other: JSONEncodable<APISelectMenuOption> | APISelectMenuOption): StringSelectMenuOptionBuilder;
}

export class TextInputComponent extends Component<APITextInputComponent> {
  public get customId(): string;
  public get value(): string;
}

export class LabelComponent extends Component<APILabelComponent> {
  public component: StringSelectMenuComponent | TextInputComponent;
  public get label(): string;
  public get description(): string | null;
}

export class BaseSelectMenuComponent<Data extends APISelectMenuComponent> extends Component<Data> {
  protected constructor(data: Data);
  public get placeholder(): string | null;
  public get maxValues(): number | null;
  public get minValues(): number | null;
  public get customId(): string;
  public get disabled(): boolean;
}

export class StringSelectMenuComponent extends BaseSelectMenuComponent<APIStringSelectComponent> {
  public get options(): APISelectMenuOption[];
}

export {
  /** @deprecated Use {@link StringSelectMenuComponent} instead */
  StringSelectMenuComponent as SelectMenuComponent,
};

export class UserSelectMenuComponent extends BaseSelectMenuComponent<APIUserSelectComponent> {}

export class RoleSelectMenuComponent extends BaseSelectMenuComponent<APIRoleSelectComponent> {}

export class MentionableSelectMenuComponent extends BaseSelectMenuComponent<APIMentionableSelectComponent> {}

export class ChannelSelectMenuComponent extends BaseSelectMenuComponent<APIChannelSelectComponent> {
  public getChannelTypes(): ChannelType[] | null;
}

export interface EmbedData {
  title?: string;
  type?: EmbedType;
  description?: string;
  url?: string;
  timestamp?: string | number | Date;
  color?: number;
  footer?: EmbedFooterData;
  image?: EmbedAssetData;
  thumbnail?: EmbedAssetData;
  provider?: APIEmbedProvider;
  author?: EmbedAuthorData;
  fields?: readonly APIEmbedField[];
  video?: EmbedAssetData;
}

export interface IconData {
  iconURL?: string;
  proxyIconURL?: string;
}

export interface EmbedAuthorData extends Omit<APIEmbedAuthor, 'icon_url' | 'proxy_icon_url'>, IconData {}

export interface EmbedFooterData extends Omit<APIEmbedFooter, 'icon_url' | 'proxy_icon_url'>, IconData {}

export interface EmbedAssetData extends Omit<APIEmbedImage, 'proxy_url'> {
  proxyURL?: string;
}

export class EmbedBuilder extends BuildersEmbed {
  public constructor(data?: EmbedData | APIEmbed);
  public override setColor(color: ColorResolvable | null): this;
  public static from(other: JSONEncodable<APIEmbed> | APIEmbed): EmbedBuilder;
  public get length(): number;
}

export class Embed {
  private constructor(data: APIEmbed);
  public readonly data: Readonly<APIEmbed>;
  public get fields(): APIEmbedField[];
  public get footer(): EmbedFooterData | null;
  public get title(): string | null;
  public get description(): string | null;
  public get url(): string | null;
  public get color(): number | null;
  public get hexColor(): string | null;
  public get timestamp(): string | null;
  public get thumbnail(): EmbedAssetData | null;
  public get image(): EmbedAssetData | null;
  public get author(): EmbedAuthorData | null;
  public get provider(): APIEmbedProvider | null;
  public get video(): EmbedAssetData | null;
  public get length(): number;
  public equals(other: Embed | APIEmbed): boolean;
  public toJSON(): APIEmbed;
}

export interface MappedChannelCategoryTypes {
  [ChannelType.GuildAnnouncement]: NewsChannel;
  [ChannelType.GuildVoice]: VoiceChannel;
  [ChannelType.GuildText]: TextChannel;
  [ChannelType.GuildStageVoice]: StageChannel;
  [ChannelType.GuildForum]: ForumChannel;
  [ChannelType.GuildMedia]: MediaChannel;
}

export type CategoryChannelType = Exclude<
  ChannelType,
  | ChannelType.DM
  | ChannelType.GroupDM
  | ChannelType.PublicThread
  | ChannelType.AnnouncementThread
  | ChannelType.PrivateThread
  | ChannelType.GuildCategory
  | ChannelType.GuildDirectory
>;

export class CategoryChannel extends GuildChannel {
  public get children(): CategoryChannelChildManager;
  public type: ChannelType.GuildCategory;
  public get parent(): null;
  public parentId: null;
}

export type CategoryChannelResolvable = Snowflake | CategoryChannel;

export type ChannelFlagsString = keyof typeof ChannelFlags;

export type ChannelFlagsResolvable = BitFieldResolvable<ChannelFlagsString, number>;

export class ChannelFlagsBitField extends BitField<ChannelFlagsString> {
  public static Flags: typeof ChannelFlags;
  public static resolve(bit?: BitFieldResolvable<ChannelFlagsString, ChannelFlags>): number;
}

export abstract class BaseChannel extends Base {
  public constructor(client: Client<true>, data?: RawChannelData, immediatePatch?: boolean);
  public get createdAt(): Date | null;
  public get createdTimestamp(): number | null;
  public id: Snowflake;
  public flags: Readonly<ChannelFlagsBitField> | null;
  public permissions: Readonly<PermissionsBitField> | null;
  public appPermissions: Readonly<PermissionsBitField> | null;
  public get partial(): false;
  public type: ChannelType;
  public get url(): string;
  public delete(): Promise<this>;
  public fetch(force?: boolean): Promise<this>;
  public isThread(): this is AnyThreadChannel;
  public isTextBased(): this is TextBasedChannel;
  public isDMBased(): this is PartialGroupDMChannel | DMChannel | PartialDMChannel;
  public isVoiceBased(): this is VoiceBasedChannel;
  public isThreadOnly(): this is ThreadOnlyChannel;
  public isSendable(): this is SendableChannels;
  public toString(): ChannelMention | UserMention;
}

export type If<Value extends boolean, TrueResult, FalseResult = null> = Value extends true
  ? TrueResult
  : Value extends false
    ? FalseResult
    : TrueResult | FalseResult;

/** @internal */
type AsyncEventIteratorDisposability =
  ReturnType<typeof EventEmitter.on> extends AsyncDisposable ? AsyncDisposable : {};
/** @internal */
interface AsyncEventIterator<Params extends any[]>
  extends AsyncIterableIterator<Params>,
    AsyncEventIteratorDisposability {
  [Symbol.asyncIterator](): AsyncEventIterator<Params>;
}

export class Client<Ready extends boolean = boolean> extends BaseClient {
  public constructor(options: ClientOptions);
  private actions: unknown;
  private presence: ClientPresence;
  private _validateOptions(options: ClientOptions): void;
  private get _censoredToken(): string | null;
  // This a technique used to brand the ready state. Or else we'll get `never` errors on typeguard checks.
  private readonly _ready: Ready;

  // Override inherited static EventEmitter methods, with added type checks for Client events.
  public static once<Emitter extends EventEmitter, Event extends keyof ClientEvents>(
    eventEmitter: Emitter,
    eventName: Emitter extends Client ? Event : string | symbol,
    options?: { signal?: AbortSignal | undefined },
  ): Promise<Emitter extends Client ? ClientEvents[Event] : any[]>;
  public static on<Emitter extends EventEmitter, Event extends keyof ClientEvents>(
    eventEmitter: Emitter,
    eventName: Emitter extends Client ? Event : string | symbol,
    options?: { signal?: AbortSignal | undefined },
  ): AsyncEventIterator<Emitter extends Client ? ClientEvents[Event] : any[]>;

  public application: If<Ready, ClientApplication | null, null>;
  public channels: ChannelManager;
  public get emojis(): BaseGuildEmojiManager;
  public guilds: GuildManager;
  public options: Omit<ClientOptions, 'intents'> & { intents: IntentsBitField };
  public get readyAt(): If<Ready, Date>;
  public readyTimestamp: If<Ready, number>;
  public sweepers: Sweepers;
  public token: If<Ready, string, string | null>;
  public get uptime(): If<Ready, number>;
  public user: If<Ready, ClientUser>;
  public users: UserManager;
  public voice: ClientVoiceManager;
  public ws: WebSocketManager;
  public destroy(): Promise<void>;
  public deleteWebhook(id: Snowflake, options?: WebhookDeleteOptions): Promise<void>;
  public fetchGuildPreview(guild: GuildResolvable): Promise<GuildPreview>;
  public fetchInvite(invite: InviteResolvable, options?: ClientFetchInviteOptions): Promise<Invite>;
  public fetchGuildTemplate(template: GuildTemplateResolvable): Promise<GuildTemplate>;
  public fetchVoiceRegions(): Promise<Collection<string, VoiceRegion>>;
  public fetchSticker(id: Snowflake): Promise<Sticker>;
  public fetchStickerPacks(options: { packId: Snowflake }): Promise<StickerPack>;
  public fetchStickerPacks(options?: StickerPackFetchOptions): Promise<Collection<Snowflake, StickerPack>>;
  /** @deprecated Use {@link Client.fetchStickerPacks} instead. */
  public fetchPremiumStickerPacks(): ReturnType<Client['fetchStickerPacks']>;
  public fetchWebhook(id: Snowflake, token?: string): Promise<Webhook>;
  public fetchGuildWidget(guild: GuildResolvable): Promise<Widget>;
  public login(token?: string): Promise<string>;
  public normalLogin(
    login: string,
    password: string,
    options?: {
      totpSecret?: string;
      captcha?: (challenge: {
        captcha_sitekey: string;
        captcha_service: string;
        captcha_rqtoken?: string;
        captcha_rqdata?: string;
        captcha_session_id?: string;
      }) => Awaitable<string>;
      mfa?: (context: {
        ticket: string;
        totp: boolean;
        sms: boolean;
        backup: boolean;
        webauthn: boolean;
        sendSms(): Promise<unknown>;
      }) => Awaitable<{ method: 'totp' | 'sms' | 'backup'; code: string }>;
    },
  ): Promise<string>;
  public QRLogin(handlers?: {
    onQRCode?: (url: string) => Awaitable<void>;
    onUserData?: (user: {
      id: string;
      username: string;
      discriminator: string;
      avatar: string;
      raw: string;
    }) => Awaitable<void>;
  }): Promise<string>;
  public passkeyLogin(passkey: {
    credentialId: string;
    privateKey: string | import('node:crypto').KeyObject;
    userHandle: string;
  }): Promise<string>;
  public isReady(): this is Client<true>;
  public toJSON(): unknown;

  public on<Event extends keyof ClientEvents>(event: Event, listener: (...args: ClientEvents[Event]) => void): this;
  public on<Event extends string | symbol>(
    event: Exclude<Event, keyof ClientEvents>,
    listener: (...args: any[]) => void,
  ): this;

  public once<Event extends keyof ClientEvents>(event: Event, listener: (...args: ClientEvents[Event]) => void): this;
  public once<Event extends string | symbol>(
    event: Exclude<Event, keyof ClientEvents>,
    listener: (...args: any[]) => void,
  ): this;

  public emit<Event extends keyof ClientEvents>(event: Event, ...args: ClientEvents[Event]): boolean;
  public emit<Event extends string | symbol>(event: Exclude<Event, keyof ClientEvents>, ...args: unknown[]): boolean;

  public off<Event extends keyof ClientEvents>(event: Event, listener: (...args: ClientEvents[Event]) => void): this;
  public off<Event extends string | symbol>(
    event: Exclude<Event, keyof ClientEvents>,
    listener: (...args: any[]) => void,
  ): this;

  public removeAllListeners<Event extends keyof ClientEvents>(event?: Event): this;
  public removeAllListeners<Event extends string | symbol>(event?: Exclude<Event, keyof ClientEvents>): this;
}

export interface StickerPackFetchOptions {
  packId?: Snowflake;
}

export class ClientApplication extends Application {
  private constructor(client: Client<true>, data: RawClientApplicationData);
  public botPublic: boolean | null;
  public botRequireCodeGrant: boolean | null;
  public bot: User | null;
  public guildId: Snowflake | null;
  public get guild(): Guild | null;
  public flags: Readonly<ApplicationFlagsBitField>;
  public approximateGuildCount: number | null;
  public approximateUserInstallCount: number | null;
  public approximateUserAuthorizationCount: number | null;
  public tags: string[];
  public installParams: ClientApplicationInstallParams | null;
  public integrationTypesConfig: IntegrationTypesConfiguration | null;
  public customInstallURL: string | null;
  public owner: User | Team | null;
  public get partial(): boolean;
  public interactionsEndpointURL: string | null;
  public eventWebhooksURL: string | null;
  public eventWebhooksStatus: ApplicationWebhookEventStatus | null;
  public eventWebhooksTypes: ApplicationWebhookEventType[] | null;
  public roleConnectionsVerificationURL: string | null;
}

export class ClientPresence extends Presence {
  private constructor(client: Client<true>, data: RawPresenceData);
  private _parse(data: PresenceData): RawPresenceData;

  public set(presence: PresenceData): ClientPresence;
}

export class ClientUser extends User {
  public mfaEnabled: boolean;
  public get presence(): ClientPresence;
  public verified: boolean;
  public edit(options: ClientUserEditOptions): Promise<this>;
  public setActivity(options?: ActivityOptions): ClientPresence;
  public setActivity(name: string, options?: Omit<ActivityOptions, 'name'>): ClientPresence;
  public setAFK(afk?: boolean, shardId?: number | readonly number[]): ClientPresence;
  public setAvatar(avatar: BufferResolvable | Base64Resolvable | null): Promise<this>;
  public setBanner(banner: BufferResolvable | Base64Resolvable | null): Promise<this>;
  public setPresence(data: PresenceData): ClientPresence;
  public setStatus(status: PresenceStatusData, shardId?: number | readonly number[]): ClientPresence;
  public setUsername(username: string): Promise<this>;
}

export class Options extends null {
  private constructor();
  public static get DefaultMakeCacheSettings(): CacheWithLimitsOptions;
  public static get DefaultSweeperSettings(): SweeperOptions;
  public static createDefault(): ClientOptions;
  public static cacheWithLimits(settings?: CacheWithLimitsOptions): CacheFactory;
  public static cacheEverything(): CacheFactory;
}

export class ClientVoiceManager {
  private constructor(client: Client);
  public readonly client: Client;
  public adapters: Map<Snowflake, InternalDiscordGatewayAdapterLibraryMethods>;
}

export type ComponentInContainer =
  | ActionRow<MessageActionRowComponent>
  | FileComponent
  | MediaGalleryComponent
  | SectionComponent
  | SeparatorComponent
  | TextDisplayComponent;

export type ComponentInContainerData =
  | ActionRowData<ActionRowComponentData>
  | FileComponentData
  | MediaGalleryComponentData
  | SectionComponentData
  | SeparatorComponentData
  | TextDisplayComponentData;

export interface ContainerComponentData<
  ComponentType extends JSONEncodable<APIComponentInContainer> | ComponentInContainerData =
    | JSONEncodable<APIComponentInContainer>
    | ComponentInContainerData,
> extends BaseComponentData {
  components: readonly ComponentType[];
  accentColor?: number;
  spoiler?: boolean;
}

export class ContainerComponent extends Component<APIContainerComponent> {
  private constructor(data: APIContainerComponent);
  public get accentColor(): number;
  public get hexAccentColor(): HexColorString;
  public get spoiler(): boolean;
  public readonly components: ComponentInContainer[];
}

export { Collection, ReadonlyCollection } from '@discordjs/collection';

export interface CollectorEventTypes<Key, Value, Extras extends unknown[] = []> {
  collect: [Value, ...Extras];
  ignore: [Value, ...Extras];
  dispose: [Value, ...Extras];
  end: [collected: ReadonlyCollection<Key, Value>, reason: string];
}

export abstract class Collector<Key, Value, Extras extends unknown[] = []> extends EventEmitter {
  protected constructor(client: Client<true>, options?: CollectorOptions<[Value, ...Extras]>);
  private _timeout: NodeJS.Timeout | null;
  private _idletimeout: NodeJS.Timeout | null;
  private _endReason: string | null;

  public readonly client: Client;
  public collected: Collection<Key, Value>;
  public lastCollectedTimestamp: number | null;
  public get lastCollectedAt(): Date | null;
  public ended: boolean;
  public get endReason(): string | null;
  public filter: CollectorFilter<[Value, ...Extras]>;
  public get next(): Promise<Value>;
  public options: CollectorOptions<[Value, ...Extras]>;
  public checkEnd(): boolean;
  public handleCollect(...args: unknown[]): Promise<void>;
  public handleDispose(...args: unknown[]): Promise<void>;
  public stop(reason?: string): void;
  public resetTimer(options?: CollectorResetTimerOptions): void;
  public [Symbol.asyncIterator](): AsyncIterableIterator<[Value, ...Extras]>;
  public toJSON(): unknown;

  protected listener: (...args: any[]) => void;
  public abstract collect(...args: unknown[]): Awaitable<Key | null>;
  public abstract dispose(...args: unknown[]): Key | null;

  public on<EventKey extends keyof CollectorEventTypes<Key, Value, Extras>>(
    event: EventKey,
    listener: (...args: CollectorEventTypes<Key, Value, Extras>[EventKey]) => void,
  ): this;

  public once<EventKey extends keyof CollectorEventTypes<Key, Value, Extras>>(
    event: EventKey,
    listener: (...args: CollectorEventTypes<Key, Value, Extras>[EventKey]) => void,
  ): this;
}

// tslint:disable-next-line no-empty-interface
export interface DMChannel
  extends Omit<
    TextBasedChannelFields<false, true>,
    'bulkDelete' | 'fetchWebhooks' | 'createWebhook' | 'setRateLimitPerUser' | 'setNSFW'
  > {}
export class DMChannel extends BaseChannel {
  private constructor(client: Client<true>, data?: RawDMChannelData);
  public flags: Readonly<ChannelFlagsBitField>;
  public get recipientId(): Snowflake;
  public recipientIds: Snowflake[];
  public get recipient(): User | null;
  public type: ChannelType.DM;
  public fetch(force?: boolean): Promise<this>;
  public toString(): UserMention;
}

export class Emoji extends Base {
  protected constructor(client: Client<true>, emoji: RawEmojiData);
  public animated: boolean | null;
  public get createdAt(): Date | null;
  public get createdTimestamp(): number | null;
  public id: Snowflake | null;
  public name: string | null;
  public get identifier(): string;
  public imageURL(options?: EmojiURLOptions): string | null;
  public get url(): string | null;
  public toJSON(): unknown;
  public toString(): string;
}

export class Guild extends AnonymousGuild {
  private constructor(client: Client<true>, data: RawGuildData);
  private _sortedRoles(): Collection<Snowflake, Role>;
  private _sortedChannels(channel: NonThreadGuildBasedChannel): Collection<Snowflake, NonThreadGuildBasedChannel>;

  public get afkChannel(): VoiceChannel | null;
  public afkChannelId: Snowflake | null;
  public afkTimeout: number;
  public applicationId: Snowflake | null;
  public maxVideoChannelUsers: number | null;
  public approximateMemberCount: number | null;
  public approximatePresenceCount: number | null;
  public autoModerationRules: AutoModerationRuleManager;
  public available: boolean;
  public bans: GuildBanManager;
  public channels: GuildChannelManager;
  public defaultMessageNotifications: GuildDefaultMessageNotifications;
  public discoverySplash: string | null;
  public emojis: GuildEmojiManager;
  public explicitContentFilter: GuildExplicitContentFilter;
  public invites: GuildInviteManager;
  public get joinedAt(): Date;
  public joinedTimestamp: number;
  public large: boolean;
  public maximumMembers: number | null;
  public maximumPresences: number | null;
  public maxStageVideoChannelUsers: number | null;
  public memberCount: number;
  public members: GuildMemberManager;
  public mfaLevel: GuildMFALevel;
  public ownerId: Snowflake;
  public preferredLocale: Locale;
  public premiumProgressBarEnabled: boolean;
  public premiumTier: GuildPremiumTier;
  public presences: PresenceManager;
  public get publicUpdatesChannel(): TextChannel | null;
  public publicUpdatesChannelId: Snowflake | null;
  public roles: RoleManager;
  public get rulesChannel(): TextChannel | null;
  public rulesChannelId: Snowflake | null;
  public get safetyAlertsChannel(): TextChannel | null;
  public safetyAlertsChannelId: Snowflake | null;
  public scheduledEvents: GuildScheduledEventManager;
  public get shard(): WebSocketShard;
  public shardId: number;
  public soundboardSounds: GuildSoundboardSoundManager;
  public stageInstances: StageInstanceManager;
  public stickers: GuildStickerManager;
  public incidentsData: IncidentActions | null;
  public get systemChannel(): TextChannel | null;
  public systemChannelFlags: Readonly<SystemChannelFlagsBitField>;
  public systemChannelId: Snowflake | null;
  public vanityURLUses: number | null;
  public get voiceAdapterCreator(): InternalDiscordGatewayAdapterCreator;
  public voiceStates: VoiceStateManager;
  public get widgetChannel(): TextChannel | NewsChannel | VoiceBasedChannel | ForumChannel | MediaChannel | null;
  public widgetChannelId: Snowflake | null;
  public widgetEnabled: boolean | null;
  public get maximumBitrate(): number;
  public get maximumStageBitrate(): number;
  public createTemplate(name: string, description?: string): Promise<GuildTemplate>;
  public delete(): Promise<Guild>;
  public discoverySplashURL(options?: ImageURLOptions): string | null;
  public edit(options: GuildEditOptions): Promise<Guild>;
  public editOnboarding(options: GuildOnboardingEditOptions): Promise<GuildOnboarding>;
  public editWelcomeScreen(options: WelcomeScreenEditOptions): Promise<WelcomeScreen>;
  public equals(guild: Guild): boolean;
  public fetchAuditLogs<Event extends GuildAuditLogsResolvable = AuditLogEvent>(
    options?: GuildAuditLogsFetchOptions<Event>,
  ): Promise<GuildAuditLogs<Event extends null ? AuditLogEvent : Event>>;
  public fetchIntegrations(): Promise<Collection<Snowflake | string, Integration>>;
  public fetchOnboarding(): Promise<GuildOnboarding>;
  public fetchOwner(options?: BaseFetchOptions): Promise<GuildMember>;
  public fetchPreview(): Promise<GuildPreview>;
  public fetchTemplates(): Promise<Collection<GuildTemplate['code'], GuildTemplate>>;
  public fetchVanityData(): Promise<Vanity>;
  public fetchWebhooks(): Promise<Collection<Snowflake, Webhook<WebhookType.ChannelFollower | WebhookType.Incoming>>>;
  public fetchWelcomeScreen(): Promise<WelcomeScreen>;
  public fetchWidget(): Promise<Widget>;
  public fetchWidgetSettings(): Promise<GuildWidgetSettings>;
  public widgetImageURL(style?: GuildWidgetStyle): string;
  public leave(): Promise<Guild>;
  public disableInvites(disabled?: boolean): Promise<Guild>;
  public setIncidentActions(incidentActions: IncidentActionsEditOptions): Promise<IncidentActions>;
  public setAFKChannel(afkChannel: VoiceChannelResolvable | null, reason?: string): Promise<Guild>;
  public setAFKTimeout(afkTimeout: number, reason?: string): Promise<Guild>;
  public setBanner(banner: BufferResolvable | Base64Resolvable | null, reason?: string): Promise<Guild>;
  public setDefaultMessageNotifications(
    defaultMessageNotifications: GuildDefaultMessageNotifications | null,
    reason?: string,
  ): Promise<Guild>;
  public setDiscoverySplash(
    discoverySplash: BufferResolvable | Base64Resolvable | null,
    reason?: string,
  ): Promise<Guild>;
  public setExplicitContentFilter(
    explicitContentFilter: GuildExplicitContentFilter | null,
    reason?: string,
  ): Promise<Guild>;
  public setIcon(icon: BufferResolvable | Base64Resolvable | null, reason?: string): Promise<Guild>;
  public setName(name: string, reason?: string): Promise<Guild>;
  /** @deprecated API related to guild ownership may no longer be used. */
  public setOwner(owner: GuildMemberResolvable, reason?: string): Promise<Guild>;
  public setPreferredLocale(preferredLocale: Locale | null, reason?: string): Promise<Guild>;
  public setPublicUpdatesChannel(publicUpdatesChannel: TextChannelResolvable | null, reason?: string): Promise<Guild>;
  public setRulesChannel(rulesChannel: TextChannelResolvable | null, reason?: string): Promise<Guild>;
  public setSafetyAlertsChannel(safetyAlertsChannel: TextChannelResolvable | null, reason?: string): Promise<Guild>;
  public setSplash(splash: BufferResolvable | Base64Resolvable | null, reason?: string): Promise<Guild>;
  public setSystemChannel(systemChannel: TextChannelResolvable | null, reason?: string): Promise<Guild>;
  public setSystemChannelFlags(systemChannelFlags: SystemChannelFlagsResolvable, reason?: string): Promise<Guild>;
  public setVerificationLevel(verificationLevel: GuildVerificationLevel | null, reason?: string): Promise<Guild>;
  public setPremiumProgressBarEnabled(enabled?: boolean, reason?: string): Promise<Guild>;
  public setWidgetSettings(settings: GuildWidgetSettingsData, reason?: string): Promise<Guild>;
  /** @deprecated API related to guild ownership may no longer be used. */
  public setMFALevel(level: GuildMFALevel, reason?: string): Promise<Guild>;
  public toJSON(): unknown;
}

export interface FileComponentData extends BaseComponentData {
  file: UnfurledMediaItemData;
  spoiler?: boolean;
}
export class FileComponent extends Component<APIFileComponent> {
  private constructor(data: APIFileComponent);
  public readonly file: UnfurledMediaItem;
  public get spoiler(): boolean;
}

export class GuildAuditLogs<Event extends AuditLogEvent = AuditLogEvent> {
  private constructor(guild: Guild, data: RawGuildAuditLogData);
  private applicationCommands: Collection<Snowflake, ApplicationCommand>;
  private webhooks: Collection<Snowflake, Webhook<WebhookType.ChannelFollower | WebhookType.Incoming>>;
  private integrations: Collection<Snowflake | string, Integration>;
  private guildScheduledEvents: Collection<Snowflake, GuildScheduledEvent>;
  private autoModerationRules: Collection<Snowflake, AutoModerationRule>;
  public entries: Collection<Snowflake, GuildAuditLogsEntry<Event>>;
  public toJSON(): unknown;
}

export class GuildAuditLogsEntry<
  TAction extends AuditLogEvent = AuditLogEvent,
  TActionType extends GuildAuditLogsActionType = TAction extends keyof GuildAuditLogsTypes
    ? GuildAuditLogsTypes[TAction][1]
    : 'All',
  TTargetType extends GuildAuditLogsTargetType = TAction extends keyof GuildAuditLogsTypes
    ? GuildAuditLogsTypes[TAction][0]
    : 'Unknown',
> {
  private constructor(guild: Guild, data: RawGuildAuditLogEntryData, logs?: GuildAuditLogs);
  public static Targets: GuildAuditLogsTargets;
  public action: TAction;
  public actionType: TActionType;
  public changes: AuditLogChange[];
  public get createdAt(): Date;
  public get createdTimestamp(): number;
  public executorId: Snowflake | null;
  public executor: User | PartialUser | null;
  public extra: TAction extends keyof GuildAuditLogsEntryExtraField ? GuildAuditLogsEntryExtraField[TAction] : null;
  public id: Snowflake;
  public reason: string | null;
  public targetId: Snowflake | null;
  public target: TTargetType extends keyof GuildAuditLogsEntryTargetField<TAction>
    ? GuildAuditLogsEntryTargetField<TAction>[TTargetType]
    : { id: Snowflake | undefined; [x: string]: unknown } | null;
  public targetType: TTargetType;
  public static actionType(action: AuditLogEvent): GuildAuditLogsActionType;
  public static targetType(target: AuditLogEvent): GuildAuditLogsTargetType;
  public toJSON(): unknown;
}

export class GuildBan extends Base {
  private constructor(client: Client<true>, data: RawGuildBanData, guild: Guild);
  public guild: Guild;
  public user: User;
  public get partial(): boolean;
  public reason?: string | null;
  public fetch(force?: boolean): Promise<GuildBan>;
}

export abstract class GuildChannel extends BaseChannel {
  public constructor(guild: Guild, data?: RawGuildChannelData, client?: Client<true>, immediatePatch?: boolean);
  private memberPermissions(member: GuildMember, checkAdmin: boolean): Readonly<PermissionsBitField>;
  private rolePermissions(role: Role, checkAdmin: boolean): Readonly<PermissionsBitField>;
  public get createdAt(): Date;
  public get createdTimestamp(): number;
  public get deletable(): boolean;
  public flags: Readonly<ChannelFlagsBitField>;
  public guild: Guild;
  public guildId: Snowflake;
  public get manageable(): boolean;
  public get members(): Collection<Snowflake, GuildMember>;
  public name: string;
  public get parent(): CategoryChannel | null;
  public parentId: Snowflake | null;
  public permissionOverwrites: PermissionOverwriteManager;
  public get permissionsLocked(): boolean | null;
  public get position(): number;
  public rawPosition: number;
  public type: GuildChannelTypes;
  public get viewable(): boolean;
  public clone(options?: GuildChannelCloneOptions): Promise<this>;
  public delete(reason?: string): Promise<this>;
  public edit(options: GuildChannelEditOptions): Promise<this>;
  public equals(channel: GuildChannel): boolean;
  public lockPermissions(): Promise<this>;
  public permissionsFor(memberOrRole: GuildMember | Role, checkAdmin?: boolean): Readonly<PermissionsBitField>;
  public permissionsFor(
    memberOrRole: GuildMemberResolvable | RoleResolvable,
    checkAdmin?: boolean,
  ): Readonly<PermissionsBitField> | null;
  public setName(name: string, reason?: string): Promise<this>;
  public setParent(channel: CategoryChannelResolvable | null, options?: SetParentOptions): Promise<this>;
  public setPosition(position: number, options?: SetChannelPositionOptions): Promise<this>;
  public isTextBased(): this is GuildBasedChannel & TextBasedChannel;
  public toString(): ChannelMention;
}

export class GuildEmoji extends BaseGuildEmoji {
  private constructor(client: Client<true>, data: RawGuildEmojiData, guild: Guild);
  private _roles: Snowflake[];

  public get deletable(): boolean;
  public guild: Guild;
  public author: User | null;
  public get roles(): GuildEmojiRoleManager;
  public delete(reason?: string): Promise<GuildEmoji>;
  public edit(options: GuildEmojiEditOptions): Promise<GuildEmoji>;
  public equals(other: GuildEmoji | unknown): boolean;
  public fetchAuthor(): Promise<User>;
  public setName(name: string, reason?: string): Promise<GuildEmoji>;
}

export type GuildMemberFlagsString = keyof typeof GuildMemberFlags;

export type GuildMemberFlagsResolvable = BitFieldResolvable<GuildMemberFlagsString, number>;

export class GuildMemberFlagsBitField extends BitField<GuildMemberFlagsString> {
  public static Flags: GuildMemberFlags;
  public static resolve(bit?: BitFieldResolvable<GuildMemberFlagsString, GuildMemberFlags>): number;
}

export interface GuildMember extends PartialTextBasedChannelFields<false> {}
export class GuildMember extends Base {
  private constructor(client: Client<true>, data: RawGuildMemberData, guild: Guild);
  private _roles: Snowflake[];
  public avatar: string | null;
  public avatarDecorationData: AvatarDecorationData | null;
  public banner: string | null;
  public get bannable(): boolean;
  public collectibles: Collectibles | null;
  public get dmChannel(): DMChannel | null;
  public get displayColor(): number;
  public get displayHexColor(): HexColorString;
  public get displayName(): string;
  public guild: Guild;
  public get id(): Snowflake;
  public pending: boolean;
  public get communicationDisabledUntil(): Date | null;
  public communicationDisabledUntilTimestamp: number | null;
  public flags: Readonly<GuildMemberFlagsBitField>;
  public get joinedAt(): Date | null;
  public joinedTimestamp: number | null;
  public get kickable(): boolean;
  public get manageable(): boolean;
  public get moderatable(): boolean;
  public nickname: string | null;
  public get partial(): false;
  public get permissions(): Readonly<PermissionsBitField>;
  public get premiumSince(): Date | null;
  public premiumSinceTimestamp: number | null;
  public get presence(): Presence | null;
  public get roles(): GuildMemberRoleManager;
  public user: User;
  public get voice(): VoiceState;
  public avatarURL(options?: ImageURLOptions): string | null;
  public avatarDecorationURL(): string | null;
  public bannerURL(options?: ImageURLOptions): string | null;
  public ban(options?: BanOptions): Promise<GuildMember>;
  public disableCommunicationUntil(timeout: DateResolvable | null, reason?: string): Promise<GuildMember>;
  public timeout(timeout: number | null, reason?: string): Promise<GuildMember>;
  public fetch(force?: boolean): Promise<GuildMember>;
  public createDM(force?: boolean): Promise<DMChannel>;
  public deleteDM(): Promise<DMChannel>;
  public displayAvatarURL(options?: ImageURLOptions): string;
  public displayBannerURL(options?: ImageURLOptions): string | null;
  public displayAvatarDecorationURL(): string | null;
  public edit(options: GuildMemberEditOptions): Promise<GuildMember>;
  public isCommunicationDisabled(): this is GuildMember & {
    communicationDisabledUntilTimestamp: number;
    readonly communicationDisabledUntil: Date;
  };
  public kick(reason?: string): Promise<GuildMember>;
  public permissionsIn(channel: GuildChannelResolvable): Readonly<PermissionsBitField>;
  public setFlags(flags: GuildMemberFlagsResolvable, reason?: string): Promise<GuildMember>;
  public setNickname(nickname: string | null, reason?: string): Promise<GuildMember>;
  public toJSON(): unknown;
  public toString(): UserMention;
  public valueOf(): string;
}

export class GuildOnboarding extends Base {
  private constructor(client: Client, data: RESTGetAPIGuildOnboardingResult);
  public get guild(): Guild;
  public guildId: Snowflake;
  public prompts: Collection<Snowflake, GuildOnboardingPrompt>;
  public defaultChannels: Collection<Snowflake, GuildChannel>;
  public enabled: boolean;
  public mode: GuildOnboardingMode;
}

export class GuildOnboardingPrompt extends Base {
  private constructor(client: Client, data: APIGuildOnboardingPrompt, guildId: Snowflake);
  public id: Snowflake;
  public get guild(): Guild;
  public guildId: Snowflake;
  public options: Collection<Snowflake, GuildOnboardingPromptOption>;
  public title: string;
  public singleSelect: boolean;
  public required: boolean;
  public inOnboarding: boolean;
  public type: GuildOnboardingPromptType;
}

export class GuildOnboardingPromptOption extends Base {
  private constructor(client: Client, data: APIGuildOnboardingPromptOption, guildId: Snowflake);
  private _emoji: APIPartialEmoji;

  public id: Snowflake;
  public get emoji(): Emoji | GuildEmoji | null;
  public get guild(): Guild;
  public guildId: Snowflake;
  public channels: Collection<Snowflake, GuildChannel>;
  public roles: Collection<Snowflake, Role>;
  public title: string;
  public description: string | null;
}

export class GuildPreview extends Base {
  private constructor(client: Client<true>, data: RawGuildPreviewData);
  public approximateMemberCount: number;
  public approximatePresenceCount: number;
  public get createdAt(): Date;
  public get createdTimestamp(): number;
  public description: string | null;
  public discoverySplash: string | null;
  public emojis: Collection<Snowflake, GuildPreviewEmoji>;
  public stickers: Collection<Snowflake, Sticker>;
  public features: `${GuildFeature}`[];
  public icon: string | null;
  public id: Snowflake;
  public name: string;
  public splash: string | null;
  public discoverySplashURL(options?: ImageURLOptions): string | null;
  public iconURL(options?: ImageURLOptions): string | null;
  public splashURL(options?: ImageURLOptions): string | null;
  public fetch(): Promise<GuildPreview>;
  public toJSON(): unknown;
  public toString(): string;
}

export class GuildScheduledEvent<Status extends GuildScheduledEventStatus = GuildScheduledEventStatus> extends Base {
  private constructor(client: Client<true>, data: RawGuildScheduledEventData);
  public id: Snowflake;
  public guildId: Snowflake;
  public channelId: Snowflake | null;
  public creatorId: Snowflake | null;
  public name: string;
  public description: string | null;
  public scheduledStartTimestamp: number | null;
  public scheduledEndTimestamp: number | null;
  public privacyLevel: GuildScheduledEventPrivacyLevel;
  public status: Status;
  public entityType: GuildScheduledEventEntityType;
  public entityId: Snowflake | null;
  public entityMetadata: GuildScheduledEventEntityMetadata | null;
  public userCount: number | null;
  public creator: User | null;
  public recurrenceRule: GuildScheduledEventRecurrenceRule | null;
  public get createdTimestamp(): number;
  public get createdAt(): Date;
  public get scheduledStartAt(): Date | null;
  public get scheduledEndAt(): Date | null;
  public get channel(): VoiceChannel | StageChannel | null;
  public get guild(): Guild | null;
  public get url(): string;
  public image: string | null;
  public get partial(): false;
  public coverImageURL(options?: Readonly<BaseImageURLOptions>): string | null;
  public createInviteURL(options?: GuildScheduledEventInviteURLCreateOptions): Promise<string>;
  public edit<AcceptableStatus extends GuildScheduledEventSetStatusArg<Status>>(
    options: GuildScheduledEventEditOptions<Status, AcceptableStatus>,
  ): Promise<GuildScheduledEvent<AcceptableStatus>>;
  public fetch(force?: boolean): Promise<GuildScheduledEvent<Status>>;
  public delete(): Promise<GuildScheduledEvent<Status>>;
  public setName(name: string, reason?: string): Promise<GuildScheduledEvent<Status>>;
  public setScheduledStartTime(
    scheduledStartTime: DateResolvable,
    reason?: string,
  ): Promise<GuildScheduledEvent<Status>>;
  public setScheduledEndTime(scheduledEndTime: DateResolvable, reason?: string): Promise<GuildScheduledEvent<Status>>;
  public setDescription(description: string, reason?: string): Promise<GuildScheduledEvent<Status>>;
  public setStatus<AcceptableStatus extends GuildScheduledEventSetStatusArg<Status>>(
    status: AcceptableStatus,
    reason?: string,
  ): Promise<GuildScheduledEvent<AcceptableStatus>>;
  public setLocation(location: string, reason?: string): Promise<GuildScheduledEvent<Status>>;
  public fetchSubscribers<Options extends FetchGuildScheduledEventSubscribersOptions>(
    options?: Options,
  ): Promise<GuildScheduledEventManagerFetchSubscribersResult<Options>>;
  public toString(): string;
  public isActive(): this is GuildScheduledEvent<GuildScheduledEventStatus.Active>;
  public isCanceled(): this is GuildScheduledEvent<GuildScheduledEventStatus.Canceled>;
  public isCompleted(): this is GuildScheduledEvent<GuildScheduledEventStatus.Completed>;
  public isScheduled(): this is GuildScheduledEvent<GuildScheduledEventStatus.Scheduled>;
}

export interface GuildScheduledEventRecurrenceRule {
  startTimestamp: number;
  get startAt(): Date;
  endTimestamp: number | null;
  get endAt(): Date | null;
  frequency: GuildScheduledEventRecurrenceRuleFrequency;
  interval: number;
  byWeekday: readonly GuildScheduledEventRecurrenceRuleWeekday[] | null;
  byNWeekday: readonly GuildScheduledEventRecurrenceRuleNWeekday[] | null;
  byMonth: readonly GuildScheduledEventRecurrenceRuleMonth[] | null;
  byMonthDay: readonly number[] | null;
  byYearDay: readonly number[] | null;
  count: number | null;
}

export interface GuildScheduledEventRecurrenceRuleNWeekday {
  n: number;
  day: GuildScheduledEventRecurrenceRuleWeekday;
}

export class GuildTemplate extends Base {
  private constructor(client: Client<true>, data: RawGuildTemplateData);
  public createdTimestamp: number;
  public updatedTimestamp: number;
  public get url(): string;
  public code: string;
  public name: string;
  public description: string | null;
  public usageCount: number;
  public creator: User;
  public creatorId: Snowflake;
  public get createdAt(): Date;
  public get updatedAt(): Date;
  public get guild(): Guild | null;
  public guildId: Snowflake;
  public serializedGuild: APITemplateSerializedSourceGuild;
  public unSynced: boolean | null;
  /** @deprecated API related to guild ownership may no longer be used. */
  public createGuild(name: string, icon?: BufferResolvable | Base64Resolvable): Promise<Guild>;
  public delete(): Promise<GuildTemplate>;
  public edit(options?: GuildTemplateEditOptions): Promise<GuildTemplate>;
  public sync(): Promise<GuildTemplate>;
  public static GuildTemplatesPattern: RegExp;
}

export class GuildPreviewEmoji extends BaseGuildEmoji {
  private constructor(client: Client<true>, data: RawGuildEmojiData, guild: GuildPreview);
  public guild: GuildPreview;
  public roles: Snowflake[];
}

export class Integration extends Base {
  private constructor(client: Client<true>, data: RawIntegrationData, guild: Guild);
  public account: IntegrationAccount;
  public application: IntegrationApplication | null;
  public enabled: boolean | null;
  public expireBehavior: IntegrationExpireBehavior | null;
  public expireGracePeriod: number | null;
  public guild: Guild;
  public id: Snowflake | string;
  public name: string;
  public role: Role | null;
  public enableEmoticons: boolean | null;
  public get roles(): Collection<Snowflake, Role>;
  public scopes: OAuth2Scopes[];
  public get syncedAt(): Date | null;
  public syncedTimestamp: number | null;
  public syncing: boolean | null;
  public type: IntegrationType;
  public user: User | null;
  public subscriberCount: number | null;
  public revoked: boolean | null;
  public delete(reason?: string): Promise<Integration>;
}

export class IntegrationApplication extends Application {
  private constructor(client: Client<true>, data: RawIntegrationApplicationData);
  public bot: User | null;
  public termsOfServiceURL: string | null;
  public privacyPolicyURL: string | null;
  public rpcOrigins: string[];
  public hook: boolean | null;
  public cover: string | null;
  public verifyKey: string | null;
}

export type GatewayIntentsString = keyof typeof GatewayIntentBits;

export class IntentsBitField extends BitField<GatewayIntentsString> {
  public static Flags: typeof GatewayIntentBits;
  public static resolve(bit?: BitFieldResolvable<GatewayIntentsString, number>): number;
}

export type CacheType = 'cached' | 'raw' | undefined;

export type CacheTypeReducer<
  State extends CacheType,
  CachedType,
  RawType = CachedType,
  PresentType = CachedType | RawType,
  Fallback = PresentType | null,
> = [State] extends ['cached']
  ? CachedType
  : [State] extends ['raw']
    ? RawType
    : [State] extends ['raw' | 'cached']
      ? PresentType
      : Fallback;

// tslint:disable-next-line no-empty-interface

export class Invite extends Base {
  private constructor(client: Client<true>, data: RawInviteData);
  public channel: NonThreadGuildBasedChannel | PartialGroupDMChannel | null;
  public channelId: Snowflake | null;
  public roles: Collection<Snowflake, InviteRole | Role> | null;
  public code: string;
  public get deletable(): boolean;
  public get createdAt(): Date | null;
  public createdTimestamp: number | null;
  public get expiresAt(): Date | null;
  public get expiresTimestamp(): number | null;
  public guild: InviteGuild | Guild | null;
  public get inviter(): User | null;
  public inviterId: Snowflake | null;
  public maxAge: number | null;
  public maxUses: number | null;
  public memberCount: number | null;
  public presenceCount: number | null;
  public targetApplication: IntegrationApplication | null;
  public targetUser: User | null;
  public targetType: InviteTargetType | null;
  public temporary: boolean | null;
  public type: InviteType;
  public get url(): string;
  public uses: number | null;
  public delete(reason?: string): Promise<Invite>;
  public updateTargetUsers(targetUsersFile: BufferResolvable | readonly UserResolvable[]): Promise<void>;
  public fetchTargetUsersJobStatus(): Promise<TargetUsersJobStatusForInvite>;
  public fetchTargetUsers(): Promise<Buffer>;
  public toJSON(): unknown;
  public toString(): string;
  public static InvitesPattern: RegExp;
  /** @deprecated Public Stage Instances don't exist anymore  */
  public stageInstance: InviteStageInstance | null;
  public guildScheduledEvent: GuildScheduledEvent | null;
  public flags: Readonly<InviteFlagsBitField>;
}

/** @deprecated Public Stage Instances don't exist anymore */
export class InviteStageInstance extends Base {
  private constructor(client: Client<true>, data: RawInviteStageInstance, channelId: Snowflake, guildId: Snowflake);
  public channelId: Snowflake;
  public guildId: Snowflake;
  public members: Collection<Snowflake, GuildMember>;
  public topic: string;
  public participantCount: number;
  public speakerCount: number;
  public get channel(): StageChannel | null;
  public get guild(): Guild | null;
}

export class InviteGuild extends AnonymousGuild {
  private constructor(client: Client<true>, data: RawInviteGuildData);
  public welcomeScreen: WelcomeScreen | null;
}

export type InviteFlagsString = keyof typeof InviteFlags;

export class InviteFlagsBitField extends BitField<InviteFlagsString> {
  public static Flags: typeof InviteFlags;
  public static resolve(bit?: BitFieldResolvable<InviteFlagsString, number>): number;
}

export class LimitedCollection<Key, Value> extends Collection<Key, Value> {
  public constructor(options?: LimitedCollectionOptions<Key, Value>, iterable?: Iterable<readonly [Key, Value]>);
  public maxSize: number;
  public keepOverLimit: ((value: Value, key: Key, collection: this) => boolean) | null;
}

export interface MediaGalleryComponentData extends BaseComponentData {
  items: readonly MediaGalleryItemData[];
}
export class MediaGalleryComponent extends Component<APIMediaGalleryComponent> {
  private constructor(data: APIMediaGalleryComponent);
  public readonly items: MediaGalleryItem[];
}

export interface MediaGalleryItemData {
  media: UnfurledMediaItemData;
  description?: string;
  spoiler?: boolean;
}
export class MediaGalleryItem {
  private constructor(data: APIMediaGalleryItem);
  public readonly data: APIMediaGalleryItem;
  public readonly media: UnfurledMediaItem;
  public get description(): string | null;
  public get spoiler(): boolean;
}

export interface MessageCall {
  get endedAt(): Date | null;
  endedTimestamp: number | null;
  participants: readonly Snowflake[];
}

export interface SharedClientTheme {
  baseMix: number;
  baseTheme?: BaseThemeType | null;
  colors: readonly string[];
  gradientAngle: number;
}

export class Message<InGuild extends boolean = boolean> extends Base {
  private readonly _cacheType: InGuild;
  private constructor(client: Client<true>, data: RawMessageData);
  private _patch(data: RawPartialMessageData | RawMessageData): void;

  public activity: MessageActivity | null;
  public applicationId: Snowflake | null;
  public attachments: Collection<Snowflake, Attachment>;
  public author: User;
  public get bulkDeletable(): boolean;
  public get channel(): If<InGuild, GuildTextBasedChannel, TextBasedChannel>;
  public channelId: Snowflake;
  public get cleanContent(): string;
  public components: TopLevelComponent[];
  public content: string;
  public get createdAt(): Date;
  public createdTimestamp: number;
  public get crosspostable(): boolean;
  public get deletable(): boolean;
  public get editable(): boolean;
  public get editedAt(): Date | null;
  public editedTimestamp: number | null;
  public embeds: Embed[];
  public groupActivityApplication: ClientApplication | null;
  public guildId: If<InGuild, Snowflake>;
  public get guild(): If<InGuild, Guild>;
  public get hasThread(): boolean;
  public id: Snowflake;
  /** @deprecated Use {@link Message.interactionMetadata} instead. */
  public interaction: MessageInteraction | null;
  public interactionMetadata: MessageInteractionMetadata | null;
  public get member(): GuildMember | null;
  public mentions: MessageMentions<InGuild>;
  public nonce: string | number | null;
  public get partial(): false;
  public get pinnable(): boolean;
  public pinned: boolean;
  public reactions: ReactionManager;
  public stickers: Collection<Snowflake, Sticker>;
  public position: number | null;
  public roleSubscriptionData: RoleSubscriptionData | null;
  public resolved: CommandInteractionResolvedData | null;
  public system: boolean;
  public get thread(): AnyThreadChannel | null;
  public tts: boolean;
  public poll: Poll | null;
  public call: MessageCall | null;
  public sharedClientTheme: SharedClientTheme | null;
  public type: MessageType;
  public get url(): string;
  public webhookId: Snowflake | null;
  public flags: Readonly<MessageFlagsBitField>;
  public reference: MessageReference | null;
  public messageSnapshots: Collection<Snowflake, MessageSnapshot>;
  public awaitReactions(options?: AwaitReactionsOptions): Promise<Collection<Snowflake | string, MessageReaction>>;
  public createReactionCollector(options?: ReactionCollectorOptions): ReactionCollector;
  public delete(): Promise<OmitPartialGroupDMChannel<Message<InGuild>>>;
  public edit(
    content: string | MessageEditOptions | MessagePayload,
  ): Promise<OmitPartialGroupDMChannel<Message<InGuild>>>;
  public equals(message: Message, rawData?: APIMessage): boolean;
  public fetchReference(): Promise<OmitPartialGroupDMChannel<Message<InGuild>>>;
  public fetchWebhook(): Promise<Webhook>;
  public crosspost(): Promise<OmitPartialGroupDMChannel<Message<InGuild>>>;
  public fetch(force?: boolean): Promise<OmitPartialGroupDMChannel<Message<InGuild>>>;
  public pin(reason?: string): Promise<OmitPartialGroupDMChannel<Message<InGuild>>>;
  public react(emoji: EmojiIdentifierResolvable): Promise<MessageReaction>;
  public removeAttachments(): Promise<OmitPartialGroupDMChannel<Message<InGuild>>>;
  public reply(
    options: string | MessagePayload | MessageReplyOptions,
  ): Promise<OmitPartialGroupDMChannel<Message<InGuild>>>;
  public forward(channel: Exclude<TextBasedChannelResolvable, PartialGroupDMChannel>): Promise<Message>;
  public resolveComponent(customId: string): MessageActionRowComponent | null;
  public startThread(options: StartThreadOptions): Promise<PublicThreadChannel<false>>;
  public suppressEmbeds(suppress?: boolean): Promise<OmitPartialGroupDMChannel<Message<InGuild>>>;
  public toJSON(): unknown;
  public toString(): string;
  public unpin(reason?: string): Promise<OmitPartialGroupDMChannel<Message<InGuild>>>;
  public inGuild(): this is Message<true>;
}

export class AuthorizingIntegrationOwners extends Base {
  private constructor(client: Client<true>, data: APIAuthorizingIntegrationOwnersMap);
  private readonly data: APIAuthorizingIntegrationOwnersMap;

  // Getters from types
  public readonly [ApplicationIntegrationType.GuildInstall]?: Snowflake;
  public readonly [ApplicationIntegrationType.UserInstall]?: Snowflake;

  public readonly guildId: Snowflake | null;
  public get guild(): Guild | null;
  public readonly userId: Snowflake | null;
  public get user(): User | null;

  public toJSON(): APIAuthorizingIntegrationOwnersMap;
}

export class AttachmentBuilder {
  public constructor(attachment: BufferResolvable | Stream, data?: AttachmentData);
  public attachment: BufferResolvable | Stream;
  public description: string | null;
  public name: string | null;
  public title: string | null;
  public waveform: string | null;
  public duration: number | null;
  public get spoiler(): boolean;
  public setDescription(description: string): this;
  public setFile(attachment: BufferResolvable | Stream, name?: string): this;
  public setName(name: string): this;
  public setTitle(title: string): this;
  public setWaveform(waveform: string): this;
  public setDuration(duration: number): this;
  public setSpoiler(spoiler?: boolean): this;
  public toJSON(): unknown;
  public static from(other: JSONEncodable<AttachmentPayload>): AttachmentBuilder;
}

export class Attachment {
  private constructor(data: APIAttachment);
  private attachment: BufferResolvable | Stream;
  public contentType: string | null;
  public description: string | null;
  public duration: number | null;
  public ephemeral: boolean;
  public flags: AttachmentFlagsBitField;
  public height: number | null;
  public id: Snowflake;
  public name: string;
  public proxyURL: string;
  public size: number;
  public get spoiler(): boolean;
  public title: string | null;
  public url: string;
  public waveform: string | null;
  public width: number | null;
  public toJSON(): unknown;
}

export type AttachmentFlagsString = keyof typeof AttachmentFlags;

export class AttachmentFlagsBitField extends BitField<AttachmentFlagsString> {
  public static Flags: Record<AttachmentFlagsString, number>;
  public static resolve(bit?: BitFieldResolvable<AttachmentFlagsString, number>): number;
}

export class MessageCollector extends Collector<Snowflake, Message, [Collection<Snowflake, Message>]> {
  public constructor(channel: TextBasedChannel, options?: MessageCollectorOptions);
  private _handleChannelDeletion(channel: NonThreadGuildBasedChannel): void;
  private _handleGuildDeletion(guild: Guild): void;

  public channel: TextBasedChannel;
  public options: MessageCollectorOptions;
  public received: number;

  public collect(message: Message): Snowflake | null;
  public dispose(message: Message): Snowflake | null;
}

export type MessageFlagsString = keyof typeof MessageFlags;

export class MessageFlagsBitField extends BitField<MessageFlagsString> {
  public static Flags: typeof MessageFlags;
  public static resolve(bit?: MessageFlagsResolvable): number;
}

export type MessageFlagsResolvable = BitFieldResolvable<MessageFlagsString, number>;

export class MessageMentions<InGuild extends boolean = boolean> {
  private constructor(
    message: Message,
    users: readonly APIUser[] | ReadonlyCollection<Snowflake, User>,
    roles: readonly Snowflake[] | ReadonlyCollection<Snowflake, Role>,
    everyone: boolean,
    repliedUser?: APIUser | User,
  );
  private _channels: Collection<Snowflake, Channel> | null;
  private readonly _content: string;
  private _members: Collection<Snowflake, GuildMember> | null;
  private _parsedUsers: Collection<Snowflake, User> | null;

  public get channels(): Collection<Snowflake, Channel>;
  public readonly client: Client;
  public everyone: boolean;
  public readonly guild: If<InGuild, Guild>;
  public has(data: UserResolvable | RoleResolvable | ChannelResolvable, options?: MessageMentionsHasOptions): boolean;
  public get members(): If<InGuild, Collection<Snowflake, GuildMember>>;
  public get parsedUsers(): Collection<Snowflake, User>;
  public repliedUser: User | null;
  public roles: Collection<Snowflake, Role>;
  public users: Collection<Snowflake, User>;
  public crosspostedChannels: Collection<Snowflake, CrosspostedChannel>;
  public toJSON(): unknown;

  private static GlobalChannelsPattern: RegExp;
  private static GlobalUsersPattern: RegExp;
  public static ChannelsPattern: typeof FormattingPatterns.Channel;
  public static EveryonePattern: RegExp;
  public static RolesPattern: typeof FormattingPatterns.Role;
  public static UsersPattern: typeof FormattingPatterns.User;
}

export type MessagePayloadOption =
  | MessageCreateOptions
  | MessageEditOptions
  | WebhookMessageCreateOptions
  | WebhookMessageEditOptions;

export class MessagePayload {
  public constructor(target: MessageTarget, options: MessagePayloadOption);
  public body: RawMessagePayloadData | null;
  public get isUser(): boolean;
  public get isWebhook(): boolean;
  public get isMessage(): boolean;
  public get isMessageManager(): boolean;
  public files: RawFile[] | null;
  public options: MessagePayloadOption;
  public target: MessageTarget;

  public static create(
    target: MessageTarget,
    options: string | MessagePayloadOption,
    extra?: MessagePayloadOption,
  ): MessagePayload;
  public static resolveFile(
    fileLike: BufferResolvable | Stream | AttachmentPayload | JSONEncodable<AttachmentPayload>,
  ): Promise<RawFile>;

  public makeContent(): string | undefined;
  public resolveBody(): this;
  public resolveFiles(): Promise<this>;
}

export class MessageReaction {
  private constructor(client: Client<true>, data: RawMessageReactionData, message: Message);
  private _emoji: GuildEmoji | ReactionEmoji;

  public burstColors: string[] | null;
  public readonly client: Client<true>;
  public count: number;
  public countDetails: ReactionCountDetailsData;
  public get emoji(): GuildEmoji | ReactionEmoji;
  public me: boolean;
  public meBurst: boolean;
  public message: Message | PartialMessage;
  public get partial(): false;
  public users: ReactionUserManager;
  public react(): Promise<MessageReaction>;
  public remove(): Promise<MessageReaction>;
  public fetch(): Promise<MessageReaction>;
  public toJSON(): unknown;
  public valueOf(): Snowflake | string;
}

export interface MessageReactionEventDetails {
  type: ReactionType;
  burst: boolean;
}

export interface ModalComponentData {
  customId: string;
  title: string;
  components: readonly (
    | JSONEncodable<APIActionRowComponent<APIComponentInModalActionRow> | APILabelComponent>
    | ActionRowData<ModalActionRowComponentData>
    | LabelComponentData
    | TextDisplayComponentData
  )[];
}

export class NewsChannel extends BaseGuildTextChannel {
  public threads: GuildTextThreadManager<AllowedThreadTypeForNewsChannel>;
  public type: ChannelType.GuildAnnouncement;
  public addFollower(channel: TextChannelResolvable, reason?: string): Promise<NewsChannel>;
}

export type NewsChannelResolvable = NewsChannel | Snowflake;

export class OAuth2Guild extends BaseGuild {
  private constructor(client: Client<true>, data: RawOAuth2GuildData);
  public owner: boolean;
  public permissions: Readonly<PermissionsBitField>;
}

export interface PartialGroupDMChannel
  extends Omit<
    TextBasedChannelFields<false, false>,
    'bulkDelete' | 'fetchWebhooks' | 'createWebhook' | 'setRateLimitPerUser' | 'setNSFW'
  > {}
export class PartialGroupDMChannel extends BaseChannel {
  private constructor(client: Client<true>, data: RawPartialGroupDMChannelData);
  public type: ChannelType.GroupDM;
  public flags: null;
  public name: string | null;
  public icon: string | null;
  public recipients: PartialRecipient[];
  public ownerId: Snowflake | null;
  public iconURL(options?: ImageURLOptions): string | null;
  public fetchOwner(options?: BaseFetchOptions): Promise<User>;
  public toString(): ChannelMention;
}

export interface GuildForumTagEmoji {
  id: Snowflake | null;
  name: string | null;
}

export interface GuildForumTag {
  id: Snowflake;
  name: string;
  moderated: boolean;
  emoji: GuildForumTagEmoji | null;
}

export interface GuildForumTagData extends Partial<GuildForumTag> {
  name: string;
}

export interface DefaultReactionEmoji {
  id: Snowflake | null;
  name: string | null;
}

export interface ThreadOnlyChannel
  extends Omit<
    TextBasedChannelFields,
    | 'send'
    | 'lastMessage'
    | 'lastPinAt'
    | 'bulkDelete'
    | 'sendTyping'
    | 'createMessageCollector'
    | 'awaitMessages'
    | 'messages'
  > {}
export abstract class ThreadOnlyChannel extends GuildChannel {
  public type: ChannelType.GuildForum | ChannelType.GuildMedia;
  public threads: GuildForumThreadManager;
  public availableTags: GuildForumTag[];
  public defaultReactionEmoji: DefaultReactionEmoji | null;
  public defaultThreadRateLimitPerUser: number | null;
  public rateLimitPerUser: number | null;
  public defaultAutoArchiveDuration: ThreadAutoArchiveDuration | null;
  public nsfw: boolean;
  public topic: string | null;
  public defaultSortOrder: SortOrderType | null;
  public setAvailableTags(tags: readonly GuildForumTagData[], reason?: string): Promise<this>;
  public setDefaultReactionEmoji(emojiId: DefaultReactionEmoji | null, reason?: string): Promise<this>;
  public setDefaultThreadRateLimitPerUser(rateLimit: number, reason?: string): Promise<this>;
  public createInvite(options?: InviteCreateOptions): Promise<Invite>;
  public fetchInvites(cache?: boolean): Promise<Collection<string, Invite>>;
  public setDefaultAutoArchiveDuration(
    defaultAutoArchiveDuration: ThreadAutoArchiveDuration,
    reason?: string,
  ): Promise<this>;
  public setTopic(topic: string | null, reason?: string): Promise<this>;
  public setDefaultSortOrder(defaultSortOrder: SortOrderType | null, reason?: string): Promise<this>;
}

export class ForumChannel extends ThreadOnlyChannel {
  public type: ChannelType.GuildForum;
  public defaultForumLayout: ForumLayoutType;
  public setDefaultForumLayout(defaultForumLayout: ForumLayoutType, reason?: string): Promise<this>;
}

export class MediaChannel extends ThreadOnlyChannel {
  public type: ChannelType.GuildMedia;
}

export class PermissionOverwrites extends Base {
  private constructor(client: Client<true>, data: RawPermissionOverwriteData, channel: NonThreadGuildBasedChannel);
  public allow: Readonly<PermissionsBitField>;
  public readonly channel: NonThreadGuildBasedChannel;
  public deny: Readonly<PermissionsBitField>;
  public id: Snowflake;
  public type: OverwriteType;
  public edit(options: PermissionOverwriteOptions, reason?: string): Promise<PermissionOverwrites>;
  public delete(reason?: string): Promise<PermissionOverwrites>;
  public toJSON(): unknown;
  public static resolveOverwriteOptions(
    options: PermissionOverwriteOptions,
    initialPermissions: { allow?: PermissionResolvable; deny?: PermissionResolvable },
  ): ResolvedOverwriteOptions;
  public static resolve(overwrite: OverwriteResolvable, guild: Guild): APIOverwrite;
}

export type PermissionsString = keyof typeof PermissionFlagsBits;

export class PermissionsBitField extends BitField<PermissionsString, bigint> {
  public any(permission: PermissionResolvable, checkAdmin?: boolean): boolean;
  public has(permission: PermissionResolvable, checkAdmin?: boolean): boolean;
  public missing(bits: BitFieldResolvable<PermissionsString, bigint>, checkAdmin?: boolean): PermissionsString[];
  public serialize(checkAdmin?: boolean): Record<PermissionsString, boolean>;
  public toArray(): PermissionsString[];

  public static All: bigint;
  public static Default: bigint;
  public static StageModerator: bigint;
  public static Flags: typeof PermissionFlagsBits;
  public static resolve(permission?: PermissionResolvable): bigint;
}

export class Presence extends Base {
  protected constructor(client: Client<true>, data?: RawPresenceData);
  public activities: Activity[];
  public clientStatus: ClientPresenceStatusData | null;
  public guild: Guild | null;
  public get member(): GuildMember | null;
  public status: PresenceStatus;
  public get user(): User | null;
  public userId: Snowflake;
  public equals(presence: Presence): boolean;
}

export interface PollQuestionMedia {
  text: string | null;
}

export class PollAnswerVoterManager extends CachedManager<Snowflake, User, UserResolvable> {
  private constructor(answer: PollAnswer);
  public answer: PollAnswer;
  public fetch(options?: BaseFetchPollAnswerVotersOptions): Promise<Collection<Snowflake, User>>;
}

export class Poll extends Base {
  private constructor(client: Client<true>, data: APIPoll, message: Message, channel: TextBasedChannel);
  public readonly channel: TextBasedChannel;
  public channelId: Snowflake;
  public readonly message: Message;
  public messageId: Snowflake;
  public question: PollQuestionMedia;
  public answers: Collection<number, PollAnswer | PartialPollAnswer>;
  public expiresTimestamp: number | null;
  public get expiresAt(): Date | null;
  public allowMultiselect: boolean;
  public layoutType: PollLayoutType;
  public resultsFinalized: boolean;
  public get partial(): false;
  public fetch(): Promise<this>;
  public end(): Promise<Message>;
}

export interface BaseFetchPollAnswerVotersOptions {
  after?: Snowflake;
  limit?: number;
}

export class PollAnswer extends Base {
  private constructor(client: Client<true>, data: APIPollAnswer & { count?: number }, poll: Poll);
  private _emoji: APIPartialEmoji | null;
  public readonly poll: Poll | PartialPoll;
  public id: number;
  public text: string | null;
  public voteCount: number;
  public voters: PollAnswerVoterManager;
  public get emoji(): GuildEmoji | Emoji | null;
  public get partial(): false;
  /** @deprecated Use {@link PollAnswerVoterManager.fetch} instead */
  public fetchVoters(options?: BaseFetchPollAnswerVotersOptions): Promise<Collection<Snowflake, User>>;
}

export class ReactionCollector extends Collector<Snowflake | string, MessageReaction, [User]> {
  public constructor(message: Message, options?: ReactionCollectorOptions);
  private _handleChannelDeletion(channel: NonThreadGuildBasedChannel): void;
  private _handleGuildDeletion(guild: Guild): void;
  private _handleMessageDeletion(message: Message): void;

  public message: Message;
  public options: ReactionCollectorOptions;
  public total: number;
  public users: Collection<Snowflake, User>;

  public static key(reaction: MessageReaction): Snowflake | string;

  public collect(reaction: MessageReaction, user: User): Snowflake | string | null;
  public dispose(reaction: MessageReaction, user: User): Snowflake | string | null;
  public empty(): void;

  public on(
    event: 'collect' | 'dispose' | 'remove' | 'ignore',
    listener: (reaction: MessageReaction, user: User) => void,
  ): this;
  public on(
    event: 'end',
    listener: (collected: ReadonlyCollection<Snowflake, MessageReaction>, reason: string) => void,
  ): this;
  public on(event: string, listener: (...args: any[]) => void): this;

  public once(
    event: 'collect' | 'dispose' | 'remove' | 'ignore',
    listener: (reaction: MessageReaction, user: User) => void,
  ): this;
  public once(
    event: 'end',
    listener: (collected: ReadonlyCollection<Snowflake, MessageReaction>, reason: string) => void,
  ): this;
  public once(event: string, listener: (...args: any[]) => void): this;
}

export class ReactionEmoji extends Emoji {
  private constructor(reaction: MessageReaction, emoji: RawReactionEmojiData);
  public reaction: MessageReaction;
  public toJSON(): unknown;
}

export class RichPresenceAssets {
  private constructor(activity: Activity, assets: RawRichPresenceAssets);
  public readonly activity: Activity;
  public largeImage: Snowflake | null;
  public largeText: string | null;
  public smallImage: Snowflake | null;
  public smallText: string | null;
  public largeImageURL(options?: ImageURLOptions): string | null;
  public smallImageURL(options?: ImageURLOptions): string | null;
}

export interface RoleColors {
  primaryColor: number;
  secondaryColor: number | null;
  tertiaryColor: number | null;
}

export interface RoleColorsResolvable extends RoleColorsEditResolvable {
  primaryColor: ColorResolvable;
  secondaryColor?: ColorResolvable;
  tertiaryColor?: ColorResolvable;
}

export interface RoleColorsEditResolvable {
  primaryColor: ColorResolvable;
  secondaryColor?: ColorResolvable | null;
  tertiaryColor?: ColorResolvable | null;
}

export class BaseRole extends Base {
  protected constructor(client: Client<true>, data: APIInviteRole | APIRole);
  /** @deprecated Use {@link Role.colors} instead. */
  public color: number;
  public colors: RoleColors;
  public get createdAt(): Date;
  public get createdTimestamp(): number;
  public get hexColor(): HexColorString;
  public id: Snowflake;
  public name: string;
  public rawPosition: number;
  public icon: string | null;
  public unicodeEmoji: string | null;
  public iconURL(options?: ImageURLOptions): string | null;
  public toJSON(): unknown;
  public toString(): RoleMention;
}

export class InviteRole extends BaseRole {
  private constructor(client: Client<true>, data: APIInviteRole);
}

export class Role extends BaseRole {
  private constructor(client: Client<true>, data: APIRole, guild: Guild);
  public get editable(): boolean;
  public flags: RoleFlagsBitField;
  public guild: Guild;
  public hoist: boolean;
  public managed: boolean;
  public get members(): Collection<Snowflake, GuildMember>;
  public mentionable: boolean;
  public permissions: Readonly<PermissionsBitField>;
  public get position(): number;
  public tags: RoleTagData | null;
  public comparePositionTo(role: RoleResolvable): number;
  public delete(reason?: string): Promise<Role>;
  public edit(options: RoleEditOptions): Promise<Role>;
  public equals(role: Role): boolean;
  public permissionsIn(
    channel: NonThreadGuildBasedChannel | Snowflake,
    checkAdmin?: boolean,
  ): Readonly<PermissionsBitField>;
  /** @deprecated Use {@link Role.setColors} instead. */
  public setColor(color: ColorResolvable, reason?: string): Promise<Role>;
  public setColors(colors: RoleColorsResolvable, reason?: string): Promise<Role>;
  public setHoist(hoist?: boolean, reason?: string): Promise<Role>;
  public setMentionable(mentionable?: boolean, reason?: string): Promise<Role>;
  public setName(name: string, reason?: string): Promise<Role>;
  public setPermissions(permissions: PermissionResolvable, reason?: string): Promise<Role>;
  public setIcon(icon: BufferResolvable | Base64Resolvable | EmojiResolvable | null, reason?: string): Promise<Role>;
  public setPosition(position: number, options?: SetRolePositionOptions): Promise<Role>;
  public setUnicodeEmoji(unicodeEmoji: string | null, reason?: string): Promise<Role>;
}

export type RoleFlagsString = keyof typeof RoleFlags;

export class RoleFlagsBitField extends BitField<RoleFlagsString> {
  public static Flags: typeof RoleFlags;
  public static resolve(bit?: BitFieldResolvable<RoleFlagsString, number>): number;
}

export interface SectionComponentData extends BaseComponentData {
  accessory: ButtonComponentData | ThumbnailComponentData;
  components: readonly TextDisplayComponentData[];
}

export class SectionComponent<
  AccessoryType extends ButtonComponent | ThumbnailComponent = ButtonComponent | ThumbnailComponent,
> extends Component<APISectionComponent> {
  private constructor(data: APISectionComponent);
  public readonly accessory: AccessoryType;
  public readonly components: TextDisplayComponent[];
  public toJSON(): APISectionComponent;
}

export type SelectMenuType = APISelectMenuComponent['type'];

export interface SeparatorComponentData extends BaseComponentData {
  spacing?: SeparatorSpacingSize;
  divider?: boolean;
}
export class SeparatorComponent extends Component<APISeparatorComponent> {
  private constructor(data: APISeparatorComponent);
  public get spacing(): SeparatorSpacingSize;
  public get divider(): boolean;
}

export {
  DeconstructedSnowflake,
  DiscordSnowflake as SnowflakeUtil,
  SnowflakeGenerateOptions,
} from '@sapphire/snowflake';

export class StageChannel extends BaseGuildVoiceChannel {
  public get stageInstance(): StageInstance | null;
  public topic: string | null;
  public type: ChannelType.GuildStageVoice;
  public createStageInstance(options: StageInstanceCreateOptions): Promise<StageInstance>;
  public setTopic(topic: string): Promise<StageChannel>;
}

export class DirectoryChannel extends BaseChannel {
  public flags: Readonly<ChannelFlagsBitField>;
  public guild: InviteGuild;
  public guildId: Snowflake;
  public name: string;
  public toString(): ChannelMention;
}

export class StageInstance extends Base {
  private constructor(client: Client<true>, data: RawStageInstanceData, channel: StageChannel);
  public id: Snowflake;
  public guildId: Snowflake;
  public channelId: Snowflake;
  public topic: string;
  public privacyLevel: StageInstancePrivacyLevel;
  /** @deprecated See https://github.com/discord/discord-api-docs/pull/4296 for more information */
  public discoverableDisabled: boolean | null;
  public guildScheduledEventId?: Snowflake;
  public get channel(): StageChannel | null;
  public get guild(): Guild | null;
  public get guildScheduledEvent(): GuildScheduledEvent | null;
  public edit(options: StageInstanceEditOptions): Promise<StageInstance>;
  public delete(): Promise<StageInstance>;
  public setTopic(topic: string): Promise<StageInstance>;
  public get createdTimestamp(): number;
  public get createdAt(): Date;
}

export class Sticker extends Base {
  private constructor(client: Client<true>, data: RawStickerData);
  public get createdTimestamp(): number;
  public get createdAt(): Date;
  public available: boolean | null;
  public description: string | null;
  public format: StickerFormatType;
  public get guild(): Guild | null;
  public guildId: Snowflake | null;
  public id: Snowflake;
  public name: string;
  public packId: Snowflake | null;
  public get partial(): boolean;
  public sortValue: number | null;
  public tags: string | null;
  public type: StickerType | null;
  public user: User | null;
  public get url(): string;
  public fetch(): Promise<Sticker>;
  public fetchPack(): Promise<StickerPack | null>;
  public fetchUser(): Promise<User | null>;
  public edit(options?: GuildStickerEditOptions): Promise<Sticker>;
  public delete(reason?: string): Promise<Sticker>;
  public equals(other: Sticker | unknown): boolean;
}

export class StickerPack extends Base {
  private constructor(client: Client<true>, data: RawStickerPackData);
  public get createdTimestamp(): number;
  public get createdAt(): Date;
  public bannerId: Snowflake | null;
  public get coverSticker(): Sticker | null;
  public coverStickerId: Snowflake | null;
  public description: string;
  public id: Snowflake;
  public name: string;
  public skuId: Snowflake;
  public stickers: Collection<Snowflake, Sticker>;
  public bannerURL(options?: ImageURLOptions): string | null;
}

export class Sweepers {
  public constructor(client: Client<true>, options: SweeperOptions);
  public readonly client: Client;
  public intervals: Record<SweeperKey, NodeJS.Timeout | null>;
  public options: SweeperOptions;

  public sweepAutoModerationRules(
    filter: CollectionSweepFilter<
      SweeperDefinitions['autoModerationRules'][0],
      SweeperDefinitions['autoModerationRules'][1]
    >,
  ): number;
  public sweepBans(filter: CollectionSweepFilter<SweeperDefinitions['bans'][0], SweeperDefinitions['bans'][1]>): number;
  public sweepEmojis(
    filter: CollectionSweepFilter<SweeperDefinitions['emojis'][0], SweeperDefinitions['emojis'][1]>,
  ): number;
  public sweepInvites(
    filter: CollectionSweepFilter<SweeperDefinitions['invites'][0], SweeperDefinitions['invites'][1]>,
  ): number;
  public sweepGuildMembers(
    filter: CollectionSweepFilter<SweeperDefinitions['guildMembers'][0], SweeperDefinitions['guildMembers'][1]>,
  ): number;
  public sweepMessages(
    filter: CollectionSweepFilter<SweeperDefinitions['messages'][0], SweeperDefinitions['messages'][1]>,
  ): number;
  public sweepPresences(
    filter: CollectionSweepFilter<SweeperDefinitions['presences'][0], SweeperDefinitions['presences'][1]>,
  ): number;
  public sweepReactions(
    filter: CollectionSweepFilter<SweeperDefinitions['reactions'][0], SweeperDefinitions['reactions'][1]>,
  ): number;
  public sweepStageInstances(
    filter: CollectionSweepFilter<SweeperDefinitions['stageInstances'][0], SweeperDefinitions['stageInstances'][1]>,
  ): number;
  public sweepStickers(
    filter: CollectionSweepFilter<SweeperDefinitions['stickers'][0], SweeperDefinitions['stickers'][1]>,
  ): number;
  public sweepThreadMembers(
    filter: CollectionSweepFilter<SweeperDefinitions['threadMembers'][0], SweeperDefinitions['threadMembers'][1]>,
  ): number;
  public sweepThreads(
    filter: CollectionSweepFilter<SweeperDefinitions['threads'][0], SweeperDefinitions['threads'][1]>,
  ): number;
  public sweepUsers(
    filter: CollectionSweepFilter<SweeperDefinitions['users'][0], SweeperDefinitions['users'][1]>,
  ): number;
  public sweepVoiceStates(
    filter: CollectionSweepFilter<SweeperDefinitions['voiceStates'][0], SweeperDefinitions['voiceStates'][1]>,
  ): number;

  public static archivedThreadSweepFilter(
    lifetime?: number,
  ): GlobalSweepFilter<SweeperDefinitions['threads'][0], SweeperDefinitions['threads'][1]>;
  public static expiredInviteSweepFilter(
    lifetime?: number,
  ): GlobalSweepFilter<SweeperDefinitions['invites'][0], SweeperDefinitions['invites'][1]>;
  public static filterByLifetime<Key, Value>(
    options?: LifetimeFilterOptions<Key, Value>,
  ): GlobalSweepFilter<Key, Value>;
  public static outdatedMessageSweepFilter(
    lifetime?: number,
  ): GlobalSweepFilter<SweeperDefinitions['messages'][0], SweeperDefinitions['messages'][1]>;
}

export type SystemChannelFlagsString = keyof typeof GuildSystemChannelFlags;

export class SystemChannelFlagsBitField extends BitField<SystemChannelFlagsString> {
  public static Flags: typeof GuildSystemChannelFlags;
  public static resolve(bit?: BitFieldResolvable<SystemChannelFlagsString, number>): number;
}

export class Team extends Base {
  private constructor(client: Client<true>, data: RawTeamData);
  public id: Snowflake;
  public name: string;
  public icon: string | null;
  public ownerId: Snowflake | null;
  public members: Collection<Snowflake, TeamMember>;
  public get owner(): TeamMember | null;
  public get createdAt(): Date;
  public get createdTimestamp(): number;

  public iconURL(options?: ImageURLOptions): string | null;
  public toJSON(): unknown;
  public toString(): string;
}

export class TeamMember extends Base {
  private constructor(team: Team, data: RawTeamMemberData);
  public team: Team;
  public get id(): Snowflake;
  /** @deprecated Use {@link TeamMember.role} instead. */
  public permissions: string[];
  public membershipState: TeamMemberMembershipState;
  public user: User;
  public role: TeamMemberRole;

  public toString(): UserMention;
}

export class TextChannel extends BaseGuildTextChannel {
  public rateLimitPerUser: number;
  public threads: GuildTextThreadManager<AllowedThreadTypeForTextChannel>;
  public type: ChannelType.GuildText;
}

export interface TextDisplayComponentData extends BaseComponentData {
  content: string;
}

export class TextDisplayComponent extends Component<APITextDisplayComponent> {
  private constructor(data: APITextDisplayComponent);
  public readonly content: string;
}

export type ForumThreadChannel = PublicThreadChannel<true>;
export type TextThreadChannel = PublicThreadChannel<false> | PrivateThreadChannel;
export type AnyThreadChannel = TextThreadChannel | ForumThreadChannel;

export interface PublicThreadChannel<Forum extends boolean = boolean> extends ThreadChannel<Forum> {
  type: ChannelType.PublicThread | ChannelType.AnnouncementThread;
}

export interface PrivateThreadChannel extends ThreadChannel<false> {
  get createdTimestamp(): number;
  get createdAt(): Date;
  type: ChannelType.PrivateThread;
}

// tslint:disable-next-line no-empty-interface
export interface ThreadChannel<ThreadOnly extends boolean = boolean>
  extends Omit<TextBasedChannelFields<true>, 'fetchWebhooks' | 'createWebhook' | 'setNSFW'> {}
export class ThreadChannel<ThreadOnly extends boolean = boolean> extends BaseChannel {
  private constructor(guild: Guild, data: RawThreadChannelData, client?: Client<true>);
  public archived: boolean | null;
  public get archivedAt(): Date | null;
  public archiveTimestamp: number | null;
  public get createdAt(): Date | null;
  private _createdTimestamp: number | null;
  public get createdTimestamp(): number | null;
  public autoArchiveDuration: ThreadAutoArchiveDuration | null;
  public get editable(): boolean;
  public flags: Readonly<ChannelFlagsBitField>;
  public guild: Guild;
  public guildId: Snowflake;
  public get guildMembers(): Collection<Snowflake, GuildMember>;
  public invitable: boolean | null;
  public get joinable(): boolean;
  public get joined(): boolean;
  public locked: boolean | null;
  public get manageable(): boolean;
  public get viewable(): boolean;
  public get sendable(): boolean;
  public memberCount: number | null;
  public messageCount: number | null;
  public appliedTags: Snowflake[];
  public totalMessageSent: number | null;
  public members: ThreadMemberManager;
  public name: string;
  public ownerId: Snowflake;
  public get parent(): If<ThreadOnly, ForumChannel | MediaChannel, TextChannel | NewsChannel> | null;
  public parentId: Snowflake | null;
  public rateLimitPerUser: number | null;
  public type: ThreadChannelType;
  public get unarchivable(): boolean;
  public delete(reason?: string): Promise<this>;
  public edit(options: ThreadEditOptions): Promise<this>;
  public join(): Promise<this>;
  public leave(): Promise<this>;
  public permissionsFor(memberOrRole: GuildMember | Role, checkAdmin?: boolean): Readonly<PermissionsBitField>;
  public permissionsFor(
    memberOrRole: GuildMemberResolvable | RoleResolvable,
    checkAdmin?: boolean,
  ): Readonly<PermissionsBitField> | null;
  public fetchOwner(options?: FetchThreadOwnerOptions): Promise<ThreadMember | null>;
  public fetchStarterMessage(options?: BaseFetchOptions): Promise<Message<true> | null>;
  public setArchived(archived?: boolean, reason?: string): Promise<this>;
  public setAutoArchiveDuration(autoArchiveDuration: ThreadAutoArchiveDuration, reason?: string): Promise<this>;
  public setInvitable(invitable?: boolean, reason?: string): Promise<this>;
  public setLocked(locked?: boolean, reason?: string): Promise<this>;
  public setName(name: string, reason?: string): Promise<this>;
  // The following 3 methods can only be run on forum threads.
  public setAppliedTags(appliedTags: readonly Snowflake[], reason?: string): Promise<If<ThreadOnly, this, never>>;
  public pin(reason?: string): Promise<If<ThreadOnly, this, never>>;
  public unpin(reason?: string): Promise<If<ThreadOnly, this, never>>;
  public toString(): ChannelMention;
}

export class ThreadMember<HasMemberData extends boolean = boolean> extends Base {
  private constructor(thread: ThreadChannel, data: RawThreadMemberData, extra?: unknown);
  public flags: ThreadMemberFlagsBitField;
  private member: If<HasMemberData, GuildMember>;
  public get guildMember(): HasMemberData extends true ? GuildMember : GuildMember | null;
  public id: Snowflake;
  public get joinedAt(): Date | null;
  public joinedTimestamp: number | null;
  public get manageable(): boolean;
  public thread: AnyThreadChannel;
  public get user(): User | null;
  public get partial(): false;
  /* tslint:disable:unified-signatures */
  public remove(): Promise<ThreadMember>;
  /** @deprecated The `reason` parameter is deprecated as Discord does not parse them. */
  public remove(reason?: string): Promise<ThreadMember>;
  /* tslint:enable:unified-signatures */
}

export type ThreadMemberFlagsString = keyof typeof ThreadMemberFlags;

export class ThreadMemberFlagsBitField extends BitField<ThreadMemberFlagsString> {
  public static Flags: typeof ThreadMemberFlags;
  public static resolve(bit?: BitFieldResolvable<ThreadMemberFlagsString, number>): number;
}

export interface ThumbnailComponentData extends BaseComponentData {
  media: UnfurledMediaItemData;
  description?: string;
  spoiler?: boolean;
}

export class ThumbnailComponent extends Component<APIThumbnailComponent> {
  private constructor(data: APIThumbnailComponent);
  public readonly media: UnfurledMediaItem;
  public get description(): string | null;
  public get spoiler(): boolean;
}

export class Typing extends Base {
  private constructor(channel: TextBasedChannel, user: PartialUser, data?: RawTypingData);
  public channel: TextBasedChannel;
  public user: User | PartialUser;
  public startedTimestamp: number;
  public get startedAt(): Date;
  public get guild(): Guild | null;
  public get member(): GuildMember | null;
  public inGuild(): this is this & {
    channel: TextChannel | NewsChannel | ThreadChannel;
    get guild(): Guild;
  };
}

export interface AvatarDecorationData {
  asset: string;
  skuId: Snowflake;
}

export interface Collectibles {
  nameplate: NameplateData | null;
}

export interface UserPrimaryGuild {
  badge: string | null;
  identityEnabled: boolean | null;
  identityGuildId: Snowflake | null;
  tag: string | null;
}

export interface NameplateData {
  asset: string;
  label: string;
  palette: NameplatePalette;
  skuId: Snowflake;
}

export interface UnfurledMediaItemData {
  url: string;
}

export class UnfurledMediaItem {
  private constructor(data: APIUnfurledMediaItem);
  public readonly data: APIUnfurledMediaItem;
  public get url(): string;
}

// tslint:disable-next-line no-empty-interface
export interface User extends PartialTextBasedChannelFields<false> {}
export class User extends Base {
  protected constructor(client: Client<true>, data: RawUserData);
  private _equals(user: APIUser): boolean;

  public accentColor: number | null | undefined;
  public avatar: string | null;
  /** @deprecated Use {@link User.avatarDecorationData} instead */
  public avatarDecoration: string | null;
  public avatarDecorationData: AvatarDecorationData | null;
  public banner: string | null | undefined;
  public bot: boolean;
  public get createdAt(): Date;
  public get createdTimestamp(): number;
  public collectibles: Collectibles | null;
  public discriminator: string;
  public get displayName(): string;
  public get defaultAvatarURL(): string;
  public get dmChannel(): DMChannel | null;
  public flags: Readonly<UserFlagsBitField> | null;
  public globalName: string | null;
  public get hexAccentColor(): HexColorString | null | undefined;
  public id: Snowflake;
  public get partial(): false;
  public primaryGuild: UserPrimaryGuild | null;
  public system: boolean;
  public get tag(): string;
  public username: string;
  public avatarURL(options?: ImageURLOptions): string | null;
  public avatarDecorationURL(options?: BaseImageURLOptions): string | null;
  public bannerURL(options?: ImageURLOptions): string | null | undefined;
  public guildTagBadgeURL(options?: ImageURLOptions): string | null;
  public createDM(force?: boolean): Promise<DMChannel>;
  public deleteDM(): Promise<DMChannel>;
  public displayAvatarURL(options?: ImageURLOptions): string;
  public equals(user: User): boolean;
  public fetch(force?: boolean): Promise<User>;
  /** @deprecated This method is deprecated and will be removed in the next major version. Flags may still be retrieved via {@link User.fetch} */
  public fetchFlags(force?: boolean): Promise<UserFlagsBitField>;
  public toString(): UserMention;
}

export type UserFlagsString = keyof typeof UserFlags;

export class UserFlagsBitField extends BitField<UserFlagsString> {
  public static Flags: typeof UserFlags;
  public static resolve(bit?: BitFieldResolvable<UserFlagsString, number>): number;
}

/** @internal */
export function basename(path: string, ext?: string): string;
export function cleanContent(str: string, channel: TextBasedChannel): string;
export function discordSort<Key, Value extends { rawPosition: number; id: Snowflake }>(
  collection: ReadonlyCollection<Key, Value>,
): Collection<Key, Value>;
export function cleanCodeBlockContent(text: string): string;
export function flatten(obj: unknown, ...props: Record<string, boolean | string>[]): unknown;
/** @internal */
export function moveElementInArray(array: unknown[], element: unknown, newIndex: number, offset?: boolean): number;
export function parseEmoji(text: string): PartialEmoji | null;
export function resolveColor(color: ColorResolvable): number;
/** @internal */
export function resolvePartialEmoji(emoji: Snowflake): PartialEmojiOnlyId;
/** @internal */
export function resolvePartialEmoji(emoji: Emoji | EmojiIdentifierResolvable): PartialEmoji | null;
export function verifyString(data: string, error?: typeof Error, errorMessage?: string, allowEmpty?: boolean): string;
/** @internal */
export function setPosition<Item extends Channel | Role>(
  item: Item,
  position: number,
  relative: boolean,
  sorted: ReadonlyCollection<Snowflake, Item>,
  client: Client<true>,
  route: string,
  reason?: string,
): Promise<{ id: Snowflake; position: number }[]>;
export function parseWebhookURL(url: string): WebhookClientDataIdWithToken | null;
/** @internal */
export function transformResolved<Cached extends CacheType>(
  supportingData: SupportingInteractionResolvedData,
  data?: Extract<
    APIApplicationCommandInteractionData,
    APIChatInputApplicationCommandInteractionData | APIContextMenuInteractionData
  >['resolved'],
): CommandInteractionResolvedData<Cached>;

/** @internal */
export interface CreateChannelOptions {
  allowFromUnknownGuild?: boolean;
}

/** @internal */
export function createChannel(
  client: Client<true>,
  data: APIChannel,
  guild?: Guild,
  extras?: CreateChannelOptions,
): Channel;

/** @deprecated This class is redundant as all methods of the class can be imported from discord.js directly. */
export class Formatters extends null {
  /** @deprecated Import this method directly from discord.js instead. */
  public static blockQuote: typeof blockQuote;
  /** @deprecated Import this method directly from discord.js instead. */
  public static bold: typeof bold;
  /** @deprecated Import this method directly from discord.js instead. */
  public static channelMention: typeof channelMention;
  /** @deprecated Import this method directly from discord.js instead. */
  public static codeBlock: typeof codeBlock;
  /** @deprecated Import this method directly from discord.js instead. */
  public static formatEmoji: typeof formatEmoji;
  /** @deprecated Import this method directly from discord.js instead. */
  public static hideLinkEmbed: typeof hideLinkEmbed;
  /** @deprecated Import this method directly from discord.js instead. */
  public static hyperlink: typeof hyperlink;
  /** @deprecated Import this method directly from discord.js instead. */
  public static inlineCode: typeof inlineCode;
  /** @deprecated Import this method directly from discord.js instead. */
  public static italic: typeof italic;
  /** @deprecated Import this method directly from discord.js instead. */
  public static quote: typeof quote;
  /** @deprecated Import this method directly from discord.js instead. */
  public static roleMention: typeof roleMention;
  /** @deprecated Import this method directly from discord.js instead. */
  public static spoiler: typeof spoiler;
  /** @deprecated Import this method directly from discord.js instead. */
  public static strikethrough: typeof strikethrough;
  /** @deprecated Import this method directly from discord.js instead. */
  public static time: typeof time;
  /** @deprecated Import this property directly from discord.js instead. */
  public static TimestampStyles: typeof TimestampStyles;
  /** @deprecated Import this method directly from discord.js instead. */
  public static underscore: typeof underscore;
  /** @deprecated Import this method directly from discord.js instead. */
  public static userMention: typeof userMention;
}

export type ComponentData =
  | MessageActionRowComponentData
  | ModalActionRowComponentData
  | LabelComponentData
  | ComponentInLabelData
  | ComponentInContainerData
  | ContainerComponentData
  | ThumbnailComponentData;

export interface SendSoundboardSoundOptions {
  soundId: Snowflake;
  guildId?: Snowflake;
}

export class VoiceChannel extends BaseGuildVoiceChannel {
  public get speakable(): boolean;
  public type: ChannelType.GuildVoice;
  public sendSoundboardSound(sound: SoundboardSound | SendSoundboardSoundOptions): Promise<void>;
}

export class VoiceChannelEffect {
  private constructor(data: GatewayVoiceChannelEffectSendDispatchData, guild: Guild);
  public guild: Guild;
  public channelId: Snowflake;
  public userId: Snowflake;
  public emoji: Emoji | null;
  public animationType: VoiceChannelEffectSendAnimationType | null;
  public animationId: number | null;
  public soundId: Snowflake | number | null;
  public soundVolume: number | null;
  public get channel(): VoiceChannel | null;
  public get soundboardSound(): GuildSoundboardSound | null;
}

export class VoiceRegion {
  private constructor(data: RawVoiceRegionData);
  public custom: boolean;
  public deprecated: boolean;
  public id: string;
  public name: string;
  public optimal: boolean;
  public toJSON(): unknown;
}

export class VoiceState extends Base {
  private constructor(guild: Guild, data: RawVoiceStateData);
  public get channel(): VoiceBasedChannel | null;
  public channelId: Snowflake | null;
  public get deaf(): boolean | null;
  public guild: Guild;
  public id: Snowflake;
  public get member(): GuildMember | null;
  public get mute(): boolean | null;
  public selfDeaf: boolean | null;
  public selfMute: boolean | null;
  public serverDeaf: boolean | null;
  public serverMute: boolean | null;
  public sessionId: string | null;
  public streaming: boolean | null;
  public selfVideo: boolean | null;
  public suppress: boolean | null;
  public requestToSpeakTimestamp: number | null;

  public setDeaf(deaf?: boolean, reason?: string): Promise<GuildMember>;
  public setMute(mute?: boolean, reason?: string): Promise<GuildMember>;
  public disconnect(reason?: string): Promise<GuildMember>;
  public setChannel(channel: GuildVoiceChannelResolvable | null, reason?: string): Promise<GuildMember>;
  public setRequestToSpeak(request?: boolean): Promise<this>;
  public setSuppressed(suppressed?: boolean): Promise<this>;
  public edit(options: VoiceStateEditOptions): Promise<this>;
  public fetch(force?: boolean): Promise<VoiceState>;
}

// tslint:disable-next-line no-empty-interface
export interface Webhook<Type extends WebhookType = WebhookType> extends WebhookFields {}
export class Webhook<Type extends WebhookType = WebhookType> {
  private constructor(client: Client<true>, data: RawWebhookData);
  public avatar: string | null;
  public avatarURL(options?: ImageURLOptions): string | null;
  public channelId: Snowflake;
  public readonly client: Client;
  public guildId: Snowflake;
  public name: string;
  public owner: Type extends WebhookType.Incoming ? User | APIUser | null : User | APIUser;
  public sourceGuild: Type extends WebhookType.ChannelFollower ? Guild | APIPartialGuild : null;
  public sourceChannel: Type extends WebhookType.ChannelFollower ? NewsChannel | APIPartialChannel : null;
  public token: Type extends WebhookType.Incoming
    ? string
    : Type extends WebhookType.ChannelFollower
      ? null
      : string | null;
  public type: Type;
  public applicationId: Type extends WebhookType.Application ? Snowflake : null;
  public get channel(): TextChannel | VoiceChannel | NewsChannel | StageChannel | ForumChannel | MediaChannel | null;
  public isUserCreated(): this is Webhook<WebhookType.Incoming> & {
    owner: User | APIUser;
  };
  public isApplicationCreated(): this is Webhook<WebhookType.Application>;
  public isIncoming(): this is Webhook<WebhookType.Incoming>;
  public isChannelFollower(): this is Webhook<WebhookType.ChannelFollower>;

  public editMessage(
    message: MessageResolvable,
    options: string | MessagePayload | WebhookMessageEditOptions,
  ): Promise<Message<true>>;
  public fetchMessage(message: Snowflake, options?: WebhookFetchMessageOptions): Promise<Message<true>>;
  public send(options: string | MessagePayload | WebhookMessageCreateOptions): Promise<Message<true>>;
}

// tslint:disable-next-line no-empty-interface
export interface WebhookClient extends WebhookFields, BaseClient {}
export class WebhookClient extends BaseClient {
  public constructor(data: WebhookClientData, options?: WebhookClientOptions);
  public readonly client: this;
  public options: WebhookClientOptions;
  public token: string;
  public editMessage(
    message: MessageResolvable,
    options: string | MessagePayload | WebhookMessageEditOptions,
  ): Promise<APIMessage>;
  public fetchMessage(message: Snowflake, options?: WebhookFetchMessageOptions): Promise<APIMessage>;
  public send(options: string | MessagePayload | WebhookMessageCreateOptions): Promise<APIMessage>;
}

export class WebSocketManager extends EventEmitter {
  private constructor(client: Client);
  private readonly packetQueue: unknown[];
  private destroyed: boolean;

  public readonly client: Client;
  public gateway: string | null;
  public shards: Collection<number, WebSocketShard>;
  public status: Status;
  public get ping(): number;

  public on(event: GatewayDispatchEvents, listener: (data: any, shardId: number) => void): this;
  public once(event: GatewayDispatchEvents, listener: (data: any, shardId: number) => void): this;

  private debug(messages: readonly string[], shardId?: number): void;
  private connect(): Promise<void>;
  private broadcast(packet: unknown): void;
  private destroy(): Promise<void>;
  private handlePacket(packet?: unknown, shard?: WebSocketShard): boolean;
  private checkShardsReady(): void;
  private triggerClientReady(): void;
}

export interface WebSocketShardEventTypes {
  ready: [];
  resumed: [];
  invalidSession: [];
  destroyed: [];
  close: [event: CloseEvent];
  allReady: [unavailableGuilds?: Set<Snowflake>];
}

export class WebSocketShard extends EventEmitter {
  private constructor(manager: WebSocketManager, id: number);
  private closeSequence: number;
  private sessionInfo: SessionInfo | null;
  public lastPingTimestamp: number;
  private expectedGuilds: Set<Snowflake> | null;
  private readyTimeout: NodeJS.Timeout | null;

  public manager: WebSocketManager;
  public id: number;
  public status: Status;
  public ping: number;

  private debug(messages: readonly string[]): void;
  private onReadyPacket(packet: unknown): void;
  private gotGuild(guildId: Snowflake): void;
  private checkReady(): void;
  private emitClose(event?: CloseEvent): void;

  public send(data: unknown, important?: boolean): void;

  public on<Event extends keyof WebSocketShardEventTypes>(
    event: Event,
    listener: (...args: WebSocketShardEventTypes[Event]) => void,
  ): this;

  public once<Event extends keyof WebSocketShardEventTypes>(
    event: Event,
    listener: (...args: WebSocketShardEventTypes[Event]) => void,
  ): this;
}

export class Widget extends Base {
  private constructor(client: Client<true>, data: RawWidgetData);
  private _patch(data: RawWidgetData): void;
  public fetch(): Promise<Widget>;
  public imageURL(style?: GuildWidgetStyle): string;
  public id: Snowflake;
  public name: string;
  public instantInvite?: string;
  public channels: Collection<Snowflake, WidgetChannel>;
  public members: Collection<string, WidgetMember>;
  public presenceCount: number;
}

export class WidgetMember extends Base {
  private constructor(client: Client<true>, data: RawWidgetMemberData);
  public id: string;
  public username: string;
  public discriminator: string;
  public avatar: string | null;
  public status: PresenceStatus;
  public deaf: boolean | null;
  public mute: boolean | null;
  public selfDeaf: boolean | null;
  public selfMute: boolean | null;
  public suppress: boolean | null;
  public channelId: Snowflake | null;
  public avatarURL: string;
  public activity: WidgetActivity | null;
}

export type SoundboardSoundResolvable = SoundboardSound | Snowflake | string;

export class SoundboardSound extends Base {
  private constructor(client: Client<true>, data: APISoundboardSound);
  public name: string;
  public soundId: Snowflake | string;
  public volume: number;
  private _emoji: Omit<APIEmoji, 'animated'> | null;
  public guildId: Snowflake | null;
  public available: boolean;
  public user: User | null;
  public get createdAt(): Date;
  public get createdTimestamp(): number;
  public get emoji(): Emoji | null;
  public get guild(): Guild | null;
  public get url(): string;
  public edit(options?: GuildSoundboardSoundEditOptions): Promise<GuildSoundboardSound>;
  public delete(reason?: string): Promise<GuildSoundboardSound>;
  public equals(other: SoundboardSound | APISoundboardSound): boolean;
}

export type DefaultSoundboardSound = SoundboardSound & { get guild(): null; guildId: null; soundId: string };
export type GuildSoundboardSound = SoundboardSound & { get guild(): Guild; guildId: Snowflake; soundId: Snowflake };

export class WelcomeChannel extends Base {
  private constructor(guild: Guild, data: RawWelcomeChannelData);
  private _emoji: Omit<APIEmoji, 'animated'>;
  public channelId: Snowflake;
  public guild: Guild | InviteGuild;
  public description: string;
  public get channel(): TextChannel | NewsChannel | ForumChannel | MediaChannel | null;
  public get emoji(): GuildEmoji | Emoji;
}

export class WelcomeScreen extends Base {
  private constructor(guild: Guild, data: RawWelcomeScreenData);
  public get enabled(): boolean;
  public guild: Guild | InviteGuild;
  public description: string | null;
  public welcomeChannels: Collection<Snowflake, WelcomeChannel>;
}

//#endregion

//#region Constants

export type NonSystemMessageType =
  | MessageType.Default
  | MessageType.Reply
  | MessageType.ChatInputCommand
  | MessageType.ContextMenuCommand;

export type UndeletableMessageType =
  | MessageType.RecipientAdd
  | MessageType.RecipientRemove
  | MessageType.Call
  | MessageType.ChannelNameChange
  | MessageType.ChannelIconChange
  | MessageType.ThreadStarterMessage;

/** @deprecated This type will no longer be updated. Use {@link UndeletableMessageType} instead. */
export type DeletableMessageType =
  | MessageType.AutoModerationAction
  | MessageType.ChannelFollowAdd
  | MessageType.ChannelPinnedMessage
  | MessageType.ChatInputCommand
  | MessageType.ContextMenuCommand
  | MessageType.Default
  | MessageType.GuildBoost
  | MessageType.GuildBoostTier1
  | MessageType.GuildBoostTier2
  | MessageType.GuildBoostTier3
  | MessageType.GuildInviteReminder
  | MessageType.InteractionPremiumUpsell
  | MessageType.Reply
  | MessageType.RoleSubscriptionPurchase
  | MessageType.StageEnd
  | MessageType.StageRaiseHand
  | MessageType.StageSpeaker
  | MessageType.StageStart
  | MessageType.StageTopic
  | MessageType.ThreadCreated
  | MessageType.UserJoin;

export const Constants: {
  HolographicStyle: {
    Primary: 11_127_295;
    Secondary: 16_759_788;
    Tertiary: 16_761_760;
  };
  MaxBulkDeletableMessageAge: 1_209_600_000;
  SweeperKeys: SweeperKey[];
  NonSystemMessageTypes: NonSystemMessageType[];
  TextBasedChannelTypes: TextBasedChannelTypes[];
  SendableChannels: SendableChannelTypes[];
  GuildTextBasedChannelTypes: GuildTextBasedChannelTypes[];
  ThreadChannelTypes: ThreadChannelType[];
  VoiceBasedChannelTypes: VoiceBasedChannelTypes[];
  SelectMenuTypes: SelectMenuType[];
  UndeletableMessageTypes: UndeletableMessageType[];
  /** @deprecated This list will no longer be updated. Use {@link Constants.UndeletableMessageTypes} instead. */
  DeletableMessageTypes: DeletableMessageType[];
  StickerFormatExtensionMap: Record<StickerFormatType, ImageFormat>;
};

export const version: string;

//#endregion

//#region Errors
export enum DiscordjsErrorCodes {
  ClientInvalidOption = 'ClientInvalidOption',
  CaptchaRequired = 'CaptchaRequired',
  MFARequired = 'MFARequired',
  RemoteAuthFailed = 'RemoteAuthFailed',

  TokenInvalid = 'TokenInvalid',

  BitFieldInvalid = 'BitFieldInvalid',

  ColorRange = 'ColorRange',
  ColorConvert = 'ColorConvert',

  InviteOptionsMissingChannel = 'InviteOptionsMissingChannel',

  FileNotFound = 'FileNotFound',

  UserNoDMChannel = 'UserNoDMChannel',

  VoiceNotStageChannel = 'VoiceNotStageChannel',

  VoiceStateNotOwn = 'VoiceStateNotOwn',
  VoiceStateInvalidType = 'VoiceStateInvalidType',

  ReqResourceType = 'ReqResourceType',

  MessageBulkDeleteType = 'MessageBulkDeleteType',
  MessageContentType = 'MessageContentType',
  MessageEmbedsUserAccount = 'MessageEmbedsUserAccount',
  MessageNonceRequired = 'MessageNonceRequired',
  MessageNonceType = 'MessageNonceType',

  BanResolveId = 'BanResolveId',
  FetchBanResolveId = 'FetchBanResolveId',

  PruneDaysType = 'PruneDaysType',

  GuildChannelResolve = 'GuildChannelResolve',
  GuildVoiceChannelResolve = 'GuildVoiceChannelResolve',
  GuildChannelOrphan = 'GuildChannelOrphan',
  GuildChannelUnowned = 'GuildChannelUnowned',
  GuildOwned = 'GuildOwned',
  GuildMembersTimeout = 'GuildMembersTimeout',
  GuildMembersMissingPermissions = 'GuildMembersMissingPermissions',
  GuildSoundboardSoundsTimeout = 'GuildSoundboardSoundsTimeout',
  GuildUncachedMe = 'GuildUncachedMe',
  ChannelNotCached = 'ChannelNotCached',
  StageChannelResolve = 'StageChannelResolve',
  GuildScheduledEventResolve = 'GuildScheduledEventResolve',
  FetchOwnerId = 'FetchOwnerId',

  InvalidType = 'InvalidType',
  InvalidElement = 'InvalidElement',

  MessageThreadParent = 'MessageThreadParent',
  MessageExistingThread = 'MessageExistingThread',
  ThreadInvitableType = 'ThreadInvitableType',

  WebhookMessage = 'WebhookMessage',
  WebhookTokenUnavailable = 'WebhookTokenUnavailable',
  WebhookURLInvalid = 'WebhookURLInvalid',
  WebhookApplication = 'WebhookApplication',
  MessageReferenceMissing = 'MessageReferenceMissing',

  EmojiType = 'EmojiType',
  EmojiManaged = 'EmojiManaged',
  MissingManageGuildExpressionsPermission = 'MissingManageGuildExpressionsPermission',

  NotGuildSoundboardSound = 'NotGuildSoundboardSound',
  NotGuildSticker = 'NotGuildSticker',

  ReactionResolveUser = 'ReactionResolveUser',

  InviteResolveCode = 'InviteResolveCode',

  InviteNotFound = 'InviteNotFound',

  MemberFetchNonceLength = 'MemberFetchNonceLength',

  NotImplemented = 'NotImplemented',

  SweepFilterReturn = 'SweepFilterReturn',

  GuildForumMessageRequired = 'GuildForumMessageRequired',

  BulkBanUsersOptionEmpty = 'BulkBanUsersOptionEmpty',

  PollAlreadyExpired = 'PollAlreadyExpired',
}

export class DiscordjsError extends Error {
  private constructor(code: DiscordjsErrorCodes, ...args: unknown[]);
  public readonly code: DiscordjsErrorCodes;
  public get name(): `Error [${DiscordjsErrorCodes}]`;
}

export class DiscordjsTypeError extends TypeError {
  private constructor(code: DiscordjsErrorCodes, ...args: unknown[]);
  public readonly code: DiscordjsErrorCodes;
  public get name(): `TypeError [${DiscordjsErrorCodes}]`;
}

export class DiscordjsRangeError extends RangeError {
  private constructor(code: DiscordjsErrorCodes, ...args: unknown[]);
  public readonly code: DiscordjsErrorCodes;
  public get name(): `RangeError [${DiscordjsErrorCodes}]`;
}

//#endregion

//#region Managers

export abstract class BaseManager {
  protected constructor(client: Client);
  public readonly client: Client;
}

export abstract class DataManager<Key, Holds, Resolvable> extends BaseManager {
  protected constructor(client: Client<true>, holds: Constructable<Holds>);
  public readonly holds: Constructable<Holds>;
  public get cache(): Collection<Key, Holds>;
  public resolve(resolvable: Holds): Holds;
  public resolve(resolvable: Resolvable): Holds | null;
  public resolveId(resolvable: Key | Holds): Key;
  public resolveId(resolvable: Resolvable): Key | null;
  public valueOf(): Collection<Key, Holds>;
}

export abstract class CachedManager<Key, Holds, Resolvable> extends DataManager<Key, Holds, Resolvable> {
  protected constructor(client: Client<true>, holds: Constructable<Holds>, iterable?: Iterable<Holds>);
  private readonly _cache: Collection<Key, Holds>;
  private _add(data: unknown, cache?: boolean, { id, extras }?: { id: Key; extras: unknown[] }): Holds;
}

export class AutoModerationRuleManager extends CachedManager<
  Snowflake,
  AutoModerationRule,
  AutoModerationRuleResolvable
> {
  private constructor(guild: Guild, iterable: unknown);
  public guild: Guild;
  public create(options: AutoModerationRuleCreateOptions): Promise<AutoModerationRule>;
  public edit(
    autoModerationRule: AutoModerationRuleResolvable,
    options: AutoModerationRuleEditOptions,
  ): Promise<AutoModerationRule>;
  public fetch(options: AutoModerationRuleResolvable | FetchAutoModerationRuleOptions): Promise<AutoModerationRule>;
  public fetch(options?: FetchAutoModerationRulesOptions): Promise<Collection<Snowflake, AutoModerationRule>>;
  public delete(autoModerationRule: AutoModerationRuleResolvable, reason?: string): Promise<void>;
}

export class BaseGuildEmojiManager extends CachedManager<Snowflake, GuildEmoji, EmojiResolvable> {
  protected constructor(client: Client<true>, iterable?: Iterable<RawGuildEmojiData>);
  public resolveIdentifier(emoji: EmojiIdentifierResolvable): string | null;
}

export class CategoryChannelChildManager extends DataManager<Snowflake, CategoryChildChannel, GuildChannelResolvable> {
  private constructor(channel: CategoryChannel);

  public channel: CategoryChannel;
  public get guild(): Guild;
  public create<Type extends CategoryChannelType>(
    options: CategoryCreateChannelOptions & { type: Type },
  ): Promise<MappedChannelCategoryTypes[Type]>;
  public create(options: CategoryCreateChannelOptions): Promise<TextChannel>;
}

export class ChannelManager extends CachedManager<Snowflake, Channel, ChannelResolvable> {
  private constructor(client: Client<true>, iterable: Iterable<RawChannelData>);
  public fetch(id: Snowflake, options?: FetchChannelOptions): Promise<Channel | null>;
}

export type MappedGuildChannelTypes = {
  [ChannelType.GuildCategory]: CategoryChannel;
} & MappedChannelCategoryTypes;

export type GuildChannelTypes = CategoryChannelType | ChannelType.GuildCategory;

export class GuildChannelManager extends CachedManager<Snowflake, GuildBasedChannel, GuildChannelResolvable> {
  private constructor(guild: Guild, iterable?: Iterable<RawGuildChannelData>);
  public get channelCountWithoutThreads(): number;
  public guild: Guild;

  public addFollower(
    channel: NewsChannelResolvable,
    targetChannel: TextChannelResolvable,
    reason?: string,
  ): Promise<Snowflake>;
  public create<Type extends GuildChannelTypes>(
    options: GuildChannelCreateOptions & { type: Type },
  ): Promise<MappedGuildChannelTypes[Type]>;
  public create(options: GuildChannelCreateOptions): Promise<TextChannel>;
  public createWebhook(options: WebhookCreateOptions): Promise<Webhook<WebhookType.Incoming>>;
  public edit(channel: GuildChannelResolvable, data: GuildChannelEditOptions): Promise<GuildChannel>;
  public fetch(id: Snowflake, options?: BaseFetchOptions): Promise<GuildBasedChannel | null>;
  public fetch(
    id?: undefined,
    options?: BaseFetchOptions,
  ): Promise<Collection<Snowflake, NonThreadGuildBasedChannel | null>>;
  public fetchWebhooks(
    channel: GuildChannelResolvable,
  ): Promise<Collection<Snowflake, Webhook<WebhookType.ChannelFollower | WebhookType.Incoming>>>;
  public setPosition(
    channel: GuildChannelResolvable,
    position: number,
    options?: SetChannelPositionOptions,
  ): Promise<GuildChannel>;
  public setPositions(channelPositions: readonly ChannelPosition[]): Promise<Guild>;
  public delete(channel: GuildChannelResolvable, reason?: string): Promise<void>;
}

export class GuildEmojiManager extends BaseGuildEmojiManager {
  private constructor(guild: Guild, iterable?: Iterable<RawGuildEmojiData>);
  public guild: Guild;
  public create(options: GuildEmojiCreateOptions): Promise<GuildEmoji>;
  public fetch(id: Snowflake, options?: BaseFetchOptions): Promise<GuildEmoji>;
  public fetch(id?: undefined, options?: BaseFetchOptions): Promise<Collection<Snowflake, GuildEmoji>>;
  public fetchAuthor(emoji: EmojiResolvable): Promise<User>;
  public delete(emoji: EmojiResolvable, reason?: string): Promise<void>;
  public edit(emoji: EmojiResolvable, options: GuildEmojiEditOptions): Promise<GuildEmoji>;
}

export class GuildEmojiRoleManager extends DataManager<Snowflake, Role, RoleResolvable> {
  private constructor(emoji: GuildEmoji);
  public emoji: GuildEmoji;
  public guild: Guild;
  public add(
    roleOrRoles: RoleResolvable | readonly RoleResolvable[] | ReadonlyCollection<Snowflake, Role>,
  ): Promise<GuildEmoji>;
  public set(roles: readonly RoleResolvable[] | ReadonlyCollection<Snowflake, Role>): Promise<GuildEmoji>;
  public remove(
    roleOrRoles: RoleResolvable | readonly RoleResolvable[] | ReadonlyCollection<Snowflake, Role>,
  ): Promise<GuildEmoji>;
}

export interface FetchSoundboardSoundsOptions {
  guildIds: readonly Snowflake[];
  time?: number;
}

export class GuildManager extends CachedManager<Snowflake, Guild, GuildResolvable> {
  private constructor(client: Client<true>, iterable?: Iterable<RawGuildData>);
  /** @deprecated API related to guild ownership may no longer be used. */
  public create(options: GuildCreateOptions): Promise<Guild>;
  public fetch(options: Snowflake | FetchGuildOptions): Promise<Guild>;
  public fetch(options?: FetchGuildsOptions): Promise<Collection<Snowflake, OAuth2Guild>>;
  public fetchSoundboardSounds(
    options: FetchSoundboardSoundsOptions,
  ): Promise<Collection<Snowflake, Collection<Snowflake, GuildSoundboardSound>>>;
  public setIncidentActions(
    guild: GuildResolvable,
    incidentActions: IncidentActionsEditOptions,
  ): Promise<IncidentActions>;
  public widgetImageURL(guild: GuildResolvable, style?: GuildWidgetStyle): string;
}

export interface AddOrRemoveGuildMemberRoleOptions {
  user: GuildMemberResolvable;
  role: RoleResolvable;
  reason?: string;
}

export class GuildMemberManager extends CachedManager<Snowflake, GuildMember, GuildMemberResolvable> {
  private constructor(guild: Guild, iterable?: Iterable<RawGuildMemberData>);
  public guild: Guild;
  public get me(): GuildMember | null;
  public ban(user: UserResolvable, options?: BanOptions): Promise<GuildMember | User | Snowflake>;
  public bulkBan(
    users: ReadonlyCollection<Snowflake, UserResolvable> | readonly UserResolvable[],
    options?: BulkBanOptions,
  ): Promise<BulkBanResult>;
  public edit(user: UserResolvable, options: GuildMemberEditOptions): Promise<GuildMember>;
  public editMe(options: GuildMemberEditMeOptions): Promise<GuildMember>;
  public fetch(
    options: UserResolvable | FetchMemberOptions | (FetchMembersOptions & { user: UserResolvable }),
  ): Promise<GuildMember>;
  public fetch(options?: FetchMembersOptions): Promise<Collection<Snowflake, GuildMember>>;
  public fetchMe(options?: BaseFetchOptions): Promise<GuildMember>;
  public fetchMemberList(
    channel: GuildChannelResolvable,
    options: { limit: number; time?: number },
  ): Promise<Collection<Snowflake, GuildMember>>;
  public kick(user: UserResolvable, reason?: string): Promise<GuildMember | User | Snowflake>;
  public prune(options: GuildPruneMembersOptions & { dry?: false; count: false }): Promise<null>;
  public prune(options?: GuildPruneMembersOptions): Promise<number>;
  public unban(user: UserResolvable, reason?: string): Promise<User | null>;
  public addRole(options: AddOrRemoveGuildMemberRoleOptions): Promise<GuildMember | User | Snowflake>;
  public removeRole(options: AddOrRemoveGuildMemberRoleOptions): Promise<GuildMember | User | Snowflake>;
}

export class GuildBanManager extends CachedManager<Snowflake, GuildBan, GuildBanResolvable> {
  private constructor(guild: Guild, iterable?: Iterable<RawGuildBanData>);
  public guild: Guild;
  public create(user: UserResolvable, options?: BanOptions): Promise<GuildMember | User | Snowflake>;
  public fetch(options: UserResolvable | FetchBanOptions): Promise<GuildBan>;
  public fetch(options?: FetchBansOptions): Promise<Collection<Snowflake, GuildBan>>;
  public remove(user: UserResolvable, reason?: string): Promise<User | null>;
  public bulkCreate(
    users: ReadonlyCollection<Snowflake, UserResolvable> | readonly UserResolvable[],
    options?: BulkBanOptions,
  ): Promise<BulkBanResult>;
}

export interface TargetUsersJobStatusForInvite {
  completedAt: Date | null;
  createdAt: Date | null;
  errorMessage: string | null;
  processedUsers: number;
  status: InviteTargetUsersJobStatus;
  totalUsers: number;
}
export class GuildInviteManager extends DataManager<string, Invite, InviteResolvable> {
  private constructor(guild: Guild, iterable?: Iterable<RawInviteData>);
  public guild: Guild;
  public create(channel: GuildInvitableChannelResolvable, options?: InviteCreateOptions): Promise<Invite>;
  public updateTargetUsers(
    invite: InviteResolvable,
    targetUsersFile: BufferResolvable | readonly UserResolvable[],
  ): Promise<void>;
  public fetchTargetUsers(invite: InviteResolvable): Promise<Buffer>;
  public fetchTargetUsersJobStatus(invite: InviteResolvable): Promise<TargetUsersJobStatusForInvite>;
  public fetch(options: InviteResolvable | FetchInviteOptions): Promise<Invite>;
  public fetch(options?: FetchInvitesOptions): Promise<Collection<string, Invite>>;
  public delete(invite: InviteResolvable, reason?: string): Promise<Invite>;
}

export class GuildScheduledEventManager extends CachedManager<
  Snowflake,
  GuildScheduledEvent,
  GuildScheduledEventResolvable
> {
  private constructor(guild: Guild, iterable?: Iterable<RawGuildScheduledEventData>);
  public guild: Guild;
  public create(options: GuildScheduledEventCreateOptions): Promise<GuildScheduledEvent>;
  public fetch(): Promise<Collection<Snowflake, GuildScheduledEvent>>;
  public fetch<
    Options extends GuildScheduledEventResolvable | FetchGuildScheduledEventOptions | FetchGuildScheduledEventsOptions,
  >(options?: Options): Promise<GuildScheduledEventManagerFetchResult<Options>>;
  public edit<
    Status extends GuildScheduledEventStatus,
    AcceptableStatus extends GuildScheduledEventSetStatusArg<Status>,
  >(
    guildScheduledEvent: GuildScheduledEventResolvable,
    options: GuildScheduledEventEditOptions<Status, AcceptableStatus>,
  ): Promise<GuildScheduledEvent<AcceptableStatus>>;
  public delete(guildScheduledEvent: GuildScheduledEventResolvable): Promise<void>;
  public fetchSubscribers<Options extends FetchGuildScheduledEventSubscribersOptions>(
    guildScheduledEvent: GuildScheduledEventResolvable,
    options?: Options,
  ): Promise<GuildScheduledEventManagerFetchSubscribersResult<Options>>;
}

export interface GuildSoundboardSoundCreateOptions {
  file: BufferResolvable | Stream;
  name: string;
  contentType?: string;
  volume?: number;
  emojiId?: Snowflake;
  emojiName?: string;
  reason?: string;
}

export interface GuildSoundboardSoundEditOptions {
  name?: string;
  volume?: number | null;
  emojiId?: Snowflake | null;
  emojiName?: string | null;
  reason?: string;
}

export interface FetchGuildSoundboardSoundOptions extends BaseFetchOptions {
  soundboardSound: SoundboardSoundResolvable;
}

export interface FetchGuildSoundboardSoundsOptions extends Pick<BaseFetchOptions, 'cache'> {}

export class GuildSoundboardSoundManager extends CachedManager<Snowflake, SoundboardSound, SoundboardSoundResolvable> {
  private constructor(guild: Guild, iterable?: Iterable<APISoundboardSound>);
  public guild: Guild;
  public create(options: GuildSoundboardSoundCreateOptions): Promise<GuildSoundboardSound>;
  public edit(
    soundboardSound: SoundboardSoundResolvable,
    options: GuildSoundboardSoundEditOptions,
  ): Promise<GuildSoundboardSound>;
  public delete(soundboardSound: SoundboardSoundResolvable): Promise<void>;
  public fetch(options: SoundboardSoundResolvable | FetchGuildSoundboardSoundOptions): Promise<GuildSoundboardSound>;
  public fetch(options?: FetchGuildSoundboardSoundsOptions): Promise<Collection<Snowflake, GuildSoundboardSound>>;
}

export class GuildStickerManager extends CachedManager<Snowflake, Sticker, StickerResolvable> {
  private constructor(guild: Guild, iterable?: Iterable<RawStickerData>);
  public guild: Guild;
  public create(options: GuildStickerCreateOptions): Promise<Sticker>;
  public edit(sticker: StickerResolvable, data?: GuildStickerEditOptions): Promise<Sticker>;
  public delete(sticker: StickerResolvable, reason?: string): Promise<void>;
  public fetch(id: Snowflake, options?: BaseFetchOptions): Promise<Sticker>;
  public fetch(id?: Snowflake, options?: BaseFetchOptions): Promise<Collection<Snowflake, Sticker>>;
  public fetchUser(sticker: StickerResolvable): Promise<User | null>;
}

export class GuildMemberRoleManager extends DataManager<Snowflake, Role, RoleResolvable> {
  private constructor(member: GuildMember);
  public get hoist(): Role | null;
  public get icon(): Role | null;
  public get color(): Role | null;
  public get highest(): Role;
  public get premiumSubscriberRole(): Role | null;
  public get botRole(): Role | null;
  public member: GuildMember;
  public guild: Guild;

  public add(
    roleOrRoles: RoleResolvable | readonly RoleResolvable[] | ReadonlyCollection<Snowflake, Role>,
    reason?: string,
  ): Promise<GuildMember>;
  public set(
    roles: readonly RoleResolvable[] | ReadonlyCollection<Snowflake, Role>,
    reason?: string,
  ): Promise<GuildMember>;
  public remove(
    roleOrRoles: RoleResolvable | readonly RoleResolvable[] | ReadonlyCollection<Snowflake, Role>,
    reason?: string,
  ): Promise<GuildMember>;
}

export interface FetchPollAnswerVotersOptions extends BaseFetchPollAnswerVotersOptions {
  messageId: Snowflake;
  answerId: number;
}

export abstract class MessageManager<InGuild extends boolean = boolean> extends CachedManager<
  Snowflake,
  Message<InGuild>,
  MessageResolvable
> {
  protected constructor(channel: TextBasedChannel, iterable?: Iterable<RawMessageData>);
  public channel: TextBasedChannel;
  public delete(message: MessageResolvable): Promise<void>;
  public edit(
    message: MessageResolvable,
    options: string | MessagePayload | MessageEditOptions,
  ): Promise<Message<InGuild>>;
  public fetch(options: MessageResolvable | FetchMessageOptions): Promise<Message<InGuild>>;
  public fetch(options?: FetchMessagesOptions): Promise<Collection<Snowflake, Message<InGuild>>>;
  /** @deprecated Use {@link MessageManager.fetchPins} instead. */
  public fetchPinned(cache?: boolean): Promise<Collection<Snowflake, Message<InGuild>>>;
  public fetchPins(options?: FetchPinnedMessagesOptions): Promise<FetchPinnedMessagesResponse<InGuild>>;
  public react(message: MessageResolvable, emoji: EmojiIdentifierResolvable): Promise<void>;
  public pin(message: MessageResolvable, reason?: string): Promise<void>;
  public unpin(message: MessageResolvable, reason?: string): Promise<void>;
  public endPoll(messageId: Snowflake): Promise<Message>;
  public fetchPollAnswerVoters(options: FetchPollAnswerVotersOptions): Promise<Collection<Snowflake, User>>;
}

export class DMMessageManager extends MessageManager {
  public channel: DMChannel;
}

export class PartialGroupDMMessageManager extends MessageManager {
  public channel: PartialGroupDMChannel;
}

export class GuildMessageManager extends MessageManager<true> {
  public channel: GuildTextBasedChannel;
  public crosspost(message: MessageResolvable): Promise<Message<true>>;
}

export class PermissionOverwriteManager extends CachedManager<
  Snowflake,
  PermissionOverwrites,
  PermissionOverwriteResolvable
> {
  private constructor(client: Client<true>, iterable?: Iterable<RawPermissionOverwriteData>);
  public set(
    overwrites: readonly OverwriteResolvable[] | ReadonlyCollection<Snowflake, OverwriteResolvable>,
    reason?: string,
  ): Promise<NonThreadGuildBasedChannel>;
  private upsert(
    userOrRole: RoleResolvable | UserResolvable,
    options: PermissionOverwriteOptions,
    overwriteOptions?: GuildChannelOverwriteOptions,
    existing?: PermissionOverwrites,
  ): Promise<NonThreadGuildBasedChannel>;
  public create(
    userOrRole: RoleResolvable | UserResolvable,
    options: PermissionOverwriteOptions,
    overwriteOptions?: GuildChannelOverwriteOptions,
  ): Promise<NonThreadGuildBasedChannel>;
  public edit(
    userOrRole: RoleResolvable | UserResolvable,
    options: PermissionOverwriteOptions,
    overwriteOptions?: GuildChannelOverwriteOptions,
  ): Promise<NonThreadGuildBasedChannel>;
  public delete(userOrRole: RoleResolvable | UserResolvable, reason?: string): Promise<NonThreadGuildBasedChannel>;
}

export class PresenceManager extends CachedManager<Snowflake, Presence, PresenceResolvable> {
  private constructor(client: Client<true>, iterable?: Iterable<RawPresenceData>);
}

export class ReactionManager extends CachedManager<Snowflake | string, MessageReaction, MessageReactionResolvable> {
  private constructor(message: Message, iterable?: Iterable<RawMessageReactionData>);
  public message: Message;
  public removeAll(): Promise<Message>;
}

export class ReactionUserManager extends CachedManager<Snowflake, User, UserResolvable> {
  private constructor(reaction: MessageReaction, iterable?: Iterable<RawUserData>);
  public reaction: MessageReaction;
  public fetch(options?: FetchReactionUsersOptions): Promise<Collection<Snowflake, User>>;
  public remove(user?: UserResolvable): Promise<MessageReaction>;
}

export class RoleManager extends CachedManager<Snowflake, Role, RoleResolvable> {
  private constructor(guild: Guild, iterable?: Iterable<RawRoleData>);
  public get everyone(): Role;
  public get highest(): Role;
  public guild: Guild;
  public get premiumSubscriberRole(): Role | null;
  public botRoleFor(user: UserResolvable): Role | null;
  public fetch(id: Snowflake, options?: BaseFetchOptions): Promise<Role | null>;
  public fetch(id?: undefined, options?: BaseFetchOptions): Promise<Collection<Snowflake, Role>>;
  public fetchMemberCounts(): Promise<Collection<Snowflake, number>>;
  public create(options?: RoleCreateOptions): Promise<Role>;
  public edit(role: RoleResolvable, options: RoleEditOptions): Promise<Role>;
  public delete(role: RoleResolvable, reason?: string): Promise<void>;
  public setPosition(role: RoleResolvable, position: number, options?: SetRolePositionOptions): Promise<Role>;
  public setPositions(rolePositions: readonly RolePosition[]): Promise<Guild>;
  public comparePositions(role1: RoleResolvable, role2: RoleResolvable): number;
}

export class StageInstanceManager extends CachedManager<Snowflake, StageInstance, StageInstanceResolvable> {
  private constructor(guild: Guild, iterable?: Iterable<RawStageInstanceData>);
  public guild: Guild;
  public create(channel: StageChannelResolvable, options: StageInstanceCreateOptions): Promise<StageInstance>;
  public fetch(channel: StageChannelResolvable, options?: BaseFetchOptions): Promise<StageInstance>;
  public edit(channel: StageChannelResolvable, options: StageInstanceEditOptions): Promise<StageInstance>;
  public delete(channel: StageChannelResolvable): Promise<void>;
}

export class ThreadManager<ThreadOnly extends boolean = boolean> extends CachedManager<
  Snowflake,
  If<ThreadOnly, ForumThreadChannel, TextThreadChannel>,
  ThreadChannelResolvable
> {
  protected constructor(
    channel: TextChannel | NewsChannel | ForumChannel | MediaChannel,
    iterable?: Iterable<RawThreadChannelData>,
  );
  public channel: If<ThreadOnly, ForumChannel | MediaChannel, TextChannel | NewsChannel>;
  public fetch(
    options: ThreadChannelResolvable,
    cacheOptions?: BaseFetchOptions,
  ): Promise<If<ThreadOnly, ForumThreadChannel, TextThreadChannel> | null>;
  public fetch(
    options: FetchThreadsOptions & { archived: FetchArchivedThreadOptions },
    cacheOptions?: { cache?: boolean },
  ): Promise<FetchedThreadsMore>;
  public fetchArchived(options?: FetchArchivedThreadOptions, cache?: boolean): Promise<FetchedThreadsMore>;
}

export class GuildTextThreadManager<AllowedThreadType> extends ThreadManager<false> {
  public create(
    options: GuildTextThreadCreateOptions<AllowedThreadType>,
  ): Promise<AllowedThreadType extends ChannelType.PrivateThread ? PrivateThreadChannel : PublicThreadChannel<false>>;
}

export class GuildForumThreadManager extends ThreadManager<true> {
  public create(options: GuildForumThreadCreateOptions): Promise<ForumThreadChannel>;
}

export class ThreadMemberManager extends CachedManager<Snowflake, ThreadMember, ThreadMemberResolvable> {
  private constructor(thread: ThreadChannel, iterable?: Iterable<RawThreadMemberData>);
  public thread: AnyThreadChannel;
  public get me(): ThreadMember | null;

  /* tslint:disable:unified-signatures */
  public add(member: UserResolvable | '@me'): Promise<Snowflake>;
  /** @deprecated The `reason` parameter is deprecated as Discord does not parse them. */
  public add(member: UserResolvable | '@me', reason?: string): Promise<Snowflake>;
  /* tslint:enable:unified-signatures */

  public fetch(
    options: ThreadMember<true> | ((FetchThreadMemberOptions & { withMember: true }) | { member: ThreadMember<true> }),
  ): Promise<ThreadMember<true>>;

  public fetch(options: ThreadMemberResolvable | FetchThreadMemberOptions): Promise<ThreadMember>;

  public fetch(
    options: FetchThreadMembersWithGuildMemberDataOptions,
  ): Promise<Collection<Snowflake, ThreadMember<true>>>;

  public fetch(options?: FetchThreadMembersWithoutGuildMemberDataOptions): Promise<Collection<Snowflake, ThreadMember>>;
  public fetchMe(options?: BaseFetchOptions): Promise<ThreadMember>;

  /* tslint:disable:unified-signatures */
  public remove(member: UserResolvable | '@me'): Promise<Snowflake>;
  /** @deprecated The `reason` parameter is deprecated as Discord does not parse them. */
  public remove(member: UserResolvable | '@me', reason?: string): Promise<Snowflake>;
  /* tslint:enable:unified-signatures */
}

export class UserManager extends CachedManager<Snowflake, User, UserResolvable> {
  private constructor(client: Client<true>, iterable?: Iterable<RawUserData>);
  private dmChannel(userId: Snowflake): DMChannel | null;
  public createDM(user: UserResolvable, options?: BaseFetchOptions): Promise<DMChannel>;
  public deleteDM(user: UserResolvable): Promise<DMChannel>;
  public fetch(user: UserResolvable, options?: BaseFetchOptions): Promise<User>;
  /** @deprecated This method is deprecated and will be removed in the next major version. Flags may still be retrieved via {@link UserManager.fetch} */
  public fetchFlags(user: UserResolvable, options?: BaseFetchOptions): Promise<UserFlagsBitField>;
  public send(user: UserResolvable, options: string | MessagePayload | MessageCreateOptions): Promise<Message<false>>;
}

export class VoiceStateManager extends CachedManager<Snowflake, VoiceState, typeof VoiceState> {
  private constructor(guild: Guild, iterable?: Iterable<RawVoiceStateData>);
  public guild: Guild;
  public fetch(member: GuildMemberResolvable | '@me', options?: BaseFetchOptions): Promise<VoiceState>;
}

//#endregion

//#region Mixins

// Model the TextBasedChannel mixin system, allowing application of these fields
// to the classes that use these methods without having to manually add them
// to each of those classes

export type Constructable<Entity> = abstract new (...args: any[]) => Entity;

export interface PartialTextBasedChannelFields<InGuild extends boolean = boolean> {
  send(options: string | MessagePayload | MessageCreateOptions): Promise<Message<InGuild>>;
}

export interface TextBasedChannelFields<InGuild extends boolean = boolean, InDM extends boolean = boolean>
  extends PartialTextBasedChannelFields<InGuild> {
  lastMessageId: Snowflake | null;
  get lastMessage(): Message | null;
  lastPinTimestamp: number | null;
  get lastPinAt(): Date | null;
  messages: If<InGuild, GuildMessageManager, If<InDM, DMMessageManager, PartialGroupDMMessageManager>>;
  awaitMessages(options?: AwaitMessagesOptions): Promise<Collection<Snowflake, Message>>;
  bulkDelete(
    messages: Collection<Snowflake, Message> | readonly MessageResolvable[] | number,
    filterOld?: boolean,
  ): Promise<Collection<Snowflake, Message | PartialMessage | undefined>>;
  createMessageCollector(options?: MessageCollectorOptions): MessageCollector;
  createWebhook(options: ChannelWebhookCreateOptions): Promise<Webhook<WebhookType.Incoming>>;
  fetchWebhooks(): Promise<Collection<Snowflake, Webhook<WebhookType.ChannelFollower | WebhookType.Incoming>>>;
  sendTyping(): Promise<void>;
  setRateLimitPerUser(rateLimitPerUser: number, reason?: string): Promise<this>;
  setNSFW(nsfw?: boolean, reason?: string): Promise<this>;
}

/** @internal */
export interface PartialWebhookFields {
  id: Snowflake;
  get url(): string;
  deleteMessage(message: MessageResolvable | APIMessage | '@original', threadId?: Snowflake): Promise<void>;
  editMessage(
    message: MessageResolvable | '@original',
    options: string | MessagePayload | WebhookMessageEditOptions,
  ): Promise<APIMessage | Message>;
  fetchMessage(message: Snowflake | '@original', options?: WebhookFetchMessageOptions): Promise<APIMessage | Message>;
  send(options: string | MessagePayload | WebhookMessageCreateOptions): Promise<APIMessage | Message>;
}

/** @internal */
export interface WebhookFields extends PartialWebhookFields {
  get createdAt(): Date;
  get createdTimestamp(): number;
  delete(reason?: string): Promise<void>;
  edit(options: WebhookEditOptions): Promise<this>;
  sendSlackMessage(body: unknown): Promise<boolean>;
}

//#endregion

//#region Typedefs

export interface ActivitiesOptions extends Omit<ActivityOptions, 'shardId'> {}

export interface ActivityOptions {
  name: string;
  state?: string;
  url?: string;
  type?: ActivityType;
  shardId?: number | readonly number[];
}

export type AllowedPartial =
  | User
  | Channel
  | GuildMember
  | Message
  | MessageReaction
  | GuildScheduledEvent
  | ThreadMember
  | SoundboardSound
  | Poll
  | PollAnswer;

export type AllowedThreadTypeForNewsChannel = ChannelType.AnnouncementThread;

export type AllowedThreadTypeForTextChannel = ChannelType.PublicThread | ChannelType.PrivateThread;

export interface BaseApplicationCommandData {
  name: string;
  nameLocalizations?: LocalizationMap;
  dmPermission?: boolean;
  defaultMemberPermissions?: PermissionResolvable | null;
  nsfw?: boolean;
  contexts?: readonly InteractionContextType[];
  integrationTypes?: readonly ApplicationIntegrationType[];
}

export interface AttachmentData {
  name?: string;
  description?: string;
  duration?: number;
  title?: string;
  waveform?: string;
}

export type CommandOptionDataTypeResolvable = ApplicationCommandOptionType;

export type CommandOptionChannelResolvableType = ApplicationCommandOptionType.Channel;

export type CommandOptionChoiceResolvableType =
  | ApplicationCommandOptionType.String
  | CommandOptionNumericResolvableType;

export type CommandOptionNumericResolvableType =
  | ApplicationCommandOptionType.Number
  | ApplicationCommandOptionType.Integer;

export type CommandOptionSubOptionResolvableType =
  | ApplicationCommandOptionType.Subcommand
  | ApplicationCommandOptionType.SubcommandGroup;

export type CommandOptionNonChoiceResolvableType = Exclude<
  CommandOptionDataTypeResolvable,
  CommandOptionChoiceResolvableType | CommandOptionSubOptionResolvableType | CommandOptionChannelResolvableType
>;

export interface BaseApplicationCommandOptionsData {
  name: string;
  nameLocalizations?: LocalizationMap;
  description: string;
  descriptionLocalizations?: LocalizationMap;
  required?: boolean;
  autocomplete?: never;
}

export interface UserApplicationCommandData extends BaseApplicationCommandData {
  type: ApplicationCommandType.User;
}

export interface MessageApplicationCommandData extends BaseApplicationCommandData {
  type: ApplicationCommandType.Message;
}

export interface ChatInputApplicationCommandData extends BaseApplicationCommandData {
  description: string;
  descriptionLocalizations?: LocalizationMap;
  type?: ApplicationCommandType.ChatInput;
  options?: readonly ApplicationCommandOptionData[];
}

export interface PrimaryEntryPointCommandData extends BaseApplicationCommandData {
  description?: string;
  descriptionLocalizations?: LocalizationMap;
  type: ApplicationCommandType.PrimaryEntryPoint;
  handler?: EntryPointCommandHandlerType;
}

export type ApplicationCommandData =
  | UserApplicationCommandData
  | MessageApplicationCommandData
  | ChatInputApplicationCommandData
  | PrimaryEntryPointCommandData;

export interface ApplicationCommandChannelOptionData extends BaseApplicationCommandOptionsData {
  type: CommandOptionChannelResolvableType;
  channelTypes?: readonly ApplicationCommandOptionAllowedChannelTypes[];
  channel_types?: readonly ApplicationCommandOptionAllowedChannelTypes[];
}

export interface ApplicationCommandChannelOption extends BaseApplicationCommandOptionsData {
  type: ApplicationCommandOptionType.Channel;
  channelTypes?: readonly ApplicationCommandOptionAllowedChannelTypes[];
}

export interface ApplicationCommandRoleOptionData extends BaseApplicationCommandOptionsData {
  type: ApplicationCommandOptionType.Role;
}

export interface ApplicationCommandRoleOption extends BaseApplicationCommandOptionsData {
  type: ApplicationCommandOptionType.Role;
}

export interface ApplicationCommandUserOptionData extends BaseApplicationCommandOptionsData {
  type: ApplicationCommandOptionType.User;
}

export interface ApplicationCommandUserOption extends BaseApplicationCommandOptionsData {
  type: ApplicationCommandOptionType.User;
}

export interface ApplicationCommandMentionableOptionData extends BaseApplicationCommandOptionsData {
  type: ApplicationCommandOptionType.Mentionable;
}

export interface ApplicationCommandMentionableOption extends BaseApplicationCommandOptionsData {
  type: ApplicationCommandOptionType.Mentionable;
}

export interface ApplicationCommandAttachmentOptionData extends BaseApplicationCommandOptionsData {
  fileTypes?: readonly FileUploadType[];
  file_types?: readonly FileUploadType[];
  type: ApplicationCommandOptionType.Attachment;
}

export interface ApplicationCommandAttachmentOption extends BaseApplicationCommandOptionsData {
  fileTypes?: readonly FileUploadType[];
  type: ApplicationCommandOptionType.Attachment;
}

export interface ApplicationCommandAutocompleteNumericOption
  extends Omit<BaseApplicationCommandOptionsData, 'autocomplete'> {
  type: CommandOptionNumericResolvableType;
  minValue?: number;
  maxValue?: number;
  autocomplete: true;
}

export interface ApplicationCommandAutocompleteStringOption
  extends Omit<BaseApplicationCommandOptionsData, 'autocomplete'> {
  type: ApplicationCommandOptionType.String;
  minLength?: number;
  maxLength?: number;
  autocomplete: true;
}

export interface ApplicationCommandAutocompleteNumericOptionData
  extends Omit<BaseApplicationCommandOptionsData, 'autocomplete'> {
  type: CommandOptionNumericResolvableType;
  minValue?: number;
  min_value?: number;
  maxValue?: number;
  max_value?: number;
  autocomplete: true;
}

export interface ApplicationCommandAutocompleteStringOptionData
  extends Omit<BaseApplicationCommandOptionsData, 'autocomplete'> {
  type: ApplicationCommandOptionType.String;
  minLength?: number;
  min_length?: number;
  maxLength?: number;
  max_length?: number;
  autocomplete: true;
}

export interface ApplicationCommandChoicesData<Type extends string | number = string | number>
  extends Omit<BaseApplicationCommandOptionsData, 'autocomplete'> {
  type: CommandOptionChoiceResolvableType;
  choices?: readonly ApplicationCommandOptionChoiceData<Type>[];
  autocomplete?: false;
}

export interface ApplicationCommandChoicesOption<Type extends string | number = string | number>
  extends Omit<BaseApplicationCommandOptionsData, 'autocomplete'> {
  type: CommandOptionChoiceResolvableType;
  choices?: readonly ApplicationCommandOptionChoiceData<Type>[];
  autocomplete?: false;
}

export interface ApplicationCommandNumericOptionData extends ApplicationCommandChoicesData<number> {
  type: CommandOptionNumericResolvableType;
  minValue?: number;
  min_value?: number;
  maxValue?: number;
  max_value?: number;
}

export interface ApplicationCommandStringOptionData extends ApplicationCommandChoicesData<string> {
  type: ApplicationCommandOptionType.String;
  minLength?: number;
  min_length?: number;
  maxLength?: number;
  max_length?: number;
}

export interface ApplicationCommandBooleanOptionData extends BaseApplicationCommandOptionsData {
  type: ApplicationCommandOptionType.Boolean;
}

export interface ApplicationCommandNumericOption extends ApplicationCommandChoicesOption<number> {
  type: CommandOptionNumericResolvableType;
  minValue?: number;
  maxValue?: number;
}

export interface ApplicationCommandStringOption extends ApplicationCommandChoicesOption<string> {
  type: ApplicationCommandOptionType.String;
  minLength?: number;
  maxLength?: number;
}

export interface ApplicationCommandBooleanOption extends BaseApplicationCommandOptionsData {
  type: ApplicationCommandOptionType.Boolean;
}

export interface ApplicationCommandSubGroupData extends Omit<BaseApplicationCommandOptionsData, 'required'> {
  type: ApplicationCommandOptionType.SubcommandGroup;
  options: readonly ApplicationCommandSubCommandData[];
}

export interface ApplicationCommandSubGroup extends Omit<BaseApplicationCommandOptionsData, 'required'> {
  type: ApplicationCommandOptionType.SubcommandGroup;
  options?: readonly ApplicationCommandSubCommand[];
}

export interface ApplicationCommandSubCommandData extends Omit<BaseApplicationCommandOptionsData, 'required'> {
  type: ApplicationCommandOptionType.Subcommand;
  options?: readonly Exclude<
    ApplicationCommandOptionData,
    ApplicationCommandSubGroupData | ApplicationCommandSubCommandData
  >[];
}

export interface ApplicationCommandSubCommand extends Omit<BaseApplicationCommandOptionsData, 'required'> {
  type: ApplicationCommandOptionType.Subcommand;
  options?: readonly Exclude<ApplicationCommandOption, ApplicationCommandSubGroup | ApplicationCommandSubCommand>[];
}

export interface ApplicationCommandNonOptionsData extends BaseApplicationCommandOptionsData {
  type: Exclude<CommandOptionNonChoiceResolvableType, ApplicationCommandOptionType.Attachment>;
}

export interface ApplicationCommandNonOptions extends BaseApplicationCommandOptionsData {
  type: Exclude<CommandOptionNonChoiceResolvableType, ApplicationCommandOptionType.Attachment>;
}

export type ApplicationCommandOptionData =
  | ApplicationCommandSubGroupData
  | ApplicationCommandAttachmentOptionData
  | ApplicationCommandNonOptionsData
  | ApplicationCommandChannelOptionData
  | ApplicationCommandAutocompleteNumericOptionData
  | ApplicationCommandAutocompleteStringOptionData
  | ApplicationCommandNumericOptionData
  | ApplicationCommandStringOptionData
  | ApplicationCommandRoleOptionData
  | ApplicationCommandUserOptionData
  | ApplicationCommandMentionableOptionData
  | ApplicationCommandBooleanOptionData
  | ApplicationCommandSubCommandData;

export type ApplicationCommandOption =
  | ApplicationCommandSubGroup
  | ApplicationCommandAutocompleteNumericOption
  | ApplicationCommandAutocompleteStringOption
  | ApplicationCommandNonOptions
  | ApplicationCommandChannelOption
  | ApplicationCommandNumericOption
  | ApplicationCommandStringOption
  | ApplicationCommandRoleOption
  | ApplicationCommandUserOption
  | ApplicationCommandMentionableOption
  | ApplicationCommandBooleanOption
  | ApplicationCommandAttachmentOption
  | ApplicationCommandSubCommand;

export interface ApplicationCommandOptionChoiceData<Value extends string | number = string | number> {
  name: string;
  nameLocalizations?: LocalizationMap;
  value: Value;
}

export interface ApplicationCommandPermissions {
  id: Snowflake;
  type: ApplicationCommandPermissionType;
  permission: boolean;
}

export interface ApplicationCommandPermissionsUpdateData {
  id: Snowflake;
  guildId: Snowflake;
  applicationId: Snowflake;
  permissions: readonly ApplicationCommandPermissions[];
}

export type ApplicationFlagsString = keyof typeof ApplicationFlags;

export type AuditLogChange = {
  [SourceElement in APIAuditLogChange as SourceElement['key']]: {
    key: SourceElement['key'];
    old?: SourceElement['old_value'];
    new?: SourceElement['new_value'];
  };
}[APIAuditLogChange['key']];

export interface AutoModerationAction {
  type: AutoModerationActionType;
  metadata: AutoModerationActionMetadata;
}

export interface AutoModerationActionMetadata {
  channelId: Snowflake | null;
  durationSeconds: number | null;
  customMessage: string | null;
}

export interface AutoModerationTriggerMetadata {
  keywordFilter: readonly string[];
  regexPatterns: readonly string[];
  presets: readonly AutoModerationRuleKeywordPresetType[];
  allowList: readonly string[];
  mentionTotalLimit: number | null;
  mentionRaidProtectionEnabled: boolean;
}

export interface AwaitMessagesOptions extends MessageCollectorOptions {
  errors?: readonly string[];
}

export interface AwaitReactionsOptions extends ReactionCollectorOptions {
  errors?: readonly string[];
}

export interface BanOptions {
  /** @deprecated Use {@link BanOptions.deleteMessageSeconds} instead. */
  deleteMessageDays?: number;
  deleteMessageSeconds?: number;
  reason?: string;
}

export interface BulkBanOptions extends Omit<BanOptions, 'deleteMessageDays'> {}

export interface BulkBanResult {
  bannedUsers: readonly Snowflake[];
  failedUsers: readonly Snowflake[];
}

export interface PollData {
  question: PollQuestionMedia;
  answers: readonly PollAnswerData[];
  duration: number;
  allowMultiselect: boolean;
  layoutType?: PollLayoutType;
}

export interface PollAnswerData {
  text: string;
  emoji?: EmojiIdentifierResolvable;
}

export type Base64Resolvable = Buffer | Base64String;

export type Base64String = string;

export interface BaseFetchOptions {
  cache?: boolean;
  force?: boolean;
}

export type BitFieldResolvable<Flags extends string, Type extends number | bigint> =
  | RecursiveReadonlyArray<Flags | Type | `${bigint}` | Readonly<BitField<Flags, Type>>>
  | Flags
  | Type
  | `${bigint}`
  | Readonly<BitField<Flags, Type>>;

export type BufferResolvable = Buffer | string;

export interface Caches {
  AutoModerationRuleManager: [manager: typeof AutoModerationRuleManager, holds: typeof AutoModerationRule];
  BaseGuildEmojiManager: [manager: typeof BaseGuildEmojiManager, holds: typeof GuildEmoji];
  // TODO: ChannelManager: [manager: typeof ChannelManager, holds: typeof Channel];
  DMMessageManager: [manager: typeof MessageManager, holds: typeof Message<false>];
  GuildBanManager: [manager: typeof GuildBanManager, holds: typeof GuildBan];
  // TODO: GuildChannelManager: [manager: typeof GuildChannelManager, holds: typeof GuildChannel];
  GuildEmojiManager: [manager: typeof GuildEmojiManager, holds: typeof GuildEmoji];
  GuildForumThreadManager: [manager: typeof GuildForumThreadManager, holds: typeof ThreadChannel<true>];
  GuildInviteManager: [manager: typeof GuildInviteManager, holds: typeof Invite];
  // TODO: GuildManager: [manager: typeof GuildManager, holds: typeof Guild];
  GuildMemberManager: [manager: typeof GuildMemberManager, holds: typeof GuildMember];
  GuildMessageManager: [manager: typeof GuildMessageManager, holds: typeof Message<true>];
  GuildScheduledEventManager: [manager: typeof GuildScheduledEventManager, holds: typeof GuildScheduledEvent];
  GuildStickerManager: [manager: typeof GuildStickerManager, holds: typeof Sticker];
  GuildTextThreadManager: [manager: typeof GuildTextThreadManager, holds: typeof ThreadChannel<false>];
  MessageManager: [manager: typeof MessageManager, holds: typeof Message];
  // TODO: PermissionOverwriteManager: [manager: typeof PermissionOverwriteManager, holds: typeof PermissionOverwrites];
  PresenceManager: [manager: typeof PresenceManager, holds: typeof Presence];
  ReactionManager: [manager: typeof ReactionManager, holds: typeof MessageReaction];
  ReactionUserManager: [manager: typeof ReactionUserManager, holds: typeof User];
  // TODO: RoleManager: [manager: typeof RoleManager, holds: typeof Role];
  StageInstanceManager: [manager: typeof StageInstanceManager, holds: typeof StageInstance];
  ThreadManager: [manager: typeof ThreadManager, holds: typeof ThreadChannel];
  ThreadMemberManager: [manager: typeof ThreadMemberManager, holds: typeof ThreadMember];
  UserManager: [manager: typeof UserManager, holds: typeof User];
  VoiceStateManager: [manager: typeof VoiceStateManager, holds: typeof VoiceState];
}

export type CacheConstructors = {
  [Cache in keyof Caches]: Caches[Cache][0] & { name: Cache };
};

type OverriddenCaches =
  | 'DMMessageManager'
  | 'GuildForumThreadManager'
  | 'GuildMessageManager'
  | 'GuildTextThreadManager';

// This doesn't actually work the way it looks 😢.
// Narrowing the type of `manager.name` doesn't propagate type information to `holds` and the return type.
export type CacheFactory = (
  managerType: CacheConstructors[Exclude<keyof Caches, OverriddenCaches>],
  holds: Caches[(typeof manager)['name']][1],
  manager: CacheConstructors[keyof Caches],
) => (typeof manager)['prototype'] extends DataManager<infer Key, infer Value, any> ? Collection<Key, Value> : never;

export type CacheWithLimitsOptions = {
  [K in keyof Caches]?: Caches[K][0]['prototype'] extends DataManager<infer Key, infer Value, any>
    ? LimitedCollectionOptions<Key, Value> | number
    : never;
};

export interface CategoryCreateChannelOptions {
  name: string;
  permissionOverwrites?: readonly OverwriteResolvable[] | ReadonlyCollection<Snowflake, OverwriteResolvable>;
  topic?: string;
  type?: CategoryChannelType;
  nsfw?: boolean;
  bitrate?: number;
  userLimit?: number;
  rateLimitPerUser?: number;
  position?: number;
  rtcRegion?: string;
  videoQualityMode?: VideoQualityMode;
  defaultThreadRateLimitPerUser?: number;
  availableTags?: readonly GuildForumTagData[];
  defaultReactionEmoji?: DefaultReactionEmoji;
  defaultAutoArchiveDuration?: ThreadAutoArchiveDuration;
  defaultSortOrder?: SortOrderType;
  defaultForumLayout?: ForumLayoutType;
  reason?: string;
}

export interface ChannelCreationOverwrites {
  allow?: PermissionResolvable;
  deny?: PermissionResolvable;
  id: RoleResolvable | UserResolvable;
}

export type ChannelMention = `<#${Snowflake}>`;

export interface ChannelPosition {
  channel: NonThreadGuildBasedChannel | Snowflake;
  lockPermissions?: boolean;
  parent?: CategoryChannelResolvable | null;
  position?: number;
}

export type GuildTextChannelResolvable = TextChannel | NewsChannel | Snowflake;
export type ChannelResolvable = Channel | Snowflake;

export interface ChannelWebhookCreateOptions {
  name: string;
  avatar?: BufferResolvable | Base64Resolvable | null;
  reason?: string;
}

export interface WebhookCreateOptions extends ChannelWebhookCreateOptions {
  channel: TextChannel | NewsChannel | VoiceChannel | StageChannel | ForumChannel | MediaChannel | Snowflake;
}

export interface GuildMembersChunk {
  index: number;
  count: number;
  notFound: readonly unknown[];
  nonce: string | undefined;
}

export type OmitPartialGroupDMChannel<Structure extends { channel: Channel }> = Structure & {
  channel: Exclude<Structure['channel'], PartialGroupDMChannel>;
};

export interface VoiceServerUpdateData {
  endpoint: string | null;
  guildId: Snowflake;
  token: string;
}

export interface ClientEvents {
  applicationCommandPermissionsUpdate: [data: ApplicationCommandPermissionsUpdateData];
  autoModerationActionExecution: [autoModerationActionExecution: AutoModerationActionExecution];
  autoModerationRuleCreate: [autoModerationRule: AutoModerationRule];
  autoModerationRuleDelete: [autoModerationRule: AutoModerationRule];
  autoModerationRuleUpdate: [
    oldAutoModerationRule: AutoModerationRule | null,
    newAutoModerationRule: AutoModerationRule,
  ];
  cacheSweep: [message: string];
  channelCreate: [channel: NonThreadGuildBasedChannel];
  channelDelete: [channel: DMChannel | NonThreadGuildBasedChannel];
  channelPinsUpdate: [channel: TextBasedChannel, date: Date];
  channelUpdate: [
    oldChannel: DMChannel | NonThreadGuildBasedChannel,
    newChannel: DMChannel | NonThreadGuildBasedChannel,
  ];
  clientReady: [client: Client<true>];
  debug: [message: string];
  warn: [message: string];
  emojiCreate: [emoji: GuildEmoji];
  emojiDelete: [emoji: GuildEmoji];
  emojiUpdate: [oldEmoji: GuildEmoji, newEmoji: GuildEmoji];
  error: [error: Error];
  guildAuditLogEntryCreate: [auditLogEntry: GuildAuditLogsEntry, guild: Guild];
  guildAvailable: [guild: Guild];
  guildBanAdd: [ban: GuildBan];
  guildBanRemove: [ban: GuildBan];
  guildCreate: [guild: Guild];
  guildDelete: [guild: Guild];
  guildUnavailable: [guild: Guild];
  guildIntegrationsUpdate: [guild: Guild];
  guildMemberAdd: [member: GuildMember];
  guildMemberAvailable: [member: GuildMember | PartialGuildMember];
  guildMemberRemove: [member: GuildMember | PartialGuildMember];
  guildMembersChunk: [members: ReadonlyCollection<Snowflake, GuildMember>, guild: Guild, data: GuildMembersChunk];
  guildMemberUpdate: [oldMember: GuildMember | PartialGuildMember, newMember: GuildMember];
  guildUpdate: [oldGuild: Guild, newGuild: Guild];
  guildSoundboardSoundCreate: [soundboardSound: GuildSoundboardSound];
  guildSoundboardSoundDelete: [soundboardSound: GuildSoundboardSound | PartialSoundboardSound];
  guildSoundboardSoundUpdate: [
    oldSoundboardSound: GuildSoundboardSound | null,
    newSoundboardSound: GuildSoundboardSound,
  ];
  guildSoundboardSoundsUpdate: [soundboardSounds: ReadonlyCollection<Snowflake, GuildSoundboardSound>, guild: Guild];
  inviteCreate: [invite: Invite];
  inviteDelete: [invite: Invite];
  messageCreate: [message: OmitPartialGroupDMChannel<Message>];
  messageDelete: [message: OmitPartialGroupDMChannel<Message | PartialMessage>];
  messagePollVoteAdd: [pollAnswer: PollAnswer | PartialPollAnswer, userId: Snowflake];
  messagePollVoteRemove: [pollAnswer: PollAnswer | PartialPollAnswer, userId: Snowflake];
  messageReactionRemoveAll: [
    message: OmitPartialGroupDMChannel<Message | PartialMessage>,
    reactions: ReadonlyCollection<string | Snowflake, MessageReaction>,
  ];
  messageReactionRemoveEmoji: [reaction: MessageReaction | PartialMessageReaction];
  messageDeleteBulk: [
    messages: ReadonlyCollection<Snowflake, Message<true> | PartialMessage<true>>,
    channel: GuildTextBasedChannel,
  ];
  messageReactionAdd: [
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    details: MessageReactionEventDetails,
  ];
  messageReactionRemove: [
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    details: MessageReactionEventDetails,
  ];
  messageUpdate: [
    oldMessage: OmitPartialGroupDMChannel<Message | PartialMessage>,
    newMessage: OmitPartialGroupDMChannel<Message>,
  ];
  presenceUpdate: [oldPresence: Presence | null, newPresence: Presence];
  /** @deprecated Use {@link ClientEvents.clientReady} instead. */
  ready: [client: Client<true>];
  roleCreate: [role: Role];
  roleDelete: [role: Role];
  roleUpdate: [oldRole: Role, newRole: Role];
  threadCreate: [thread: AnyThreadChannel, newlyCreated: boolean];
  threadDelete: [thread: AnyThreadChannel];
  threadListSync: [threads: ReadonlyCollection<Snowflake, AnyThreadChannel>, guild: Guild];
  threadMemberUpdate: [oldMember: ThreadMember, newMember: ThreadMember];
  threadMembersUpdate: [
    addedMembers: ReadonlyCollection<Snowflake, ThreadMember>,
    removedMembers: ReadonlyCollection<Snowflake, ThreadMember | PartialThreadMember>,
    thread: AnyThreadChannel,
  ];
  threadUpdate: [oldThread: AnyThreadChannel, newThread: AnyThreadChannel];
  typingStart: [typing: Typing];
  userUpdate: [oldUser: User | PartialUser, newUser: User];
  voiceChannelEffectSend: [voiceChannelEffect: VoiceChannelEffect];
  voiceServerUpdate: [data: VoiceServerUpdateData];
  voiceStateUpdate: [oldState: VoiceState, newState: VoiceState];
  /** @deprecated Use {@link ClientEvents.webhooksUpdate} instead. */
  webhookUpdate: ClientEvents['webhooksUpdate'];
  webhooksUpdate: [channel: TextChannel | NewsChannel | VoiceChannel | ForumChannel | MediaChannel];
  shardDisconnect: [closeEvent: CloseEvent, shardId: number];
  shardError: [error: Error, shardId: number];
  shardReady: [shardId: number, unavailableGuilds: Set<Snowflake> | undefined];
  shardReconnecting: [shardId: number];
  shardResume: [shardId: number, replayedEvents: number];
  stageInstanceCreate: [stageInstance: StageInstance];
  stageInstanceUpdate: [oldStageInstance: StageInstance | null, newStageInstance: StageInstance];
  stageInstanceDelete: [stageInstance: StageInstance];
  stickerCreate: [sticker: Sticker];
  stickerDelete: [sticker: Sticker];
  stickerUpdate: [oldSticker: Sticker, newSticker: Sticker];
  guildScheduledEventCreate: [guildScheduledEvent: GuildScheduledEvent];
  guildScheduledEventUpdate: [
    oldGuildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent | null,
    newGuildScheduledEvent: GuildScheduledEvent,
  ];
  guildScheduledEventDelete: [guildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent];
  guildScheduledEventUserAdd: [guildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent, user: User];
  guildScheduledEventUserRemove: [guildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent, user: User];
  soundboardSounds: [soundboardSounds: ReadonlyCollection<Snowflake, GuildSoundboardSound>, guild: Guild];
}

export interface ClientFetchInviteOptions {
  guildScheduledEventId?: Snowflake;
}

export interface ClientOptions {
  closeTimeout?: number;
  makeCache?: CacheFactory;
  allowedMentions?: MessageMentionOptions;
  partials?: readonly Partials[];
  failIfNotExists?: boolean;
  presence?: PresenceData;
  intents?: BitFieldResolvable<GatewayIntentsString, number>;
  sweepers?: SweeperOptions;
  ws?: WebSocketOptions;
  rest?: Partial<RESTOptions>;
  jsonTransformer?: (obj: unknown) => unknown;
  enforceNonce?: boolean;
}

export type ClientPresenceStatus = 'online' | 'idle' | 'dnd';

export interface ClientPresenceStatusData {
  web?: ClientPresenceStatus;
  mobile?: ClientPresenceStatus;
  desktop?: ClientPresenceStatus;
}

export interface ClientUserEditOptions {
  username?: string;
  avatar?: BufferResolvable | Base64Resolvable | null;
  banner?: BufferResolvable | Base64Resolvable | null;
}

export interface CloseEvent {
  /** @deprecated Not used anymore since using {@link @discordjs/ws#(WebSocketManager:class)} internally */
  wasClean: boolean;
  code: number;
  /** @deprecated Not used anymore since using {@link @discordjs/ws#(WebSocketManager:class)} internally */
  reason: string;
}

export type CollectorFilter<Arguments extends unknown[]> = (...args: Arguments) => Awaitable<boolean>;

export interface CollectorOptions<FilterArguments extends unknown[]> {
  filter?: CollectorFilter<FilterArguments>;
  time?: number;
  idle?: number;
  dispose?: boolean;
}

export interface CollectorResetTimerOptions {
  time?: number;
  idle?: number;
}

export type ColorResolvable =
  | keyof typeof Colors
  | 'Random'
  | readonly [red: number, green: number, blue: number]
  | number
  | HexColorString;

export interface BaseInteractionResolvedData<Cached extends CacheType = CacheType> {
  attachments?: ReadonlyCollection<Snowflake, Attachment>;
  channels?: ReadonlyCollection<Snowflake, CacheTypeReducer<Cached, Channel, APIInteractionDataResolvedChannel>>;
  members?: ReadonlyCollection<Snowflake, CacheTypeReducer<Cached, GuildMember, APIInteractionDataResolvedGuildMember>>;
  roles?: ReadonlyCollection<Snowflake, CacheTypeReducer<Cached, Role, APIRole>>;
  users?: ReadonlyCollection<Snowflake, User>;
}

export interface CommandInteractionResolvedData<Cached extends CacheType = CacheType>
  extends BaseInteractionResolvedData<Cached> {
  messages?: ReadonlyCollection<Snowflake, CacheTypeReducer<Cached, Message, APIMessage>>;
}

export declare const Colors: {
  Default: 0x000000;
  White: 0xffffff;
  Aqua: 0x1abc9c;
  Green: 0x57f287;
  Blue: 0x3498db;
  Yellow: 0xfee75c;
  Purple: 0x9b59b6;
  LuminousVividPink: 0xe91e63;
  Fuchsia: 0xeb459e;
  Gold: 0xf1c40f;
  Orange: 0xe67e22;
  Red: 0xed4245;
  Grey: 0x95a5a6;
  Navy: 0x34495e;
  DarkAqua: 0x11806a;
  DarkGreen: 0x1f8b4c;
  DarkBlue: 0x206694;
  DarkPurple: 0x71368a;
  DarkVividPink: 0xad1457;
  DarkGold: 0xc27c0e;
  DarkOrange: 0xa84300;
  DarkRed: 0x992d22;
  DarkGrey: 0x979c9f;
  DarkerGrey: 0x7f8c8d;
  LightGrey: 0xbcc0c0;
  DarkNavy: 0x2c3e50;
  Blurple: 0x5865f2;
  Greyple: 0x99aab5;
  DarkButNotBlack: 0x2c2f33;
  NotQuiteBlack: 0x23272a;
};

export enum Events {
  ApplicationCommandPermissionsUpdate = 'applicationCommandPermissionsUpdate',
  AutoModerationActionExecution = 'autoModerationActionExecution',
  AutoModerationRuleCreate = 'autoModerationRuleCreate',
  AutoModerationRuleDelete = 'autoModerationRuleDelete',
  AutoModerationRuleUpdate = 'autoModerationRuleUpdate',
  ClientReady = 'clientReady',
  GuildAuditLogEntryCreate = 'guildAuditLogEntryCreate',
  GuildAvailable = 'guildAvailable',
  GuildCreate = 'guildCreate',
  GuildDelete = 'guildDelete',
  GuildUpdate = 'guildUpdate',
  GuildUnavailable = 'guildUnavailable',
  GuildMemberAdd = 'guildMemberAdd',
  GuildMemberRemove = 'guildMemberRemove',
  GuildMemberUpdate = 'guildMemberUpdate',
  GuildMemberAvailable = 'guildMemberAvailable',
  GuildMembersChunk = 'guildMembersChunk',
  GuildIntegrationsUpdate = 'guildIntegrationsUpdate',
  GuildRoleCreate = 'roleCreate',
  GuildRoleDelete = 'roleDelete',
  InviteCreate = 'inviteCreate',
  InviteDelete = 'inviteDelete',
  GuildRoleUpdate = 'roleUpdate',
  GuildEmojiCreate = 'emojiCreate',
  GuildEmojiDelete = 'emojiDelete',
  GuildEmojiUpdate = 'emojiUpdate',
  GuildBanAdd = 'guildBanAdd',
  GuildBanRemove = 'guildBanRemove',
  ChannelCreate = 'channelCreate',
  ChannelDelete = 'channelDelete',
  ChannelUpdate = 'channelUpdate',
  ChannelPinsUpdate = 'channelPinsUpdate',
  MessageCreate = 'messageCreate',
  MessageDelete = 'messageDelete',
  MessageUpdate = 'messageUpdate',
  MessageBulkDelete = 'messageDeleteBulk',
  MessagePollVoteAdd = 'messagePollVoteAdd',
  MessagePollVoteRemove = 'messagePollVoteRemove',
  MessageReactionAdd = 'messageReactionAdd',
  MessageReactionRemove = 'messageReactionRemove',
  MessageReactionRemoveAll = 'messageReactionRemoveAll',
  MessageReactionRemoveEmoji = 'messageReactionRemoveEmoji',
  ThreadCreate = 'threadCreate',
  ThreadDelete = 'threadDelete',
  ThreadUpdate = 'threadUpdate',
  ThreadListSync = 'threadListSync',
  ThreadMemberUpdate = 'threadMemberUpdate',
  ThreadMembersUpdate = 'threadMembersUpdate',
  UserUpdate = 'userUpdate',
  PresenceUpdate = 'presenceUpdate',
  VoiceChannelEffectSend = 'voiceChannelEffectSend',
  VoiceServerUpdate = 'voiceServerUpdate',
  VoiceStateUpdate = 'voiceStateUpdate',
  TypingStart = 'typingStart',
  WebhooksUpdate = 'webhooksUpdate',
  Error = 'error',
  Warn = 'warn',
  Debug = 'debug',
  CacheSweep = 'cacheSweep',
  ShardDisconnect = 'shardDisconnect',
  ShardError = 'shardError',
  ShardReconnecting = 'shardReconnecting',
  ShardReady = 'shardReady',
  ShardResume = 'shardResume',
  Raw = 'raw',
  StageInstanceCreate = 'stageInstanceCreate',
  StageInstanceUpdate = 'stageInstanceUpdate',
  StageInstanceDelete = 'stageInstanceDelete',
  GuildStickerCreate = 'stickerCreate',
  GuildStickerDelete = 'stickerDelete',
  GuildStickerUpdate = 'stickerUpdate',
  GuildScheduledEventCreate = 'guildScheduledEventCreate',
  GuildScheduledEventUpdate = 'guildScheduledEventUpdate',
  GuildScheduledEventDelete = 'guildScheduledEventDelete',
  GuildScheduledEventUserAdd = 'guildScheduledEventUserAdd',
  GuildScheduledEventUserRemove = 'guildScheduledEventUserRemove',
  GuildSoundboardSoundCreate = 'guildSoundboardSoundCreate',
  GuildSoundboardSoundDelete = 'guildSoundboardSoundDelete',
  GuildSoundboardSoundUpdate = 'guildSoundboardSoundUpdate',
  GuildSoundboardSoundsUpdate = 'guildSoundboardSoundsUpdate',
  SoundboardSounds = 'soundboardSounds',
}

export enum WebSocketShardEvents {
  Close = 'close',
  Destroyed = 'destroyed',
  InvalidSession = 'invalidSession',
  Ready = 'ready',
  Resumed = 'resumed',
  AllReady = 'allReady',
}

export enum Status {
  Ready = 0,
  Connecting = 1,
  Reconnecting = 2,
  Idle = 3,
  Nearly = 4,
  Disconnected = 5,
  WaitingForGuilds = 6,
  Identifying = 7,
  Resuming = 8,
}

export interface GuildScheduledEventInviteURLCreateOptions extends InviteCreateOptions {
  channel?: GuildInvitableChannelResolvable;
}

export interface RoleCreateOptions extends RoleData {
  colors?: RoleColorsResolvable;
  reason?: string;
}

export interface RoleEditOptions extends RoleData {
  colors?: RoleColorsEditResolvable;
  reason?: string;
}

export interface StageInstanceCreateOptions {
  topic: string;
  privacyLevel?: StageInstancePrivacyLevel;
  sendStartNotification?: boolean;
  guildScheduledEvent?: GuildScheduledEventResolvable;
}

export interface CrosspostedChannel {
  channelId: Snowflake;
  guildId: Snowflake;
  type: ChannelType;
  name: string;
}

export type DateResolvable = Date | number | string;

export interface GuildTemplateEditOptions {
  name?: string;
  description?: string;
}

export interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export type EmojiIdentifierResolvable =
  | EmojiResolvable
  | `${'' | 'a:'}${string}:${Snowflake}`
  | `<${'' | 'a'}:${string}:${Snowflake}>`
  | string;

export type EmojiResolvable = Snowflake | GuildEmoji | ReactionEmoji;

export interface FetchArchivedThreadOptions {
  type?: 'public' | 'private';
  fetchAll?: boolean;
  before?: ThreadChannelResolvable | DateResolvable;
  limit?: number;
}

export interface FetchAutoModerationRuleOptions extends BaseFetchOptions {
  autoModerationRule: AutoModerationRuleResolvable;
}

export interface FetchAutoModerationRulesOptions {
  cache?: boolean;
}

export interface FetchBanOptions extends BaseFetchOptions {
  user: UserResolvable;
}

export interface FetchBansOptions {
  limit?: number;
  before?: Snowflake;
  after?: Snowflake;
  cache?: boolean;
}

export interface FetchChannelOptions extends BaseFetchOptions {
  allowUnknownGuild?: boolean;
}

export interface FetchedThreads {
  threads: ReadonlyCollection<Snowflake, AnyThreadChannel>;
  members: ReadonlyCollection<Snowflake, ThreadMember>;
}

export interface FetchedThreadsMore extends FetchedThreads {
  hasMore: boolean;
}

export interface FetchGuildOptions extends BaseFetchOptions {
  guild: GuildResolvable;
  withCounts?: boolean;
}

export interface FetchGuildsOptions {
  before?: Snowflake;
  after?: Snowflake;
  limit?: number;
}

export interface FetchGuildScheduledEventOptions extends BaseFetchOptions {
  guildScheduledEvent: GuildScheduledEventResolvable;
  withUserCount?: boolean;
}

export interface FetchGuildScheduledEventsOptions {
  cache?: boolean;
  withUserCount?: boolean;
}

export interface FetchGuildScheduledEventSubscribersOptions {
  limit?: number;
  withMember?: boolean;
}

export interface FetchInviteOptions extends BaseFetchOptions {
  code: string;
}

export interface FetchInvitesOptions {
  channelId?: GuildInvitableChannelResolvable;
  cache?: boolean;
}

export interface FetchMemberOptions extends BaseFetchOptions {
  user: UserResolvable;
}

export interface FetchMembersOptions {
  user?: UserResolvable | readonly UserResolvable[];
  query?: string;
  limit?: number;
  withPresences?: boolean;
  time?: number;
  nonce?: string;
}

export interface FetchMessageOptions extends BaseFetchOptions {
  message: MessageResolvable;
}

export interface FetchMessagesOptions {
  limit?: number;
  before?: Snowflake;
  after?: Snowflake;
  around?: Snowflake;
  cache?: boolean;
}

export interface FetchPinnedMessagesOptions {
  before?: DateResolvable;
  cache?: boolean;
  limit?: number;
}

export interface FetchPinnedMessagesResponse<InGuild extends boolean = boolean> {
  hasMore: boolean;
  items: readonly MessagePin<InGuild>[];
}

export interface MessagePin<InGuild extends boolean = boolean> {
  message: Message<InGuild>;
  get pinnedAt(): Date;
  pinnedTimestamp: number;
}

export interface FetchReactionUsersOptions {
  type?: ReactionType;
  limit?: number;
  after?: Snowflake;
}

export interface FetchThreadMemberOptions extends BaseFetchOptions {
  member: ThreadMemberResolvable;
  withMember?: boolean;
}

export interface FetchThreadOwnerOptions extends BaseFetchOptions {
  withMember?: boolean;
}

export interface FetchThreadMembersWithGuildMemberDataOptions {
  withMember: true;
  after?: Snowflake;
  limit?: number;
  cache?: boolean;
}

export interface FetchThreadMembersWithoutGuildMemberDataOptions {
  withMember?: false;
  cache?: boolean;
}

export type FetchThreadMembersOptions =
  | FetchThreadMembersWithGuildMemberDataOptions
  | FetchThreadMembersWithoutGuildMemberDataOptions;

export interface FetchThreadsOptions {
  archived?: FetchArchivedThreadOptions;
}

export interface AttachmentPayload {
  attachment: BufferResolvable | Stream;
  name?: string;
  description?: string;
  duration?: number;
  title?: string;
  waveform?: string;
}

export type GlobalSweepFilter<Key, Value> = () =>
  | ((value: Value, key: Key, collection: Collection<Key, Value>) => boolean)
  | null;

interface GuildAuditLogsTypes {
  [AuditLogEvent.GuildUpdate]: ['Guild', 'Update'];
  [AuditLogEvent.ChannelCreate]: ['Channel', 'Create'];
  [AuditLogEvent.ChannelUpdate]: ['Channel', 'Update'];
  [AuditLogEvent.ChannelDelete]: ['Channel', 'Delete'];
  [AuditLogEvent.ChannelOverwriteCreate]: ['Channel', 'Create'];
  [AuditLogEvent.ChannelOverwriteUpdate]: ['Channel', 'Update'];
  [AuditLogEvent.ChannelOverwriteDelete]: ['Channel', 'Delete'];
  [AuditLogEvent.MemberKick]: ['User', 'Delete'];
  [AuditLogEvent.MemberPrune]: ['User', 'Delete'];
  [AuditLogEvent.MemberBanAdd]: ['User', 'Delete'];
  [AuditLogEvent.MemberBanRemove]: ['User', 'Create'];
  [AuditLogEvent.MemberUpdate]: ['User', 'Update'];
  [AuditLogEvent.MemberRoleUpdate]: ['User', 'Update'];
  [AuditLogEvent.MemberMove]: ['User', 'Update'];
  [AuditLogEvent.MemberDisconnect]: ['User', 'Delete'];
  [AuditLogEvent.BotAdd]: ['User', 'Create'];
  [AuditLogEvent.RoleCreate]: ['Role', 'Create'];
  [AuditLogEvent.RoleUpdate]: ['Role', 'Update'];
  [AuditLogEvent.RoleDelete]: ['Role', 'Delete'];
  [AuditLogEvent.InviteCreate]: ['Invite', 'Create'];
  [AuditLogEvent.InviteUpdate]: ['Invite', 'Update'];
  [AuditLogEvent.InviteDelete]: ['Invite', 'Delete'];
  [AuditLogEvent.WebhookCreate]: ['Webhook', 'Create'];
  [AuditLogEvent.WebhookUpdate]: ['Webhook', 'Update'];
  [AuditLogEvent.WebhookDelete]: ['Webhook', 'Delete'];
  [AuditLogEvent.EmojiCreate]: ['Emoji', 'Create'];
  [AuditLogEvent.EmojiUpdate]: ['Emoji', 'Update'];
  [AuditLogEvent.EmojiDelete]: ['Emoji', 'Delete'];
  [AuditLogEvent.MessageDelete]: ['Message', 'Delete'];
  [AuditLogEvent.MessageBulkDelete]: ['Message', 'Delete'];
  [AuditLogEvent.MessagePin]: ['Message', 'Create'];
  [AuditLogEvent.MessageUnpin]: ['Message', 'Delete'];
  [AuditLogEvent.IntegrationCreate]: ['Integration', 'Create'];
  [AuditLogEvent.IntegrationUpdate]: ['Integration', 'Update'];
  [AuditLogEvent.IntegrationDelete]: ['Integration', 'Delete'];
  [AuditLogEvent.StageInstanceCreate]: ['StageInstance', 'Create'];
  [AuditLogEvent.StageInstanceUpdate]: ['StageInstance', 'Update'];
  [AuditLogEvent.StageInstanceDelete]: ['StageInstance', 'Delete'];
  [AuditLogEvent.StickerCreate]: ['Sticker', 'Create'];
  [AuditLogEvent.StickerUpdate]: ['Sticker', 'Update'];
  [AuditLogEvent.StickerDelete]: ['Sticker', 'Delete'];
  [AuditLogEvent.GuildScheduledEventCreate]: ['GuildScheduledEvent', 'Create'];
  [AuditLogEvent.GuildScheduledEventUpdate]: ['GuildScheduledEvent', 'Update'];
  [AuditLogEvent.GuildScheduledEventDelete]: ['GuildScheduledEvent', 'Delete'];
  [AuditLogEvent.ThreadCreate]: ['Thread', 'Create'];
  [AuditLogEvent.ThreadUpdate]: ['Thread', 'Update'];
  [AuditLogEvent.ThreadDelete]: ['Thread', 'Delete'];
  [AuditLogEvent.ApplicationCommandPermissionUpdate]: ['ApplicationCommand', 'Update'];
  [AuditLogEvent.SoundboardSoundCreate]: ['SoundboardSound', 'Create'];
  [AuditLogEvent.SoundboardSoundUpdate]: ['SoundboardSound', 'Update'];
  [AuditLogEvent.SoundboardSoundDelete]: ['SoundboardSound', 'Delete'];
  [AuditLogEvent.AutoModerationRuleCreate]: ['AutoModeration', 'Create'];
  [AuditLogEvent.AutoModerationRuleUpdate]: ['AutoModeration', 'Update'];
  [AuditLogEvent.AutoModerationRuleDelete]: ['AutoModeration', 'Delete'];
  [AuditLogEvent.AutoModerationBlockMessage]: ['User', 'Update'];
  [AuditLogEvent.AutoModerationFlagToChannel]: ['User', 'Update'];
  [AuditLogEvent.AutoModerationUserCommunicationDisabled]: ['User', 'Update'];
  [AuditLogEvent.OnboardingPromptCreate]: ['GuildOnboardingPrompt', 'Create'];
  [AuditLogEvent.OnboardingPromptUpdate]: ['GuildOnboardingPrompt', 'Update'];
  [AuditLogEvent.OnboardingPromptDelete]: ['GuildOnboardingPrompt', 'Delete'];
  [AuditLogEvent.OnboardingCreate]: ['GuildOnboarding', 'Create'];
  [AuditLogEvent.OnboardingUpdate]: ['GuildOnboarding', 'Update'];
}

export type GuildAuditLogsActionType = GuildAuditLogsTypes[keyof GuildAuditLogsTypes][1] | 'All';

export interface GuildAuditLogsEntryExtraField {
  [AuditLogEvent.MemberKick]: { integrationType: string } | null;
  [AuditLogEvent.MemberRoleUpdate]: { integrationType: string } | null;
  [AuditLogEvent.MemberPrune]: { removed: number; days: number };
  [AuditLogEvent.MemberMove]: { channel: VoiceBasedChannel | { id: Snowflake }; count: number };
  [AuditLogEvent.MessageDelete]: { channel: GuildTextBasedChannel | { id: Snowflake }; count: number };
  [AuditLogEvent.MessageBulkDelete]: { count: number };
  [AuditLogEvent.MessagePin]: { channel: GuildTextBasedChannel | { id: Snowflake }; messageId: Snowflake };
  [AuditLogEvent.MessageUnpin]: { channel: GuildTextBasedChannel | { id: Snowflake }; messageId: Snowflake };
  [AuditLogEvent.MemberDisconnect]: { count: number };
  [AuditLogEvent.ChannelOverwriteCreate]:
    | Role
    | GuildMember
    | { id: Snowflake; name: string; type: AuditLogOptionsType.Role }
    | { id: Snowflake; type: AuditLogOptionsType.Member };
  [AuditLogEvent.ChannelOverwriteUpdate]:
    | Role
    | GuildMember
    | { id: Snowflake; name: string; type: AuditLogOptionsType.Role }
    | { id: Snowflake; type: AuditLogOptionsType.Member };
  [AuditLogEvent.ChannelOverwriteDelete]:
    | Role
    | GuildMember
    | { id: Snowflake; name: string; type: AuditLogOptionsType.Role }
    | { id: Snowflake; type: AuditLogOptionsType.Member };
  [AuditLogEvent.StageInstanceCreate]: StageChannel | { id: Snowflake };
  [AuditLogEvent.StageInstanceDelete]: StageChannel | { id: Snowflake };
  [AuditLogEvent.StageInstanceUpdate]: StageChannel | { id: Snowflake };
  [AuditLogEvent.ApplicationCommandPermissionUpdate]: { applicationId: Snowflake };
  [AuditLogEvent.AutoModerationBlockMessage]: {
    autoModerationRuleName: string;
    autoModerationRuleTriggerType: AuditLogRuleTriggerType;
    channel: GuildTextBasedChannel | { id: Snowflake };
  };
  [AuditLogEvent.AutoModerationFlagToChannel]: {
    autoModerationRuleName: string;
    autoModerationRuleTriggerType: AuditLogRuleTriggerType;
    channel: GuildTextBasedChannel | { id: Snowflake };
  };
  [AuditLogEvent.AutoModerationUserCommunicationDisabled]: {
    autoModerationRuleName: string;
    autoModerationRuleTriggerType: AuditLogRuleTriggerType;
    channel: GuildTextBasedChannel | { id: Snowflake };
  };
}

export interface GuildAuditLogsEntryTargetField<TAction extends AuditLogEvent> {
  User: User | PartialUser | null;
  Guild: Guild;
  Webhook: Webhook<WebhookType.ChannelFollower | WebhookType.Incoming>;
  Invite: Invite;
  Emoji: GuildEmoji | { id: Snowflake };
  Role: Role | { id: Snowflake };
  Message: TAction extends AuditLogEvent.MessageBulkDelete ? GuildTextBasedChannel | { id: Snowflake } : User | null;
  Integration: Integration;
  Channel: NonThreadGuildBasedChannel | { id: Snowflake; [x: string]: unknown };
  Thread: AnyThreadChannel | { id: Snowflake; [x: string]: unknown };
  StageInstance: StageInstance;
  Sticker: Sticker;
  GuildScheduledEvent: GuildScheduledEvent;
  ApplicationCommand: ApplicationCommand | { id: Snowflake };
  AutoModerationRule: AutoModerationRule;
  GuildOnboardingPrompt: GuildOnboardingPrompt | { id: Snowflake; [x: string]: unknown };
  SoundboardSound: SoundboardSound | { id: Snowflake };
}

export interface GuildAuditLogsFetchOptions<Event extends GuildAuditLogsResolvable> {
  before?: Snowflake | GuildAuditLogsEntry;
  after?: Snowflake | GuildAuditLogsEntry;
  limit?: number;
  user?: UserResolvable;
  type?: Event;
}

export type GuildAuditLogsResolvable = AuditLogEvent | null;

export type GuildAuditLogsTargetType = GuildAuditLogsTypes[keyof GuildAuditLogsTypes][0] | 'Unknown';

export type GuildAuditLogsTargets = {
  [Key in GuildAuditLogsTargetType]: Key;
};

export type GuildBanResolvable = GuildBan | UserResolvable;

export type GuildChannelResolvable = Snowflake | GuildBasedChannel;

export interface AutoModerationRuleCreateOptions {
  name: string;
  eventType: AutoModerationRuleEventType;
  triggerType: AutoModerationRuleTriggerType;
  triggerMetadata?: AutoModerationTriggerMetadataOptions;
  actions: readonly AutoModerationActionOptions[];
  enabled?: boolean;
  exemptRoles?: ReadonlyCollection<Snowflake, Role> | readonly RoleResolvable[];
  exemptChannels?: ReadonlyCollection<Snowflake, GuildBasedChannel> | readonly GuildChannelResolvable[];
  reason?: string;
}

export interface AutoModerationRuleEditOptions extends Partial<Omit<AutoModerationRuleCreateOptions, 'triggerType'>> {}

export interface AutoModerationTriggerMetadataOptions extends Partial<AutoModerationTriggerMetadata> {}

export interface AutoModerationActionOptions {
  type: AutoModerationActionType;
  metadata?: AutoModerationActionMetadataOptions;
}

export interface AutoModerationActionMetadataOptions extends Partial<Omit<AutoModerationActionMetadata, 'channelId'>> {
  channel?: GuildTextChannelResolvable | ThreadChannel;
}

export interface GuildChannelCreateOptions extends Omit<CategoryCreateChannelOptions, 'type'> {
  parent?: CategoryChannelResolvable | null;
  type?: Exclude<
    ChannelType,
    | ChannelType.DM
    | ChannelType.GroupDM
    | ChannelType.PublicThread
    | ChannelType.AnnouncementThread
    | ChannelType.PrivateThread
  >;
}

export interface GuildChannelCloneOptions extends Omit<GuildChannelCreateOptions, 'name'> {
  name?: string;
}

export interface GuildChannelEditOptions {
  name?: string;
  type?: ChannelType.GuildText | ChannelType.GuildAnnouncement;
  position?: number;
  topic?: string | null;
  nsfw?: boolean;
  bitrate?: number;
  userLimit?: number;
  parent?: CategoryChannelResolvable | null;
  rateLimitPerUser?: number;
  lockPermissions?: boolean;
  permissionOverwrites?: readonly OverwriteResolvable[] | ReadonlyCollection<Snowflake, OverwriteResolvable>;
  defaultAutoArchiveDuration?: ThreadAutoArchiveDuration;
  rtcRegion?: string | null;
  videoQualityMode?: VideoQualityMode | null;
  availableTags?: readonly GuildForumTagData[];
  defaultReactionEmoji?: DefaultReactionEmoji | null;
  defaultThreadRateLimitPerUser?: number;
  flags?: ChannelFlagsResolvable;
  defaultSortOrder?: SortOrderType | null;
  defaultForumLayout?: ForumLayoutType;
  reason?: string;
}

export interface GuildChannelOverwriteOptions {
  reason?: string;
  type?: OverwriteType;
}

/** @deprecated API related to guild ownership may no longer be used. */
export interface GuildCreateOptions {
  name: string;
  icon?: BufferResolvable | Base64Resolvable | null;
  verificationLevel?: GuildVerificationLevel;
  defaultMessageNotifications?: GuildDefaultMessageNotifications;
  explicitContentFilter?: GuildExplicitContentFilter;
  roles?: readonly PartialRoleData[];
  channels?: readonly PartialChannelData[];
  afkChannelId?: Snowflake | number;
  afkTimeout?: number;
  systemChannelId?: Snowflake | number;
  systemChannelFlags?: SystemChannelFlagsResolvable;
}

export interface GuildWidgetSettings {
  enabled: boolean;
  channel: TextChannel | NewsChannel | VoiceBasedChannel | ForumChannel | MediaChannel | null;
}

export interface GuildEditOptions {
  name?: string;
  verificationLevel?: GuildVerificationLevel | null;
  defaultMessageNotifications?: GuildDefaultMessageNotifications | null;
  explicitContentFilter?: GuildExplicitContentFilter | null;
  afkTimeout?: number;
  afkChannel?: VoiceChannelResolvable | null;
  icon?: BufferResolvable | Base64Resolvable | null;
  /** @deprecated API related to guild ownership may no longer be used. */
  owner?: GuildMemberResolvable;
  splash?: BufferResolvable | Base64Resolvable | null;
  discoverySplash?: BufferResolvable | Base64Resolvable | null;
  banner?: BufferResolvable | Base64Resolvable | null;
  systemChannel?: TextChannelResolvable | null;
  systemChannelFlags?: SystemChannelFlagsResolvable;
  rulesChannel?: TextChannelResolvable | null;
  publicUpdatesChannel?: TextChannelResolvable | null;
  safetyAlertsChannel?: TextChannelResolvable | null;
  preferredLocale?: Locale | null;
  features?: readonly `${GuildFeature}`[];
  description?: string | null;
  premiumProgressBarEnabled?: boolean;
  reason?: string;
}

export interface GuildEmojiCreateOptions {
  attachment: BufferResolvable | Base64Resolvable;
  name: string;
  roles?: ReadonlyCollection<Snowflake, Role> | readonly RoleResolvable[];
  reason?: string;
}

export interface GuildEmojiEditOptions {
  name?: string;
  roles?: ReadonlyCollection<Snowflake, Role> | readonly RoleResolvable[];
  reason?: string;
}

export interface GuildStickerCreateOptions {
  file: BufferResolvable | Stream | AttachmentPayload | JSONEncodable<AttachmentBuilder>;
  name: string;
  tags: string;
  description?: string | null;
  reason?: string;
}

export interface GuildStickerEditOptions {
  name?: string;
  description?: string | null;
  tags?: string;
  reason?: string;
}

export interface GuildMemberEditOptions {
  nick?: string | null;
  roles?: ReadonlyCollection<Snowflake, Role> | readonly RoleResolvable[];
  mute?: boolean;
  deaf?: boolean;
  channel?: GuildVoiceChannelResolvable | null;
  communicationDisabledUntil?: DateResolvable | null;
  flags?: GuildMemberFlagsResolvable;
  reason?: string;
}

export type GuildMemberResolvable = GuildMember | UserResolvable;

export interface GuildMemberEditMeOptions {
  avatar?: Base64Resolvable | BufferResolvable | null;
  banner?: Base64Resolvable | BufferResolvable | null;
  bio?: string | null;
  nick?: string | null;
  reason?: string;
}

export type GuildResolvable = Guild | NonThreadGuildBasedChannel | GuildMember | GuildEmoji | Invite | Role | Snowflake;

export interface GuildPruneMembersOptions {
  count?: boolean;
  days?: number;
  dry?: boolean;
  reason?: string;
  roles?: readonly RoleResolvable[];
}

export interface GuildWidgetSettingsData {
  enabled: boolean;
  channel: TextChannel | NewsChannel | VoiceBasedChannel | ForumChannel | MediaChannel | Snowflake | null;
}

// TODO: use conditional types for better TS support
export interface GuildScheduledEventCreateOptions {
  name: string;
  scheduledStartTime: DateResolvable;
  scheduledEndTime?: DateResolvable;
  privacyLevel: GuildScheduledEventPrivacyLevel;
  entityType: GuildScheduledEventEntityType;
  description?: string;
  channel?: GuildVoiceChannelResolvable;
  entityMetadata?: GuildScheduledEventEntityMetadataOptions;
  image?: BufferResolvable | Base64Resolvable | null;
  reason?: string;
  recurrenceRule?: GuildScheduledEventRecurrenceRuleOptions;
}

export type GuildScheduledEventRecurrenceRuleOptions =
  | BaseGuildScheduledEventRecurrenceRuleOptions<
      GuildScheduledEventRecurrenceRuleFrequency.Yearly,
      {
        byMonth: readonly GuildScheduledEventRecurrenceRuleMonth[];
        byMonthDay: readonly number[];
      }
    >
  | BaseGuildScheduledEventRecurrenceRuleOptions<
      GuildScheduledEventRecurrenceRuleFrequency.Monthly,
      {
        byNWeekday: readonly GuildScheduledEventRecurrenceRuleNWeekday[];
      }
    >
  | BaseGuildScheduledEventRecurrenceRuleOptions<
      GuildScheduledEventRecurrenceRuleFrequency.Weekly | GuildScheduledEventRecurrenceRuleFrequency.Daily,
      {
        byWeekday: readonly GuildScheduledEventRecurrenceRuleWeekday[];
      }
    >;

type BaseGuildScheduledEventRecurrenceRuleOptions<
  Frequency extends GuildScheduledEventRecurrenceRuleFrequency,
  Extra extends {},
> = {
  startAt: DateResolvable;
  interval: number;
  frequency: Frequency;
} & Extra;

export interface GuildScheduledEventEditOptions<
  Status extends GuildScheduledEventStatus,
  AcceptableStatus extends GuildScheduledEventSetStatusArg<Status>,
> extends Omit<Partial<GuildScheduledEventCreateOptions>, 'channel' | 'recurrenceRule'> {
  channel?: GuildVoiceChannelResolvable | null;
  status?: AcceptableStatus;
  recurrenceRule?: GuildScheduledEventRecurrenceRuleOptions | null;
}

export interface GuildScheduledEventEntityMetadata {
  location: string | null;
}

export interface GuildScheduledEventEntityMetadataOptions {
  location?: string;
}

export type GuildScheduledEventManagerFetchResult<
  Options extends GuildScheduledEventResolvable | FetchGuildScheduledEventOptions | FetchGuildScheduledEventsOptions,
> = Options extends GuildScheduledEventResolvable | FetchGuildScheduledEventOptions
  ? GuildScheduledEvent
  : Collection<Snowflake, GuildScheduledEvent>;

export type GuildScheduledEventManagerFetchSubscribersResult<
  Options extends FetchGuildScheduledEventSubscribersOptions,
> = Options extends { withMember: true }
  ? Collection<Snowflake, GuildScheduledEventUser<true>>
  : Collection<Snowflake, GuildScheduledEventUser<false>>;

export type GuildScheduledEventResolvable = Snowflake | GuildScheduledEvent;

export type GuildScheduledEventSetStatusArg<Status extends GuildScheduledEventStatus> =
  Status extends GuildScheduledEventStatus.Scheduled
    ? GuildScheduledEventStatus.Active | GuildScheduledEventStatus.Canceled
    : Status extends GuildScheduledEventStatus.Active
      ? GuildScheduledEventStatus.Completed
      : never;

export interface GuildScheduledEventUser<WithMember> {
  guildScheduledEventId: Snowflake;
  user: User;
  member: WithMember extends true ? GuildMember : null;
}

export type GuildTemplateResolvable = string;

export type GuildVoiceChannelResolvable = VoiceBasedChannel | Snowflake;

export interface GuildOnboardingEditOptions {
  prompts?: readonly GuildOnboardingPromptData[] | ReadonlyCollection<Snowflake, GuildOnboardingPrompt>;
  defaultChannels?: readonly ChannelResolvable[] | ReadonlyCollection<Snowflake, GuildChannel>;
  enabled?: boolean;
  mode?: GuildOnboardingMode;
  reason?: string;
}

export interface GuildOnboardingPromptData {
  id?: Snowflake;
  title: string;
  singleSelect?: boolean;
  required?: boolean;
  inOnboarding?: boolean;
  type?: GuildOnboardingPromptType;
  options: readonly GuildOnboardingPromptOptionData[] | ReadonlyCollection<Snowflake, GuildOnboardingPromptOption>;
}

export interface GuildOnboardingPromptOptionData {
  id?: Snowflake | null;
  channels?: readonly ChannelResolvable[] | ReadonlyCollection<Snowflake, GuildChannel>;
  roles?: readonly RoleResolvable[] | ReadonlyCollection<Snowflake, Role>;
  title: string;
  description?: string | null;
  emoji?: EmojiIdentifierResolvable | Emoji | null;
}

export type HexColorString = `#${string}`;

export interface IncidentActions {
  invitesDisabledUntil: Date | null;
  dmsDisabledUntil: Date | null;
  dmSpamDetectedAt: Date | null;
  raidDetectedAt: Date | null;
}

export interface IncidentActionsEditOptions {
  invitesDisabledUntil?: DateResolvable | null | undefined;
  dmsDisabledUntil?: DateResolvable | null | undefined;
}

export interface IntegrationAccount {
  id: string | Snowflake;
  name: string;
}

export type IntegrationType = 'twitch' | 'youtube' | 'discord' | 'guild_subscription';

export type IntegrationTypesConfigurationParameters = ClientApplicationInstallParams;

export interface IntegrationTypesConfigurationContext {
  oauth2InstallParams: IntegrationTypesConfigurationParameters | null;
}

export type IntegrationTypesConfiguration = Partial<
  Record<ApplicationIntegrationType, IntegrationTypesConfigurationContext>
>;

export type GuildInvitableChannelResolvable =
  | TextChannel
  | VoiceChannel
  | NewsChannel
  | StageChannel
  | ForumChannel
  | MediaChannel
  | Snowflake;

export interface InviteCreateOptions {
  temporary?: boolean;
  maxAge?: number;
  maxUses?: number;
  unique?: boolean;
  reason?: string;
  roles?: readonly RoleResolvable[];
  targetApplication?: ApplicationResolvable;
  targetUser?: UserResolvable;
  targetType?: InviteTargetType;
  targetUsersFile?: BufferResolvable | readonly UserResolvable[];
}

export type InviteResolvable = string;

export interface LifetimeFilterOptions<Key, Value> {
  excludeFromSweep?: (value: Value, key: Key, collection: LimitedCollection<Key, Value>) => boolean;
  getComparisonTimestamp?: (value: Value, key: Key, collection: LimitedCollection<Key, Value>) => number;
  lifetime?: number;
}

export type ActionRowComponentOptions =
  | ButtonComponentData
  | StringSelectMenuComponentData
  | UserSelectMenuComponentData
  | RoleSelectMenuComponentData
  | MentionableSelectMenuComponentData
  | ChannelSelectMenuComponentData;

export type MessageActionRowComponentResolvable = MessageActionRowComponent | ActionRowComponentOptions;

export interface MessageActivity {
  partyId?: string;
  type: MessageActivityType;
}

export interface BaseButtonComponentData extends BaseComponentData {
  type: ComponentType.Button;
  style: ButtonStyle;
  disabled?: boolean;
  emoji?: ComponentEmojiResolvable;
  label?: string;
}

export interface LinkButtonComponentData extends BaseButtonComponentData {
  style: ButtonStyle.Link;
  url: string;
}

export interface InteractionButtonComponentData extends BaseButtonComponentData {
  style: Exclude<ButtonStyle, ButtonStyle.Link>;
  customId: string;
}

export type ButtonComponentData = InteractionButtonComponentData | LinkButtonComponentData;

export interface MessageCollectorOptions extends CollectorOptions<[Message, Collection<Snowflake, Message>]> {
  max?: number;
  maxProcessed?: number;
}

export interface MessageInteractionMetadata {
  id: Snowflake;
  type: InteractionType;
  user: User;
  authorizingIntegrationOwners: AuthorizingIntegrationOwners;
  originalResponseMessageId: Snowflake | null;
  interactedMessageId: Snowflake | null;
  triggeringInteractionMetadata: MessageInteractionMetadata | null;
}

/** @deprecated Use {@link MessageInteractionMetadata} instead. */
export interface MessageInteraction {
  id: Snowflake;
  type: InteractionType;
  commandName: string;
  user: User;
}

export interface MessageMentionsHasOptions {
  ignoreDirect?: boolean;
  ignoreRoles?: boolean;
  ignoreRepliedUser?: boolean;
  ignoreEveryone?: boolean;
}

export interface MessageMentionOptions {
  parse?: readonly MessageMentionTypes[];
  roles?: readonly Snowflake[];
  users?: readonly Snowflake[];
  repliedUser?: boolean;
}

export type MessageMentionTypes = 'roles' | 'users' | 'everyone';

export interface MessageSnapshot
  extends Partialize<
    Message,
    null,
    Exclude<
      keyof Message,
      | 'attachments'
      | 'client'
      | 'components'
      | 'content'
      | 'createdTimestamp'
      | 'editedTimestamp'
      | 'embeds'
      | 'flags'
      | 'mentions'
      | 'stickers'
      | 'type'
    >
  > {}

export interface BaseMessageOptions {
  content?: string;
  embeds?: readonly (JSONEncodable<APIEmbed> | APIEmbed)[];
  allowedMentions?: MessageMentionOptions;
  files?: readonly (
    | BufferResolvable
    | Stream
    | JSONEncodable<APIAttachment>
    | Attachment
    | AttachmentBuilder
    | AttachmentPayload
  )[];
  components?: readonly (
    | JSONEncodable<APIMessageTopLevelComponent>
    | TopLevelComponentData
    | ActionRowData<MessageActionRowComponentData | MessageActionRowComponentBuilder>
    | APIMessageTopLevelComponent
  )[];
}

export interface BaseMessageOptionsWithPoll extends BaseMessageOptions {
  poll?: PollData;
}

export interface MessageCreateOptions extends BaseMessageOptionsWithPoll {
  tts?: boolean;
  nonce?: string | number;
  enforceNonce?: boolean;
  reply?: ReplyOptions;
  forward?: ForwardOptions;
  stickers?: readonly StickerResolvable[];
  sharedClientTheme?: JSONEncodable<APIMessageSharedClientTheme> | SharedClientTheme;
  flags?:
    | BitFieldResolvable<
        Extract<MessageFlagsString, 'IsVoiceMessage' | 'SuppressEmbeds' | 'SuppressNotifications' | 'IsComponentsV2'>,
        | MessageFlags.IsVoiceMessage
        | MessageFlags.SuppressEmbeds
        | MessageFlags.SuppressNotifications
        | MessageFlags.IsComponentsV2
      >
    | undefined;
}

export interface GuildForumThreadMessageCreateOptions
  extends BaseMessageOptions,
    Pick<MessageCreateOptions, 'flags' | 'stickers'> {}

export interface MessageEditAttachmentData {
  id: Snowflake;
}

export interface MessageEditOptions extends Omit<BaseMessageOptions, 'content'> {
  content?: string | null;
  attachments?: readonly (Attachment | MessageEditAttachmentData)[];
  flags?:
    | BitFieldResolvable<
        Extract<MessageFlagsString, 'SuppressEmbeds' | 'IsComponentsV2'>,
        MessageFlags.SuppressEmbeds | MessageFlags.IsComponentsV2
      >
    | undefined;
}

export type MessageReactionResolvable = MessageReaction | Snowflake | string;

export interface MessageReference {
  channelId: Snowflake;
  guildId: Snowflake | undefined;
  messageId: Snowflake | undefined;
  type: MessageReferenceType;
}

export type MessageResolvable = Message | Snowflake;

export interface BaseSelectMenuComponentData extends BaseComponentData {
  customId: string;
  disabled?: boolean;
  maxValues?: number;
  minValues?: number;
  placeholder?: string;
  required?: true;
}

export interface StringSelectMenuComponentData extends BaseSelectMenuComponentData {
  type: ComponentType.StringSelect;
  options: readonly SelectMenuComponentOptionData[];
}

export interface UserSelectMenuComponentData extends BaseSelectMenuComponentData {
  type: ComponentType.UserSelect;
  defaultValues?: readonly APISelectMenuDefaultValue<SelectMenuDefaultValueType.User>[];
}

export interface RoleSelectMenuComponentData extends BaseSelectMenuComponentData {
  type: ComponentType.RoleSelect;
  defaultValues?: readonly APISelectMenuDefaultValue<SelectMenuDefaultValueType.Role>[];
}

export interface MentionableSelectMenuComponentData extends BaseSelectMenuComponentData {
  type: ComponentType.MentionableSelect;
  defaultValues?: readonly APISelectMenuDefaultValue<
    SelectMenuDefaultValueType.Role | SelectMenuDefaultValueType.User
  >[];
}

export interface ChannelSelectMenuComponentData extends BaseSelectMenuComponentData {
  type: ComponentType.ChannelSelect;
  channelTypes?: readonly ChannelType[];
  defaultValues?: readonly APISelectMenuDefaultValue<SelectMenuDefaultValueType.Channel>[];
}

export interface MessageSelectOption {
  default: boolean;
  description: string | null;
  emoji: APIPartialEmoji | null;
  label: string;
  value: string;
}

export interface ReactionCountDetailsData {
  burst: number;
  normal: number;
}

export interface SelectMenuComponentOptionData {
  default?: boolean;
  description?: string;
  emoji?: ComponentEmojiResolvable;
  label: string;
  value: string;
}

export interface TextInputComponentData extends BaseComponentData {
  type: ComponentType.TextInput;
  customId: string;
  style: TextInputStyle;
  label: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  value?: string;
  placeholder?: string;
}

export interface FileUploadComponentData extends BaseComponentData {
  customId: string;
  fileTypes?: readonly FileUploadType[];
  maxValues?: number;
  minValues?: number;
  required?: boolean;
  type: ComponentType.FileUpload;
}

export interface RadioGroupOption {
  default?: boolean;
  description?: string;
  label: string;
  value: string;
}
export interface RadioGroupComponentData extends BaseComponentData {
  customId: string;
  options: readonly RadioGroupOption[];
  required?: boolean;
  type: ComponentType.RadioGroup;
}

export interface CheckboxGroupOption {
  default?: boolean;
  description?: string;
  label: string;
  value: string;
}
export interface CheckboxGroupComponentData extends BaseComponentData {
  customId: string;
  maxValues?: number;
  minValues?: number;
  options: readonly CheckboxGroupOption[];
  required?: boolean;
  type: ComponentType.CheckboxGroup;
}

export interface CheckboxComponentData extends BaseComponentData {
  customId: string;
  default?: boolean;
  type: ComponentType.Checkbox;
}

export type MessageTarget =
  | TextBasedChannel
  | User
  | GuildMember
  | Webhook<WebhookType.Incoming>
  | WebhookClient
  | Message
  | MessageManager;

export interface OverwriteData {
  allow?: PermissionResolvable;
  deny?: PermissionResolvable;
  id: GuildMemberResolvable | RoleResolvable;
  type?: OverwriteType;
}

export type OverwriteResolvable = PermissionOverwrites | OverwriteData;

export type PermissionFlags = Record<keyof typeof PermissionFlagsBits, bigint>;

export type PermissionOverwriteOptions = Partial<Record<keyof typeof PermissionFlagsBits, boolean | null>>;

export type PermissionResolvable = BitFieldResolvable<keyof typeof PermissionFlagsBits, bigint>;

export type PermissionOverwriteResolvable = UserResolvable | RoleResolvable | PermissionOverwrites;

export interface RecursiveReadonlyArray<ItemType> extends ReadonlyArray<ItemType | RecursiveReadonlyArray<ItemType>> {}

export interface PartialRecipient {
  username: string;
}

export interface PresenceData {
  status?: PresenceStatusData;
  afk?: boolean;
  activities?: readonly ActivitiesOptions[];
  shardId?: number | readonly number[];
}

export type PresenceResolvable = Presence | UserResolvable | Snowflake;

/** @deprecated API related to guild ownership may no longer be used. */
export interface PartialChannelData {
  id?: Snowflake | number;
  parentId?: Snowflake | number;
  type?: ChannelType.GuildText | ChannelType.GuildVoice | ChannelType.GuildCategory;
  name: string;
  topic?: string | null;
  nsfw?: boolean;
  bitrate?: number;
  userLimit?: number;
  rtcRegion?: string | null;
  videoQualityMode?: VideoQualityMode;
  permissionOverwrites?: readonly PartialOverwriteData[];
  rateLimitPerUser?: number;
}

export interface PartialEmoji {
  animated: boolean;
  id: Snowflake | undefined;
  name: string;
}

export interface PartialEmojiOnlyId {
  id: Snowflake;
}

export type Partialize<
  PartialType extends AllowedPartial,
  NulledKeys extends keyof PartialType | null = null,
  NullableKeys extends keyof PartialType | null = null,
  OverridableKeys extends keyof PartialType | '' = '',
> = {
  [K in keyof Omit<PartialType, OverridableKeys>]: K extends 'partial'
    ? true
    : K extends NulledKeys
      ? null
      : K extends NullableKeys
        ? PartialType[K] | null
        : PartialType[K];
};

export interface PartialDMChannel extends Partialize<DMChannel, null, null, 'lastMessageId'> {
  lastMessageId: undefined;
}

export interface PartialGuildMember extends Partialize<GuildMember, 'joinedAt' | 'joinedTimestamp' | 'pending'> {}

export interface PartialMessage<InGuild extends boolean = boolean>
  extends Partialize<Message<InGuild>, 'type' | 'system' | 'pinned' | 'tts', 'content' | 'cleanContent' | 'author'> {}

export interface PartialMessageReaction extends Partialize<MessageReaction, 'count'> {}

export interface PartialPoll
  extends Partialize<
    Poll,
    'allowMultiselect' | 'layoutType' | 'expiresTimestamp',
    null,
    'question' | 'message' | 'answers'
  > {
  question: { text: null };
  message: PartialMessage;
  answers: Collection<number, PartialPollAnswer>;
}

export interface PartialPollAnswer extends Partialize<PollAnswer, 'emoji' | 'text', null, 'poll'> {
  readonly poll: PartialPoll;
}

export interface PartialGuildScheduledEvent
  extends Partialize<GuildScheduledEvent, 'userCount', 'status' | 'privacyLevel' | 'name' | 'entityType'> {}

export interface PartialThreadMember extends Partialize<ThreadMember, 'flags' | 'joinedAt' | 'joinedTimestamp'> {}

export interface PartialSoundboardSound extends Partialize<SoundboardSound, 'available' | 'name' | 'volume'> {}

/** @deprecated API related to guild ownership may no longer be used. */
export interface PartialOverwriteData {
  id: Snowflake | number;
  type?: OverwriteType;
  allow?: PermissionResolvable;
  deny?: PermissionResolvable;
}

/** @deprecated API related to guild ownership may no longer be used. */
export interface PartialRoleData extends RoleData {
  id?: Snowflake | number;
}

export enum Partials {
  User,
  Channel,
  GuildMember,
  Message,
  Reaction,
  GuildScheduledEvent,
  ThreadMember,
  SoundboardSound,
  Poll,
  PollAnswer,
}

export interface PartialUser extends Partialize<User, 'username' | 'tag' | 'discriminator'> {}

export type PresenceStatusData = ClientPresenceStatus | 'invisible';

export type PresenceStatus = PresenceStatusData | 'offline';

export interface ReactionCollectorOptions extends CollectorOptions<[MessageReaction, User]> {
  max?: number;
  maxEmojis?: number;
  maxUsers?: number;
}

export interface ReplyOptions {
  messageReference: MessageResolvable;
  failIfNotExists?: boolean;
}

export interface BaseForwardOptions {
  message: MessageResolvable;
  channel?: Exclude<TextBasedChannelResolvable, PartialGroupDMChannel>;
  guild?: GuildResolvable;
}

export type ForwardOptionsWithMandatoryChannel = BaseForwardOptions & Required<Pick<BaseForwardOptions, 'channel'>>;

export interface ForwardOptionsWithOptionalChannel extends BaseForwardOptions {
  message: Exclude<MessageResolvable, Snowflake>;
}

export type ForwardOptions = ForwardOptionsWithMandatoryChannel | ForwardOptionsWithOptionalChannel;

export interface MessageReplyOptions extends Omit<MessageCreateOptions, 'reply' | 'forward'> {
  failIfNotExists?: boolean;
}

export interface ResolvedOverwriteOptions {
  allow: PermissionsBitField;
  deny: PermissionsBitField;
}

export interface RoleData {
  name?: string;
  /** @deprecated Use `colors` instead. */
  color?: ColorResolvable;
  hoist?: boolean;
  position?: number;
  permissions?: PermissionResolvable;
  mentionable?: boolean;
  icon?: BufferResolvable | Base64Resolvable | EmojiResolvable | null;
  unicodeEmoji?: string | null;
}

export type RoleMention = '@everyone' | `<@&${Snowflake}>`;

export interface RolePosition {
  role: RoleResolvable;
  position: number;
}

export type RoleResolvable = Role | Snowflake;

export interface RoleSubscriptionData {
  roleSubscriptionListingId: Snowflake;
  tierName: string;
  totalMonthsSubscribed: number;
  isRenewal: boolean;
}

export interface RoleTagData {
  botId?: Snowflake;
  integrationId?: Snowflake;
  premiumSubscriberRole?: true;
  subscriptionListingId?: Snowflake;
  availableForPurchase?: true;
  guildConnections?: true;
}

export interface SetChannelPositionOptions {
  relative?: boolean;
  reason?: string;
}

export interface SetParentOptions {
  lockPermissions?: boolean;
  reason?: string;
}

export interface SetRolePositionOptions {
  relative?: boolean;
  reason?: string;
}

export { Snowflake };

export type StageInstanceResolvable = StageInstance | Snowflake;

export interface StartThreadOptions {
  name: string;
  autoArchiveDuration?: ThreadAutoArchiveDuration;
  reason?: string;
  rateLimitPerUser?: number;
}

export type ClientStatus = number;

export type StickerResolvable = Sticker | Snowflake;

export type SystemChannelFlagsResolvable = BitFieldResolvable<SystemChannelFlagsString, number>;

export type StageChannelResolvable = StageChannel | Snowflake;

export interface StageInstanceEditOptions {
  topic?: string;
  privacyLevel?: StageInstancePrivacyLevel;
}

/** @internal */
export interface SupportingInteractionResolvedData {
  client: Client;
  guild?: Guild;
  channel?: GuildTextBasedChannel;
}

export type SweeperKey = keyof SweeperDefinitions;

export type CollectionSweepFilter<Key, Value> = (value: Value, key: Key, collection: Collection<Key, Value>) => boolean;

export interface SweepOptions<Key, Value> {
  interval: number;
  filter: GlobalSweepFilter<Key, Value>;
}

export interface LifetimeSweepOptions {
  interval: number;
  lifetime: number;
  filter?: never;
}

export interface SweeperDefinitions {
  autoModerationRules: [Snowflake, AutoModerationRule];
  bans: [Snowflake, GuildBan];
  emojis: [Snowflake, GuildEmoji];
  invites: [string, Invite, true];
  guildMembers: [Snowflake, GuildMember];
  messages: [Snowflake, Message, true];
  presences: [Snowflake, Presence];
  reactions: [string | Snowflake, MessageReaction];
  stageInstances: [Snowflake, StageInstance];
  stickers: [Snowflake, Sticker];
  threadMembers: [Snowflake, ThreadMember];
  threads: [Snowflake, AnyThreadChannel, true];
  users: [Snowflake, User];
  voiceStates: [Snowflake, VoiceState];
}

export type SweeperOptions = {
  [Key in keyof SweeperDefinitions]?: SweeperDefinitions[Key][2] extends true
    ? SweepOptions<SweeperDefinitions[Key][0], SweeperDefinitions[Key][1]> | LifetimeSweepOptions
    : SweepOptions<SweeperDefinitions[Key][0], SweeperDefinitions[Key][1]>;
};

export interface LimitedCollectionOptions<Key, Value> {
  maxSize?: number;
  keepOverLimit?: (value: Value, key: Key, collection: LimitedCollection<Key, Value>) => boolean;
}

export type Channel =
  | CategoryChannel
  | DMChannel
  | PartialDMChannel
  | PartialGroupDMChannel
  | NewsChannel
  | StageChannel
  | TextChannel
  | PublicThreadChannel
  | PrivateThreadChannel
  | VoiceChannel
  | ForumChannel
  | MediaChannel;

export type TextBasedChannel = Exclude<Extract<Channel, { type: TextChannelType }>, ForumChannel | MediaChannel>;

export type SendableChannels = Extract<Channel, { send: (...args: any[]) => any }>;

export type TextBasedChannels = TextBasedChannel;

export type TextBasedChannelTypes = TextBasedChannel['type'];

export type GuildTextBasedChannelTypes = Exclude<TextBasedChannelTypes, ChannelType.DM | ChannelType.GroupDM>;

export type SendableChannelTypes = SendableChannels['type'];

export type VoiceBasedChannel = Extract<Channel, { bitrate: number }>;

export type GuildBasedChannel = Extract<Channel, { guild: Guild }>;

export type CategoryChildChannel = Exclude<Extract<Channel, { parent: CategoryChannel | null }>, CategoryChannel>;

export type NonThreadGuildBasedChannel = Exclude<GuildBasedChannel, AnyThreadChannel>;

export type GuildTextBasedChannel = Extract<GuildBasedChannel, TextBasedChannel>;

export type TextChannelResolvable = Snowflake | TextChannel;

export type TextBasedChannelResolvable = Snowflake | TextBasedChannel;

export type ThreadChannelResolvable = Snowflake | ThreadChannel;

export type ThreadChannelType = ChannelType.AnnouncementThread | ChannelType.PublicThread | ChannelType.PrivateThread;

export interface GuildTextThreadCreateOptions<AllowedThreadType> extends StartThreadOptions {
  startMessage?: MessageResolvable;
  type?: AllowedThreadType;
  invitable?: AllowedThreadType extends ChannelType.PrivateThread ? boolean : never;
}

export interface GuildForumThreadCreateOptions extends StartThreadOptions {
  message: GuildForumThreadMessageCreateOptions | MessagePayload;
  appliedTags?: readonly Snowflake[];
}

export interface ThreadEditOptions {
  name?: string;
  archived?: boolean;
  autoArchiveDuration?: ThreadAutoArchiveDuration;
  rateLimitPerUser?: number;
  locked?: boolean;
  invitable?: boolean;
  appliedTags?: readonly Snowflake[];
  flags?: ChannelFlagsResolvable;
  reason?: string;
}

export type ThreadMemberResolvable = ThreadMember | UserResolvable;

export type UserMention = `<@${Snowflake}>`;

export type UserResolvable = User | Snowflake | Message | GuildMember | ThreadMember;

export interface Vanity {
  code: string | null;
  uses: number;
}

export type VoiceBasedChannelTypes = VoiceBasedChannel['type'];

export type VoiceChannelResolvable = Snowflake | VoiceChannel;

export interface VoiceStateEditOptions {
  requestToSpeak?: boolean;
  suppressed?: boolean;
}

export type WebhookClientData = WebhookClientDataIdWithToken | WebhookClientDataURL;

export interface WebhookClientDataIdWithToken {
  id: Snowflake;
  token: string;
}

export interface WebhookClientDataURL {
  url: string;
}

export interface WebhookClientOptions extends Pick<ClientOptions, 'allowedMentions' | 'rest'> {}

export interface WebhookDeleteOptions {
  token?: string;
  reason?: string;
}

export interface WebhookEditOptions {
  name?: string;
  avatar?: BufferResolvable | null;
  channel?: GuildTextChannelResolvable | VoiceChannel | StageChannel | ForumChannel | MediaChannel;
  reason?: string;
}

export interface WebhookMessageEditOptions extends MessageEditOptions {
  threadId?: Snowflake;
  withComponents?: boolean;
}

export interface WebhookFetchMessageOptions {
  threadId?: Snowflake;
}

export interface WebhookMessageCreateOptions
  extends Omit<MessageCreateOptions, 'nonce' | 'reply' | 'stickers' | 'forward' | 'sharedClientTheme'> {
  username?: string;
  avatarURL?: string;
  threadId?: Snowflake;
  threadName?: string;
  appliedTags?: readonly Snowflake[];
  withComponents?: boolean;
}

export interface WebSocketOptions {
  large_threshold?: number;
  version?: number;
  buildStrategy?(manager: WSWebSocketManager): IShardingStrategy;
  buildIdentifyThrottler?(manager: WSWebSocketManager): Awaitable<IIdentifyThrottler>;
}

export interface WidgetActivity {
  name: string;
}

export interface WidgetChannel {
  id: Snowflake;
  name: string;
  position: number;
}

export interface WelcomeChannelData {
  description: string;
  channel: TextChannel | NewsChannel | ForumChannel | MediaChannel | Snowflake;
  emoji?: EmojiIdentifierResolvable;
}

export interface WelcomeScreenEditOptions {
  enabled?: boolean;
  description?: string;
  welcomeChannels?: readonly WelcomeChannelData[];
}

export interface ClientApplicationInstallParams {
  scopes: readonly OAuth2Scopes[];
  permissions: Readonly<PermissionsBitField>;
}

//#endregion

//#region Voice

/**
 * @internal Use `DiscordGatewayAdapterLibraryMethods` from `@discordjs/voice` instead.
 */
export interface InternalDiscordGatewayAdapterLibraryMethods {
  onVoiceServerUpdate(data: GatewayVoiceServerUpdateDispatchData): void;
  onVoiceStateUpdate(data: GatewayVoiceStateUpdateDispatchData): void;
  destroy(): void;
}

/**
 * @internal Use `DiscordGatewayAdapterImplementerMethods` from `@discordjs/voice` instead.
 */
export interface InternalDiscordGatewayAdapterImplementerMethods {
  sendPayload(payload: unknown): boolean;
  destroy(): void;
}

/**
 * @internal Use `DiscordGatewayAdapterCreator` from `@discordjs/voice` instead.
 */
export type InternalDiscordGatewayAdapterCreator = (
  methods: InternalDiscordGatewayAdapterLibraryMethods,
) => InternalDiscordGatewayAdapterImplementerMethods;

//#endregion

export * from '@discordjs/builders';
export * from '@discordjs/formatters';
export * from '@discordjs/rest';
export * from '@discordjs/util';
export * from '@discordjs/ws';
// External
export * from 'discord-api-types/v10';

// Solve TS compile error
export type { ImageSize };
