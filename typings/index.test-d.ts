import { ReadonlyCollection } from '@discordjs/collection';
import {
  APIActionRowComponent,
  APIButtonComponent,
  APIChannelSelectComponent,
  APIComponentInActionRow,
  APIEmbed,
  APIMentionableSelectComponent,
  APIMessage,
  APIPartialChannel,
  APIPartialGuild,
  APIRoleSelectComponent,
  APIStringSelectComponent,
  APIUserSelectComponent,
  ApplicationCommandOptionType,
  ApplicationIntegrationType,
  AuditLogEvent,
  ButtonStyle,
  ChannelType,
  ComponentType,
  GatewayIntentBits,
  GuildMemberFlags,
  GuildScheduledEventRecurrenceRuleFrequency,
  GuildScheduledEventRecurrenceRuleMonth,
  GuildScheduledEventRecurrenceRuleWeekday,
  MessageFlags,
  TextInputStyle,
  WebhookType,
} from 'discord-api-types/v10';
import {
  expectAssignable,
  expectDeprecated,
  expectNotAssignable,
  expectNotDeprecated,
  expectNotType,
  expectType,
} from 'tsd';
import {
  ActionRow,
  ActionRowBuilder,
  ActionRowComponent,
  ActionRowData,
  AnyThreadChannel,
  ApplicationCommandAttachmentOption,
  ApplicationCommandAttachmentOptionData,
  ApplicationCommandChannelOption,
  ApplicationCommandChannelOptionData,
  ApplicationCommandChoicesData,
  ApplicationCommandChoicesOption,
  ApplicationCommandOptionData,
  ApplicationCommandSubCommand,
  ApplicationCommandSubCommandData,
  ApplicationCommandSubGroup,
  ApplicationCommandSubGroupData,
  AttachmentBuilder,
  type AuditLogChange,
  AuthorizingIntegrationOwners,
  AutoModerationActionExecution,
  AutoModerationRule,
  AutoModerationRuleManager,
  ButtonBuilder,
  ButtonComponent,
  ButtonComponentData,
  Call,
  CallVoiceState,
  CategoryChannel,
  CategoryChannelChildManager,
  Channel,
  ChannelFlagsBitField,
  ChannelMention,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuComponent,
  ChatInputApplicationCommandData,
  Client,
  ClientApplication,
  ClientSession,
  ClientUser,
  ClientUserSettings,
  CloseEvent,
  Collection,
  Collector,
  CommandOptionNonChoiceResolvableType,
  ContainerComponentData,
  CustomStatus,
  DefaultSoundboardSound,
  DirectoryChannel,
  DMChannel,
  DMMessageManager,
  Embed,
  EmbedBuilder,
  Emoji,
  Events,
  FetchedThreadsMore,
  FetchPinnedMessagesResponse,
  FileComponentData,
  FileUploadComponentData,
  ForumChannel,
  Guild,
  GuildAuditLogs,
  GuildAuditLogsActionType,
  GuildAuditLogsEntry,
  GuildAuditLogsTargetType,
  GuildBan,
  GuildBanManager,
  type GuildBasedChannel,
  GuildChannel,
  GuildChannelManager,
  GuildEmoji,
  GuildEmojiManager,
  GuildForumThreadManager,
  GuildInviteManager,
  GuildMember,
  GuildMemberFlagsBitField,
  GuildMemberManager,
  GuildMessageManager,
  GuildOnboarding,
  GuildScheduledEventManager,
  GuildScheduledEventRecurrenceRuleOptions,
  GuildScheduledEventUser,
  GuildTemplate,
  type GuildTextBasedChannel,
  GuildTextThreadManager,
  Invite,
  MediaChannel,
  MediaGalleryComponentData,
  MediaGalleryItemData,
  MentionableSelectMenuBuilder,
  MentionableSelectMenuComponent,
  Message,
  MessageActionRowComponentBuilder,
  MessageActionRowComponentData,
  MessageCollector,
  MessageManager,
  MessageMentions,
  MessageReaction,
  NewsChannel,
  type NonThreadGuildBasedChannel,
  Options,
  PartialDMChannel,
  PartialEmoji,
  PartialEmojiOnlyId,
  PartialGroupDMChannel,
  PartialGroupDMMessageManager,
  PartialGuildMember,
  PartialMessage,
  PartialMessageReaction,
  PartialPoll,
  PartialPollAnswer,
  PartialTextBasedChannelFields,
  PartialThreadMember,
  PartialUser,
  PermissionOverwriteManager,
  Poll,
  PollAnswer,
  PollAnswerVoterManager,
  PollData,
  Presence,
  PresenceManager,
  PresenceStatus,
  PresenceStatusData,
  ReactionCollector,
  Relationship,
  RelationshipManager,
  RelationshipType,
  Role,
  RoleManager,
  RoleSelectMenuBuilder,
  RoleSelectMenuComponent,
  resolvePartialEmoji,
  SectionComponentData,
  SeparatorComponentData,
  Snowflake,
  StageChannel,
  StageInstance,
  Status,
  StickerPack,
  StringSelectMenuBuilder,
  StringSelectMenuComponent,
  StringSelectMenuComponentData,
  type TextBasedChannel,
  TextBasedChannelFields,
  type TextBasedChannelTypes,
  TextChannel,
  TextDisplayComponentData,
  TextInputBuilder,
  ThreadChannel,
  ThreadChannelType,
  ThreadManager,
  ThreadMember,
  ThreadMemberFlagsBitField,
  ThreadMemberManager,
  ThreadOnlyChannel,
  ThumbnailComponentData,
  Typing,
  UnfurledMediaItemData,
  User,
  UserManager,
  UserMention,
  UserSelectMenuBuilder,
  UserSelectMenuComponent,
  type VoiceBasedChannel,
  VoiceChannel,
  VoiceServerUpdateData,
  Webhook,
  WebhookClient,
  WebSocketShard,
  WebSocketShardEvents,
} from './index.js';

// Test type transformation:
declare const notPropertyOf: <Value, Property extends PropertyKey>(
  value: Value,
  property: Property & Exclude<Property, keyof Value>,
) => void;

const client: Client = new Client({
  intents: GatewayIntentBits.Guilds,
  makeCache: Options.cacheWithLimits({
    MessageManager: 200,
    // @ts-expect-error
    Message: 100,
    GuildMemberManager: {
      maxSize: 200,
      keepOverLimit: member => member.id === client.user?.id,
    },
    ThreadManager: {
      maxSize: 200,
      keepOverLimit: value => !value.archived,
    },
  }),
});

if (client.isReady()) {
  expectType<Client<true>>(client);
} else {
  expectType<Client>(client);
}

client.on('autoModerationActionExecution', autoModerationActionExecution =>
  expectType<AutoModerationActionExecution>(autoModerationActionExecution),
);

client.on('autoModerationRuleCreate', ({ client }) => expectType<Client<true>>(client));
client.on('autoModerationRuleDelete', ({ client }) => expectType<Client<true>>(client));

client.on('autoModerationRuleUpdate', (oldAutoModerationRule, { client: newClient }) => {
  expectType<Client<true>>(oldAutoModerationRule!.client);
  expectType<Client<true>>(newClient);
});

client.on('channelCreate', ({ client }) => expectType<Client<true>>(client));
client.on('channelDelete', ({ client }) => expectType<Client<true>>(client));
client.on('channelPinsUpdate', ({ client }, date) => {
  expectType<Client<true>>(client);
  expectType<Date | null>(date);
});

