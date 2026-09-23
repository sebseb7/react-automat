/**
 * @module KeyedAutomat
 *
 * Observable dynamic/keyed entity state container for React PureComponents.
 * Manages collections of items by ID with concurrent fetch deduplication,
 * React Suspense support, and fine-grained per-ID subscriptions.
 */

import { shallowEqual, resolveSelector, getGlobalMap } from './Automat.js';

/**
 * Creates a blank item state container.
 * @template T
 * @param {T | null} [initialData=null]
 * @returns {import('./index.d.ts').ItemState<T>}
 */
export function createDefaultItemState(initialData = null) {
  return {
    data: initialData,
    loading: false,
    loaded: false,
    error: null,
  };
}

/**
 * Lightweight scoped handle for a specific key/ID within a KeyedAutomat.
 * Implements an interface consistent with standard Automat instances.
 * @template T
 */
export class KeyHandle {
  /**
   * @param {KeyedAutomat<T>} automat
   * @param {string | number} id
   */
  constructor(automat, id) {
    this._automat = automat;
    this._id = id;
  }

  get id() {
    return this._id;
  }

  get automat() {
    return this._automat;
  }

  get state() {
    return this._automat.get(this._id);
  }

  get data() {
    return this._automat.getData(this._id);
  }

  get loading() {
    return this._automat.get(this._id).loading;
  }

  get loaded() {
    return this._automat.isLoaded(this._id);
  }

  get error() {
    return this._automat.get(this._id).error;
  }

  load(options) {
    return this._automat.load(this._id, options);
  }

  read() {
    return this._automat.read(this._id);
  }

  reload() {
    return this._automat.reload(this._id);
  }

  setDirty(keep, now) {
    return this._automat.setDirty(this._id, keep, now);
  }

  set(data) {
    return this._automat.set(this._id, data);
  }

  evict() {
    return this._automat.evict(this._id);
  }

  subscribe(target, selector) {
    return this._automat.subscribeKey(this._id, target, selector);
  }
}

/**
 * KeyedAutomat manages a dynamic dictionary of reactive entity states by ID.
 * @template T
 * @template A
 */
export class KeyedAutomat {
  /**
   * @param {T | null} [initialItemState=null] Default data value for new items.
   * @param {A | ((automat: KeyedAutomat<T, A>) => A)} [callbacks={}] Actions dictionary or factory.
   * @param {object} [options={}]
   * @param {string} [options.name] Identifier for global registry and devtools.
   * @param {(id: string | number, automat: KeyedAutomat<T, A>) => Promise<T> | T} [options.loader]
   */
  constructor(initialItemState = null, callbacks = {}, options = {}) {
    this._initialItem = initialItemState !== undefined ? initialItemState : null;
    this._options = options || {};
    this._name = options.name ?? null;
    this._loader = options.loader ?? null;

    /** @type {Map<string | number, import('./index.d.ts').ItemState<T>>} */
    this._items = new Map();

    /** @type {Map<string | number, Promise<T>>} */
    this._inFlight = new Map();

    /** @type {Map<string | number, Map<object | function, function>>} */
    this._keyedSubs = new Map();

    /** @type {Map<object | function, function>} */
    this._globalSubs = new Map();

    /** @type {Set<function>} */
    this._dirtySubs = new Set();

    /** @type {Map<string | number, KeyHandle<T>>} */
    this._keyHandles = new Map();

    const resolvedCallbacks = typeof callbacks === 'function' ? callbacks(this) : (callbacks || {});
    this._cbs = {};
    for (const [key, fn] of Object.entries(resolvedCallbacks)) {
      this._cbs[key] = typeof fn === 'function' ? fn.bind(this) : fn;
    }

    if (this._name) {
      getGlobalMap('__KEYED_AUTOMATS__')?.set(this._name, this);
      getGlobalMap('__AUTOMATS__')?.set(this._name, this);
    }
  }

  get name() {
    return this._name;
  }

