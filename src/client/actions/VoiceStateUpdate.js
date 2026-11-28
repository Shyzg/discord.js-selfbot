'use strict';

const Action = require('./Action');
const { callVoiceState } = require('../../structures/Call');
const VoiceState = require('../../structures/VoiceState');
const Events = require('../../util/Events');

class VoiceStateUpdate extends Action {
  handle(data) {
    const client = this.client;
    // No guild: a DM or group DM call. Its voice states live on the call, never in voiceStateUpdate.
    if (!data.guild_id) {
      this.handleCall(data);
      return;
    }
    const guild = client.guilds.cache.get(data.guild_id);
    if (guild) {
      // Update the state
      const oldState =
        guild.voiceStates.cache.get(data.user_id)?._clone() ?? new VoiceState(guild, { user_id: data.user_id });

      let newState;
      if (data.channel_id === null) {
        newState = guild.voiceStates._add(data, false);
        guild.voiceStates.cache.delete(data.user_id);
      } else {
        newState = guild.voiceStates._add(data);
      }

      // Get the member
      let member = guild.members.cache.get(data.user_id);
      if (member && data.member) {
        member._patch(data.member);
      } else if (data.member?.user && data.member.joined_at) {
        member = guild.members._add(data.member);
      }

      // Emit event
      if (data.user_id === client.user?.id) {
        client.emit(Events.Debug, `[VOICE] received voice state update: ${JSON.stringify(data)}`);
        client.voice.onVoiceStateUpdate(data);
      }

      /**
       * Emitted whenever a member changes voice state - e.g. joins/leaves a channel, mutes/unmutes.
       * @event Client#voiceStateUpdate
       * @param {VoiceState} oldState The voice state before the update
       * @param {VoiceState} newState The voice state after the update
       */
      client.emit(Events.VoiceStateUpdate, oldState, newState);
    }
  }

  handleCall(data) {
    const client = this.client;
    // A leave carries no channel: find the call the user was in.
    const call = client.calls.get(data.channel_id) ?? client.calls.find(cached => cached.voiceStates.has(data.user_id));
    if (!call) return;
    // Moving to this call also means leaving any other one.
    for (const other of client.calls.values()) if (other !== call) other.voiceStates.delete(data.user_id);

    const oldState = call.voiceStates.get(data.user_id) ?? null;
    const newState = callVoiceState(data);
    if (newState.channelId) call.voiceStates.set(data.user_id, newState);
    else call.voiceStates.delete(data.user_id);
    /**
     * Emitted when someone joins, leaves or changes their voice state in a DM or group DM call (user accounts only).
     * @event Client#callVoiceStateUpdate
     * @param {?CallVoiceState} oldState The voice state before the update, `null` if the user just joined
     * @param {CallVoiceState} newState The voice state after the update; `channelId` is `null` if the user left
     * @param {Call} call The call
     */
    client.emit(Events.CallVoiceStateUpdate, oldState, newState, call);
  }
}

module.exports = VoiceStateUpdate;
