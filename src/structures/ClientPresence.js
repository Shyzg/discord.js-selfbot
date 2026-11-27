'use strict';

const { GatewayOpcodes, ActivityType } = require('discord-api-types/v10');
const { Presence } = require('./Presence');
const { DiscordjsTypeError, ErrorCodes } = require('../errors');
const Events = require('../util/Events');

/**
 * Represents the client's presence.
 * @extends {Presence}
 */
class ClientPresence extends Presence {
  constructor(client, data = {}) {
    // `unknown` lets the gateway keep the status set in the user's other apps (the IDENTIFY default too), so a later
    // setActivity()/setAFK() can't switch an invisible, idle or do-not-disturb account to online.
    super(client, { ...data, status: data.status ?? 'unknown', user: { id: null } });
  }

  /**
   * Sets the client's presence
   * @param {PresenceData} presence The data to set the presence to
   * @returns {ClientPresence}
   */
  set(presence) {
    const packet = this._parse(presence);
    this._patch(packet);
    if (presence.shardId === undefined) {
      this.client.ws.broadcast({ op: GatewayOpcodes.PresenceUpdate, d: packet });
    } else {
      const shardIds = Array.isArray(presence.shardId) ? presence.shardId : [presence.shardId];
      for (const shardId of shardIds) {
        const shard = this.client.ws.shards.get(shardId);
        if (!shard) continue;
        Promise.resolve(shard.send({ op: GatewayOpcodes.PresenceUpdate, d: packet })).catch(error => {
          if (!this.client.ws.destroyed) this.client.emit(Events.ShardError, error, shardId);
        });
      }
    }
    return this;
  }

  /**
   * Parses presence data into a packet ready to be sent to Discord
   * @param {PresenceData} presence The data to parse
   * @returns {GatewayPresenceUpdateData}
   * @private
   */
  _parse({ status, since, afk, activities }) {
    const data = {
      activities: [],
      afk: typeof afk === 'boolean' ? afk : false,
      since: typeof since === 'number' && !Number.isNaN(since) ? since : 0,
      status: status ?? this.status,
    };
    if (activities?.length) {
      for (const [i, activity] of activities.entries()) {
        if (typeof activity.name !== 'string') {
          throw new DiscordjsTypeError(ErrorCodes.InvalidType, `activities[${i}].name`, 'string');
        }

        const type = activity.type ?? ActivityType.Playing;
        let { name, state } = activity;

        if (type === ActivityType.Custom && !state) {
          state = name;
          name = 'Custom Status';
        }

        data.activities.push({
          type,
          name,
          state,
          url: activity.url,
        });
      }
    } else if (!activities && (status || afk || since) && this.activities.length) {
      data.activities.push(
        ...this.activities.map(activity => ({
          name: activity.name,
          state: activity.state ?? undefined,
          type: activity.type,
          url: activity.url ?? undefined,
        })),
      );
    }

    return data;
  }
}

module.exports = ClientPresence;
