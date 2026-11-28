'use strict';

const { Call } = require('../../../structures/Call');
const Events = require('../../../util/Events');

module.exports = (client, { d: data }) => {
  const existing = client.calls.get(data.channel_id);
  if (existing) {
    // Sent again for a known call after a Request Call Connect: refresh it, voice states included.
    const oldCall = existing._clone();
    existing._patch(data);
    client.emit(Events.CallUpdate, oldCall, existing);
    return;
  }
  const call = new Call(client, data);
  client.calls.set(call.channelId, call);
  /**
   * Emitted when a call starts in a DM or group DM, or, right after connecting, for a call already in progress
   * (user accounts only).
   * @event Client#callCreate
   * @param {Call} call The call
   */
  client.emit(Events.CallCreate, call);
};
