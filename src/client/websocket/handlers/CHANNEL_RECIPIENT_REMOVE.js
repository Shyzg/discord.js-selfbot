'use strict';

const { ChannelType } = require('discord-api-types/v10');

// Someone left or was removed from a group DM: drop them from PartialGroupDMChannel#recipients.
module.exports = (client, { d: data }) => {
  const channel = client.channels.cache.get(data.channel_id);
  if (channel?.type !== ChannelType.GroupDM || !data.user?.id) return;
  channel.recipients = channel.recipients.filter(recipient => recipient.id !== data.user.id);
};
