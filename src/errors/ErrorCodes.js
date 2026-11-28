'use strict';

/**
 * @typedef {Object} DiscordjsErrorCodes

 * @property {'ClientInvalidOption'} ClientInvalidOption
 * @property {'CaptchaRequired'} CaptchaRequired
 * @property {'MFARequired'} MFARequired
 * @property {'RemoteAuthFailed'} RemoteAuthFailed

 * @property {'TokenInvalid'} TokenInvalid

 * @property {'BitFieldInvalid'} BitFieldInvalid

 * @property {'ColorRange'} ColorRange
 * @property {'ColorConvert'} ColorConvert

 * @property {'InviteOptionsMissingChannel'} InviteOptionsMissingChannel

 * @property {'FileNotFound'} FileNotFound

 * @property {'UserNoDMChannel'} UserNoDMChannel

 * @property {'VoiceNotStageChannel'} VoiceNotStageChannel

 * @property {'VoiceStateNotOwn'} VoiceStateNotOwn
 * @property {'VoiceStateInvalidType'} VoiceStateInvalidType

 * @property {'ReqResourceType'} ReqResourceType

 * @property {'MessageContentType'} MessageContentType
 * @property {'MessageComponentsUserAccount'} MessageComponentsUserAccount
 * @property {'MessageEmbedsUserAccount'} MessageEmbedsUserAccount
 * @property {'MessageNotFound'} MessageNotFound
 * @property {'MessageNonceRequired'} MessageNonceRequired
 * @property {'MessageNonceType'} MessageNonceType

 * @property {'InteractionApplicationNotFound'} InteractionApplicationNotFound
 * @property {'InteractionCommandNotFound'} InteractionCommandNotFound
 * @property {'InteractionCommandOption'} InteractionCommandOption
 * @property {'InteractionComponentNotFound'} InteractionComponentNotFound
 * @property {'InteractionSelectValues'} InteractionSelectValues
 * @property {'InteractionFailed'} InteractionFailed
 * @property {'InteractionTimeout'} InteractionTimeout

 * @property {'StreamKeyInvalid'} StreamKeyInvalid
 * @property {'StreamNotInVoiceChannel'} StreamNotInVoiceChannel
 * @property {'StreamMissingPermission'} StreamMissingPermission
 * @property {'StreamTypeUnsupported'} StreamTypeUnsupported
 * @property {'StreamWatchOwn'} StreamWatchOwn
 * @property {'StreamDaveMissing'} StreamDaveMissing
 * @property {'StreamAlreadyOpen'} StreamAlreadyOpen
 * @property {'StreamRefused'} StreamRefused
 * @property {'StreamTimeout'} StreamTimeout
 * @property {'StreamConnectionFailed'} StreamConnectionFailed
 * @property {'StreamCodecUnsupported'} StreamCodecUnsupported
 * @property {'StreamAlreadyPlaying'} StreamAlreadyPlaying
 * @property {'StreamEnded'} StreamEnded

 * @property {'BanResolveId'} BanResolveId
 * @property {'FetchBanResolveId'} FetchBanResolveId

 * @property {'PruneDaysType'} PruneDaysType

 * @property {'GuildChannelResolve'} GuildChannelResolve
 * @property {'GuildVoiceChannelResolve'} GuildVoiceChannelResolve
 * @property {'GuildChannelOrphan'} GuildChannelOrphan
 * @property {'GuildChannelUnowned'} GuildChannelUnowned
 * @property {'GuildOwned'} GuildOwned
 * @property {'GuildMembersTimeout'} GuildMembersTimeout
 * @property {'GuildMembersMissingPermissions'} GuildMembersMissingPermissions
 * @property {'GuildSoundboardSoundsTimeout'} GuildSoundboardSoundsTimeout
 * @property {'GuildUncachedMe'} GuildUncachedMe
 * @property {'ChannelNotCached'} ChannelNotCached
 * @property {'StageChannelResolve'} StageChannelResolve
 * @property {'GuildScheduledEventResolve'} GuildScheduledEventResolve
 * @property {'FetchOwnerId'} FetchOwnerId

 * @property {'InvalidType'} InvalidType
 * @property {'InvalidElement'} InvalidElement

 * @property {'MessageThreadParent'} MessageThreadParent
 * @property {'MessageExistingThread'} MessageExistingThread
 * @property {'ThreadInvitableType'} ThreadInvitableType

 * @property {'WebhookMessage'} WebhookMessage
 * @property {'WebhookTokenUnavailable'} WebhookTokenUnavailable
 * @property {'WebhookURLInvalid'} WebhookURLInvalid
 * @property {'WebhookApplication'} WebhookApplication
 * @property {'MessageReferenceMissing'} MessageReferenceMissing

 * @property {'EmojiType'} EmojiType
 * @property {'EmojiManaged'} EmojiManaged
 * @property {'MissingManageGuildExpressionsPermission'} MissingManageGuildExpressionsPermission

 * @property {'NotGuildSoundboardSound'} NotGuildSoundboardSound
 * @property {'NotGuildSticker'} NotGuildSticker

 * @property {'ReactionResolveUser'} ReactionResolveUser

 * @property {'InviteResolveCode'} InviteResolveCode

 * @property {'InviteNotFound'} InviteNotFound

 * @property {'MemberFetchNonceLength'} MemberFetchNonceLength

 * @property {'NotImplemented'} NotImplemented

 * @property {'GuildForumMessageRequired'} GuildForumMessageRequired

 * @property {'SweepFilterReturn'} SweepFilterReturn

 * @property {'BulkBanUsersOptionEmpty'} BulkBanUsersOptionEmpty

 * @property {'PollAlreadyExpired'} PollAlreadyExpired
 */

