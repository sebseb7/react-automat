/**
 * @module Automat
 *
 * Higher-order observable state container for React PureComponents with optional
 * persistence (Window or IndexedDB), backend API binding, cascading invalidation,
 * and multi-automat combination.
 */

/**
 * Performs a shallow equality check between two values or objects.
 * Used by Automat subscribers to avoid unnecessary setState calls when
 * a subscribed slice of state has not changed.
 */
export function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

// ── Global Window & Registry Aliases ──────────────────────────────
const W = typeof window !== 'undefined' ? window : null;
const getGlobalMap = (key) => W && (W[key] ||= new Map());

// ── Unified IndexedDB Storage ─────────────────────────────────────
const IDB_NAME = 'automat_db';
const IDB_STORE = 'states';
let idbPromise = null;

function getIdb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!idbPromise) {
    idbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return idbPromise;
}

function idbGet(key) {
  return getIdb().then((db) => {
    if (!db) return undefined;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    });
  });
}

function idbSet(key, value) {
  return getIdb().then((db) => {
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  });
}

function idbDelete(key) {
  return getIdb().then((db) => {
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  });
}

// ── Selector Normalizer ───────────────────────────────────────────
function resolveSelector(s, isComponent = false) {
  if (typeof s === 'function') {
    return s;
  }
  if (typeof s === 'string') {
    return isComponent ? (state) => (state ? { [s]: state[s] } : state) : (state) => state?.[s];
  }
  if (Array.isArray(s)) {
    return (state) => {
      if (!state) return state;
      const slice = {};
      for (let i = 0; i < s.length; i++) {
        const k = s[i];
        slice[k] = state[k];
      }
      return slice;
    };
  }
  return (state) => state;
}

export class Automat {
  constructor(initialState = null, callbacks = {}, options = {}) {
    const hasInitial = initialState !== null && initialState !== undefined;
    this._initial = hasInitial
      ? typeof initialState === 'object'
        ? { ...initialState }
        : initialState
      : null;
    this._state = this._initial ? { ...this._initial } : null;

    const resolvedCallbacks = typeof callbacks === 'function' ? callbacks(this) : (callbacks || {});
    this._cbs = {};
    for (const [key, fn] of Object.entries(resolvedCallbacks)) {
      this._cbs[key] = typeof fn === 'function' ? fn.bind(this) : fn;
    }
    this._subs = new Map();
    this._dirtySubs = new Set();
    this._unsubs = [];
    this._name = options.name ?? null;
    this._persist = Boolean(options.persist);
    this._loader = options.loader ?? null;
    this._error = null;

    if (this._name) {
      getGlobalMap('__AUTOMATS__')?.set(this._name, this);
    }

    this._isDirty = false;

    if (this._loader) {
      this._ready = this._fetchLoader();
    } else if (this._name && this._persist) {
      this._ready = idbGet(this._name).then((saved) => {
        if (saved && typeof saved === 'object') {
          this.setState(saved);
        }
        return this._state;
      });
    } else if (this._name && !this._persist) {
      const saved = getGlobalMap('__AUTOMAT_STATE__')?.get(this._name);
      if (saved && typeof saved === 'object') {
        this._state = { ...this._state, ...saved };
      }
      getGlobalMap('__AUTOMAT_STATE__')?.set(this._name, this._state);
      this._ready = Promise.resolve(this._state);
    } else {
      this._ready = Promise.resolve(this._state);
    }
  }

  /**
   * Internal data loader for function-backed automats.
   * @private
   */
  _fetchLoader() {
    this._isDirty = false;
    this._error = null;

    const promise = Promise.resolve(this._loader(this))
      .then((data) => {
        if (data && typeof data === 'object') {
          this._state = { ...this._state, ...data };
        } else if (data !== undefined) {
          this._state = data;
        }
        this._isDirty = false;
        this._error = null;
        if (this._name) {
          this._persist
            ? idbSet(this._name, this._state)
            : getGlobalMap('__AUTOMAT_STATE__')?.set(this._name, this._state);
        }
        this._notify(this._state);
        return this._state;
      })
      .catch((err) => {
        this._error = err?.message || String(err);
        this._notify(this._state);
        throw err;
      });

    this._ready = promise;
    return promise;
  }

