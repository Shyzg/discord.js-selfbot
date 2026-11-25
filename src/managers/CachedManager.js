'use strict';

const process = require('node:process');
const DataManager = require('./DataManager');
const { MakeCacheOverrideSymbol } = require('../util/Symbols');

const warnedManagers = new Set();

/**
 * Manages the API methods of a data model with a mutable cache of instances.
 * @extends {DataManager}
 * @abstract
 */
class CachedManager extends DataManager {
  constructor(client, holds, iterable) {
    super(client, holds);

    /**
     * The private cache of items for this manager.
     * @type {Collection}
     * @private
     * @readonly
     * @name CachedManager#_cache
     */
    Object.defineProperty(this, '_cache', {
      value: this.client.options.makeCache(
        this.constructor[MakeCacheOverrideSymbol] ?? this.constructor,
        this.holds,
        this.constructor,
      ),
    });

    if (this.constructor._warnOnCacheOverride && !warnedManagers.has(this.constructor.name)) {
      const defaultCaching =
        this._cache.constructor.name === 'Collection' ||
        this._cache.maxSize === undefined ||
        this._cache.maxSize === Infinity;
      if (!defaultCaching) {
        warnedManagers.add(this.constructor.name);
        process.emitWarning(
          `Overriding the cache handling for ${this.constructor.name} is unsupported and breaks functionality.`,
          'UnsupportedCacheOverwriteWarning',
        );
      }
    }

    if (iterable) {
      for (const item of iterable) {
        this._add(item);
      }
    }
  }

  /**
   * The cache of items for this manager.
   * @type {Collection}
   * @abstract
   */
  get cache() {
    return this._cache;
  }

  _add(data, cache = true, { id, extras = [] } = {}) {
    const existing = this.cache.get(id ?? data.id);
    if (existing) {
      if (cache) {
        existing._patch(data);
        return existing;
      }
      const clone = existing._clone();
      clone._patch(data);
      return clone;
    }

    const entry = this.holds ? new this.holds(this.client, data, ...extras) : data;
    if (cache) this.cache.set(id ?? entry.id, entry);
    return entry;
  }
}

module.exports = CachedManager;