  get actions() {
    return this._cbs;
  }

  /**
   * Returns a snapshot object of all currently cached ID item states.
   */
  get state() {
    const snapshot = {};
    for (const [id, item] of this._items.entries()) {
      snapshot[id] = item;
    }
    return snapshot;
  }

  getState() {
    return this.state;
  }

  /**
   * Retrieves or creates a scoped KeyHandle proxy for the specified ID.
   * @param {string | number} id
   * @returns {KeyHandle<T>}
   */
  key(id) {
    const keyStr = String(id);
    let handle = this._keyHandles.get(keyStr);
    if (!handle) {
      handle = new KeyHandle(this, id);
      this._keyHandles.set(keyStr, handle);
    }
    return handle;
  }

  /**
   * Returns whether an entry exists for the given ID.
   * @param {string | number} id
   * @returns {boolean}
   */
  has(id) {
    return this._items.has(id);
  }

  /**
   * Returns whether the given ID has been successfully loaded.
   * @param {string | number} id
   * @returns {boolean}
   */
  isLoaded(id) {
    return Boolean(this._items.get(id)?.loaded);
  }

  /**
   * Returns the ItemState for an ID. Returns a default unready ItemState if not yet fetched.
   * @param {string | number} id
   * @returns {import('./index.d.ts').ItemState<T>}
   */
  get(id) {
    const item = this._items.get(id);
    if (item) return item;
    return createDefaultItemState(this._initialItem);
  }

  /**
   * Alias for get(id).
   * @param {string | number} id
   */
  getItem(id) {
    return this.get(id);
  }

  /**
   * Returns the data property for an ID, or null if unready.
   * @param {string | number} id
   * @returns {T | null}
   */
  getData(id) {
    return this.get(id).data;
  }

  /**
   * Loads data for a specific ID with concurrent fetch deduplication.
   * @param {string | number} id
   * @param {{ force?: boolean }} [options]
   * @returns {Promise<T>}
   */
  load(id, options = {}) {
    const keyStr = String(id);
    if (!options.force && this._inFlight.has(keyStr)) {
      return this._inFlight.get(keyStr);
    }

    const current = this.get(id);
    if (!options.force && current.loaded && !current.error) {
      return Promise.resolve(current.data);
    }

    if (!this._loader) {
      return Promise.resolve(current.data);
    }

    // Set loading state
    const loadingState = {
      ...current,
      loading: true,
      error: null,
    };
    this._items.set(id, loadingState);
    this._notifyKey(id, loadingState);

    const promise = Promise.resolve(this._loader(id, this))
      .then((data) => {
        this._inFlight.delete(keyStr);
        const loadedState = {
          data: data !== undefined ? data : null,
          loading: false,
          loaded: true,
          error: null,
        };
        this._items.set(id, loadedState);
        this._notifyKey(id, loadedState);
        return loadedState.data;
      })
      .catch((err) => {
        this._inFlight.delete(keyStr);
        const errorVal = err?.message || String(err);
        const errorState = {
          ...this.get(id),
          loading: false,
          error: errorVal,
        };
        this._items.set(id, errorState);
        this._notifyKey(id, errorState);
        throw err;
      });

    this._inFlight.set(keyStr, promise);
    return promise;
  }

  /**
   * React Suspense-compatible read method for an ID.
   * - If not loaded and not loading, triggers load(id) and throws the promise.
   * - If loading, throws the in-flight promise.
   * - If error, throws the error.
   * - If loaded, returns data.
   *
   * @param {string | number} id
   * @returns {T}
   */
  read(id) {
    const keyStr = String(id);
    const item = this._items.get(id);

    if (!item || (!item.loaded && !item.loading && !item.error)) {
      const promise = this.load(id);
      throw promise;
    }

    if (item.loading) {
      const inFlight = this._inFlight.get(keyStr);
      if (inFlight) throw inFlight;
    }

    if (item.error) {
      throw typeof item.error === 'object' ? item.error : new Error(item.error);
    }

    return item.data;
  }

