'use strict';

const Events = require('../../../util/Events');

module.exports = (client, { d: data }) => {
  client.emit(
    Events.Debug,
    `[STREAM] received stream server: ${JSON.stringify({ ...data, token: data.token ? '*'.repeat(data.token.length) : data.token })}`,
  );
  client.streams._onServerUpdate(data);
};
