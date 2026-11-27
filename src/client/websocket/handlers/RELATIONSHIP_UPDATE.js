'use strict';

const Events = require('../../../util/Events');

module.exports = (client, { d: data }) => {
  const oldRelationship = client.relationships.cache.get(data.id)?._clone() ?? null;
  const relationship = client.relationships._add(data);
  /**
   * Emitted when a relationship changes without changing its type, e.g. a friend's nickname.
   * @event Client#relationshipUpdate
   * @param {?Relationship} oldRelationship The relationship before the update, if it was cached
   * @param {Relationship} newRelationship The relationship after the update
   */
  client.emit(Events.RelationshipUpdate, oldRelationship, relationship);
};