  /**
   * Directly sets/commits data for a specific ID into state.
   * @param {string | number} id
   * @param {T} data
   * @returns {import('./index.d.ts').ItemState<T>}
   */
  set(id, data) {
    const next = {
      data: data !== undefined ? data : null,
      loading: false,
      loaded: true,
      error: null,
    };
    this._items.set(id, next);
    this._notifyKey(id, next);
    return next;
  }

  /**
   * Invalidates a specific ID or all cached IDs.
   * If subscribed and configured with a loader, re-fetches immediately when requested or subscribed.
   *
   * @param {string | number} [id] Target ID. If omitted, marks all keys dirty.
   * @param {boolean | { keep?: boolean, now?: boolean }} [keep=false]
   * @param {boolean} [now=false]
   */
  setDirty(id, keep = false, now = false) {
    if (id === undefined || id === null) {
      // Invalidate all items
      const promises = [];
      for (const key of Array.from(this._items.keys())) {
        promises.push(this.setDirty(key, keep, now));
      }
      return Promise.all(promises);
    }

    let shouldKeep = Boolean(keep);
    let shouldNow = Boolean(now);
    if (typeof keep === 'object' && keep !== null) {
      shouldKeep = Boolean(keep.keep);
      shouldNow = Boolean(keep.now);
    }

    const current = this._items.get(id);
    if (typeof current?.data?.revoke === 'function') {
      try {
        current.data.revoke();
      } catch {}
    }

    if (!shouldKeep) {
      const resetState = createDefaultItemState(this._initialItem);
      this._items.set(id, resetState);
      this._notifyKey(id, resetState);
    } else if (current) {
      current.loaded = false;
      this._notifyKey(id, current);
    }

    for (const fn of this._dirtySubs) {
      try {
        fn(id, this);
      } catch {}
    }

    const keySubs = this._keyedSubs.get(id);
    const hasSubscribers = (keySubs && keySubs.size > 0) || this._globalSubs.size > 0;

    if (this._loader && (shouldNow || hasSubscribers)) {
      return this.load(id, { force: true });
    }

    return Promise.resolve(this.get(id).data);
  }

  /**
   * Forces re-fetch of an ID (or all if omitted).
   * @param {string | number} [id]
   */
  reload(id) {
    return this.setDirty(id, false, true);
  }

  /**
   * Evicts an item from memory, revoking any blob URLs if present.
   * @param {string | number} id
   */
  evict(id) {
    const current = this._items.get(id);
    if (typeof current?.data?.revoke === 'function') {
      try {
        current.data.revoke();
      } catch {}
    }

    this._items.delete(id);
    this._inFlight.delete(String(id));

    const empty = createDefaultItemState(this._initialItem);
    this._notifyKey(id, empty);
  }

  /**
   * Clears all cached items and in-flight requests.
   */
  clear() {
    for (const id of Array.from(this._items.keys())) {
      this.evict(id);
    }
  }

  /**
   * Registers a listener called whenever an item (or the automat) becomes dirty.
   * @param {(id: string | number | undefined, automat: KeyedAutomat<T, A>) => void} fn
   * @returns {() => void}
   */
  onDirty(fn) {
    this._dirtySubs.add(fn);
    return () => this._dirtySubs.delete(fn);
  }

