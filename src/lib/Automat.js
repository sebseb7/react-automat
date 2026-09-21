/**
 * @module Automat
 *
 * Higher-order state container designed for React PureComponent with optional
 * persistence (Window or IndexedDB) and backend API binding.
 */

/**
 * Shallow equality check between two values or objects.
 */
function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const kA = Object.keys(a);
  return kA.length === Object.keys(b).length && kA.every((k) => Object.is(a[k], b[k]));
}

// ── Global Window & Registry Aliases ──────────────────────────────
const W = typeof window !== 'undefined' ? window : null;
const getGlobalMap = (key) => W && (W[key] ||= new Map());

// ── Unified IndexedDB Runner ──────────────────────────────────────
const IDB_NAME = 'automat_db';
const IDB_STORE = 'states';
let idbPromise = null;

const getIdb = () =>
  typeof indexedDB === 'undefined'
    ? Promise.resolve(null)
    : (idbPromise ||= new Promise((resolve) => {
        try {
          const req = indexedDB.open(IDB_NAME, 1);
          req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(IDB_STORE)) {
              req.result.createObjectStore(IDB_STORE);
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }));

const idbRun = (method, ...args) =>
  getIdb().then(
    (db) =>
      db &&
      new Promise((resolve) => {
        try {
          const req = db
            .transaction(IDB_STORE, method === 'get' ? 'readonly' : 'readwrite')
            .objectStore(IDB_STORE)[method](...args);
          req.onsuccess = req.oncomplete = () => resolve(req.result);
          req.onerror = () => resolve();
        } catch {
          resolve();
        }
      })
  );

// ── Selector Normalizer ───────────────────────────────────────────
const resolveSelector = (s) =>
  typeof s === 'function'
    ? s
    : Array.isArray(s)
    ? (x) => x && Object.fromEntries(s.map((k) => [k, x[k]]))
    : s
    ? (x) => x && { [s]: x[s] }
    : (x) => x;

export class Automat {
  constructor(initialState = null, callbacks = {}, options = {}) {
    const hasInitial = initialState !== null && initialState !== undefined;
    this._initial = hasInitial
      ? typeof initialState === 'object'
        ? { ...initialState }
        : initialState
      : null;
    this._state = this._initial ? { ...this._initial } : null;

    this._cbs = callbacks;
    this._subs = new Map();
    this._dirtySubs = new Set();
    this._unsubs = [];
    this._name = options.name ?? null;
    this._persist = Boolean(options.persist);
    this._url = options.url ?? null;
    this._fetcher = options.fetcher || ((url) => fetch(url).then((r) => r.json()));
    this._error = null;

    if (this._name) {
      getGlobalMap('__AUTOMATS__')?.set(this._name, this);
    }

    this._isReady = !this._url && !(this._name && this._persist);
    this._isDirty = false;
    this._ready = this._url
      ? this._fetchData()
      : this._name && this._persist
      ? idbRun('get', this._name).then((saved) => {
          if (saved && typeof saved === 'object') this.setState(saved);
          this._isReady = true;
          return this._state;
        })
      : Promise.resolve(
          this._name && !this._persist
            ? ((this._state = {
                ...this._state,
                ...getGlobalMap('__AUTOMAT_STATE__')?.get(this._name),
              }),
              getGlobalMap('__AUTOMAT_STATE__')?.set(this._name, this._state),
              this._state)
            : this._state
        );
  }

  /**
   * Internal data fetcher for backend API binding.
   * @param {boolean} [silent=false] If true, preserves isReady without unready flash.
   * @private
   */
  _fetchData(silent = false) {
    if (!silent) this._isReady = false;
    this._isDirty = false;
    this._error = null;

    const promise = this._fetcher(this._url, this)
      .then((data) => {
        this._state = data;
        this._isReady = true;
        this._isDirty = false;
        this._error = null;
        if (this._name) {
          this._persist
            ? idbRun('put', this._state, this._name)
            : getGlobalMap('__AUTOMAT_STATE__')?.set(this._name, this._state);
        }
        this._notify(this._state);
        return this._state;
      })
      .catch((err) => {
        this._error = err;
        this._isReady = false;
        this._notify(this._state);
        throw err;
      });

    this._ready = promise;
    return promise;
  }

  /**
   * Marks the automat as dirty and unready.
   * State resets to initial default or null (if no defaults were given).
   *
   * If subscribed anywhere, reloads immediately from backend API.
   * If not subscribed anywhere, defers reload until read() or subscribe().
   */
  setDirty() {
    if (typeof this._state?.revoke === 'function') {
      try {
        this._state.revoke();
      } catch {}
    }
    this._isDirty = true;
    this._isReady = false;
    this._state = this._initial ? { ...this._initial } : null;
    this._notify(this._state);

    if (this._dirtySubs) {
      for (const fn of this._dirtySubs) {
        try {
          fn(this);
        } catch {}
      }
    }

    if (this._subs.size > 0 && this._url) {
      return this._fetchData();
    }
    return Promise.resolve(this._state);
  }

  /**
   * Reloads data from the backend API without making the automat dirty or unready.
   * Existing state remains intact and UI stays interactive until fresh data arrives.
   *
   * @returns {Promise<any>} Resolves with the fresh state.
   */
  reload() {
    return this._url ? this._fetchData(true) : Promise.resolve(this._state);
  }

  /**
   * Alias for reload().
   */
  refresh() {
    return this.reload();
  }

  /**
   * Reads current state for React Suspense or imperative consumers.
   * If dirty and unmounted, calling read() triggers deferred reload.
   * If unready, throws the ready promise for React Suspense.
   */
  read() {
    if (this._url) {
      if (this._isDirty) {
        this._fetchData();
      }
      if (!this._isReady) {
        if (this._error) throw this._error;
        throw this._ready;
      }
    }
    return this._state;
  }

  /**
   * Retrieves an Automat instance registered by name.
   * @param {string} name
   */
  static get(name) {
    return getGlobalMap('__AUTOMATS__')?.get(name);
  }

  /**
   * Combines multiple automats into one derived automat.
   * The combined state and actions use the same keys as the supplied map.
   * Child updates are forwarded without taking ownership of the children.
   *
   * @param {Record<string, Automat>} automats
   * @returns {Automat}
   */
  static combine(automats) {
    return new CombinedAutomat(automats);
  }

  get name() {
    return this._name;
  }

  get persist() {
    return this._persist;
  }

  get url() {
    return this._url;
  }

  get isReady() {
    return this._isReady;
  }

  get isDirty() {
    return this._isDirty;
  }

  get error() {
    return this._error;
  }

  get subscriberCount() {
    return this._subs.size;
  }

  get ready() {
    if (this._url && this._isDirty) {
      return this._fetchData();
    }
    return this._ready;
  }

  async clearPersistence() {
    if (!this._name) return;
    this._persist
      ? await idbRun('delete', this._name)
      : getGlobalMap('__AUTOMAT_STATE__')?.delete(this._name);
  }

  get state() {
    return this._state;
  }

  getState() {
    return this._state;
  }

  setState(partial) {
    this._state = { ...this._state, ...partial };
    if (this._name) {
      this._persist
        ? idbRun('put', this._state, this._name)
        : getGlobalMap('__AUTOMAT_STATE__')?.set(this._name, this._state);
    }
    this._notify(partial);
    return this._state;
  }

  subscribe(target, selector) {
    const isComponent = target && typeof target.setState === 'function';
    if (!isComponent && typeof target !== 'function') {
      throw new TypeError('Automat.subscribe expects a component or function.');
    }

    const getSlice = selector ? resolveSelector(selector) : null;
    let lastSlice = getSlice ? getSlice(this._state) : undefined;

    const notifyFn = (state, partial) => {
      if (getSlice) {
        const nextSlice = getSlice(state);
        if (nextSlice == null && lastSlice == null) return;
        if (shallowEqual(lastSlice, nextSlice)) return;
        lastSlice = nextSlice;

        if (isComponent) {
          if (nextSlice !== null && typeof nextSlice !== 'object') {
            throw new TypeError('Automat: selector must return an object.');
          }
          nextSlice ? target.setState(nextSlice) : target.forceUpdate();
        } else {
          target(nextSlice);
        }
      } else {
        if (isComponent) {
          const update = partial ?? state;
          update && typeof update === 'object'
            ? target.setState(update)
            : target.forceUpdate();
        } else {
          target(state);
        }
      }
    };

    this._subs.set(target, notifyFn);

    if (this._url && this._isDirty) {
      this._fetchData();
    }

    return () => {
      this.unsubscribe(target);
    };
  }

  select(selector) {
    const slice = resolveSelector(selector);
    const self = this;
    return {
      get state() {
        return slice(self._state);
      },
      subscribe: (target) => self.subscribe(target, selector),
    };
  }

  unsubscribe(target) {
    this._subs.delete(target);
  }

  /**
   * Registers a listener called whenever this automat becomes dirty.
   * @param {(automat: Automat) => void} fn
   * @returns {() => void} Unsubscribe function
   */
  onDirty(fn) {
    this._dirtySubs.add(fn);
    return () => this._dirtySubs.delete(fn);
  }

  /**
   * Cascading invalidation: automatically sets this automat dirty whenever
   * upstreamAutomat is set dirty. If filterFn is provided, only invalidates when it returns true.
   *
   * @param {Automat} upstreamAutomat
   * @param {(upstreamState: any, myState: any) => boolean} [filterFn]
   * @returns {this}
   */
  invalidateWith(upstreamAutomat, filterFn) {
    const unsub = upstreamAutomat.onDirty((upstream) => {
      if (!filterFn || filterFn(upstream.state, this._state)) {
        this.setDirty();
      }
    });
    this._unsubs.push(unsub);
    return this;
  }

  /**
   * Connects this automat to an upstream automat.
   * Whenever upstream emits new state, transform(upstreamState, myState) runs.
   *
   * @param {Automat} upstreamAutomat
   * @param {(upstreamState: any, myState: any) => any} transform
   * @param {object} [options]
   * @param {boolean | ((upstreamState: any, myState: any) => boolean)} [options.cascadeDirty]
   * @returns {this}
   */
  subscribeTo(upstreamAutomat, transform, options = {}) {
    const unsub = upstreamAutomat.subscribe((upstreamState) => {
      const partial = transform(upstreamState, this._state);
      if (partial != null) {
        this.setState(partial);
      }
    });
    this._unsubs.push(unsub);

    if (options?.cascadeDirty) {
      this.invalidateWith(
        upstreamAutomat,
        typeof options.cascadeDirty === 'function' ? options.cascadeDirty : null
      );
    }
    return this;
  }

  get actions() {
    return this._cbs;
  }

  dispose() {
    if (typeof this._state?.revoke === 'function') {
      try {
        this._state.revoke();
      } catch {}
    }
    this._unsubs.forEach((fn) => fn());
    this._unsubs = [];
    this._subs.clear();
    this._dirtySubs?.clear();
    if (this._name) {
      getGlobalMap('__AUTOMATS__')?.delete(this._name);
    }
  }

  _notify(partial) {
    for (const notifyFn of this._subs.values()) {
      notifyFn(this._state, partial);
    }
  }
}

/**
 * Derived aggregate returned by Automat.combine().
 * Disposing it removes aggregate subscriptions but leaves its children alive.
 */
class CombinedAutomat extends Automat {
  constructor(automats) {
    if (!automats || typeof automats !== 'object' || Array.isArray(automats)) {
      throw new TypeError('Automat.combine expects an object of Automat instances.');
    }

    const entries = Object.entries(automats);
    for (const [key, automat] of entries) {
      if (!automat || typeof automat.subscribe !== 'function') {
        throw new TypeError(`Automat.combine: "${key}" is not an Automat instance.`);
      }
    }

    super(
      Object.fromEntries(entries.map(([key, automat]) => [key, automat.state])),
      Object.fromEntries(entries.map(([key, automat]) => [key, automat.actions]))
    );

    this._children = automats;

    for (const [key, automat] of entries) {
      this._unsubs.push(
        automat.subscribe((state) => this.setState({ [key]: state })),
        automat.onDirty(() => {
          for (const fn of this._dirtySubs) {
            try {
              fn(this);
            } catch {}
          }
        })
      );
    }
  }

  get isReady() {
    return Object.values(this._children).every((automat) => automat.isReady);
  }

  get isDirty() {
    return Object.values(this._children).some((automat) => automat.isDirty);
  }

  get error() {
    return Object.values(this._children).find((automat) => automat.error)?.error ?? null;
  }

  get ready() {
    return Promise.all(Object.values(this._children).map((automat) => automat.ready)).then(() => {
      this._syncState();
      return this._state;
    });
  }

  read() {
    this._state = Object.fromEntries(
      Object.entries(this._children).map(([key, automat]) => [key, automat.read()])
    );
    return this._state;
  }

  setDirty() {
    return Promise.all(Object.values(this._children).map((automat) => automat.setDirty())).then(() => {
      this._syncState();
      return this._state;
    });
  }

  reload() {
    return Promise.all(Object.values(this._children).map((automat) => automat.reload())).then(() => {
      this._syncState();
      return this._state;
    });
  }

  refresh() {
    return this.reload();
  }

  _syncState() {
    this._state = Object.fromEntries(
      Object.entries(this._children).map(([key, automat]) => [key, automat.state])
    );
  }
}