client.on('channelUpdate', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('emojiCreate', ({ client }) => expectType<Client<true>>(client));
client.on('emojiDelete', ({ client }) => expectType<Client<true>>(client));

client.on('emojiUpdate', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('guildBanAdd', ({ client }) => expectType<Client<true>>(client));
client.on('guildBanRemove', ({ client }) => expectType<Client<true>>(client));
client.on('guildDelete', ({ client }) => expectType<Client<true>>(client));
client.on('guildIntegrationsUpdate', ({ client }) => expectType<Client<true>>(client));
client.on('guildMemberAdd', ({ client }) => expectType<Client<true>>(client));
client.on('guildMemberAvailable', ({ client }) => expectType<Client<true>>(client));

client.on('guildMemberRemove', member => {
  expectType<Client<true>>(member.client);
  if (member.partial) return expectType<null>(member.joinedAt);
  expectType<Date | null>(member.joinedAt);
});

client.on('guildMembersChunk', (members, { client }) => {
  expectType<Client<true>>(members.first()!.client);
  expectType<Client<true>>(client);
});

client.on('guildMemberUpdate', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('guildScheduledEventCreate', ({ client }) => expectType<Client<true>>(client));
client.on('guildScheduledEventDelete', ({ client }) => expectType<Client<true>>(client));

client.on('guildScheduledEventUpdate', (oldGuildScheduledEvent, { client }) => {
  expectType<Client<true>>(oldGuildScheduledEvent!.client);
  expectType<Client<true>>(client);
});

client.on('guildScheduledEventUserAdd', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('guildScheduledEventUserRemove', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('guildUnavailable', ({ client }) => expectType<Client<true>>(client));

client.on('guildUpdate', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('inviteCreate', ({ client }) => expectType<Client<true>>(client));
client.on('inviteDelete', ({ client }) => expectType<Client<true>>(client));

// This is to check that stuff is the right type
declare const assertIsMessage: (m: Promise<Message>) => void;

client.on('messageCreate', async message => {
  const { client, channel } = message;

  // https://github.com/discordjs/discord.js/issues/8545
  {
    // These should not throw any errors when comparing messages from any source.
    channel.messages.cache.filter(message => message);
    (await channel.messages.fetch()).filter(({ author }) => author.id === message.author.id);

    if (channel.isDMBased()) {
      expectType<DMMessageManager | PartialGroupDMMessageManager>(channel.messages.channel.messages);
    } else {
      expectType<GuildMessageManager>(channel.messages.channel.messages);
    }
  }

  if (!message.inGuild() && message.partial) {
    expectNotType<never>(message);
  }

  expectType<Client<true>>(client);
  assertIsMessage(channel.send('string'));
  assertIsMessage(channel.send({}));
  // @ts-expect-error User accounts cannot send embeds
  channel.send({ embeds: [] });

  const attachment = new AttachmentBuilder('file.png');
  const embed = new EmbedBuilder();
  assertIsMessage(channel.send({ files: [attachment] }));
  // @ts-expect-error User accounts cannot send embeds
  channel.send({ embeds: [embed] });
  // @ts-expect-error User accounts cannot send embeds
  channel.send({ embeds: [embed], files: [attachment] });

  expectType<TextBasedChannel>(message.channel);
  expectNotType<GuildTextBasedChannel>(message.channel);

  // @ts-expect-error
  channel.send();
  // @ts-expect-error
  channel.send({ another: 'property' });

  const webhook = await message.fetchWebhook();

  if (webhook.isChannelFollower()) {
    expectAssignable<Guild | APIPartialGuild>(webhook.sourceGuild);
    expectAssignable<NewsChannel | APIPartialChannel>(webhook.sourceChannel);
    expectType<Webhook<WebhookType.ChannelFollower>>(webhook);
  } else if (webhook.isIncoming()) {
    expectType<string>(webhook.token);
    expectType<Webhook<WebhookType.Incoming>>(webhook);
  }

  expectNotType<Guild | APIPartialGuild>(webhook.sourceGuild);
  expectNotType<NewsChannel | APIPartialChannel>(webhook.sourceChannel);
  expectNotType<string>(webhook.token);

  // Check that both builders and builder data can be sent via webhooks (user accounts cannot send embeds/components)
  const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();

  const rawButtonsRow: ActionRowData<ButtonComponentData> = {
    type: ComponentType.ActionRow,
    components: [
      { type: ComponentType.Button, label: 'test', style: ButtonStyle.Primary, customId: 'test' },
      {
        type: ComponentType.Button,
        label: 'another test',
        style: ButtonStyle.Link,
        url: 'https://discord.js.org',
      },
    ],
  };

  const buttonsRow: ActionRowData<ButtonBuilder> = {
    type: ComponentType.ActionRow,
    components: [new ButtonBuilder()],
  };

  const rawStringSelectMenuRow: ActionRowData<StringSelectMenuComponentData> = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.StringSelect,
        options: [{ label: 'test', value: 'test' }],
        customId: 'test',
      },
    ],
  };

  const stringSelectRow: ActionRowData<StringSelectMenuBuilder> = {
    type: ComponentType.ActionRow,
    components: [new StringSelectMenuBuilder()],
  };

  const embedData = { description: 'test', color: 0xff0000 };

  webhook.send({
    components: [row, rawButtonsRow, buttonsRow, rawStringSelectMenuRow, stringSelectRow],
    embeds: [embed, embedData],
  });

  // @ts-expect-error User accounts cannot send components
  channel.send({ components: [row] });

  const rawTextDisplay: TextDisplayComponentData = {
    type: ComponentType.TextDisplay,
    content: 'test',
  };

  const rawMedia: UnfurledMediaItemData = { url: 'https://discord.js.org' };

  const rawThumbnail: ThumbnailComponentData = {
    type: ComponentType.Thumbnail,
    media: rawMedia,
    spoiler: true,
    description: 'test',
  };

  const rawSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [rawTextDisplay],
    accessory: rawThumbnail,
  };

  const rawMediaGalleryItem: MediaGalleryItemData = {
    media: rawMedia,
    description: 'test',
    spoiler: false,
  };

  const rawMediaGallery: MediaGalleryComponentData = {
    type: ComponentType.MediaGallery,
    items: [rawMediaGalleryItem, rawMediaGalleryItem, rawMediaGalleryItem],
  };

  const rawSeparator: SeparatorComponentData = {
    type: ComponentType.Separator,
    spacing: 1,
    divider: false,
  };

  const rawFile: FileComponentData = {
    type: ComponentType.File,
    file: rawMedia,
  };

  const rawContainer: ContainerComponentData = {
    type: ComponentType.Container,
    components: [rawSection, rawSeparator, rawMediaGallery, rawFile],
    accentColor: 0xff00ff,
    spoiler: true,
  };

  webhook.send({ flags: MessageFlags.IsComponentsV2, components: [rawContainer] });
});

client.on('messageDelete', ({ client }) => expectType<Client<true>>(client));

client.on('messageDeleteBulk', (messages, { client }) => {
  expectType<Client<true>>(messages.first()!.client);
  expectType<Client<true>>(client);
});

client.on('messagePollVoteAdd', async (answer, userId) => {
  expectType<Client<true>>(answer.client);
  expectType<Snowflake>(userId);

  if (answer.partial) {
    expectType<null>(answer.emoji);
    expectType<null>(answer.text);
    expectNotType<null>(answer.id);
    expectNotType<null>(answer.poll);

    await answer.poll.fetch();
    answer = answer.poll.answers?.get(answer.id) ?? answer;

    expectType<User>(answer.voters.cache.get(userId)!);
  }

  expectType<string | null>(answer.text);
  expectType<GuildEmoji | Emoji | null>(answer.emoji);
  expectType<number>(answer.id);
  expectType<number>(answer.voteCount!);
});

client.on('messagePollVoteRemove', async (answer, userId) => {
  expectType<Client<true>>(answer.client);
  expectType<Snowflake>(userId);

  if (answer.partial) {
    expectType<null>(answer.emoji);
    expectType<null>(answer.text);
    expectNotType<null>(answer.id);
    expectNotType<null>(answer.poll);

    await answer.poll.fetch();
    answer = answer.poll.answers?.get(answer.id) ?? answer;
  }

  expectType<string | null>(answer.text);
  expectType<GuildEmoji | Emoji | null>(answer.emoji);
  expectType<number>(answer.id);
  expectType<number>(answer.voteCount!);
});

client.on('messageReactionAdd', async (reaction, { client }) => {
  expectType<Client<true>>(reaction.client);
  expectType<Client<true>>(client);

  if (reaction.partial) {
    expectType<null>(reaction.count);
    reaction = await reaction.fetch();
  }

  expectType<number>(reaction.count);
  if (reaction.message.partial) return expectType<string | null>(reaction.message.content);
  expectType<string>(reaction.message.content);
});

client.on('messageReactionRemove', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('messageReactionRemoveAll', async (message, reactions) => {
  console.log(`messageReactionRemoveAll - id: ${message.id} (${message.id.length})`);
  if (message.partial) message = await message.fetch();
  console.log(`messageReactionRemoveAll - content: ${message.content}`);
  expectType<Client<true>>(message.client);
  expectType<Client<true>>(reactions.first()!.client);
});

client.on('messageReactionRemoveEmoji', ({ client }) => expectType<Client<true>>(client));

client.on('messageUpdate', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('presenceUpdate', (oldPresence, { client }) => {
  expectType<Client<true>>(oldPresence!.client);
  expectType<Client<true>>(client);
});

client.on('ready', async client => {
  expectType<Client<true>>(client);
  console.log(`Client is logged in as ${client.user.tag} and ready!`);
});

client.on('roleCreate', ({ client }) => expectType<Client<true>>(client));
client.on('roleDelete', ({ client }) => expectType<Client<true>>(client));

client.on('roleUpdate', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('stageInstanceCreate', ({ client }) => expectType<Client<true>>(client));
client.on('stageInstanceDelete', ({ client }) => expectType<Client<true>>(client));

client.on('stageInstanceUpdate', (oldStageInstance, { client }) => {
  expectType<Client<true>>(oldStageInstance!.client);
  expectType<Client<true>>(client);
});

client.on('stickerCreate', ({ client }) => expectType<Client<true>>(client));
client.on('stickerDelete', ({ client }) => expectType<Client<true>>(client));

client.on('stickerUpdate', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('threadCreate', thread => {
  expectType<Client<true>>(thread.client);

  if (thread.type === ChannelType.PrivateThread) {
    expectType<number>(thread.createdTimestamp);
    expectType<Date>(thread.createdAt);
  } else {
    expectType<number | null>(thread.createdTimestamp);
    expectType<Date | null>(thread.createdAt);
  }
});

client.on('threadDelete', ({ client }) => expectType<Client<true>>(client));

client.on('threadListSync', (threads, { client }) => {
  expectType<Client<true>>(threads.first()!.client);
  expectType<Client<true>>(client);
});

client.on('threadMembersUpdate', (addedMembers, removedMembers, thread) => {
  expectType<Client<true>>(addedMembers.first()!.client);
  expectType<Client<true>>(removedMembers.first()!.client);
  expectType<Client<true>>(thread.client);
  expectType<ReadonlyCollection<Snowflake, ThreadMember>>(addedMembers);
  expectType<ReadonlyCollection<Snowflake, ThreadMember | PartialThreadMember>>(removedMembers);
  expectType<AnyThreadChannel>(thread);
  const left = removedMembers.first();
  if (!left) return;

  if (left.partial) {
    expectType<PartialThreadMember>(left);
    expectType<null>(left.flags);
  } else {
    expectType<ThreadMember>(left);
    expectType<ThreadMemberFlagsBitField>(left.flags);
  }
});

client.on('threadMemberUpdate', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('threadUpdate', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('typingStart', ({ client }) => expectType<Client<true>>(client));

client.on('userUpdate', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('voiceServerUpdate', data => {
  expectType<VoiceServerUpdateData>(data);
});

client.on('voiceStateUpdate', ({ client: oldClient }, { client: newClient }) => {
  expectType<Client<true>>(oldClient);
  expectType<Client<true>>(newClient);
});

client.on('webhooksUpdate', ({ client }) => expectType<Client<true>>(client));

client.on('guildCreate', async g => {
  expectType<Client<true>>(g.client);
  const channel = g.channels.cache.random();
  if (!channel) return;

  if (channel.type === ChannelType.GuildText) {
    const row: ActionRowData<MessageActionRowComponentData> = {
      type: ComponentType.ActionRow,
      components: [
        new ButtonBuilder(),
        { type: ComponentType.Button, style: ButtonStyle.Primary, label: 'string', customId: 'foo' },
        { type: ComponentType.Button, style: ButtonStyle.Link, label: 'test', url: 'test' },
        { type: ComponentType.StringSelect, customId: 'foo', options: [{ label: 'label', value: 'value' }] },
        new StringSelectMenuBuilder(),
        // @ts-expect-error
        { type: ComponentType.TextInput, style: TextInputStyle.Paragraph, customId: 'foo', label: 'test' },
        // @ts-expect-error
        new TextInputBuilder(),
      ],
    };

    const row2 = new ActionRowBuilder<MessageActionRowComponentBuilder>({
      type: ComponentType.ActionRow,
      components: [
        { type: ComponentType.Button, style: ButtonStyle.Primary, label: 'string', customId: 'foo' },
        { type: ComponentType.Button, style: ButtonStyle.Link, label: 'test', url: 'test' },
        { type: ComponentType.StringSelect, customId: 'foo', options: [{ label: 'label', value: 'value' }] },
      ],
    });

    webhookClient.send({ components: [row, row2] });
  }

  channel.setName('foo').then(updatedChannel => {
    console.log(`New channel name: ${updatedChannel.name}`);
  });
});

// EventEmitter static method overrides
expectType<Promise<[Client<true>]>>(Client.once(client, 'ready'));
expectAssignable<AsyncIterableIterator<[Client<true>]>>(Client.on(client, 'ready'));

client.login('absolutely-valid-token');

declare const loggedInClient: Client<true>;
expectType<ClientApplication | null>(loggedInClient.application);
expectType<Date>(loggedInClient.readyAt);
expectType<number>(loggedInClient.readyTimestamp);
expectType<string>(loggedInClient.token);
expectType<number>(loggedInClient.uptime);
expectType<ClientUser>(loggedInClient.user);

declare const loggedOutClient: Client<false>;
expectType<null>(loggedOutClient.application);
expectType<null>(loggedOutClient.readyAt);
expectType<null>(loggedOutClient.readyTimestamp);
expectType<string | null>(loggedOutClient.token);
expectType<null>(loggedOutClient.uptime);
expectType<null>(loggedOutClient.user);

declare const dmChannel: DMChannel;
declare const threadChannel: ThreadChannel;
declare const threadChannelFromForum: ThreadChannel<true>;
declare const threadChannelNotFromForum: ThreadChannel<false>;
declare const newsChannel: NewsChannel;
declare const textChannel: TextChannel;
declare const voiceChannel: VoiceChannel;
declare const guild: Guild;
declare const user: User;
declare const guildMember: GuildMember;

// Test thread channels' parent inference
expectType<TextChannel | NewsChannel | ForumChannel | MediaChannel | null>(threadChannel.parent);
expectType<ForumChannel | MediaChannel | null>(threadChannelFromForum.parent);
expectType<TextChannel | NewsChannel | null>(threadChannelNotFromForum.parent);

// Test whether the structures implement send
expectType<TextBasedChannelFields<false>['send']>(dmChannel.send);
expectType<TextBasedChannelFields<true>['send']>(threadChannel.send);
expectType<TextBasedChannelFields<true>['send']>(newsChannel.send);
expectType<TextBasedChannelFields<true>['send']>(textChannel.send);
expectType<TextBasedChannelFields<true>['send']>(voiceChannel.send);
expectAssignable<PartialTextBasedChannelFields>(user);
expectAssignable<PartialTextBasedChannelFields>(guildMember);

expectType<Promise<Message<false>>>(client.users.send(user, 'test'));

expectType<Promise<NewsChannel>>(textChannel.setType(ChannelType.GuildAnnouncement));
expectType<Promise<TextChannel>>(newsChannel.setType(ChannelType.GuildText));

expectType<Message | null>(dmChannel.lastMessage);
expectType<Message | null>(threadChannel.lastMessage);
expectType<Message | null>(newsChannel.lastMessage);
expectType<Message | null>(textChannel.lastMessage);
expectType<Message | null>(voiceChannel.lastMessage);

notPropertyOf(user, 'lastMessage');
notPropertyOf(user, 'lastMessageId');
notPropertyOf(guildMember, 'lastMessage');
notPropertyOf(guildMember, 'lastMessageId');

// Test collector event parameters
declare const messageCollector: MessageCollector;
messageCollector.on('collect', (...args) => {
  expectType<[Message, Collection<Snowflake, Message>]>(args);
});

(async () => {
  for await (const value of messageCollector) {
    expectType<[Message<boolean>, Collection<Snowflake, Message>]>(value);
  }
})();

declare const reactionCollector: ReactionCollector;
reactionCollector.on('dispose', (...args) => {
  expectType<[MessageReaction, User]>(args);
});

(async () => {
  for await (const value of reactionCollector) {
    expectType<[MessageReaction, User]>(value);
  }
})();

// Make sure the properties are typed correctly, and that no backwards properties
// (K -> V and V -> K) exist:
expectAssignable<'messageCreate'>(Events.MessageCreate);
expectAssignable<'close'>(WebSocketShardEvents.Close);
expectAssignable<1>(Status.Connecting);

declare const applicationCommandOptionData: ApplicationCommandOptionData;
{
  // Test inference of choice values.
  if ('choices' in applicationCommandOptionData) {
    if (applicationCommandOptionData.type === ApplicationCommandOptionType.String) {
      expectType<string>(applicationCommandOptionData.choices[0]!.value);
      expectNotType<number>(applicationCommandOptionData.choices[0]!.value);
    }

    if (applicationCommandOptionData.type === ApplicationCommandOptionType.Integer) {
      expectType<number>(applicationCommandOptionData.choices[0]!.value);
      expectNotType<string>(applicationCommandOptionData.choices[0]!.value);
    }

    if (applicationCommandOptionData.type === ApplicationCommandOptionType.Number) {
      expectType<number>(applicationCommandOptionData.choices[0]!.value);
      expectNotType<string>(applicationCommandOptionData.choices[0]!.value);
    }
  }
}

declare const chatInputApplicationCommandData: ChatInputApplicationCommandData;
{
  chatInputApplicationCommandData.options = [];
  chatInputApplicationCommandData.options = [] as const;
}

declare const applicationCommandChannelOptionData: ApplicationCommandChannelOptionData;
declare const applicationCommandChannelOption: ApplicationCommandChannelOption;
{
  applicationCommandChannelOptionData.channelTypes = [] as const;
  applicationCommandChannelOptionData.channel_types = [] as const;
  applicationCommandChannelOption.channelTypes = [] as const;
}

declare const applicationCommandAttachmentOptionData: ApplicationCommandAttachmentOptionData;
declare const applicationCommandAttachmentOption: ApplicationCommandAttachmentOption;
{
  applicationCommandAttachmentOptionData.fileTypes = ['image', '.pdf'] as const;
  applicationCommandAttachmentOptionData.file_types = ['video', '.mov'] as const;
  applicationCommandAttachmentOption.fileTypes = ['audio', '.flac'] as const;

  expectNotAssignable<ApplicationCommandOptionData>({
    description: 'Upload a file',
    fileTypes: ['pdf'],
    name: 'file',
    type: ApplicationCommandOptionType.Attachment,
  });
}

declare const applicationNonChoiceOptionData: ApplicationCommandOptionData & {
  type: CommandOptionNonChoiceResolvableType;
};
{
  // Options aren't allowed on this command type.

  // @ts-expect-error
  applicationNonChoiceOptionData.choices;
}

declare const applicationCommandChoicesData: ApplicationCommandChoicesData;
declare const applicationCommandChoicesOption: ApplicationCommandChoicesOption;
{
  applicationCommandChoicesData.choices = [];
  applicationCommandChoicesData.choices = [] as const;
  applicationCommandChoicesOption.choices = [];
  applicationCommandChoicesOption.choices = [] as const;
}

declare const applicationCommandSubCommandData: ApplicationCommandSubCommandData;
declare const applicationCommandSubCommand: ApplicationCommandSubCommand;
{
  applicationCommandSubCommandData.options = [];
  applicationCommandSubCommandData.options = [] as const;
  applicationCommandSubCommand.options = [];
  applicationCommandSubCommand.options = [] as const;
}

declare const applicationSubGroupCommandData: ApplicationCommandSubGroupData;
declare const applicationCommandSubGroup: ApplicationCommandSubGroup;
{
  expectType<ApplicationCommandOptionType.SubcommandGroup>(applicationSubGroupCommandData.type);
  applicationSubGroupCommandData.options = [];
  applicationSubGroupCommandData.options = [] as const;
  applicationCommandSubGroup.options = [];
  applicationCommandSubGroup.options = [] as const;
}

declare const autoModerationRuleManager: AutoModerationRuleManager;
{
  expectType<Promise<AutoModerationRule>>(autoModerationRuleManager.fetch('1234567890'));
  expectType<Promise<AutoModerationRule>>(autoModerationRuleManager.fetch({ autoModerationRule: '1234567890' }));
  expectType<Promise<AutoModerationRule>>(
    autoModerationRuleManager.fetch({ autoModerationRule: '1234567890', cache: false }),
  );
  expectType<Promise<AutoModerationRule>>(
    autoModerationRuleManager.fetch({ autoModerationRule: '1234567890', force: true }),
  );
  expectType<Promise<AutoModerationRule>>(
    autoModerationRuleManager.fetch({ autoModerationRule: '1234567890', cache: false, force: true }),
  );
  expectType<Promise<Collection<Snowflake, AutoModerationRule>>>(autoModerationRuleManager.fetch());
  expectType<Promise<Collection<Snowflake, AutoModerationRule>>>(autoModerationRuleManager.fetch({}));
  expectType<Promise<Collection<Snowflake, AutoModerationRule>>>(autoModerationRuleManager.fetch({ cache: false }));
  // @ts-expect-error The `force` option cannot be used alongside fetching all auto moderation rules.
  autoModerationRuleManager.fetch({ force: false });
}

declare const categoryChannelChildManager: CategoryChannelChildManager;
{
  expectType<Promise<VoiceChannel>>(categoryChannelChildManager.create({ name: 'name', type: ChannelType.GuildVoice }));
  expectType<Promise<TextChannel>>(categoryChannelChildManager.create({ name: 'name', type: ChannelType.GuildText }));
  expectType<Promise<NewsChannel>>(
    categoryChannelChildManager.create({ name: 'name', type: ChannelType.GuildAnnouncement }),
  );
  expectType<Promise<StageChannel>>(
    categoryChannelChildManager.create({ name: 'name', type: ChannelType.GuildStageVoice }),
  );
  expectType<Promise<TextChannel>>(categoryChannelChildManager.create({ name: 'name' }));
}

declare const guildChannelManager: GuildChannelManager;
{
  expectType<Promise<TextChannel>>(guildChannelManager.create({ name: 'name' }));
  expectType<Promise<VoiceChannel>>(guildChannelManager.create({ name: 'name', type: ChannelType.GuildVoice }));
  expectType<Promise<CategoryChannel>>(guildChannelManager.create({ name: 'name', type: ChannelType.GuildCategory }));
  expectType<Promise<TextChannel>>(guildChannelManager.create({ name: 'name', type: ChannelType.GuildText }));
  expectType<Promise<NewsChannel>>(guildChannelManager.create({ name: 'name', type: ChannelType.GuildAnnouncement }));
  expectType<Promise<StageChannel>>(guildChannelManager.create({ name: 'name', type: ChannelType.GuildStageVoice }));
  expectType<Promise<ForumChannel>>(guildChannelManager.create({ name: 'name', type: ChannelType.GuildForum }));
  expectType<Promise<MediaChannel>>(guildChannelManager.create({ name: 'name', type: ChannelType.GuildMedia }));

  expectType<Promise<Collection<Snowflake, NonThreadGuildBasedChannel | null>>>(guildChannelManager.fetch());
  expectType<Promise<Collection<Snowflake, NonThreadGuildBasedChannel | null>>>(
    guildChannelManager.fetch(undefined, {}),
  );
  expectType<Promise<GuildBasedChannel | null>>(guildChannelManager.fetch('0'));

  const channel = guildChannelManager.cache.first()!;

  if (channel.isTextBased()) {
    const { messages } = channel;
    const message = await messages.fetch('123');
    expectType<GuildMessageManager>(messages);
    expectType<Promise<Message<true>>>(messages.crosspost('1234567890'));
    expectType<Promise<Message<true>>>(messages.edit('1234567890', 'text'));
    expectType<Promise<Message<true>>>(messages.fetch('1234567890'));
    expectType<Promise<Collection<Snowflake, Message<true>>>>(messages.fetchPinned());
    expectType<Promise<FetchPinnedMessagesResponse<true>>>(messages.fetchPins());
    expectType<Guild>(message.guild);
    expectType<Snowflake>(message.guildId);
    expectType<GuildTextBasedChannel>(message.channel.messages.channel);
  }
}

{
  const { messages } = dmChannel;
  const message = await messages.fetch('123');
  expectType<DMMessageManager>(messages);
  expectType<Promise<Message>>(messages.edit('1234567890', 'text'));
  expectType<Promise<Message>>(messages.fetch('1234567890'));
  expectType<Promise<Collection<Snowflake, Message>>>(messages.fetchPinned());
  expectType<Promise<FetchPinnedMessagesResponse>>(messages.fetchPins());
  expectType<Guild | null>(message.guild);
  expectType<Snowflake | null>(message.guildId);
  expectType<DMChannel | PartialGroupDMChannel | GuildTextBasedChannel>(message.channel.messages.channel);
  expectType<MessageMentions>(message.mentions);
  expectType<Guild | null>(message.mentions.guild);
  expectType<Collection<Snowflake, GuildMember> | null>(message.mentions.members);

  if (messages.channel.isDMBased()) {
    expectType<DMChannel>(messages.channel);
    expectType<DMChannel>(messages.channel.messages.channel);
  }

  // @ts-expect-error Crossposting is not possible in direct messages.
  messages.crosspost('1234567890');
}

declare const threadManager: ThreadManager;
{
  expectType<Promise<AnyThreadChannel | null>>(threadManager.fetch('12345678901234567'));
  expectType<Promise<AnyThreadChannel | null>>(threadManager.fetch('12345678901234567', { cache: true, force: false }));
  expectType<Promise<FetchedThreadsMore>>(threadManager.fetch({ archived: { limit: 4 } }));

  // @ts-expect-error The force option has no effect here.
  threadManager.fetch({ archived: {} }, { force: true });
}

declare const guildForumThreadManager: GuildForumThreadManager;
expectType<ForumChannel | MediaChannel>(guildForumThreadManager.channel);

declare const guildTextThreadManager: GuildTextThreadManager<
  ChannelType.PublicThread | ChannelType.PrivateThread | ChannelType.AnnouncementThread
>;
expectType<TextChannel | NewsChannel>(guildTextThreadManager.channel);

declare const guildMemberManager: GuildMemberManager;
{
  expectType<Promise<GuildMember>>(guildMemberManager.fetch('12345678901234567'));
  expectType<Promise<GuildMember>>(guildMemberManager.fetch({ user: '12345678901234567' }));
  expectType<Promise<GuildMember>>(guildMemberManager.fetch({ user: '12345678901234567', cache: true, force: false }));
  expectType<Promise<Collection<Snowflake, GuildMember>>>(guildMemberManager.fetch());
  expectType<Promise<Collection<Snowflake, GuildMember>>>(guildMemberManager.fetch({}));
  expectType<Promise<Collection<Snowflake, GuildMember>>>(guildMemberManager.fetch({ user: ['12345678901234567'] }));
  expectType<Promise<Collection<Snowflake, GuildMember>>>(guildMemberManager.fetch({ withPresences: false }));
  expectType<Promise<GuildMember>>(guildMemberManager.fetch({ user: '12345678901234567', withPresences: true }));

  expectType<Promise<Collection<Snowflake, GuildMember>>>(
    guildMemberManager.fetch({ query: 'test', user: ['12345678901234567'], nonce: 'test' }),
  );

  // @ts-expect-error The cache & force options have no effect here.
  guildMemberManager.fetch({ cache: true, force: false });
  // @ts-expect-error The force option has no effect here.
  guildMemberManager.fetch({ user: ['12345678901234567'], cache: true, force: false });
}

declare const messageManager: MessageManager;
{
  expectType<Promise<Message>>(messageManager.fetch('1234567890'));
  expectType<Promise<Message>>(messageManager.fetch({ message: '1234567890' }));
  expectType<Promise<Message>>(messageManager.fetch({ message: '1234567890', cache: true, force: false }));
  expectType<Promise<Collection<Snowflake, Message>>>(messageManager.fetch());
  expectType<Promise<Collection<Snowflake, Message>>>(messageManager.fetch({}));
  expectType<Promise<Collection<Snowflake, Message>>>(
    messageManager.fetch({ limit: 100, before: '1234567890', cache: false }),
  );
  // @ts-expect-error
  messageManager.fetch({ cache: true, force: false });
  // @ts-expect-error
  messageManager.fetch({ message: '1234567890', after: '1234567890', cache: true, force: false });
}

declare const pollAnswerVoterManager: PollAnswerVoterManager;
{
  expectType<Promise<Collection<Snowflake, User>>>(pollAnswerVoterManager.fetch());
  expectType<PollAnswer>(pollAnswerVoterManager.answer);
}

declare const roleManager: RoleManager;
expectType<Promise<Collection<Snowflake, Role>>>(roleManager.fetch());
expectType<Promise<Collection<Snowflake, Role>>>(roleManager.fetch(undefined, {}));
expectType<Promise<Role | null>>(roleManager.fetch('0'));

declare const guildEmojiManager: GuildEmojiManager;
expectType<Promise<Collection<Snowflake, GuildEmoji>>>(guildEmojiManager.fetch());
expectType<Promise<Collection<Snowflake, GuildEmoji>>>(guildEmojiManager.fetch(undefined, {}));
expectType<Promise<GuildEmoji>>(guildEmojiManager.fetch('0'));

declare const guildBanManager: GuildBanManager;
{
  expectType<Promise<GuildBan>>(guildBanManager.fetch('1234567890'));
  expectType<Promise<GuildBan>>(guildBanManager.fetch({ user: '1234567890' }));
  expectType<Promise<GuildBan>>(guildBanManager.fetch({ user: '1234567890', cache: true, force: false }));
  expectType<Promise<Collection<Snowflake, GuildBan>>>(guildBanManager.fetch());
  expectType<Promise<Collection<Snowflake, GuildBan>>>(guildBanManager.fetch({}));
  expectType<Promise<Collection<Snowflake, GuildBan>>>(guildBanManager.fetch({ limit: 100, before: '1234567890' }));
  // @ts-expect-error
  guildBanManager.fetch({ cache: true, force: false });
  // @ts-expect-error
  guildBanManager.fetch({ user: '1234567890', after: '1234567890', cache: true, force: false });
}

declare const threadMemberWithGuildMember: ThreadMember<true>;
declare const threadMemberManager: ThreadMemberManager;
{
  expectNotDeprecated(threadMemberManager.add('1234678'));
  expectDeprecated(threadMemberManager.add('1234678', 'reason'));
  expectNotDeprecated(threadMemberManager.remove('1234678'));
  expectDeprecated(threadMemberManager.remove('1234678', 'reason'));
  expectNotDeprecated(threadMemberWithGuildMember.remove());
  expectDeprecated(threadMemberWithGuildMember.remove('reason'));
}

declare const userManager: UserManager;
{
  expectDeprecated(userManager.fetchFlags('1234567890'));
  expectDeprecated(user.fetchFlags());
}

declare const typing: Typing;
expectType<User | PartialUser>(typing.user);
if (typing.user.partial) expectType<null>(typing.user.username);
if (!typing.user.partial) expectType<string>(typing.user.tag);

expectType<TextBasedChannel>(typing.channel);
if (typing.channel.partial) expectType<undefined>(typing.channel.lastMessageId);

expectType<GuildMember | null>(typing.member);
expectType<Guild | null>(typing.guild);

if (typing.inGuild()) {
  expectType<Guild>(typing.channel.guild);
  expectType<Guild>(typing.guild);
}

declare const webSocketShard: WebSocketShard;

webSocketShard.on('close', event => {
  expectType<CloseEvent>(event);
});

declare const collector: Collector<string, Message, string[]>;

collector.on('collect', (collected, ...other) => {
  expectType<Message>(collected);
  expectType<string[]>(other);
});

collector.on('dispose', (vals, ...other) => {
  expectType<Message>(vals);
  expectType<string[]>(other);
});

collector.on('end', (collection, reason) => {
  expectType<ReadonlyCollection<string, Message>>(collection);
  expectType<string>(reason);
});

(async () => {
  for await (const value of collector) {
    expectType<[Message, ...string[]]>(value);
  }
})();

// Test audit logs
expectType<Promise<GuildAuditLogs<AuditLogEvent.MemberKick>>>(guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick }));

expectType<Promise<GuildAuditLogs<AuditLogEvent.ChannelCreate>>>(
  guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate }),
);

expectType<Promise<GuildAuditLogs<AuditLogEvent.IntegrationUpdate>>>(
  guild.fetchAuditLogs({ type: AuditLogEvent.IntegrationUpdate }),
);

expectType<Promise<GuildAuditLogs<AuditLogEvent>>>(guild.fetchAuditLogs({ type: null }));
expectType<Promise<GuildAuditLogs<AuditLogEvent>>>(guild.fetchAuditLogs());

expectType<Promise<GuildAuditLogsEntry<AuditLogEvent.MemberKick, 'Delete', 'User'> | undefined>>(
  guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick }).then(al => al.entries.first()),
);
expectAssignable<Promise<GuildAuditLogsEntry<AuditLogEvent.MemberKick, 'Delete', 'User'> | undefined>>(
  guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick }).then(al => al.entries.first()),
);

expectType<Promise<GuildAuditLogsEntry<AuditLogEvent, GuildAuditLogsActionType, GuildAuditLogsTargetType> | undefined>>(
  guild.fetchAuditLogs({ type: null }).then(al => al.entries.first()),
);
expectType<Promise<GuildAuditLogsEntry<AuditLogEvent, GuildAuditLogsActionType, GuildAuditLogsTargetType> | undefined>>(
  guild.fetchAuditLogs().then(al => al.entries.first()),
);

expectType<Promise<{ integrationType: string } | null | undefined>>(
  guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick }).then(al => al.entries.first()?.extra),
);

