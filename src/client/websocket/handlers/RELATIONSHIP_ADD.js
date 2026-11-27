'use strict';

const Events = require('../../../util/Events');

module.exports = (client, { d: data }) => {
  const relationship = client.relationships._add(data);
  /**
   * Emitted when a relationship is created or its type changes, e.g. a friend request arrives or gets accepted.
   * @event Client#relationshipAdd
   * @param {Relationship} relationship The relationship
   * @param {boolean} shouldNotify Whether Discord suggests notifying the user about it
   */
  client.emit(Events.RelationshipAdd, relationship, Boolean(data.should_notify));
};
