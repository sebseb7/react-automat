# ⚙ react-automat

> Zero-dependency higher-order observable state container for React `PureComponent`. State lives in module scope (independent of component mounting). Components read state synchronously in `constructor` and subscribe in `componentDidMount`. No Context, hooks, or HOCs.

[![npm version](https://img.shields.io/npm/v/react-automat?style=flat-square&color=crimson)](https://www.npmjs.com/package/react-automat)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-automat?style=flat-square&color=22c55e&label=minzipped)](https://bundlephobia.com/package/react-automat)
[![Live Interactive Demo](https://img.shields.io/badge/Live%20Demo-sebgreen.net%2Fautomat-6366f1?style=flat-square)](https://sebgreen.net/automat/)
[![License: 0BSD](https://img.shields.io/badge/License-0BSD-blue.svg?style=flat-square)](LICENSE)

```bash
npm install react-automat
# or: pnpm add react-automat | yarn add react-automat | bun add react-automat
```

---

## Quick Start

```js
// counterAutomat.js
import { Automat } from 'react-automat';

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

## 1. Complete Type Signatures

```ts
import type { PureComponent } from 'react';

export interface AutomatOptions<T> {
  name?: string | null;      // window.__AUTOMATS__ key & Automat.get(name)
  persist?: boolean;         // false = window (default), true = IndexedDB
  loader?: (automat: Automat<T, any>) => Promise<Partial<T> | void>;
  url?: string | null;       // Auto-triggers fetcher(url) on init
  fetcher?: (url: string, automat?: Automat<T, any>) => Promise<T>;
}

export type Selector<T, S = any> = keyof T | (keyof T)[] | ((state: T) => S | null | undefined);

export interface ScopedSlice<S> {
  readonly state: S;
  subscribe(target: PureComponent | ((slice: S) => void)): () => void;
}

export interface BlobResource {
  blob: Blob; url: string; size: number; type: string; loadedAt: string;
  revoke: () => void; // Auto-called on setDirty() / dispose() to release memory
}

export interface SSEOptions<T = any, A = any> {
  onMessage?: (data: any, event: string, automat: Automat<T, A>) => void;
  events?: Record<string, (data: any, automat: Automat<T, A>) => void>;
  onError?: (err: any, automat: Automat<T, A>) => void;
}

export type CombinedState<M extends Record<string, Automat<any, any>>> = {
  [K in keyof M]: M[K] extends Automat<infer T, any> ? T : never;
};

export type CombinedActions<M extends Record<string, Automat<any, any>>> = {
  [K in keyof M]: M[K] extends Automat<any, infer A> ? A : never;
};

export class Automat<T = any, A = Record<string, Function>> {
  constructor(initialState?: T | null, actions?: A, options?: AutomatOptions<T>);

  readonly state: T;
  getState(): T;
  setState(partial: Partial<T> | ((prev: T) => Partial<T>)): T;
  readonly actions: A;

  readonly isReady: boolean;
  readonly isDirty: boolean;
  readonly ready: Promise<T>; // Re-awaitable after setDirty()
  readonly name: string | null;
  readonly persist: boolean;
  readonly url: string | null;
  readonly subscriberCount: number;

  getData(options?: { reload?: boolean }): T;
  load(options?: { reload?: boolean }): T;

  subscribe(target: PureComponent | ((state: T, partial?: Partial<T>) => void), selector?: Selector<T>): () => void;
  select<S = any>(selector: Selector<T, S>): ScopedSlice<S>;
  unsubscribe(target: any): void;

  subscribeTo<U = any>(
    upstream: Automat<U, any>,
    transform: (upstreamState: U, currentState: T) => Partial<T> | null | undefined,
    options?: { cascadeDirty?: boolean | ((upstream: U, current: T) => boolean) }
  ): this;

  invalidateWith<U = any>(upstream: Automat<U, any>, filterFn?: (upstream: U, current: T) => boolean): this;
  onDirty(fn: (automat: this) => void): () => void;

  setDirty(): Promise<T>;   // Resets state to null/default, revokes blobs, cascades, defers if unmounted
  reload(): Promise<T>;     // Silent background re-fetch; preserves state & isReady=true
  refresh(): Promise<T>;    // Alias for reload()
  read(): T;                // For Suspense: throws ready promise if unready; triggers deferred load if dirty

  clearPersistence(): Promise<void>;
  dispose(): void;          // Unsubs all, revokes blobs, deletes from window registry

  static get<T = any, A = any>(name: string): Automat<T, A> | undefined;

  // Dictionary Combination:
  static combine<M extends Record<string, Automat<any, any>>>(automats: M): Automat<CombinedState<M>, CombinedActions<M>>;

  // Array Combiner Function Combination:
  static combine<R = any>(
    upstreamAutomats: Automat<any, any>[],
    combiner: (...states: any[]) => R,
    options?: AutomatOptions<R>
  ): Automat<R, Record<string, Function>>;
}

// Fetchers & SSE
export function fetchJson<T = any>(url: string, options?: RequestInit): Promise<T>;
export function fetchBlob(url: string, options?: RequestInit): Promise<BlobResource>;
export const fetchImageBlob: typeof fetchBlob;
export const fetchPdfBlob: typeof fetchBlob;
export function connectSSE<T, A>(automat: Automat<T, A>, url: string, options?: SSEOptions<T, A>): { eventSource: EventSource | null; close: () => void };
export function createSSEFetcher(sseUrl: string, baseFetcher?: Function, sseOptions?: SSEOptions): (url: string, automat?: any) => Promise<any>;
```

---

## 2. Canonical Usage Patterns

### A. PureComponent Subscription
```jsx
import { PureComponent } from 'react';
import { Automat } from 'react-automat';

const store = new Automat({ count: 0 }, { inc: () => store.setState({ count: store.state.count + 1 }) });

class Counter extends PureComponent {
  constructor(props) { super(props); this.state = store.state; } // Sync read, never stale
  componentDidMount() { this.unsub = store.subscribe(this); }    // Auto-calls this.setState(partial)
  componentWillUnmount() { this.unsub(); }
  render() { return <button onClick={store.actions.inc}>{this.state.count}</button>; }
}
```

### B. Fine-Grained Selectors (Shallow-guarded, 0 renders if slice unchanged)
```js
store.subscribe(this, 'count');                         // Single key
store.subscribe(this, ['theme', 'locale']);             // Multi key
store.subscribe(this, (s) => ({ items: s.list.length }));// Projection function
```

### C. Async Fetch & Constructor Cache (Instant Re-Mount)
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

### D. Multi-API Orchestration (`Automat.combine`)
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
    // Instant resolution in constructor if both upstreams loaded earlier:
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

### E. Backend API: React Suspense vs Standard
```jsx
const user = new Automat(null, {}, { url: '/api/user' });

// Suspense: throws promise while unready
const Profile = () => <div>{user.read().name}</div>;

// Standard: check isReady
class ProfileStandard extends PureComponent {
  constructor(props) { super(props); this.state = { u: user.state }; }
  componentDidMount() { this.unsub = user.subscribe(this, (u) => ({ u })); }
  componentWillUnmount() { this.unsub(); }
  render() {
    if (!user.isReady) return <div>Loading...</div>;
    return <div>{this.state.u.name}</div>;
  }
}
```

### F. Cascading Invalidation & Memory Freeing with Blobs
```js
const photoHub = new Automat(null, {}, { url: '/api/photos' });
const photo1 = new Automat(null, {}, { url: '/api/photos/1', fetcher: fetchImageBlob });

// Automatically cascades setDirty when hub is dirtied
photo1.invalidateWith(photoHub);

// When photoHub.setDirty() is triggered:
// 1. photo1 calls URL.revokeObjectURL(photo1.state.url) to free browser image memory
// 2. photo1 resets to null/initial state
// 3. If photo1 is mounted, re-fetches immediately; if unmounted, defers fetch!
```

### G. Dynamic / Keyed Entities (`KeyedAutomat`)

For entity collections loaded by ID (e.g. categories, articles, users), `KeyedAutomat` provides per-ID reactive entries, concurrent in-flight deduplication, React Suspense, and fine-grained per-ID subscriptions:

```jsx
import { KeyedAutomat } from 'react-automat';

const categoryAutomat = new KeyedAutomat(null, {}, {
  name: 'categories',
  loader: async (id) => {
    const res = await fetch(`/api/categories/${id}`);
    return res.json();
  },
});

// 1. Scoped handle for a specific ID:
const techHandle = categoryAutomat.key('tech');

// 2. React Suspense (auto-triggers load, throws in-flight promise):
const TechCategory = () => {
  const category = categoryAutomat.read('tech'); // or techHandle.read()
  return <h1>{category.name}</h1>;
};

// 3. PureComponent subscription (O(1) updates, 0 cross-talk between IDs):
class CategoryView extends PureComponent {
  constructor(props) {
    super(props);
    this.handle = categoryAutomat.key(props.id);
    this.state = this.handle.state; // { data, loading, loaded, error }
  }
  componentDidMount() {
    this.unsub = this.handle.subscribe(this, (item) => ({
      data: item.data,
      loading: item.loading,
    }));
    this.handle.load(); // Deduplicated across concurrent mounts
  }
  componentWillUnmount() {
    this.unsub();
  }
  render() {
    const { loading, data } = this.state;
    if (loading) return <div>Loading category...</div>;
    return <div>{data?.name}</div>;
  }
}
```

---

## 3. Core Invariants

1. **Lifecycle-Independent**: `Automat` instances live outside the React tree (typically in module scope), persisting state across component mounts and unmounts.
2. **Synchronous Constructor Reads**: Components initialize with `this.state = myAutomat.state;` directly in `constructor(props)`.
3. **Automatic Shallow Merges**: When subscribed with `subscribe(this)`, `automat.setState(partial)` calls `component.setState(partial)`, preserving any component-local state.
4. **Fine-Grained Selectors**: Passing a selector to `subscribe(this, selector)` runs shallow equality checks; updates to unrelated fields skip `setState` and avoid re-renders.
5. **Zero Wrappers**: No hooks, HOCs, Context Providers, or `connect()`.
6. **Optional Persistence**: Automats can specify a `name` and persist in the `window` object (`persist: false`) for session memory across unmounts/HMR, or in `IndexedDB` (`persist: true`) to survive full page reloads.

---

## Best Practices

### ✅ DO
- Define `Automat` instances in module scope.
- Read `automat.state` or `automat.getData()` directly in `constructor(props)`.
- Subscribe in `componentDidMount()` and unsubscribe in `componentWillUnmount()`.
- Use selectors (`'key'`, `['keys']`, or function) on multi-field automats to avoid unnecessary re-renders.
- Return `null` in `subscribeTo` transforms when an update should be skipped.

### ❌ DON'T
- Do not instantiate `Automat` inside React component lifecycle or render methods.
- Do not mutate state directly (`automat.state.count = 1`); use `setState()` or actions.
- Do not wrap components in React Context providers or HOCs.
- Do not forget to unsubscribe in `componentWillUnmount()`.
