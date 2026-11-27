'use strict';

const Events = require('../../../util/Events');

// Every SESSIONS_REPLACE carries the full session list, so it replaces the previous one.
module.exports = (client, { d: data }) => {
  if (!client.user || !Array.isArray(data)) return;
  const oldSessions = client.user._setSessions(data);
  /**
   * Emitted when the client user's gateway sessions or overall status change (user accounts only).
   * @event Client#sessionsUpdate
   * @param {Collection<string, ClientSession>} oldSessions The sessions before the update
   * @param {Collection<string, ClientSession>} newSessions The sessions after the update
   */
  client.emit(Events.SessionsUpdate, oldSessions, client.user.sessions);
};
