'use strict';

const { GoLiveStream } = require('../../../structures/GoLiveStream');
const Events = require('../../../util/Events');

module.exports = (client, { d: data }) => {
  const existing = client.streams.cache.get(data.stream_key);
  if (existing) {
    const old = existing._clone();
    existing._patch(data);
    client.emit(Events.StreamUpdate, old, existing);
  } else {
    const stream = new GoLiveStream(client, data);
    client.streams.cache.set(stream.key, stream);
    /**
     * Emitted when a Go Live stream this session created or watches opens (user accounts only).
     * @event Client#streamCreate
     * @param {GoLiveStream} stream The stream
     */
    client.emit(Events.StreamCreate, stream);
  }
  client.streams._onCreate(data);
};
