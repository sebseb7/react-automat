# Automat

Observable state management for React `PureComponent` — state independent of component lifecycle. Lightweight (~1.1 kB minified) and zero-dependency.

---

## Quick Start

```js
// counterAutomat.js
import { Automat } from 'automat';

export const counterAutomat = new Automat(
  { count: 0 },
  {
    increment(step = 1) {
      counterAutomat.setState({ count: counterAutomat.state.count + step });
    },
    decrement(step = 1) {
      counterAutomat.setState({ count: counterAutomat.state.count - step });
    },
  }
);
```

```jsx
// Counter.jsx
import { PureComponent } from 'react';
import { counterAutomat } from './counterAutomat.js';

export class Counter extends PureComponent {
  constructor(props) {
    super(props);
    // 1. Read state directly in constructor (never stale)
    this.state = counterAutomat.state;
  }

  componentDidMount() {
    // 2. Subscribe component to updates
    this.unsubscribe = counterAutomat.subscribe(this);
  }

  componentWillUnmount() {
    // 3. Clean up on unmount
    this.unsubscribe();
  }

  render() {
    return (
      <div>
        <span>{this.state.count}</span>
        <button onClick={() => counterAutomat.actions.increment()}>+1</button>
        <button onClick={() => counterAutomat.actions.decrement()}>-1</button>
      </div>
    );
  }
}
```

---

## Core Invariants

1. **Lifecycle-Independent**: `Automat` instances live outside the React tree (typically in module scope), persisting state across component mounts and unmounts.
2. **Synchronous Constructor Reads**: Components initialize with `this.state = myAutomat.state;` directly in `constructor(props)`.
3. **Automatic Shallow Merges**: When subscribed with `subscribe(this)`, `automat.setState(partial)` calls `component.setState(partial)`, preserving any component-local state.
4. **Fine-Grained Selectors**: Passing a selector to `subscribe(this, selector)` runs shallow equality checks; updates to unrelated fields skip `setState` and avoid re-renders.
5. **Zero Wrappers**: No hooks, HOCs, Context Providers, or `connect()`.
6. **Optional Persistence**: Automats can specify a `name` and persist in the `window` object (`persist: false`) for session memory across unmounts/HMR, or in `IndexedDB` (`persist: true`) to survive full page reloads.

---

## API Reference

### `new Automat(initialState, actions?, options?)`

Creates an observable state container with optional persistence.

- `initialState` *(object)*: Initial state snapshot (shallow copied).
- `actions` *(object, optional)*: Action methods stored on `automat.actions`.
- `options` *(object, optional)*:
  - `name` *(string)*: Unique identifier used for persistence and `Automat.get(name)` registry lookup.
  - `persist` *(boolean)*: Persistence strategy when `name` is provided:
    - `false` (default): Persists in the `window` object (session memory, survives component unmounts and HMR).
    - `true`: Persists in `IndexedDB` (survives page reloads and browser restarts).
  - `loader` *(function, optional)*: Asynchronous loader `(automat) => Promise<object>`. Invoked when `getData()` is called while state is `'idle'`.

```js
// Window-persisted (session memory)
const sessionStore = new Automat(
  { filter: 'all' },
  { setFilter(filter) { sessionStore.setState({ filter }); } },
  { name: 'filter', persist: false }
);

// Async API-backed with loader
const userStore = new Automat(
  { status: 'idle', data: null },
  {},
  {
    name: 'user',
    loader: async (store) => {
      const res = await fetch('/api/user');
      return { data: await res.json() };
    },
  }
);
```

---

### `automat.getData(options?)` / `automat.load(options?)`

Reads state for PureComponent constructor initialization, triggering asynchronous loading if state is idle:

1. **First Mount (Data Not Loaded)**:
   - Sets `{ status: 'pending' }` and kicks off the async loader.
   - Synchronously returns the pending state for the first render.
   - When the fetch completes, `setState()` notifies subscribers, causing a 2nd render with data.
2. **Subsequent Mounts / Remounts (Data Already Loaded)**:
   - Directly returns `{ status: 'success', data }` synchronously in the constructor.
   - Component renders completed data immediately. **Zero 2nd render occurs!**

```jsx
class UserProfile extends PureComponent {
  constructor(props) {
    super(props);
    // 💡 Synchronous read in constructor:
    this.state = userStore.getData();
  }
  componentDidMount() {
    this.unsubscribe = userStore.subscribe(this);
  }
  componentWillUnmount() {
    this.unsubscribe();
  }
  render() {
    const { status, data } = this.state;
    if (status === 'pending') return <Spinner />;
    return <div>{data.name}</div>;
  }
}
```

---

### `automat.state` / `automat.getState()`

Returns the current state snapshot.

```js
const current = automat.state;
// or
const current = automat.getState();
```

---

### `automat.setState(partial)`

