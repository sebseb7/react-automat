# Automat — LLM Agent API Reference & Integration Guide

This document is optimized for LLMs and AI coding assistants implementing or consuming the `automat` state management library.

---

## 1. System Overview & Core Invariants

`automat` is a lightweight (~1.1 kB minified, zero-dependency) observable state container designed specifically for React `PureComponent`.

### Key Invariants
1. **Instance Lifetime (Module Singleton or Dynamic Map Registry)**: An `Automat` instance lives outside the React render tree. While commonly instantiated as module-level singletons, instances can also be stored dynamically in a `Map` (e.g. `window.automatRegistry = new Map()` or an in-memory entity cache) keyed by ID or index. State persists in memory across component mounts, unmounts, and subscription transfers.
2. **Direct Constructor Read**: Components read `automat.state` directly in their `constructor(props)`. State is never stale upon mounting.
3. **Lifecycle Subscription**: Components register with `automat.subscribe(this)` in `componentDidMount()` and call `this.unsubscribe()` in `componentWillUnmount()`.
4. **Hybrid State by Default**: When `automat.setState()` notifies a component, it calls `component.setState(partial)`. React's class component `setState` performs a shallow merge, preserving any component-local state fields.
5. **No Wrappers or Hooks**: No HOCs, no context providers, no hooks, no `connect()`.

---

## 2. API Reference

### Constructor

```ts
new Automat<T extends object, A extends Record<string, Function>>(
  initialState: T,
  actions?: A
): Automat<T, A>
```

- `initialState`: Object representing the initial state snapshot. Shallow-copied internally.
- `actions` *(optional)*: Object of action functions. Accessible via `automat.actions`.

---

### Instance Properties & Methods

| Member | Signature | Description |
|---|---|---|
| `state` | `get state(): T` | Direct getter returning current state snapshot. Ideal for component constructors: `this.state = myAutomat.state;`. |
| `getState()` | `getState(): T` | Method returning current state snapshot. |
| `actions` | `get actions(): A` | Getter returning the actions object passed into the constructor. |
| `setState()` | `setState(partial: Partial<T>): T` | Shallow-merges `partial` into current state and synchronously notifies all subscribers. Returns new state. |
| `subscribe()` | `subscribe(target: PureComponent \| ((state: T) => void), selector?: (state: T) => object \| null): () => void` | Subscribes either a React component instance (`this`) or a callback function. Returns an `unsubscribe` function. |
| `unsubscribe()` | `unsubscribe(target: PureComponent \| Function): void` | Manually unregisters a subscriber. |
| `subscribeTo()` | `subscribeTo<U>(upstream: Automat<U>, transform: (upstreamState: U, myState: T) => Partial<T> \| null): this` | Reactive pipeline: Derives state from an upstream automat. Returns `this` for chaining. |
| `dispose()` | `dispose(): void` | Unsubscribes all upstream listeners and clears all subscribers. |

---

## 3. Canonical Patterns for Code Generation

### Pattern A: Defining an Automat Module

```js
// src/automats/counterAutomat.js
import { Automat } from 'automat'; // or relative path to lib/index.js

export const counterAutomat = new Automat(
  { count: 0 },
  {
    increment(step = 1) {
      counterAutomat.setState({ count: counterAutomat.state.count + step });
    },
    decrement(step = 1) {
      counterAutomat.setState({ count: counterAutomat.state.count - step });
    },
    reset() {
      counterAutomat.setState({ count: 0 });
    },
  }
);
```

---

### Pattern B: React `PureComponent` Integration & Click Wiring

```jsx
// src/components/CounterController.jsx
import { PureComponent } from 'react';
import { counterAutomat } from '../automats/counterAutomat.js';

export class CounterController extends PureComponent {
  constructor(props) {
    super(props);
    // 1. Initialize hybrid state: shared automat fields + component-local fields
    this.state = {
      count: counterAutomat.state.count, // shared state from automat
      step: 1,                           // local state private to component
    };
  }

  componentDidMount() {
    // 2. Subscribe component to automat updates:
    this.unsubscribe = counterAutomat.subscribe(this);
  }

  componentWillUnmount() {
    // 3. Clean up subscription on unmount:
    this.unsubscribe();
  }

  // 4. Click handlers: invoke automat action directly
  handleIncrement = () => {
    counterAutomat.actions.increment(this.state.step);
  };

  handleDecrement = () => {
    counterAutomat.actions.decrement(this.state.step);
  };

  render() {
    const { count, step } = this.state;
    return (
      <div>
        <p>Count: {count}</p>
        <button onClick={this.handleDecrement}>−{step}</button>
        <button onClick={this.handleIncrement}>+{step}</button>
      </div>
    );
  }
}
```

