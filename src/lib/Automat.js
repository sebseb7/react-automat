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
    this.#notify();
    return this.#state;
  }

  /**
   * Subscriber handling for React lifecycle management or listener callbacks.
   *
   * Supports:
   * 1. A React component instance (has `.setState`):
   *    `this.unsubscribe = automat.subscribe(this);`
   * 2. A React component instance with an optional selector:
   *    `this.unsubscribe = automat.subscribe(this, state => ({ count: state.count }));`
   * 3. A listener function:
   *    `this.unsubscribe = automat.subscribe((state) => { ... });`
   *
   * @param {object|function} target    React component instance or callback function.
   * @param {function}        [selector] Optional selector function mapping state.
   * @returns {function}                 Unsubscribe function for componentWillUnmount.
   */
  subscribe(target, selector) {
    let notifyFn;

    if (typeof target === 'function') {
      notifyFn = target;
    } else if (target && typeof target.setState === 'function') {
      notifyFn = (state) => {
        const next = typeof selector === 'function' ? selector(state) : state;
        if (next != null) {
          target.setState(next);
        }
      };
    } else {
      throw new TypeError(
        'Automat.subscribe expects a callback function or a React component instance with a setState method.'
      );
    }

    this.#subscribers.set(target, notifyFn);

    return () => {
      this.unsubscribe(target);
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
  #notify() {
    for (const notifyFn of this.#subscribers.values()) {
      notifyFn(this.#state);
    }
  }
}
