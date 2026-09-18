# ⚙ automat

> Observable state management for React `PureComponent`.  
> State lives **independently of component lifecycle** — mounts and unmounts freely without losing state.  
> **No wrappers, no HOCs, no `connect()` — purely direct access and lifecycle subscriber handling.**

```bash
npm run dev
```

---

## Motivation

Redux separates state from UI, but brings boilerplate and pushes toward hooks. Higher-order wrappers and `connect()` introduce indirection, wrapper nesting, and tricky state hydration.

`automat` provides a clean, direct approach centered on standard `React.PureComponent`:

1. **Instantiate first**: The Automat instance is created outside React's render tree.
2. **Direct constructor access**: Components initialize directly from `automat.state` (or `getState()`) — never stale, even after transitions prior to mounting.
3. **Lifecycle subscriber handling**: In `componentDidMount`, register the component with `automat.subscribe(this)`. In `componentWillUnmount`, call `this.unsubscribe()` or `automat.unsubscribe(this)`.
4. **Direct event wiring**: Call `automat.actions.actionName()` or `automat.setState(...)` directly in `onClick` handlers. No dispatchers, actions creators, or prop drilling.
5. **Render minimization**: Standard `PureComponent` shallow state comparison prevents unnecessary re-renders automatically without extra layers.

---

## Direct PureComponent Pattern (Wired Click Example)

Here is a complete, two-component example showing how clicks trigger actions and synchronize independent components:

```jsx
import { PureComponent } from 'react';
import { Automat } from 'automat';

// 1. Instantiate the automat outside React:
const counterAutomat = new Automat(
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

// 2. Controller component: buttons trigger actions, hybrid state tracks local clicks
class CounterButton extends PureComponent {
  constructor(props) {
    super(props);
    // 💡 HYBRID STATE:
    // Shared count comes from the automat; step & localClicks are local
    this.state = {
      count: counterAutomat.state.count, // ← from automat
      step: 1,                           // ← component-local state
      localClicks: 0,                    // ← component-local state
    };
  }

  componentDidMount() {
    // Subscribe component to automat updates
    this.unsubscribe = counterAutomat.subscribe(this);
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  // 💡 CLICK HANDLERS: update local state AND trigger automat actions
  handleIncrement = () => {
    const { step, localClicks } = this.state;
    this.setState({ localClicks: localClicks + 1 });
    counterAutomat.actions.increment(step); // ← Triggers automat!
  };

  handleDecrement = () => {
    const { step, localClicks } = this.state;
    this.setState({ localClicks: localClicks + 1 });
    counterAutomat.actions.decrement(step); // ← Triggers automat!
  };

  handleReset = () => {
    this.setState({ localClicks: 0 });
    counterAutomat.actions.reset();         // ← Triggers automat!
  };

  render() {
    const { count, step, localClicks } = this.state;
    return (
      <div className="card">
        <p>Count: {count} · Local Clicks: {localClicks}</p>

        {/* 💡 WIRED ONCLICK: calls handlers directly */}
        <button onClick={this.handleDecrement}>−{step}</button>
        <button onClick={this.handleIncrement}>+{step}</button>
        <button onClick={this.handleReset}>Reset</button>
      </div>
    );
  }
}

// 3. Independent Display component: reads same automat with ZERO props passed
class CounterDisplay extends PureComponent {
  constructor(props) {
    super(props);
    // Reads directly from automat in constructor:
    this.state = counterAutomat.state;
  }

  componentDidMount() {
    // Automatically re-renders when CounterButton triggers an increment/decrement
    this.unsubscribe = counterAutomat.subscribe(this);
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  render() {
    return <h1>Display: {this.state.count}</h1>;
  }
}
```

---

### Why Hybrid State works seamlessly with React PureComponent

When `counterAutomat.setState({ count: 42 })` notifies the subscriber:
1. It calls `this.setState({ count: 42 })` on the component instance.
2. React's class component `setState` performs a **shallow merge** into `this.state`.
3. Local fields (`step`, `localClicks`, `inputValue`) remain untouched.
4. `PureComponent`'s shallow comparison ensures renders happen only when values change.

```jsx
class SearchBox extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      ...searchAutomat.state, // results, loading, etc.
      inputValue: '',         // component-local input
    };
  }

  componentDidMount() {
    this.unsubscribe = searchAutomat.subscribe(this);
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  handleInput = (e) => {
    this.setState({ inputValue: e.target.value });
  };

  // 💡 Wired form submission / click:
  handleSubmit = (e) => {
    e.preventDefault();
    const query = this.state.inputValue.trim();
    if (query) {
      searchAutomat.actions.search(query); // ← Triggers async search action
    }
  };

  render() {
    const { loading, results, inputValue } = this.state;
    return (
      <form onSubmit={this.handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={this.handleInput}
          placeholder="Search items…"
        />
        {/* 💡 Click triggers handleSubmit → searchAutomat.actions.search() */}
        <button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>

        <ul>
          {results?.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      </form>
    );
  }
}
```

---

## Core API

### `new Automat(initialState, actions?)`

