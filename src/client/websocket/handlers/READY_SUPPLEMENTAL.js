'use strict';

// PRIORITIZED_READY_PAYLOAD moves voice states, and the members behind them, out of READY into this event.
// shortcut: clientReady can fire just before this event lands; hold readiness for it if voice state at ready matters.
module.exports = (client, { d: data }) => {
  for (const [index, { id, voice_states: voiceStates }] of (data.guilds ?? []).entries()) {
    const guild = client.guilds.cache.get(id);
    if (!guild) continue;
    // DEDUPE_USER_OBJECTS: members carry only `user_id`; READY cached the users, so skip any it did not send.
    for (const member of data.merged_members?.[index] ?? []) {
      if (client.users.cache.has(member.user_id)) guild.members._add({ ...member, user: { id: member.user_id } });
    }
    // Unavailable guilds send only their id. After a re-identify, drop the states of people who left meanwhile.
    if (voiceStates) {
      guild.voiceStates.cache.clear();
      for (const state of voiceStates) guild.voiceStates._add(state);
    }
    for (const presence of data.merged_presences?.guilds?.[index] ?? []) {
      const userId = presence.user_id ?? presence.user?.id;
      if (userId) guild.presences._add({ ...presence, user: { id: userId }, guild });
    }
  }
  // Overall presences of friends and implicit relationships, which belong to no guild.
  for (const presence of data.merged_presences?.friends ?? []) {
    const userId = presence.user_id ?? presence.user?.id;
    if (userId) client.presences._add({ ...presence, user: { id: userId }, guild: null });
  }
};