expectType<Promise<{ integrationType: string } | null | undefined>>(
  guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate }).then(al => al.entries.first()?.extra),
);

expectType<Promise<StageChannel | { id: Snowflake } | undefined>>(
  guild.fetchAuditLogs({ type: AuditLogEvent.StageInstanceCreate }).then(al => al.entries.first()?.extra),
);
expectType<Promise<{ channel: GuildTextBasedChannel | { id: Snowflake }; count: number } | undefined>>(
  guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete }).then(al => al.entries.first()?.extra),
);

expectType<Promise<User | PartialUser | null | undefined>>(
  guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick }).then(al => al.entries.first()?.target),
);
expectType<Promise<StageInstance | undefined>>(
  guild.fetchAuditLogs({ type: AuditLogEvent.StageInstanceCreate }).then(al => al.entries.first()?.target),
);
expectType<Promise<User | null | undefined>>(
  guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete }).then(al => al.entries.first()?.target),
);
expectType<Promise<GuildTextBasedChannel | { id: string } | undefined>>(
  guild.fetchAuditLogs({ type: AuditLogEvent.MessageBulkDelete }).then(al => al.entries.first()?.target),
);

declare const AuditLogChange: AuditLogChange;
// @ts-expect-error
expectType<boolean | undefined>(AuditLogChange.old);
// @ts-expect-error
expectType<boolean | undefined>(AuditLogChange.new);
if (AuditLogChange.key === 'available') {
  expectType<boolean | undefined>(AuditLogChange.old);
  expectType<boolean | undefined>(AuditLogChange.new);
}

