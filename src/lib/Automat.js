/**
 * @module Automat
 *
 * An observable state container whose lifetime is independent of any React component.
 * State persists across mounts and unmounts; components always see the latest value
 * when they mount because they read `automat.state` or `automat.getState()` in their constructor.
 *
 * Optional Persistence:
 * - `persist: false` (default when `name` is provided): Persists state in `window` object
 *   (session memory; survives unmounts, dynamic imports, and HMR).
 * - `persist: true`: Persists state in `IndexedDB` (survives page reloads and browser restarts).
 *
 * Direct PureComponent usage:
 * ```jsx
 * class CounterDisplay extends PureComponent {
 *   constructor(props) {
 *     super(props);
 *     // 1. Direct access in constructor:
 *     this.state = counterAutomat.state;
 *   }
 *
 *   componentDidMount() {
 *     // 2. Subscriber handling for React lifecycle management:
 *     this.unsubscribe = counterAutomat.subscribe(this);
 *   }
 *
 *   componentWillUnmount() {
 *     // 3. Clean up on unmount:
 *     this.unsubscribe(); // or counterAutomat.unsubscribe(this);
 *   }
 *
 *   render() {
 *     return <span>{this.state.count}</span>;
 *   }
 * }
 * ```
 */
/**
 * Performs a shallow equality check between two values or objects.
 * Used by Automat subscribers to avoid unnecessary setState calls when
 * a subscribed slice of state has not changed.
 */
