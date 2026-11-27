'use strict';

const Events = require('../../../util/Events');

module.exports = (client, { d: data }) => {
  const relationship = client.relationships.cache.get(data.id) ?? client.relationships._add(data, false);
  client.relationships.cache.delete(data.id);
  /**
   * Emitted when a relationship ends: unfriended, unblocked, or a friend request cancelled or declined.
   * @event Client#relationshipRemove
   * @param {Relationship} relationship The relationship that was removed
   */
  client.emit(Events.RelationshipRemove, relationship);
};