declare const TextBasedChannel: TextBasedChannel;
declare const TextBasedChannelTypes: TextBasedChannelTypes;
declare const VoiceBasedChannel: VoiceBasedChannel;
declare const GuildBasedChannel: GuildBasedChannel;
declare const NonThreadGuildBasedChannel: NonThreadGuildBasedChannel;
declare const GuildTextBasedChannel: GuildTextBasedChannel;

expectType<TextBasedChannel>(TextBasedChannel);
expectType<
  | ChannelType.GuildText
  | ChannelType.DM
  | ChannelType.GroupDM
  | ChannelType.GuildAnnouncement
  | ChannelType.GuildVoice
  | ChannelType.GuildStageVoice
  | ThreadChannelType
>(TextBasedChannelTypes);
expectType<StageChannel | VoiceChannel>(VoiceBasedChannel);
expectType<GuildBasedChannel>(GuildBasedChannel);
expectType<CategoryChannel | NewsChannel | StageChannel | TextChannel | VoiceChannel | ForumChannel | MediaChannel>(
  NonThreadGuildBasedChannel,
);
expectType<GuildTextBasedChannel>(GuildTextBasedChannel);

const button = new ButtonBuilder({
  label: 'test',
  style: ButtonStyle.Primary,
  customId: 'test',
});