Shallow-merges `partial` into current state and synchronously notifies subscribers. Returns the updated state.

```js
automat.setState({ count: 5 });
```

---

### `automat.actions`

Provides direct access to the actions object supplied in the constructor.

```js
automat.actions.reset();
```

---

### `automat.subscribe(target, selector?)`

Subscribes a React `PureComponent` instance (`this`) or a callback function. Returns an unsubscribe function.

```ts
subscribe(
  target: PureComponent | ((state: T) => void),
  selector?: string | string[] | ((state: T) => object | null)
): () => void
```

#### Selector forms:

- **Single Key (string)**:
  ```js
  // Injects { count } into component setState only when count changes
  this.unsubscribe = myAutomat.subscribe(this, 'count');
  ```
- **Multiple Keys (array)**:
  ```js
  // Injects { count, text } only when either property changes
  this.unsubscribe = myAutomat.subscribe(this, ['count', 'text']);
  ```
- **Selector Function**:
  ```js
  // Custom slice with shallow equality check; return null/undefined to skip update
  this.unsubscribe = myAutomat.subscribe(this, (state) => ({
    badgeCount: state.items.length,
  }));
  ```
- **Callback Function (non-React)**:
  ```js
  const unsub = myAutomat.subscribe((state) => console.log('State changed:', state));
  ```

---

### `automat.select(selector)`

Creates a scoped slice containing a `.state` getter and a pre-scoped `.subscribe()` helper.

```js
const countSlice = myAutomat.select('count');

// In constructor:
this.state = countSlice.state; // { count: 0 }

// In componentDidMount:
this.unsubscribe = countSlice.subscribe(this);
```

---

### `automat.unsubscribe(target)`

Unregisters a subscriber. Prefer calling the function returned by `subscribe()`.

```js
automat.unsubscribe(this);
```

---

### `automat.subscribeTo(upstreamAutomat, transform)`

Derives state reactively from an upstream automat. Whenever `upstreamAutomat` updates, `transform(upstreamState, myState)` runs. Return partial state to update, or `null` / `undefined` to skip. Returns `this` for chaining.

```js
const auditAutomat = new Automat({ logs: [] });

auditAutomat.subscribeTo(counterAutomat, (upstream, my) => {
  if (upstream.count === 0) return null; // skip update
  return {
    logs: [`Count changed to ${upstream.count}`, ...my.logs.slice(0, 19)],
  };
});
```

---

### `automat.ready`

A promise resolving with current state when initial rehydration finishes (resolves immediately for non-persisted and window-persisted instances; resolves once IndexedDB data loads).

```js
await cartStore.ready;
console.log('Cart rehydrated:', cartStore.state);
```

---

### `automat.clearPersistence()`

Deletes the persisted state entry from `window` or `IndexedDB`.

```js
await cartStore.clearPersistence();
```

---

### `Automat.get(name)`

Static registry method to retrieve any named `Automat` instance stored in the `window` object.

```js
const filterStore = Automat.get('filter');
```

---

### `Automat.combine(upstreamAutomats, combiner, options?)`

Combines multiple upstream automats into a single derived container.

- **Concurrent Orchestration**: When accessed via `.getData()` while any upstream is idle, triggers all idle upstreams to fetch concurrently in parallel.
- **Instant Constructor Resolution**: If all upstream automats have already resolved (`status === 'success'`), `.getData()` computes the projection synchronously in the component constructor, returning complete combined data with zero delay and a single render.

```js
const dashboardAutomat = Automat.combine(
  [userStatsAutomat, systemMetricsAutomat],
  (statsState, metricsState) => ({
    stats: statsState.data,
    metrics: metricsState.data,
  })
);

// In component constructor:
this.state = dashboardAutomat.getData();
```

---

### `automat.dispose()`

Tears down all upstream subscriptions set up via `subscribeTo()`, clears all subscribers, and removes named instance registrations from the window registry.

```js
automat.dispose();
```

---

## Examples: Named Automats & Persistence

### 1. Named Automat in Window Object (`persist: false`)

Useful for shared app settings, tab management, or devtools inspection. State persists in memory across component unmounts and Hot Module Replacement (HMR) reloads:

```js
// settingsAutomat.js
import { Automat } from 'automat';

export const settingsAutomat = new Automat(
  { theme: 'dark', soundEnabled: true },
  {
    setTheme(theme) {
      settingsAutomat.setState({ theme });
    },
    toggleSound() {
      settingsAutomat.setState({ soundEnabled: !settingsAutomat.state.soundEnabled });
    },
  },
  { name: 'settings', persist: false } // Saved in window object
);

// Any other file or devtools console can lookup the instance by name:
const settings = Automat.get('settings');
settings?.actions.setTheme('light');
```

---

### 2. Reload-Resilient Persistence with IndexedDB (`persist: true`)