const keys = [
  'ClientInvalidOption',
  'CaptchaRequired',
  'MFARequired',
  'RemoteAuthFailed',

  'TokenInvalid',

  'BitFieldInvalid',

  'ColorRange',
  'ColorConvert',

  'InviteOptionsMissingChannel',

  'FileNotFound',

  'UserNoDMChannel',

  'VoiceNotStageChannel',

  'VoiceStateNotOwn',
  'VoiceStateInvalidType',

  'ReqResourceType',

  'MessageContentType',
  'MessageComponentsUserAccount',
  'MessageEmbedsUserAccount',
  'MessageNotFound',
  'MessageNonceRequired',
  'MessageNonceType',

  'InteractionApplicationNotFound',
  'InteractionCommandNotFound',
  'InteractionCommandOption',
  'InteractionComponentNotFound',
  'InteractionSelectValues',
  'InteractionFailed',
  'InteractionTimeout',

  'StreamKeyInvalid',
  'StreamNotInVoiceChannel',
  'StreamMissingPermission',
  'StreamTypeUnsupported',
  'StreamWatchOwn',
  'StreamDaveMissing',
  'StreamAlreadyOpen',
  'StreamRefused',
  'StreamTimeout',
  'StreamConnectionFailed',
  'StreamCodecUnsupported',
  'StreamAlreadyPlaying',
  'StreamEnded',

  'BanResolveId',
  'FetchBanResolveId',

  'PruneDaysType',

  'GuildChannelResolve',
  'GuildVoiceChannelResolve',
  'GuildChannelOrphan',
  'GuildChannelUnowned',
  'GuildOwned',
  'GuildMembersTimeout',
  'GuildMembersMissingPermissions',
  'GuildSoundboardSoundsTimeout',
  'GuildUncachedMe',
  'ChannelNotCached',
  'StageChannelResolve',
  'GuildScheduledEventResolve',
  'FetchOwnerId',

  'InvalidType',
  'InvalidElement',

  'MessageThreadParent',
  'MessageExistingThread',
  'ThreadInvitableType',

  'WebhookMessage',
  'WebhookTokenUnavailable',
  'WebhookURLInvalid',
  'WebhookApplication',
  'MessageReferenceMissing',

  'EmojiType',
  'EmojiManaged',
  'MissingManageGuildExpressionsPermission',

  'NotGuildSoundboardSound',
  'NotGuildSticker',

  'ReactionResolveUser',

  'InviteResolveCode',

  'InviteNotFound',

  'MemberFetchNonceLength',

  'NotImplemented',

  'SweepFilterReturn',

  'GuildForumMessageRequired',

  'BulkBanUsersOptionEmpty',

  'PollAlreadyExpired',
];

// JSDoc for IntelliSense purposes
/**
 * @type {DiscordjsErrorCodes}
 * @ignore
 */
module.exports = Object.fromEntries(keys.map(key => [key, key]));