const selectMenu = new StringSelectMenuBuilder({
  maxValues: 10,
  minValues: 2,
  customId: 'test',
});

new ActionRowBuilder({
  components: [selectMenu.toJSON(), button.toJSON()],
});

new StringSelectMenuBuilder({
  customId: 'foo',
});

new ButtonBuilder({
  style: ButtonStyle.Danger,
})
  .setEmoji('<a:foo:123>')
  .setEmoji('<:foo:123>')
  .setEmoji('foobar:123')
  .setEmoji('😏')
  .setEmoji({
    name: 'test',
    id: '123',
    animated: false,
  });

// @ts-expect-error
new EmbedBuilder().setColor('abc');

new EmbedBuilder().setColor('#ffffff');

expectNotAssignable<ActionRowData<MessageActionRowComponentData>>({
  type: ComponentType.ActionRow,
  components: [
    {
      type: ComponentType.Button,
    },
  ],
});

declare const stringSelectMenuData: APIStringSelectComponent;
StringSelectMenuBuilder.from(stringSelectMenuData);

declare const userSelectMenuData: APIUserSelectComponent;
UserSelectMenuBuilder.from(userSelectMenuData);

declare const roleSelectMenuData: APIRoleSelectComponent;
RoleSelectMenuBuilder.from(roleSelectMenuData);