Useful for shopping carts, drafts, and user form progress that must survive full page refreshes and browser restarts:

```js
// cartAutomat.js
import { Automat } from 'automat';

export const cartAutomat = new Automat(
  { items: [], lastUpdated: null },
  {
    addItem(item) {
      cartAutomat.setState({
        items: [...cartAutomat.state.items, item],
        lastUpdated: Date.now(),
      });
    },
    clearCart() {
      cartAutomat.setState({ items: [], lastUpdated: null });
      // Optional: wipe stored record from IndexedDB
      cartAutomat.clearPersistence();
    },
  },
  { name: 'cart', persist: true } // Automatically syncs with IndexedDB
);

// Optional: wait for saved data to finish hydrating before proceeding
await cartAutomat.ready;
console.log('Hydrated cart items from IndexedDB:', cartAutomat.state.items);
```

---

### 3. PureComponent Consuming an IndexedDB-Persisted Automat

Components mount immediately with initial state. When IndexedDB finishes loading persisted data in the background, subscribers are notified automatically:

```jsx
// CartView.jsx
import { PureComponent } from 'react';
import { cartAutomat } from './cartAutomat.js';

export class CartView extends PureComponent {
  constructor(props) {
    super(props);
    // 1. Mount immediately with current/initial state
    this.state = cartAutomat.state;
  }

  componentDidMount() {
    // 2. Subscribe — receives automatic update once IndexedDB hydrates
    this.unsubscribe = cartAutomat.subscribe(this);
  }

  componentWillUnmount() {
    // 3. Clean up subscription
    this.unsubscribe();
  }

  render() {
    const { items } = this.state;
    return (
      <div>
        <h3>Shopping Cart ({items.length} items)</h3>
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.name} - ${item.price}</li>
          ))}
        </ul>
        <button onClick={() => cartAutomat.actions.addItem({ id: Date.now(), name: 'New Item', price: 20 })}>
          Add Item (Persists on Reload)
        </button>
      </div>
    );
  }
}
```

---

### 4. Async Fetch with Constructor Caching (Instant Re-Mount)

When a component accesses `myAutomat.getData()` in its constructor while data is loading, it receives `{ status: 'pending' }` and renders the pending state. When the fetch completes, it renders again (2 renders total).

When another component mounts (or the component remounts via a collapsible toggle) with data already loaded, `getData()` returns `{ status: 'success', data }` synchronously in the constructor — displaying final data in **1 render with zero 2nd render**:

```jsx
class UserCard extends PureComponent {
  constructor(props) {
    super(props);
    // 💡 Synchronous read in constructor:
    // If already loaded, returns immediately -> 1 render only!
    this.state = profileAsyncAutomat.getData();
  }
  componentDidMount() {
    this.unsubscribe = profileAsyncAutomat.subscribe(this);
  }
  componentWillUnmount() {
    this.unsubscribe();
  }
  render() {
    const { status, data } = this.state;
    if (status === 'pending') return <div className="spinner" />;
    return <div>{data.name}</div>;
  }
}
```

---

### 5. Combined Multi-API Automats (`Automat.combine`)

Combines two delayed APIs. If accessed while upstreams are idle, it triggers both to load concurrently in parallel. If both had already been accessed earlier, it resolves instantly in the constructor:

```js
const combinedDashboard = Automat.combine(
  [userStatsAutomat, systemMetricsAutomat],
  (stats, metrics) => ({
    stats: stats.data,
    metrics: metrics.data,
  })
);

class Dashboard extends PureComponent {
  constructor(props) {
    super(props);
    // 💡 If both upstreams were loaded earlier, resolves instantly in constructor:
    this.state = combinedDashboard.getData();
  }
  componentDidMount() {
    this.unsubscribe = combinedDashboard.subscribe(this);
  }
  componentWillUnmount() {
    this.unsubscribe();
  }
  render() {
    const { status, stats, metrics } = this.state;
    if (status === 'pending') return <div>Loading dual sources in parallel...</div>;
    return (
      <div>
        <h1>{stats.name}</h1>
        <div>Cluster: {metrics.clusterHealth}</div>
      </div>
    );
  }
}
```

---

## Best Practices

### ✅ DO
- Define `Automat` instances in module scope.
- Read `automat.state` directly in `constructor(props)`.
- Subscribe in `componentDidMount()` and unsubscribe in `componentWillUnmount()`.
- Use selectors (`'key'`, `['keys']`, or function) on multi-field automats to avoid unnecessary re-renders.
- Return `null` in `subscribeTo` transforms when an update should be skipped.

### ❌ DON'T
- Do not instantiate `Automat` inside React component lifecycle or render methods.
- Do not mutate state directly (`automat.state.count = 1`); use `setState()` or actions.
- Do not wrap components in React Context providers or HOCs.
- Do not forget to unsubscribe in `componentWillUnmount()`.