  /**
   * Subscribes a React PureComponent instance or a listener callback to a specific ID.
   * Updates only trigger when this specific ID's state changes.
   *
   * @param {string | number} id
   * @param {object | function} target React component (`this`) or callback function.
   * @param {string | string[] | function} [selector]
   * @returns {() => void} Unsubscribe cleanup function.
   */
  subscribeKey(id, target, selector) {
    const isComponent = target && typeof target.setState === 'function';
    const isFunction = typeof target === 'function';

    if (!isComponent && !isFunction) {
      throw new TypeError(
        'KeyedAutomat.subscribeKey expects a callback function or a React component instance with a setState method.'
      );
    }

    let subsForId = this._keyedSubs.get(id);
    if (!subsForId) {
      subsForId = new Map();
      this._keyedSubs.set(id, subsForId);
    }

    const hasSelector = selector !== undefined && selector !== null;
    const getSlice = hasSelector ? resolveSelector(selector, isComponent) : null;
    let lastSlice = getSlice ? getSlice(this.get(id)) : undefined;

    const notifyFn = (itemState) => {
      if (getSlice) {
        const nextSlice = getSlice(itemState);
        if (nextSlice == null) return;
        if (shallowEqual(lastSlice, nextSlice)) return;
        lastSlice = nextSlice;

        if (isComponent) {
          if (typeof nextSlice !== 'object') {
            throw new TypeError(
              'KeyedAutomat: selector for a React component must return a state object, e.g. s => ({ data: s.data }).'
            );
          }
          target.setState(nextSlice);
        } else {
          target(nextSlice);
        }
      } else {
        if (isComponent) {
          target.setState({ [id]: itemState });
        } else {
          target(itemState);
        }
      }
    };

    subsForId.set(target, notifyFn);

    return () => {
      subsForId.delete(target);
      if (subsForId.size === 0) {
        this._keyedSubs.delete(id);
      }
    };
  }

  /**
   * Subscribes to the entire dictionary state or multi-item slices.
   *
   * @param {object | function} target React component (`this`) or callback function.
   * @param {string | string[] | function} [selector]
   * @returns {() => void} Unsubscribe cleanup function.
   */
  subscribe(target, selector) {
    const isComponent = target && typeof target.setState === 'function';
    const isFunction = typeof target === 'function';

    if (!isComponent && !isFunction) {
      throw new TypeError(
        'KeyedAutomat.subscribe expects a callback function or a React component instance with a setState method.'
      );
    }

    const hasSelector = selector !== undefined && selector !== null;
    const getSlice = hasSelector ? resolveSelector(selector, isComponent) : null;
    let lastSlice = getSlice ? getSlice(this.state) : undefined;

    const notifyFn = (fullState, partial) => {
      if (getSlice) {
        const nextSlice = getSlice(fullState);
        if (nextSlice == null) return;
        if (shallowEqual(lastSlice, nextSlice)) return;
        lastSlice = nextSlice;

        if (isComponent) {
          if (typeof nextSlice !== 'object') {
            throw new TypeError(
              'KeyedAutomat: selector for a React component must return a state object, e.g. state => ({ items: state }).'
            );
          }
          target.setState(nextSlice);
        } else {
          target(nextSlice);
        }
      } else {
        if (isComponent) {
          target.setState(partial ?? fullState);
        } else {
          target(fullState);
        }
      }
    };

    this._globalSubs.set(target, notifyFn);

    return () => {
      this._globalSubs.delete(target);
    };
  }

  /**
   * Disposes the KeyedAutomat, revoking all blob resources and removing all subscribers.
   */
  dispose() {
    this.clear();
    this._keyedSubs.clear();
    this._globalSubs.clear();
    this._dirtySubs.clear();
    this._keyHandles.clear();

    if (this._name) {
      getGlobalMap('__KEYED_AUTOMATS__')?.delete(this._name);
      getGlobalMap('__AUTOMATS__')?.delete(this._name);
    }
  }

  /**
   * @private
   */
  _notifyKey(id, itemState) {
    // 1. Notify fine-grained per-ID subscribers (O(1))
    const subsForId = this._keyedSubs.get(id);
    if (subsForId) {
      for (const notifyFn of subsForId.values()) {
        try {
          notifyFn(itemState);
        } catch {}
      }
    }

    // 2. Notify global dictionary subscribers
    if (this._globalSubs.size > 0) {
      const fullState = this.state;
      const partial = { [id]: itemState };
      for (const notifyFn of this._globalSubs.values()) {
        try {
          notifyFn(fullState, partial);
        } catch {}
      }
    }
  }
}