---

### Pattern C: Passive Reader Component with State Selector

Use a selector function when a component only cares about a subset of the automat's state:

```jsx
// src/components/CountDisplay.jsx
import { PureComponent } from 'react';
import { counterAutomat } from '../automats/counterAutomat.js';

export class CountDisplay extends PureComponent {
  constructor(props) {
    super(props);
    this.state = { count: counterAutomat.state.count };
  }

  componentDidMount() {
    // Selector maps state to target object. Returning null skips setState.
    this.unsubscribe = counterAutomat.subscribe(this, (state) => ({
      count: state.count,
    }));
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  render() {
    return <h1>Current Count: {this.state.count}</h1>;
  }
}
```

---

### Pattern D: Reactive Cascade with `subscribeTo()`

Use `subscribeTo()` to connect two automats into a reactive pipe. The `transform` function receives `(upstreamState, myState)`:

```js
// src/automats/auditAutomat.js
import { Automat } from 'automat';
import { counterAutomat } from './counterAutomat.js';

export const auditAutomat = new Automat({ logs: [] });

// Wire reactive pipeline:
auditAutomat.subscribeTo(
  counterAutomat,
  (upstream, my) =>
    // Return null to conditionally skip updates; otherwise return partial state:
    upstream.count === 0
      ? null
      : {
          logs: [
            { id: Date.now(), text: `Counter changed to ${upstream.count}` },
            ...my.logs.slice(0, 19), // Accumulate history up to 20 items
          ],
        }
);
```

#### Rules for `subscribeTo()`:
1. **`upstream`**: Snapshot of the observed automat after its update.
2. **`my`**: Snapshot of the current (downstream) automat *before* this update. Use this as an accumulator.
3. **Filtering (`return null`)**: Return `null` or `undefined` to bypass `setState()`, producing zero subscriber notifications and zero component re-renders.

---

### Pattern E: API-Backed Auto-Sync Indexed Counter (POST)

An automat can perform optimistic state updates immediately for responsive UI, while automatically synchronizing mutations to the backend via HTTP POST in the background:

```js
// src/automats/syncCounterAutomat.js
import { Automat } from 'automat';

export const syncCounterAutomat = new Automat(
  {
    index: 0,
    count: 0,
    syncStatus: 'synced', // 'syncing' | 'synced' | 'error'
    lastSyncedAt: null,
    error: null,
  },
  {
    async increment(step = 1) {
      const { index, count } = syncCounterAutomat.state;
      const nextCount = count + step;

      // 1. Optimistic update (UI updates immediately):
      syncCounterAutomat.setState({
        count: nextCount,
        syncStatus: 'syncing',
        error: null,
      });

      // 2. Automatic background sync via POST /api/counter:
      try {
        const res = await fetch('/api/counter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index, count: nextCount }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // 3. Mark in-sync once server responds:
        syncCounterAutomat.setState({
          syncStatus: 'synced',
          lastSyncedAt: data.savedAt,
        });
      } catch (err) {
        syncCounterAutomat.setState({
          syncStatus: 'error',
          error: err.message,
        });
      }
    },
  }
);
```

---

### Pattern F: Dynamic Window Map (Count-Driven Automat Resubscription)

In this pattern, a standard shared counter automat drives the index. A second component watches that counter and uses its value to access, dynamically instantiate, and resubscribe to a different `Automat` stored in `window.automats = new Map()`, instantly recalling that slot's state:

```js
// 1. Shared index/counter automat (like Example 1):
export const indexAutomat = new Automat({ index: 0 }, {
  increment() { indexAutomat.setState({ index: indexAutomat.state.index + 1 }); },
  decrement() { indexAutomat.setState({ index: Math.max(0, indexAutomat.state.index - 1) }); },
});

// 2. Map on window holding dynamically instantiated Automats per index:
if (typeof window !== 'undefined' && !window.automats) {
  window.automats = new Map();
}

export function getOrCreateSlotAutomat(index) {
  if (!window.automats.has(index)) {
    const automat = new Automat(
      { index, clicks: 0, notes: `Slot #${index} initial notes` },
      {
        click() { automat.setState({ clicks: automat.state.clicks + 1 }); },
        setNotes(notes) { automat.setState({ notes }); },
      }
    );
    window.automats.set(index, automat);
  }
  return window.automats.get(index);
}
```

#### Dynamic Resubscription Component:

```jsx
// 3. Component dynamically resubscribing based on shared counter value:
export class DynamicSlotObserver extends PureComponent {
  constructor(props) {
    super(props);
    const initialIndex = indexAutomat.state.index;
    this.state = {
      currentIndex: initialIndex,
      slotState: getOrCreateSlotAutomat(initialIndex).state, // Recall state on mount
    };
  }

  componentDidMount() {
    // Watch shared index counter:
    this.unsubIndex = indexAutomat.subscribe((indexState) => {
      this.handleIndexChange(indexState.index);
    });
    // Subscribe to initial slot automat:
    this.subscribeToSlot(this.state.currentIndex);
  }

  componentWillUnmount() {
    this.unsubIndex?.();
    this.unsubSlot?.();
  }

  handleIndexChange(newIndex) {
    if (newIndex === this.state.currentIndex) return;

    // 💡 DYNAMIC RESUBSCRIPTION WORKFLOW:
    // 1. Unhook old subscription:
    this.unsubSlot?.();

    // 2. Lookup or dynamically instantiate in window.automats:
    const slotAutomat = getOrCreateSlotAutomat(newIndex);

    // 3. Recall preserved state immediately:
    this.setState({
      currentIndex: newIndex,
      slotState: slotAutomat.state,
    });

    // 4. Resubscribe to the newly selected instance:
    this.unsubSlot = slotAutomat.subscribe((slotState) => {
      this.setState({ slotState });
    });
  }

  subscribeToSlot(index) {
    this.unsubSlot = getOrCreateSlotAutomat(index).subscribe((slotState) => {
      this.setState({ slotState });
    });
  }

  render() {
    const { currentIndex, slotState } = this.state;
    return (
      <div>
        <h3>Slot #{currentIndex}</h3>
        <p>Recalled Clicks: {slotState.clicks}</p>
        <button onClick={() => getOrCreateSlotAutomat(currentIndex).actions.click()}>
          Click Slot #{currentIndex}
        </button>
      </div>
    );
  }
}
```

---

## 4. Strict Agent Guidelines (DOs and DON'Ts)

### ✅ DOs
- **DO** create `Automat` instances in module scope or outside React components.
- **DO** initialize component state synchronously in `constructor(props)` using `this.state = myAutomat.state;` or `{ ...myAutomat.state, localField: 'val' }`.
- **DO** register subscriptions in `componentDidMount()` via `this.unsubscribe = myAutomat.subscribe(this);`.
- **DO** clean up subscriptions in `componentWillUnmount()` via `this.unsubscribe();`.
- **DO** invoke actions directly from event handlers (e.g. `onClick={() => myAutomat.actions.doSomething()}`).
- **DO** return `null` in `subscribeTo` transforms when an update should be filtered out.

### ❌ DON'Ts
- **DON'T** instantiate `new Automat()` inside a React component's `render()`, `constructor()`, or lifecycle method.
- **DON'T** mutate state directly (e.g. `myAutomat.state.count = 5` is forbidden). Always call `myAutomat.setState({ count: 5 })` or an action.
- **DON'T** wrap components in React Context providers, HOCs, or `connect()`.
- **DON'T** use React Hooks (`useState`, `useEffect`) when targeting the `automat` class component architecture. Use `PureComponent`.
- **DON'T** forget to store the return value of `subscribe(this)` and call it in `componentWillUnmount()`, as this will cause memory leaks.
