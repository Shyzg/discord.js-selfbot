'use strict';

const Action = require('./Action');
const Events = require('../../util/Events');
const Partials = require('../../util/Partials');

class PresenceUpdateAction extends Action {
  handle(data) {
    let user = this.client.users.cache.get(data.user.id);
    if (!user && ('username' in data.user || this.client.options.partials.includes(Partials.User))) {
      user = this.client.users._add(data.user);
    }
    if (!user) return;

    if (data.user.username) {
      if (!user._equals(data.user)) this.client.actions.UserUpdate.handle(data.user);
    }

    const guild = this.client.guilds.cache.get(data.guild_id);
    // No guild_id: the overall presence of a friend, implicit relationship or DM recipient (user accounts only).
    const presences = guild?.presences ?? (data.guild_id ? null : this.client.presences);
    if (!presences) return;

    const oldPresence = presences.cache.get(user.id)?._clone() ?? null;
    if (guild && !guild.members.cache.has(user.id) && data.status !== 'offline') {
      const member = guild.members._add({
        user,
        deaf: false,
        mute: false,
      });
      this.client.emit(Events.GuildMemberAvailable, member);
    }
    const newPresence = presences._add(Object.assign(data, { guild: guild ?? null }));
    // Guildless presences get their own event, so presenceUpdate handlers ported from bots can keep using
    // `newPresence.guild` without a null check.
    const event = guild ? Events.PresenceUpdate : Events.UserPresenceUpdate;
    if (this.client.listenerCount(event) && !newPresence.equals(oldPresence)) {
      /**
       * Emitted whenever a guild member's presence (e.g. status, activity) is changed.
       * @event Client#presenceUpdate
       * @param {?Presence} oldPresence The presence before the update, if one at all
       * @param {Presence} newPresence The presence after the update
       */

      /**
       * Emitted whenever the overall presence of a friend, implicit relationship or DM recipient changes (user
       * accounts only). These presences belong to no guild: {@link Presence#guild} is `null` and they are cached in
       * {@link Client#presences}. A friend in shared guilds also produces one {@link Client#event:presenceUpdate}
       * per guild.
       * @event Client#userPresenceUpdate
       * @param {?Presence} oldPresence The presence before the update, if one at all
       * @param {Presence} newPresence The presence after the update
       */
      this.client.emit(event, oldPresence, newPresence);
    }
  }
}

module.exports = PresenceUpdateAction;
