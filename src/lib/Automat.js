/**
 * @module Automat
 *
 * An observable state container whose lifetime is independent of any React component.
 * State persists across mounts and unmounts; components always see the latest value
 * when they mount because they read `automat.state` or `automat.getState()` in their constructor.
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

export class Automat {
  /** @type {object} */
  #state;
  /** @type {Map<any, function>} Map of subscriber target -> notification callback */
  #subscribers = new Map();
  /** @type {object} */
  #callbacks;
  /** @type {Array<function>} */
  #upstreamUnsubscribers = [];

  /**
   * @param {object} initialState  Initial state snapshot.
   * @param {object} [callbacks]   Named action callbacks. Exposed via `.actions`.
   */
  constructor(initialState = {}, callbacks = {}) {
    this.#state = { ...initialState };
    this.#callbacks = callbacks;
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
   * Shallow-merges `partial` into the current state and notifies all subscribers.
   *
   * @param {object} partial  Fields to update.
   * @returns {object}        The new full state.
   */
  setState(partial) {
    this.#state = { ...this.#state, ...partial };
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
  }

  /** @private */
  #notify(partial) {
    for (const notifyFn of this.#subscribers.values()) {
      notifyFn(this.#state, partial);
    }
  }
}
