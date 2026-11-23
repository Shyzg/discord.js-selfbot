'use strict';

const ClientApplication = require('../../../structures/ClientApplication');
let ClientUser;

module.exports = (client, { d: data }, shard) => {
  if (client.user) {
    client.user._patch(data.user);
  } else {
    ClientUser ??= require('../../../structures/ClientUser');
    client.user = new ClientUser(client, data.user);
    client.users.cache.set(client.user.id, client.user);
  }

  for (const [index, guild] of data.guilds.entries()) {
    guild.shardId = shard.id;
    const cached = client.guilds._add(guild);
    // User READY moves members into `merged_members` (one array per guild, `user_id` instead of `user`).
    const me = data.merged_members?.[index]?.find(member => member.user_id === data.user.id);
    if (me) cached.members._add({ ...me, user: data.user });
  }

  // User accounts have no application in READY (it is a bot-only field).
  if (data.application) {
    if (client.application) {
      client.application._patch(data.application);
    } else {
      client.application = new ClientApplication(client, data.application);
    }
  }

  shard.checkReady();
};
