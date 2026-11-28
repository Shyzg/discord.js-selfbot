'use strict';

const { GoLiveStream } = require('../../../structures/GoLiveStream');
const Events = require('../../../util/Events');

module.exports = (client, { d: data }) => {
  const existing = client.streams.cache.get(data.stream_key);
  if (!existing) {
    const stream = new GoLiveStream(client, data);
    client.streams.cache.set(stream.key, stream);
    client.emit(Events.StreamCreate, stream);
    return;
  }
  const old = existing._clone();
  existing._patch(data);
  /**
   * Emitted when a Go Live stream this session created or watches changes: its viewers, its region, or whether it
   * is paused (user accounts only).
   * @event Client#streamUpdate
   * @param {GoLiveStream} oldStream The stream before the update
   * @param {GoLiveStream} newStream The stream after the update
   */
  client.emit(Events.StreamUpdate, old, existing);
};