declare const channelSelectMenuData: APIChannelSelectComponent;
ChannelSelectMenuBuilder.from(channelSelectMenuData);

declare const mentionableSelectMenuData: APIMentionableSelectComponent;
MentionableSelectMenuBuilder.from(mentionableSelectMenuData);

expectNotAssignable<FileUploadComponentData>({
  customId: 'upload',
  fileTypes: ['pdf'],
  type: ComponentType.FileUpload,
});

declare const stringSelectMenuComp: StringSelectMenuComponent;
StringSelectMenuBuilder.from(stringSelectMenuComp);

declare const userSelectMenuComp: UserSelectMenuComponent;
UserSelectMenuBuilder.from(userSelectMenuComp);

declare const roleSelectMenuComp: RoleSelectMenuComponent;
RoleSelectMenuBuilder.from(roleSelectMenuComp);

declare const channelSelectMenuComp: ChannelSelectMenuComponent;
ChannelSelectMenuBuilder.from(channelSelectMenuComp);

declare const mentionableSelectMenuComp: MentionableSelectMenuComponent;
MentionableSelectMenuBuilder.from(mentionableSelectMenuComp);

declare const buttonData: APIButtonComponent;
ButtonBuilder.from(buttonData);

declare const buttonComp: ButtonComponent;
ButtonBuilder.from(buttonComp);

declare const embedData: APIEmbed;
EmbedBuilder.from(embedData);

declare const embedComp: Embed;
EmbedBuilder.from(embedComp);

declare const actionRowData: APIActionRowComponent<APIComponentInActionRow>;
ActionRowBuilder.from(actionRowData);

declare const actionRowComp: ActionRow<ActionRowComponent>;
ActionRowBuilder.from(actionRowComp);

declare const buttonsActionRowData: APIActionRowComponent<APIButtonComponent>;
declare const buttonsActionRowComp: ActionRow<ButtonComponent>;

expectType<ActionRowBuilder<ButtonBuilder>>(ActionRowBuilder.from<ButtonBuilder>(buttonsActionRowData));
expectType<ActionRowBuilder<ButtonBuilder>>(ActionRowBuilder.from<ButtonBuilder>(buttonsActionRowComp));

declare const anyComponentsActionRowData: APIActionRowComponent<APIComponentInActionRow>;
declare const anyComponentsActionRowComp: ActionRow<ActionRowComponent>;

expectType<ActionRowBuilder>(ActionRowBuilder.from(anyComponentsActionRowData));
expectType<ActionRowBuilder>(ActionRowBuilder.from(anyComponentsActionRowComp));

type UserMentionChannels = DMChannel | PartialDMChannel;
declare const channelMentionChannels: Exclude<Channel | DirectoryChannel, UserMentionChannels>;
declare const userMentionChannels: UserMentionChannels;

expectType<ChannelMention>(channelMentionChannels.toString());
expectType<UserMention>(userMentionChannels.toString());
expectType<UserMention>(user.toString());
expectType<UserMention>(guildMember.toString());

declare const webhook: Webhook;
declare const webhookClient: WebhookClient;
declare const snowflake: Snowflake;

expectType<Promise<Message<true>>>(webhook.send('content'));
expectType<Promise<Message<true>>>(webhook.editMessage(snowflake, 'content'));
expectType<Promise<Message<true>>>(webhook.fetchMessage(snowflake));
expectType<Promise<Webhook>>(webhook.edit({ name: 'name' }));

expectType<Promise<APIMessage>>(webhookClient.send('content'));
expectType<Promise<APIMessage>>(webhookClient.editMessage(snowflake, 'content'));
expectType<Promise<APIMessage>>(webhookClient.fetchMessage(snowflake));

declare const partialGroupDMChannel: PartialGroupDMChannel;
declare const categoryChannel: CategoryChannel;
declare const stageChannel: StageChannel;
declare const forumChannel: ForumChannel;
declare const mediaChannel: MediaChannel;
declare const threadOnlyChannel: ThreadOnlyChannel;

// Threads have messages.
expectType<GuildMessageManager>(threadChannel.messages);

// Thread-only channels have threads—not messages.
notPropertyOf(threadOnlyChannel, 'messages');
notPropertyOf(forumChannel, 'messages');
notPropertyOf(mediaChannel, 'messages');

await forumChannel.edit({
  availableTags: [...forumChannel.availableTags, { name: 'tag' }],
});

await forumChannel.setAvailableTags([{ ...forumChannel.availableTags, name: 'tag' }]);
await forumChannel.setAvailableTags([{ name: 'tag' }]);

expectType<Readonly<ChannelFlagsBitField>>(textChannel.flags);
expectType<Readonly<ChannelFlagsBitField>>(voiceChannel.flags);
expectType<Readonly<ChannelFlagsBitField>>(stageChannel.flags);
expectType<Readonly<ChannelFlagsBitField>>(forumChannel.flags);
expectType<Readonly<ChannelFlagsBitField>>(dmChannel.flags);
expectType<Readonly<ChannelFlagsBitField>>(categoryChannel.flags);
expectType<Readonly<ChannelFlagsBitField>>(newsChannel.flags);
expectType<Readonly<ChannelFlagsBitField>>(threadChannel.flags);

