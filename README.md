# ⚙ react-automat

> Zero-dependency higher-order state container for React `PureComponent`. State lives in module scope (independent of mounting). Components read state synchronously in `constructor` and subscribe in `componentDidMount`. No Context, hooks, or HOCs.

[![npm version](https://img.shields.io/npm/v/react-automat?style=flat-square&color=crimson)](https://www.npmjs.com/package/react-automat)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-automat?style=flat-square&color=22c55e&label=minzipped)](https://bundlephobia.com/package/react-automat)
[![Live Interactive Demo](https://img.shields.io/badge/Live%20Demo-sebgreen.net%2Fautomat-6366f1?style=flat-square)](https://sebgreen.net/automat/)
[![License: 0BSD](https://img.shields.io/badge/License-0BSD-blue.svg?style=flat-square)](LICENSE)

```bash
npm install react-automat
# or: pnpm add react-automat | yarn add react-automat | bun add react-automat
```

---

## 1. Complete Type Signatures

```ts
import type { PureComponent } from 'react';

export interface AutomatOptions<T> {
  name?: string | null;      // window.__AUTOMATS__ key & Automat.get(name)
  persist?: boolean;         // false = window (default), true = IndexedDB
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
}

// Fetchers & SSE
export function fetchJson<T = any>(url: string, options?: RequestInit): Promise<T>;
export function fetchBlob(url: string, options?: RequestInit): Promise<BlobResource>;
export const fetchImageBlob: typeof fetchBlob;
export const fetchPdfBlob: typeof fetchBlob;
export function connectSSE<T, A>(automat: Automat<T, A>, url: string, options?: SSEOptions<T, A>): { eventSource: EventSource | null; close: () => void };
export function createSSEFetcher(sseUrl: string, baseFetcher?: Function, sseOptions?: SSEOptions): (url: string, automat?: any) => Promise<any>;
```

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

### C. Unconnected Component via Window (Zero imports of store file)
```js
const store = Automat.get('cart'); // or window.__AUTOMATS__?.get('cart')
this.state = { count: store?.state?.items?.length || 0 };
this.unsub = store?.subscribe(this, (s) => ({ count: s.items.length }));
```

### D. Backend API: React Suspense vs Standard
```jsx
const user = new Automat(null, {}, { url: '/api/user' });

// Suspense: throws promise while unready
const Profile = () => <div>{user.read().name}</div>;

// Standard: check isReady
class ProfileStandard extends PureComponent {
  constructor(props) { super(props); this.state = { u: user.state }; }
  componentDidMount() { this.unsub = user.subscribe(this, (u) => ({ u })); }
  componentWillUnmount() { this.unsub(); }
  render() { return !user.isReady ? <Spinner /> : <div>{this.state.u.name}</div>; }
}
```

### E. Cascading Invalidation, Blobs & Memory Freeing
```js
const all = new Automat(null, {}, { name: 'photos/all', url: '/api/photos' });
const p1 = new Automat(null, {}, { name: 'photo/1', url: '/api/photos/1', fetcher: fetchImageBlob });
p1.invalidateWith(all); // p1 cascades setDirty() when all.setDirty() is called

all.setDirty(); // p1 auto-revokes held Blob URL, resets state=null, defers reload if unmounted
```

### F. SSE Remote Trigger
```js
const live = new Automat({}, {
  onSSETrigger(data, event, store) {
    if (event === 'invalidate') store.setDirty();
    if (event === 'reload') store.reload();
  }
});
connectSSE(live, '/api/stream');
```

## 3. Decision Matrix: `setDirty()` vs `reload()`

| Method | `isReady` | State during fetch | Suspense | Unmounted | Use Case |
|---|---|---|---|---|---|
| `setDirty()` | `false` | Resets to `null`/init | Throws fallback | Deferred until mount/read | Cache bust, logout, hard reset |
| `reload()` | `true` | Preserved | Never suspends | Immediate fetch | Polling, pull-to-refresh, sync |

## 4. Invariant Rules
- Read `store.state` synchronously in `constructor(props)` — never in render bodies.
- Subscribe in `componentDidMount()` & store the returned `unsub`; unsubscribe in `componentWillUnmount()`.
- Never mutate `store.state` directly (`store.state.x = 1` ❌); use `store.setState({ x })` or actions.
- Pass selectors to `subscribe(this, selector)` on multi-key stores to skip redundant renders.
- Never wrap components in Context Providers, HOCs, or custom hooks.
