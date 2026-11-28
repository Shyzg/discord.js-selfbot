'use strict';

const { GoLiveStream } = require('../../../structures/GoLiveStream');
const Events = require('../../../util/Events');

module.exports = (client, { d: data }) => {
  const stream = client.streams.cache.get(data.stream_key) ?? new GoLiveStream(client, data);
  client.streams.cache.delete(data.stream_key);
  /**
   * Emitted when a Go Live stream this session created or watches ends, or could not be opened (user accounts only).
   * @event Client#streamDelete
   * @param {GoLiveStream} stream The stream
   * @param {string} reason Why it ended, such as `user_requested`, `stream_ended`, `stream_full` or `unauthorized`
   */
  client.emit(Events.StreamDelete, stream, data.reason ?? null);
  client.streams._onDelete(data);
};
