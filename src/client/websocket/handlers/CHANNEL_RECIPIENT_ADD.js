'use strict';

const { ChannelType } = require('discord-api-types/v10');

// Someone joined a group DM: keep PartialGroupDMChannel#recipients current (only full channel payloads set it).
module.exports = (client, { d: data }) => {
  const channel = client.channels.cache.get(data.channel_id);
  if (channel?.type !== ChannelType.GroupDM || !data.user?.id) return;
  client.users._add(data.user);
  channel.recipients = [...channel.recipients.filter(recipient => recipient.id !== data.user.id), data.user];
};
