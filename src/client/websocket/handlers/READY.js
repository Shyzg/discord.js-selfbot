'use strict';

let ClientUser;

module.exports = (client, { d: data }, shard) => {
  if (client.user && client.user.id === data.user.id) {
    client.user._patch(data.user);
  } else {
    ClientUser ??= require('../../../structures/ClientUser');
    client.user = new ClientUser(client, data.user);
    client.users.cache.set(client.user.id, client.user);
  }

  // DEDUPE_USER_OBJECTS: each user arrives once in `users`; the rest of READY (and READY_SUPPLEMENTAL) names them by id.
  const users = new Map((data.users ?? []).map(user => [user.id, user]));
  for (const user of users.values()) client.users._add(user);
  // Open DMs and group DMs. Uncached, a new message in one of them would have no channel and be dropped.
  for (const channel of data.private_channels ?? []) {
    const recipients = channel.recipient_ids?.map(id => users.get(id) ?? { id }) ?? channel.recipients;
    client.channels._add({ ...channel, recipients });
  }

  for (const [index, guild] of data.guilds.entries()) {
    guild.shardId = shard.id;
    const cached = client.guilds._add(guild);
    // User READY moves members into `merged_members` (one array per guild, `user_id` instead of `user`).
    const me = data.merged_members?.[index]?.find(member => member.user_id === data.user.id);
    if (me) cached.members._add({ ...me, user: data.user });
  }

  shard.checkReady();
};