expectType<null>(partialGroupDMChannel.flags);

client.on('guildAuditLogEntryCreate', (auditLogEntry, guild) => {
  expectType<GuildAuditLogsEntry>(auditLogEntry);
  expectType<Guild>(guild);
});

expectType<Readonly<GuildMemberFlagsBitField>>(guildMember.flags);

declare const emojiResolvable: GuildEmoji | Emoji | string;

{
  const onboarding = await guild.fetchOnboarding();
  expectType<GuildOnboarding>(onboarding);

  expectType<GuildOnboarding>(await guild.editOnboarding(onboarding));

  await guild.editOnboarding({
    defaultChannels: onboarding.defaultChannels,
    enabled: onboarding.enabled,
    mode: onboarding.mode,
    prompts: onboarding.prompts,
  });

  const prompt = onboarding.prompts.first()!;
  const option = prompt.options.first()!;

  await guild.editOnboarding({ prompts: [prompt] });
  await guild.editOnboarding({ prompts: [{ ...prompt, options: [option] }] });

  await guild.editOnboarding({ prompts: [{ ...prompt, options: [{ ...option, emoji: emojiResolvable }] }] });
}

declare const partialDMChannel: PartialDMChannel;
expectType<true>(partialDMChannel.partial);
expectType<undefined>(partialDMChannel.lastMessageId);

declare const partialGuildMember: PartialGuildMember;
expectType<true>(partialGuildMember.partial);
expectType<null>(partialGuildMember.joinedAt);
expectType<null>(partialGuildMember.joinedTimestamp);
expectType<null>(partialGuildMember.pending);

declare const partialMessage: PartialMessage;
expectType<true>(partialMessage.partial);
expectType<null>(partialMessage.type);
expectType<null>(partialMessage.system);
expectType<null>(partialMessage.pinned);
expectType<null>(partialMessage.tts);
expectAssignable<null | Message['content']>(partialMessage.content);
expectAssignable<null | Message['cleanContent']>(partialMessage.cleanContent);
expectAssignable<null | Message['author']>(partialMessage.author);

declare const partialMessageReaction: PartialMessageReaction;
expectType<true>(partialMessageReaction.partial);
expectType<null>(partialMessageReaction.count);

declare const partialThreadMember: PartialThreadMember;
expectType<true>(partialThreadMember.partial);
expectType<null>(partialThreadMember.flags);
expectType<null>(partialThreadMember.joinedAt);
expectType<null>(partialThreadMember.joinedTimestamp);

declare const partialUser: PartialUser;
expectType<true>(partialUser.partial);
expectType<null>(partialUser.username);
expectType<null>(partialUser.tag);
expectType<null>(partialUser.discriminator);

declare const emoji: Emoji;
{
  expectType<PartialEmojiOnlyId>(resolvePartialEmoji('12345678901234567'));
  expectType<PartialEmoji | null>(resolvePartialEmoji(emoji));
}

await textChannel.send({
  poll: {
    question: {
      text: 'Question',
    },
    duration: 60,
    answers: [{ text: 'Answer 1' }, { text: 'Answer 2', emoji: '<:1blade:874989932983238726>' }],
    allowMultiselect: false,
  },
});

declare const partialPoll: PartialPoll;
{
  if (partialPoll.partial) {
    expectType<null>(partialPoll.question.text);
    expectType<PartialMessage>(partialPoll.message);
    expectType<null>(partialPoll.allowMultiselect);
    expectType<null>(partialPoll.layoutType);
    expectType<null>(partialPoll.expiresTimestamp);
    expectType<Collection<number, PartialPollAnswer>>(partialPoll.answers);
  }
}

declare const partialPollAnswer: PartialPollAnswer;
{
  if (partialPollAnswer.partial) {
    expectType<PartialPoll>(partialPollAnswer.poll);
    expectType<null>(partialPollAnswer.emoji);
    expectType<null>(partialPollAnswer.text);
  }
}
declare const poll: Poll;
declare const message: Message;
declare const pollData: PollData;
{
  expectType<Message>(await poll.end());
  expectType<false>(poll.partial);
  expectNotType<Collection<number, PartialPollAnswer>>(poll.answers);

  const answer = poll.answers.first()!;

  if (!answer.partial) {
    expectType<number>(answer.voteCount);
    expectType<number>(answer.id);
    expectType<PollAnswerVoterManager>(answer.voters);
    expectType<Collection<Snowflake, User>>(await answer.voters.fetch({ after: snowflake, limit: 10 }));
  }

  await messageManager.endPoll(snowflake);
  await messageManager.fetchPollAnswerVoters({
    messageId: snowflake,
    answerId: 1,
  });

  await message.edit({
    // @ts-expect-error
    poll: pollData,
  });
}

expectType<Collection<Snowflake, StickerPack>>(await client.fetchStickerPacks());
expectType<Collection<Snowflake, StickerPack>>(await client.fetchStickerPacks({}));
expectType<StickerPack>(await client.fetchStickerPacks({ packId: snowflake }));

declare const guildScheduledEventManager: GuildScheduledEventManager;
await guildScheduledEventManager.edit(snowflake, { recurrenceRule: null });

{
  expectNotAssignable<GuildScheduledEventRecurrenceRuleOptions>({
    startAt: new Date(),
    frequency: GuildScheduledEventRecurrenceRuleFrequency.Yearly,
    interval: 1,
    byMonth: [GuildScheduledEventRecurrenceRuleMonth.May],
    byMonthDay: [4],
    // Invalid property
    byWeekday: [GuildScheduledEventRecurrenceRuleWeekday.Monday],
  });

  expectNotAssignable<GuildScheduledEventRecurrenceRuleOptions>({
    startAt: new Date(),
    frequency: GuildScheduledEventRecurrenceRuleFrequency.Yearly,
    interval: 1,
    byMonth: [GuildScheduledEventRecurrenceRuleMonth.May],
    byMonthDay: [4],
    // Invalid property
    byNWeekday: [{ n: 1, day: GuildScheduledEventRecurrenceRuleWeekday.Monday }],
  });

  expectAssignable<GuildScheduledEventRecurrenceRuleOptions>({
    startAt: new Date(),
    frequency: GuildScheduledEventRecurrenceRuleFrequency.Yearly,
    interval: 1,
    byMonth: [GuildScheduledEventRecurrenceRuleMonth.May],
    byMonthDay: [4],
  });
}

{
  expectAssignable<GuildScheduledEventRecurrenceRuleOptions>({
    startAt: new Date(),
    frequency: GuildScheduledEventRecurrenceRuleFrequency.Monthly,
    interval: 1,
    byNWeekday: [{ n: 1, day: GuildScheduledEventRecurrenceRuleWeekday.Monday }],
  });

  expectNotAssignable<GuildScheduledEventRecurrenceRuleOptions>({
    startAt: new Date(),
    frequency: GuildScheduledEventRecurrenceRuleFrequency.Monthly,
    interval: 1,
    byNWeekday: [{ n: 1, day: GuildScheduledEventRecurrenceRuleWeekday.Monday }],
    // Invalid property
    byWeekday: [GuildScheduledEventRecurrenceRuleWeekday.Monday],
  });
}

{
  expectAssignable<GuildScheduledEventRecurrenceRuleOptions>({
    startAt: new Date(),
    frequency: GuildScheduledEventRecurrenceRuleFrequency.Weekly,
    interval: 1,
    byWeekday: [GuildScheduledEventRecurrenceRuleWeekday.Monday],
  });

  expectNotAssignable<GuildScheduledEventRecurrenceRuleOptions>({
    startAt: new Date(),
    frequency: GuildScheduledEventRecurrenceRuleFrequency.Weekly,
    interval: 1,
    byWeekday: [GuildScheduledEventRecurrenceRuleWeekday.Monday],
    // Invalid property
    byNWeekday: [{ n: 1, day: GuildScheduledEventRecurrenceRuleWeekday.Monday }],
  });
}

{
  expectNotAssignable<GuildScheduledEventRecurrenceRuleOptions>({
    startAt: new Date(),
    frequency: GuildScheduledEventRecurrenceRuleFrequency.Daily,
    interval: 1,
    byWeekday: [GuildScheduledEventRecurrenceRuleWeekday.Monday],
    // Invalid property
    byNWeekday: [{ n: 1, day: GuildScheduledEventRecurrenceRuleWeekday.Monday }],
  });

  expectNotAssignable<GuildScheduledEventRecurrenceRuleOptions>({
    startAt: new Date(),
    frequency: GuildScheduledEventRecurrenceRuleFrequency.Daily,
    interval: 1,
    byWeekday: [GuildScheduledEventRecurrenceRuleWeekday.Monday],
    // Invalid property
    byMonth: [GuildScheduledEventRecurrenceRuleMonth.May],
  });
}

