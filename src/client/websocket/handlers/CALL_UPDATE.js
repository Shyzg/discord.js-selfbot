'use strict';

const { Call } = require('../../../structures/Call');
const Events = require('../../../util/Events');

module.exports = (client, { d: data }) => {
  const existing = client.calls.get(data.channel_id);
  if (!existing) {
    // The CALL_CREATE was missed (e.g. it came while disconnected): start tracking the call now.
    const call = new Call(client, data);
    client.calls.set(call.channelId, call);
    client.emit(Events.CallCreate, call);
    return;
  }
  const oldCall = existing._clone();
  existing._patch(data);
  /**
   * Emitted when a call's metadata changes: who is being rung, or its region (user accounts only).
   * @event Client#callUpdate
   * @param {Call} oldCall The call before the update
   * @param {Call} newCall The call after the update
   */
  client.emit(Events.CallUpdate, oldCall, existing);
};