function shallowEqual(a, b) {
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

export class Automat {
  /** @type {object} */
  #state;
  /** @type {Map<any, function>} Map of subscriber target -> notification callback */
  #subscribers = new Map();
  /** @type {object} */
  #callbacks;
  /** @type {Array<function>} */
  #upstreamUnsubscribers = [];
  /** @type {string|null} */
  #name = null;
  /** @type {boolean} */
  #persist = false;
  /** @type {Promise<object>} */
  #ready = Promise.resolve();
  /** @type {function|null} */
  #loader = null;

  /**
   * @param {object} initialState  Initial state snapshot.
   * @param {object} [callbacks]   Named action callbacks. Exposed via `.actions`.
   * @param {object} [options]     Configuration options.
   * @param {string} [options.name] Identifier for persistence and registry lookup.
   * @param {boolean} [options.persist] true = IndexedDB (survives reload), false = window object (default).
   * @param {function} [options.loader] Async loader function (automat) => Promise<object>.
   */
  constructor(initialState = {}, callbacks = {}, options = {}) {
    this.#callbacks = callbacks;
    this.#name = options.name ?? null;
    this.#persist = Boolean(options.persist);
    this.#loader = typeof options.loader === 'function' ? options.loader : null;

    if (this.#name && typeof window !== 'undefined') {
      window.__AUTOMATS__ = window.__AUTOMATS__ || new Map();
      window.__AUTOMATS__.set(this.#name, this);
    }

    if (this.#name && !this.#persist) {
      // Window object persistence (session memory, persists across unmounts & HMR)
      if (typeof window !== 'undefined') {
        window.__AUTOMAT_STATE__ = window.__AUTOMAT_STATE__ || new Map();
        if (window.__AUTOMAT_STATE__.has(this.#name)) {
          this.#state = { ...initialState, ...window.__AUTOMAT_STATE__.get(this.#name) };
        } else {
          this.#state = { ...initialState };
          window.__AUTOMAT_STATE__.set(this.#name, this.#state);
        }
      } else {
        this.#state = { ...initialState };
      }
      this.#ready = Promise.resolve(this.#state);
    } else if (this.#name && this.#persist) {
      // IndexedDB persistence (survives page reloads)
      this.#state = { ...initialState };
      this.#ready = idbGet(this.#name).then((saved) => {
        if (saved && typeof saved === 'object') {
          this.setState(saved);
        }
        return this.#state;
      });
    } else {
      this.#state = { ...initialState };
      this.#ready = Promise.resolve(this.#state);
    }
  }

  /**
   * Retrieves an Automat instance registered by name.
   * @param {string} name
   * @returns {Automat|undefined}
   */
  static get(name) {
    if (typeof window !== 'undefined' && window.__AUTOMATS__) {
      return window.__AUTOMATS__.get(name);
    }
    return undefined;
  }

  /**
   * Creates a combined Automat derived from multiple upstream Automats.
   *
   * When accessed via `.getData()`:
   * - If all upstream automats are already resolved (`status === 'success'`),
   *   it immediately returns the combined state in the constructor (instant resolution).
   * - If any upstream automat is idle, it triggers `.getData()` on them concurrently,
   *   transitions itself to pending, and synchronizes automatically as each completes.
   *
   * @param {Automat[]} upstreamAutomats  Array of upstream Automat instances.
   * @param {function(...states: object[]): object} combiner  Function that maps upstream states to combined state.
   * @param {object} [options]  Optional Automat options (name, persist).
   * @returns {Automat}
   */
  static combine(upstreamAutomats, combiner, options = {}) {
    const computeInitial = () => {
      const upstreamStates = upstreamAutomats.map((a) => a.state);
      return combiner(...upstreamStates);
    };

    const combined = new Automat(
      computeInitial(),
      {
        getData(opts = {}) {
          const allResolved = upstreamAutomats.every(
            (a) => a.state?.status === 'success'
          );

          if (allResolved && !opts.reload) {
            const currentCombined = combiner(...upstreamAutomats.map((a) => a.state));
            if (combined.state.status !== 'success') {
              combined.setState({ ...currentCombined, status: 'success' });
            }
            return combined.state;
          }

          // Trigger loading on any uncompleted or reload-requested upstreams
          upstreamAutomats.forEach((a) => {
            if (typeof a.getData === 'function' && (a.state?.status === 'idle' || opts.reload)) {
              a.getData(opts);
            }
          });

          const checkAllResolved = upstreamAutomats.every(
            (a) => a.state?.status === 'success'
          );

          if (checkAllResolved) {
            const res = combiner(...upstreamAutomats.map((a) => a.state));
            combined.setState({ ...res, status: 'success' });
            return combined.state;
          }

          const partialCombined = combiner(...upstreamAutomats.map((a) => a.state));
          combined.setState({ ...partialCombined, status: 'pending' });
          return combined.state;
        },
      },
      options
    );

    // Subscribe to all upstreams
    upstreamAutomats.forEach((upstream) => {
      combined.subscribeTo(upstream, () => {
        const upstreamStates = upstreamAutomats.map((a) => a.state);
        const allDone = upstreamStates.every((s) => s?.status === 'success');
        const anyError = upstreamStates.find((s) => s?.status === 'error');
        const combinedSlice = combiner(...upstreamStates);

        if (anyError) {
          return { ...combinedSlice, status: 'error', error: anyError.error };
        }
        if (allDone) {
          return { ...combinedSlice, status: 'success', error: null };
        }
        return { ...combinedSlice, status: 'pending' };
      });
    });

    return combined;
  }

  /**
   * The registered name of the automat, or null if unnamed.
   * @returns {string|null}
   */
  get name() {
    return this.#name;
  }

  /**
   * Whether this automat is persisted to IndexedDB (true) or window object (false).
   * @returns {boolean}
   */
  get persist() {
    return this.#persist;
  }

  /**
   * Promise resolving when initial state rehydration is complete.
   * @returns {Promise<object>}
   */
  get ready() {
    return this.#ready;
  }

  /**
   * Clears persisted state from window or IndexedDB.
   * @returns {Promise<void>}
   */
  async clearPersistence() {
    if (!this.#name) return;
    if (this.#persist) {
      await idbDelete(this.#name);
    } else if (typeof window !== 'undefined') {
      window.__AUTOMAT_STATE__?.delete(this.#name);
    }
  }

  /**
   * Direct property access to the current state snapshot.
   * Use in PureComponent constructor: `this.state = automat.state;`
   * @returns {object}
   */
  get state() {
    return this.#state;
  }

  /**
   * Returns the current state snapshot.
   * Use in PureComponent constructor: `this.state = automat.getState();`
   * @returns {object}
   */
  getState() {
    return this.#state;
  }

  /**
   * Reads state for constructor initialization, optionally triggering an action or loader.
   *
   * Lifecycle & Caching Semantics:
   * 1. If loader or load action is configured and state is 'idle' (or reload is true):
   *    - Transitions state to { status: 'pending', error: null }.
   *    - Launches loader asynchronously in the background.
   *    - Synchronously returns the pending state for the first render.
   * 2. When the async fetch finishes, automat.setState notifies subscribers, triggering
   *    a second render with completed data.
   * 3. When called again from another component or after remounting with data already loaded
   *    (status === 'success'), returns the resolved state immediately in the constructor.
   *    No secondary render is needed!
   *
   * @param {object} [options]
   * @param {boolean} [options.reload=false]
   * @returns {object}
   */
  getData(options = {}) {
    const shouldReload = Boolean(options.reload);
    const isIdle = !this.#state.status || this.#state.status === 'idle' || shouldReload;

    if (this.#loader && isIdle) {
      this.setState({ status: 'pending', error: null });
      Promise.resolve(this.#loader(this))
        .then((result) => {
          if (result && typeof result === 'object') {
            this.setState({ status: 'success', ...result, error: null });
          } else {
            this.setState({ status: 'success', error: null });
          }
        })
        .catch((err) => {
          this.setState({ status: 'error', error: err?.message || String(err) });
        });
      return this.#state;
    }

    if (this.#callbacks?.getData && typeof this.#callbacks.getData === 'function') {
      return this.#callbacks.getData(options);
    }

    if (this.#callbacks?.load && typeof this.#callbacks.load === 'function' && isIdle) {
      this.#callbacks.load(options);
      return this.#state;
    }

    return this.#state;
  }

  /**
   * Alias for getData(options).
   * @param {object} [options]
   * @returns {object}
   */
  load(options) {
    return this.getData(options);
  }

  /**
   * Forces a reload via getData({ reload: true }).
   * @returns {object}
   */
  reload() {
    return this.getData({ reload: true });
  }

  /**
   * Shallow-merges `partial` into the current state and notifies all subscribers.
   *
   * @param {object} partial  Fields to update.
   * @returns {object}        The new full state.
   */
  setState(partial) {
    this.#state = { ...this.#state, ...partial };
    if (this.#name) {
      if (this.#persist) {
        idbSet(this.#name, this.#state);
      } else if (typeof window !== 'undefined') {
        window.__AUTOMAT_STATE__?.set(this.#name, this.#state);
      }
    }
    this.#notify(partial);
    return this.#state;
  }

  /**
   * Subscribes a React PureComponent instance or a listener callback.
   *
   * Partial / Slice Subscriptions:
   * By default, subscribing to an automat triggers updates when any state changes.
   * Passing a `selector` allows subscribing to only a slice of state.
   * Changes to unrelated state fields will NOT trigger setState or re-renders.
   *
   * Selector forms:
   * 1. Single property key (string):
   *    `automat.subscribe(this, 'count')`
   * 2. Multiple property keys (array of strings):
   *    `automat.subscribe(this, ['count', 'step'])`
   * 3. Selector function:
   *    `automat.subscribe(this, state => ({ count: state.count }))`
   *    (Return null/undefined to conditionally skip updates)
   * 4. Full subscription (omitted):
   *    `automat.subscribe(this)`
   *
   * @param {object|function} target      React component (`this`) or callback function.
   * @param {string|string[]|function} [selector] Property key, key array, or selector function.
   * @returns {function}                  Unsubscribe function for componentWillUnmount.
   */
  subscribe(target, selector) {
    const isComponent = target && typeof target.setState === 'function';
    const isFunction = typeof target === 'function';

    if (!isComponent && !isFunction) {
      throw new TypeError(
        'Automat.subscribe expects a callback function or a React component instance with a setState method.'
      );
    }

    let getSlice;
    if (typeof selector === 'string') {
      getSlice = isComponent
        ? (state) => ({ [selector]: state[selector] })
        : (state) => state[selector];
    } else if (Array.isArray(selector)) {
      getSlice = (state) => {
        const slice = {};
        for (let i = 0; i < selector.length; i++) {
          const key = selector[i];
          slice[key] = state[key];
        }
        return slice;
      };
    } else if (typeof selector === 'function') {
      getSlice = selector;
    }

    let lastSlice = getSlice ? getSlice(this.#state) : undefined;

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
          target.setState(partial ?? state);
        } else {
          target(state);
        }
      }
    };

    this.#subscribers.set(target, notifyFn);

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
    let getSlice;
    if (typeof selector === 'string') {
      getSlice = (state) => ({ [selector]: state[selector] });
    } else if (Array.isArray(selector)) {
      getSlice = (state) => {
        const slice = {};
        for (let i = 0; i < selector.length; i++) {
          const key = selector[i];
          slice[key] = state[key];
        }
        return slice;
      };
    } else if (typeof selector === 'function') {
      getSlice = selector;
    } else {
      getSlice = (state) => state;
    }

    const self = this;
    return {
      get state() {
        return getSlice(self.state);
      },
      subscribe: (target) => self.subscribe(target, selector),
    };
  }

  /**
   * Unsubscribes a component or listener function.
   *
   * Can be called directly in `componentWillUnmount`:
   * `automat.unsubscribe(this);`
   *
   * @param {object|function} target
   */
  unsubscribe(target) {
    this.#subscribers.delete(target);
  }

  /**
   * Wires this automat to derive state from an upstream automat.
   *
   * Whenever `upstreamAutomat` changes, `transform` is called with the upstream state
   * and this automat's current state. The returned partial object is applied via
   * `setState`, notifying this automat's own subscribers.
   *
   * @param {Automat}  upstreamAutomat
   * @param {function(upstreamState: object, myState: object): object|null} transform
   * @returns {this}  Chainable.
   */
  subscribeTo(upstreamAutomat, transform) {
    const unsub = upstreamAutomat.subscribe((upstreamState) => {
      const partial = transform(upstreamState, this.#state);
      if (partial != null) {
        this.setState(partial);
      }
    });
    this.#upstreamUnsubscribers.push(unsub);
    return this;
  }

  /**
   * The named action callbacks passed in the constructor.
   * @type {object}
   */
  get actions() {
    return this.#callbacks;
  }

  /**
   * Tears down all upstream subscriptions and clears the subscriber map.
   */
  dispose() {
    this.#upstreamUnsubscribers.forEach((fn) => fn());
    this.#upstreamUnsubscribers = [];
    this.#subscribers.clear();
    if (this.#name && typeof window !== 'undefined' && window.__AUTOMATS__) {
      window.__AUTOMATS__.delete(this.#name);
    }
  }

  /** @private */
  #notify(partial) {
    for (const notifyFn of this.#subscribers.values()) {
      notifyFn(this.#state, partial);
    }
  }
}