declare const authorizingIntegrationOwners: AuthorizingIntegrationOwners;
{
  expectType<Snowflake | null>(authorizingIntegrationOwners.guildId);
  expectType<Guild | null>(authorizingIntegrationOwners.guild);
  expectType<Snowflake | null>(authorizingIntegrationOwners.userId);
  expectType<User | null>(authorizingIntegrationOwners.user);
  expectType<Snowflake | undefined>(authorizingIntegrationOwners[ApplicationIntegrationType.GuildInstall]);
}

await textChannel.send({
  files: [
    new AttachmentBuilder('https://example.com/voice-message.ogg')
      .setDuration(2)
      .setWaveform('AFUqPDw3Eg2hh4+gopOYj4xthU4='),
  ],
  flags: MessageFlags.IsVoiceMessage,
});

await textChannel.send({
  files: [
    {
      attachment: 'https://example.com/voice-message.ogg',
      duration: 2,
      waveform: 'AFUqPDw3Eg2hh4+gopOYj4xthU4=',
    },
  ],
  flags: MessageFlags.IsVoiceMessage,
});

// User-account (selfbot) API & fixed typing assertions
declare const clientUser: ClientUser;
declare const channelSelect: ChannelSelectMenuComponent;
declare const guildInviteManager: GuildInviteManager;
declare const permissionOverwriteManager: PermissionOverwriteManager;
declare const guildTemplate: GuildTemplate;
declare const scheduledEventManager: GuildScheduledEventManager;
{
  const defaultUserClient = new Client();
  expectType<Client>(defaultUserClient);
  expectType<Promise<string>>(defaultUserClient.normalLogin('user@example.com', 'pw', { totpSecret: 'SECRET' }));
  expectType<Promise<string>>(
    defaultUserClient.QRLogin({
      onQRCode: url => expectType<string>(url),
      onUserData: user => expectType<string | null>(user.avatar),
    }),
  );
  expectType<Promise<string>>(
    defaultUserClient.passkeyLogin({ credentialId: 'id', privateKey: 'key', userHandle: 'uh' }),
  );
  expectType<Promise<Collection<string, DefaultSoundboardSound>>>(defaultUserClient.fetchDefaultSoundboardSounds());
  expectType<Promise<void>>(webhookClient.deleteWebhook('123456789012345678'));
  defaultUserClient.sweepers.destroy();

  expectType<Promise<Collection<Snowflake, GuildMember>>>(
    guildMemberManager.fetchMemberList(textChannel, { limit: 100, time: 5000 }),
  );

  expectType<boolean | null>(clientUser.mfaEnabled);
  expectType<Promise<ClientUser>>(clientUser.setUsername('newname', 'password'));

  expectType<ChannelType[] | null>(channelSelect.channelTypes);
  expectType<Collection<string, Invite>>(guildInviteManager.cache);
  expectType<GuildChannel>(permissionOverwriteManager.channel);
  expectType<string>(guildTemplate.toString());

  expectType<boolean>(guildMember.equals(guildMember));
  expectType<GuildMemberFlags.CompletedOnboarding>(GuildMemberFlagsBitField.Flags.CompletedOnboarding);

  expectType<Promise<Message<false>>>(partialGroupDMChannel.send({ content: 'hi', nonce: '123', enforceNonce: true }));
  expectType<Promise<Message>>(message.forward(partialGroupDMChannel));

  expectType<Promise<Collection<Snowflake, GuildScheduledEventUser<false>>>>(
    scheduledEventManager.fetchSubscribers('123456789012345678', { before: '1', after: '2', limit: 10 }),
  );
}

// User-account features: relationships, friend presences, invites, subscriptions, notes, read state, sessions
{
  expectType<RelationshipManager>(client.relationships);
  expectType<PresenceManager>(client.presences);
  expectType<Collection<Snowflake, Relationship>>(client.relationships.friends);
  expectType<Collection<Snowflake, Relationship>>(client.relationships.incoming);
  expectType<Promise<Collection<Snowflake, Relationship>>>(client.relationships.fetch());
  expectType<Promise<void>>(client.relationships.sendFriendRequest('someone', { captcha: async () => 'key' }));
  expectType<Promise<void>>(client.relationships.addFriend(user));
  expectType<Promise<void>>(client.relationships.block(user));
  expectType<Promise<void>>(client.relationships.remove('123456789012345678'));
  expectType<Promise<void>>(client.relationships.setNickname(user, 'nick'));
  const relationship = client.relationships.cache.get('123456789012345678');
  if (relationship) {
    expectType<RelationshipType>(relationship.type);
    expectType<string | null>(relationship.nickname);
    expectType<User | null>(relationship.user);
  }

  expectType<Promise<Guild | PartialGroupDMChannel | Invite>>(client.acceptInvite('code'));
  expectType<Promise<void>>(client.guilds.subscribe(client.guilds.cache));
  expectType<Promise<void>>(guild.subscribe({ threads: false }));

  expectType<Promise<string | null>>(client.users.fetchNote(user, { force: true }));
  expectType<Promise<string | null>>(user.setNote('note'));
  expectType<string | null>(user.note);

  expectType<Promise<TextChannel>>(textChannel.markRead());
  expectType<Promise<Message>>(message.markRead());

  expectType<Collection<string, ClientSession>>(clientUser.sessions);
  expectType<PresenceStatus | null>(clientUser.status);

  client.on('relationshipAdd', (added, shouldNotify) => {
    expectType<Relationship>(added);
    expectType<boolean>(shouldNotify);
  });
  client.on('sessionsUpdate', (oldSessions, newSessions) => {
    expectType<Collection<string, ClientSession>>(oldSessions);
    expectType<Collection<string, ClientSession>>(newSessions);
  });
  client.on('userNoteUpdate', (noteUser, oldNote, newNote) => {
    expectType<User>(noteUser);
    expectType<string | null>(oldNote);
    expectType<string | null>(newNote);
  });
  client.on('userPresenceUpdate', (oldPresence, newPresence) => {
    expectType<Presence | null>(oldPresence);
    expectType<Presence>(newPresence);
  });
}

// User-account synced settings: status and custom status
{
  const settings = clientUser.settings;
  expectType<ClientUserSettings>(settings);
  expectType<PresenceStatusData | null>(settings.status);
  expectType<CustomStatus | null>(settings.customStatus);
  expectType<Promise<ClientUserSettings>>(settings.fetch());
  expectType<Promise<ClientUserSettings>>(settings.setStatus('dnd'));
  expectType<Promise<ClientUserSettings>>(
    settings.setCustomStatus({ text: 'Busy', emoji: '🔕', expiresAt: Date.now() }),
  );
  expectType<Promise<ClientUserSettings>>(settings.setCustomStatus(null));
  expectType<Promise<ClientUserSettings>>(settings.edit({ status: 'idle', customStatus: { text: 'brb' } }));
  // @ts-expect-error `unknown` is what a session asks for, not a status an account can choose
  settings.setStatus('unknown');
  client.on('userSettingsUpdate', (oldSettings, newSettings) => {
    expectType<ClientUserSettings>(oldSettings);
    expectType<ClientUserSettings>(newSettings);
  });
}

// User-account DM and group DM calls
{
  expectType<Collection<Snowflake, Call>>(client.calls);
  expectType<Call | null>(dmChannel.call);
  expectType<Call | null>(partialGroupDMChannel.call);
  const call = client.calls.first();
  if (call) {
    expectType<Snowflake[]>(call.ringing);
    expectType<Collection<Snowflake, CallVoiceState>>(call.voiceStates);
    expectType<DMChannel | PartialGroupDMChannel | null>(call.channel);
    expectType<Promise<Call>>(call.ring([user]));
    expectType<Promise<Call>>(call.stopRinging());
    expectType<Promise<Call>>(call.setRegion('rotterdam'));
  }
  client.on('callCreate', created => expectType<Call>(created));
  client.on('callUpdate', (oldCall, newCall) => {
    expectType<Call>(oldCall);
    expectType<Call>(newCall);
  });
  client.on('callDelete', deleted => expectType<boolean>(deleted.unavailable));
  client.on('callVoiceStateUpdate', (oldState, newState, voiceCall) => {
    expectType<CallVoiceState | null>(oldState);
    expectType<Snowflake | null>(newState.channelId);
    expectType<Call>(voiceCall);
  });
}