  /**
   * Marks the automat as dirty and unready.
   * State resets to initial default or null.
   * If subscribed anywhere and configured with a loader, triggers loader fetch immediately.
   */
  setDirty(keep = false, now = false) {
    let shouldKeep = Boolean(keep);
    let shouldNow = Boolean(now);
    if (typeof keep === 'object' && keep !== null) {
      shouldKeep = Boolean(keep.keep);
      shouldNow = Boolean(keep.now);
    }
    if (typeof this._state?.revoke === 'function') {
      try {
        this._state.revoke();
      } catch {}
    }
    this._isDirty = true;
    if (!shouldKeep) {
      this._state = this._initial ? { ...this._initial } : null;
      this._notify(this._state);
    }

    if (this._dirtySubs) {
      for (const fn of this._dirtySubs) {
        try {
          fn(this);
        } catch {}
      }
    }

    if (this._loader && (shouldNow || this._subs.size > 0)) {
      return this._fetchLoader();
    }
    return Promise.resolve(this._state);
  }

  /**
   * Reads current state for React Suspense or imperative consumers.
   * If dirty and unmounted, triggers deferred fetch.
   * If unready, throws the ready promise for React Suspense.
   */
  read() {
    if (this._loader) {
      if (this._isDirty) {
        this._fetchLoader();
      }
      if (this._error) throw this._error;
      if (this._state === null && this._ready) {
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
   *
   * Supports two signatures:
   * 1. Array + Combiner function:
   *    Automat.combine([automatA, automatB], (stateA, stateB) => ({ ... }), options)
   * 2. Object Dictionary:
   *    Automat.combine({ auth: authAutomat, company: companyAutomat })
   *
   * @param {Automat[] | Record<string, Automat>} upstream
   * @param {Function} [combiner]
   * @param {object} [options]
   * @returns {Automat}
   */
  static combine(upstream, combiner, options = {}) {
    if (Array.isArray(upstream)) {
      if (typeof combiner !== 'function') {
        throw new TypeError('Automat.combine with array expects a combiner function as second argument.');
      }
      return createOrchestratedCombinedAutomat(upstream, combiner, options);
    }

    if (upstream && typeof upstream === 'object') {
      return new CombinedAutomat(upstream);
    }

    throw new TypeError('Automat.combine expects an array or dictionary object of Automat instances.');
  }

  get name() {
    return this._name;
  }

  get persist() {
    return this._persist;
  }

  get isPersisted() {
    return this._persist;
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
    if (this._loader && this._isDirty) {
      return this._fetchLoader();
    }
    return this._ready;
  }

  async clearPersistence() {
    if (!this._name) return;
    this._persist
      ? await idbDelete(this._name)
      : getGlobalMap('__AUTOMAT_STATE__')?.delete(this._name);
  }

  get state() {
    if (this._loader && this._isDirty) {
      this._fetchLoader();
    }
    return this._state;
  }

  getState() {
    return this.state;
  }

  /**
   * Shallow-merges `partial` into current state and notifies all subscribers.
   */
  setState(partial) {
    const update = typeof partial === 'function' ? partial(this._state) : partial;
    this._state = { ...this._state, ...update };
    if (this._name) {
      this._persist
        ? idbSet(this._name, this._state)
        : getGlobalMap('__AUTOMAT_STATE__')?.set(this._name, this._state);
    }
    this._notify(update);
    return this._state;
  }

  /**
   * Subscribes a React PureComponent instance or a listener callback.
   * Supports slice subscriptions with string, array, or function selectors.
   * Uses shallow equality to prevent re-renders when the slice has not changed.
   *
   * @param {object|function} target React component (`this`) or callback function.
   * @param {string|string[]|function} [selector]
   * @returns {function} Unsubscribe cleanup function.
   */
  subscribe(target, selector) {
    const isComponent = target && typeof target.setState === 'function';
    const isFunction = typeof target === 'function';

    if (!isComponent && !isFunction) {
      throw new TypeError(
        'Automat.subscribe expects a callback function or a React component instance with a setState method.'
      );
    }

    const hasSelector = selector !== undefined && selector !== null;
    const getSlice = hasSelector ? resolveSelector(selector, isComponent) : null;
    let lastSlice = getSlice ? getSlice(this._state) : undefined;

    const notifyFn = (state, partial) => {
      if (getSlice) {
        const nextSlice = getSlice(state);
        if (nextSlice == null) return;
        if (shallowEqual(lastSlice, nextSlice)) return;
        lastSlice = nextSlice;

        if (isComponent) {
          if (typeof nextSlice !== 'object') {
            throw new TypeError(
              'Automat: selector for a React component must return a state object, e.g. state => ({ count: state.count }).'
            );
          }
          target.setState(nextSlice);
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

    if (this._loader && this._isDirty) {
      this._fetchLoader();
    }

    return () => {
      this.unsubscribe(target);
    };
  }

  /**
   * Slices this automat to a subset of state for reading and subscription.
   *
   * @param {string|string[]|function} selector
   * @returns {{ readonly state: any, subscribe(target: object|function): function }}
   */
  select(selector) {
    const getSlice = resolveSelector(selector, false);
    const self = this;
    return {
      get state() {
        return getSlice(self._state);
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
   * @returns {() => void}
   */
  onDirty(fn) {
    this._dirtySubs.add(fn);
    return () => this._dirtySubs.delete(fn);
  }

  /**
   * Cascading invalidation: automatically sets this automat dirty whenever
   * upstreamAutomat is set dirty.
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
   * Connects this automat to derive state from an upstream automat.
   *
   * @param {Automat} upstreamAutomat
   * @param {(upstreamState: any, myState: any) => any} transform
   * @param {object} [options]
   * @param {boolean | ((upstreamState: any, myState: any) => boolean)} [options.cascadeDirty]
   * @returns {this} Chainable.
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
 * Creates an orchestrated combined Automat from an array of upstreams and combiner function.
 */
function createOrchestratedCombinedAutomat(upstreamAutomats, combiner, options = {}) {
  const computeInitial = () => {
    const upstreamStates = upstreamAutomats.map((a) => a.state);
    return combiner(...upstreamStates);
  };

  const combined = new Automat(
    computeInitial(),
    {},
    options
  );

  // Subscribe to all upstreams
  upstreamAutomats.forEach((upstream) => {
    combined.subscribeTo(upstream, () => {
      const upstreamStates = upstreamAutomats.map((a) => a.state);
      const combinedSlice = combiner(...upstreamStates);
      combined.setState(combinedSlice);
      return combinedSlice;
    });
  });

  return combined;
}

/**
 * Derived aggregate returned by Automat.combine({ auth: authAutomat, company: companyAutomat }).
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
        automat.onDirty?.(() => {
          for (const fn of this._dirtySubs) {
            try {
              fn(this);
            } catch {}
          }
        })
      );
    }
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
      Object.entries(this._children).map(([key, automat]) => [key, automat.read?.() ?? automat.state])
    );
    return this._state;
  }

  setDirty(keep = false, now = false) {
    return Promise.all(Object.values(this._children).map((automat) => automat.setDirty?.(keep, now))).then(() => {
      this._syncState();
      return this._state;
    });
  }

  _syncState() {
    this._state = Object.fromEntries(
      Object.entries(this._children).map(([key, automat]) => [key, automat.state])
    );
  }
}
