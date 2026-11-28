'use strict';

const { Call } = require('../../../structures/Call');
const Events = require('../../../util/Events');

module.exports = (client, { d: data }) => {
  const call = client.calls.get(data.channel_id) ?? new Call(client, data);
  client.calls.delete(data.channel_id);
  call.unavailable = Boolean(data.unavailable);
  /**
   * Emitted when a call ends, or becomes unavailable because of an outage (see {@link Call#unavailable}).
   * @event Client#callDelete
   * @param {Call} call The call
   */
  client.emit(Events.CallDelete, call);
};