```js
import { Automat } from './src/lib/index.js';

const counterAutomat = new Automat(
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

| Member | Description |
|---|---|
| `automat.state` | Direct getter for current state snapshot (ideal for `constructor`) |
| `automat.getState()` | Returns current state snapshot |
| `automat.setState(partial)` | Merges partial into state and notifies all subscribers |
| `automat.subscribe(target, selector?)` | Subscribes a component (`this`) or callback. Supports key string, key array, or selector function. Avoids unnecessary re-renders via shallow equality check. |
| `automat.select(selector)` | Returns a sliced view `{ readonly state, subscribe(target) }` for direct constructor reads and scoped subscriptions. |
| `automat.unsubscribe(target)` | Unsubscribes a component instance or callback function |
| `automat.subscribeTo(upstream, transform)` | Notification cascade: derives state from an upstream automat |
| `automat.actions` | Named action callbacks passed to constructor — call directly from `onClick` |
| `automat.dispose()` | Tears down all upstream subscriptions and clears all subscribers |

---

## Subscribing to Part of the State (Slice Subscriptions)

When an automat has multiple fields (e.g. `{ count, filter, theme, user }`), subscribing without a selector will cause any state change to trigger `this.setState()` on the subscriber.

When a component only cares about a subset of the automat's state, subscribe with a **slice selector**. `Automat` performs an internal shallow equality check (`shallowEqual(lastSlice, nextSlice)`), ensuring updates to other unrelated fields **never trigger `setState` or re-renders**:

### 1. Single Key String
```jsx
// Subscribes only to changes in 'count'. Unrelated fields will NOT trigger setState:
this.unsubscribe = myAutomat.subscribe(this, 'count');
```

### 2. Array of Keys
```jsx
// Subscribes only to 'count' and 'step':
this.unsubscribe = myAutomat.subscribe(this, ['count', 'step']);
```

### 3. Custom Selector Function
```jsx
// Computes a derived slice; returning null/undefined skips updates:
this.unsubscribe = myAutomat.subscribe(this, (state) => ({
  count: state.count,
  isEven: state.count % 2 === 0,
}));
```

### 4. Automat Slicing with `.select()`
```jsx
const countSlice = myAutomat.select('count');
this.state = countSlice.state;          // { count: 0 }
this.unsubscribe = countSlice.subscribe(this);
```

---

## Notification Cascade (Wired Example)

### How `subscribeTo()` Works (Reactive Pipeline)

`subscribeTo()` establishes a **reactive pipeline between two automats** without React components in the middle. Think of it like a database trigger or spreadsheet formula: when the upstream changes, the downstream automatically derives new state.

```
┌─────────────────┐      setState()      ┌─────────────────────────┐
│  counterAutomat │ ───────────────────> │ notificationAutomat     │
│  (Upstream)     │                      │ (Downstream)            │
└─────────────────┘                      └────────────┬────────────┘
                                                      │ notifies
                                                      ▼
                                         ┌─────────────────────────┐
                                         │ NotificationBar         │
                                         │ (PureComponent UI)      │
                                         └─────────────────────────┘
```

#### Code Anatomy:

```js
// 1. Upstream automat (e.g. holds raw counter)
const counterAutomat = new Automat({ count: 0 }, {
  increment(step = 1) {
    counterAutomat.setState({ count: counterAutomat.state.count + step });
  },
});

// 2. Downstream automat (e.g. maintains an event/audit log)
const notificationAutomat = new Automat(
  { messages: [] },
  {
    clear() { notificationAutomat.setState({ messages: [] }); },
  }
);

// 3. Connect downstream to upstream (returns null to filter, or state object):
notificationAutomat.subscribeTo(
  counterAutomat,
  (upstream, my) =>
    upstream.count === 0
      ? null
      : {
          messages: [
            {
              id: Date.now(),
              text: `Counter changed to ${upstream.count}`,
              time: new Date().toLocaleTimeString(),
              count: upstream.count,
            },
            ...my.messages.slice(0, 9), // Caps list at 10 items
          ],
        }
);
```

#### Parameter Breakdown:

| Parameter | What it receives | Purpose |
|---|---|---|
| `upstreamAutomat` | `counterAutomat` | The automat to watch. Any time it calls `setState()`, the transform runs. |
| `upstreamState` | `{ count: 42 }` | The **new state snapshot** of the upstream automat. |
| `myState` | `{ messages: [...] }` | The **current state snapshot** of *this* downstream automat right before updating. Essential for accumulating history, comparing previous values, or merging. |
| **Return value** | `{ messages: [...] }` | A **partial state object** passed to `this.setState(partial)`. Returning `null` skips the update. |

#### Filtering Updates (Conditional Derivation):

You can selectively ignore upstream events by returning `null`:

```js
// Only log notifications when count exceeds 10:
notificationAutomat.subscribeTo(counterAutomat, (upstreamState, myState) => {
  if (upstreamState.count < 10) {
    return null; // 💡 Returning null skips setState — no re-renders!
  }
  return {
    messages: [{ id: Date.now(), text: `High value reached: ${upstreamState.count}` }, ...myState.messages],
  };
});
```

#### Multiple Upstream Sources & Chaining:

`subscribeTo()` returns `this`, so an automat can aggregate from multiple independent sources:

```js
dashboardAutomat
  .subscribeTo(userAutomat, (user) => ({ username: user.name }))
  .subscribeTo(cartAutomat, (cart) => ({ cartItemCount: cart.items.length }));
```

#### Teardown:

Calling `notificationAutomat.dispose()` unsubscribes all upstream listeners automatically to prevent memory leaks when an automat is torn down.


### Wiring the Cascade in UI:

```jsx
// 4. Controller component: buttons trigger the UPSTREAM automat
class CascadeControls extends PureComponent {
  handleTrigger = (step) => {
    // 💡 CLICK WIRED HERE:
    // Calling counterAutomat triggers notificationAutomat downstream!
    counterAutomat.actions.increment(step);
  };

  handleClear = () => {
    notificationAutomat.actions.clear();
  };

  render() {
    return (
      <div>
        <button onClick={() => this.handleTrigger(1)}>Trigger (+1)</button>
        <button onClick={() => this.handleTrigger(5)}>Trigger (+5)</button>
        <button onClick={this.handleClear}>Clear Stream</button>
      </div>
    );
  }
}

// 5. Downstream component: automatically receives derived cascade messages
class NotificationBar extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      messages: notificationAutomat.state.messages, // ← from cascade
      filter: 'all',                                // ← component-local
    };
  }

  componentDidMount() {
    this.unsub = notificationAutomat.subscribe(this);
  }

  componentWillUnmount() {
    this.unsub();
  }

  render() {
    const { messages } = this.state;
    return (
      <ul>
        {messages.map((m) => (
          <li key={m.id}>{m.text} ({m.time})</li>
        ))}
      </ul>
    );
  }
}
```

When `counterAutomat.setState()` fires → `transform` runs → `notificationAutomat.setState()` fires → `NotificationBar` automatically re-renders.

---

## API-Backed Auto-Sync Counter (POST)

An automat can perform optimistic state updates immediately for instant UI feedback, while automatically synchronizing mutations to the backend via HTTP POST in the background:

```js
// syncCounterAutomat.js
const syncCounterAutomat = new Automat(
  {
    index: 0,
    count: 0,
    syncStatus: 'synced', // 'syncing' | 'synced' | 'error'
    lastSyncedAt: null,
  },
  {
    async increment(step = 1) {
      const { index, count } = syncCounterAutomat.state;
      const nextCount = count + step;

      // 1. Optimistic update (UI updates immediately):
      syncCounterAutomat.setState({ count: nextCount, syncStatus: 'syncing' });

      // 2. Automatic background sync via POST /api/counter:
      try {
        const res = await fetch('/api/counter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index, count: nextCount }),
        });
        const data = await res.json();
        syncCounterAutomat.setState({ syncStatus: 'synced', lastSyncedAt: data.savedAt });
      } catch (err) {
        syncCounterAutomat.setState({ syncStatus: 'error', error: err.message });
      }
    },
  }
);
```

### Component Wiring:

```jsx
class SyncCounterControls extends PureComponent {
  state = syncCounterAutomat.state;

  componentDidMount() {
    this.unsubscribe = syncCounterAutomat.subscribe(this);
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  render() {
    const { index, count, syncStatus, lastSyncedAt } = this.state;
    return (
      <div>
        <h3>Counter #{index}: {count}</h3>
        <button onClick={() => syncCounterAutomat.actions.increment(1)}>+1</button>
        <span>Status: {syncStatus === 'syncing' ? 'POST in flight…' : `Synced (${lastSyncedAt})`}</span>
      </div>
    );
  }
}
```

---

## Building the Standalone Library

```bash
npm run build:lib
```

Produces minified, zero-dependency bundles in `dist/`:
- `dist/automat.es.js` (~1.14 kB raw / **545 B** gzipped)
- `dist/automat.umd.js` (~1.09 kB raw / **552 B** gzipped)

---

## Project Structure

```
src/
├── lib/
│   ├── Automat.js                  ← core observable state class
│   └── index.js                    ← public re-exports
│
└── examples/
    ├── automats/
    │   ├── counterAutomat.js       ← local memory automat
    │   ├── notificationAutomat.js  ← subscribes to counter (cascade)
    │   ├── syncCounterAutomat.js   ← API-backed auto-sync indexed counter (POST)
    │   └── indexAutomat.js         ← shared index + dynamic window.automats Map
    └── components/
        ├── CounterButton.jsx       ← PureComponent with direct constructor & subscribe
        ├── CounterDisplay.jsx      ← independent PureComponent synced via counterAutomat
        ├── CascadeControls.jsx     ← PureComponent driving and demonstrating upstream cascade
        ├── NotificationBar.jsx     ← independent PureComponent displaying cascade stream
        ├── SyncCounterControls.jsx ← PureComponent driving auto-sync indexed counter
        ├── SyncBackendMonitor.jsx  ← PureComponent inspecting backend DB and POST payload
        ├── IndexSelector.jsx       ← PureComponent driving shared index counter
        └── DynamicAutomatSubscriber.jsx ← dynamically resubscribes to window.automats by index
```

---

## License

MIT
