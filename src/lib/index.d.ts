import type { PureComponent } from 'react';

export interface AutomatOptions<T = any> {
  name?: string | null;
  persist?: boolean;
  loader?: (automat: Automat<T, any>) => Promise<T | Partial<T>> | T | Partial<T>;
}

export type Selector<T, S> =
  | keyof T
  | (keyof T)[]
  | ((state: T) => S | null | undefined);

export interface ScopedSlice<S> {
  readonly state: S;
  subscribe(target: PureComponent | ((slice: S) => void)): () => void;
}

export interface BlobResource {
  blob: Blob;
  url: string;
  size: number;
  type: string;
  loadedAt: string;
  revoke: () => void;
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
  constructor(
    initialState?: T | null,
    actions?: A | ((automat: Automat<T, A>) => A),
    options?: AutomatOptions<T>
  );

  readonly state: T;
  getState(): T;
  setState(partial: Partial<T> | ((prevState: T) => Partial<T>)): T;

  readonly actions: A;
  readonly isDirty: boolean;
  readonly ready: Promise<T>;
  readonly name: string | null;
  readonly persist: boolean;
  readonly subscriberCount: number;

  subscribe(
    target: PureComponent | ((state: T, partial?: Partial<T>) => void),
    selector?: Selector<T, any>
  ): () => void;

  select<S = any>(selector: Selector<T, S>): ScopedSlice<S>;
  unsubscribe(target: any): void;

  subscribeTo<U = any>(
    upstreamAutomat: Automat<U, any>,
    transform: (upstreamState: U, currentState: T) => Partial<T> | null | undefined,
    options?: { cascadeDirty?: boolean | ((upstream: U, current: T) => boolean) }
  ): this;

  invalidateWith<U = any>(
    upstreamAutomat: Automat<U, any>,
    filterFn?: (upstreamState: U, currentState: T) => boolean
  ): this;

  onDirty(fn: (automat: this) => void): () => void;

  setDirty(keep?: boolean, now?: boolean): Promise<T>;
  read(): T;

  clearPersistence(): Promise<void>;
  dispose(): void;

  static get<T = any, A = any>(name: string): Automat<T, A> | undefined;
  static combine<M extends Record<string, Automat<any, any>>>(
    automats: M
  ): Automat<CombinedState<M>, CombinedActions<M>>;
  static combine<R = any>(
    upstreamAutomats: Automat<any, any>[],
    combiner: (...states: any[]) => R,
    options?: AutomatOptions<R>
  ): Automat<R, Record<string, Function>>;
}

export function fetchJson<T = any>(url: string, options?: RequestInit): Promise<T>;
export function fetchBlob(url: string, options?: RequestInit): Promise<BlobResource>;
export const fetchImageBlob: typeof fetchBlob;
export const fetchPdfBlob: typeof fetchBlob;

export function connectSSE<T = any, A = any>(
  automat: Automat<T, A>,
  url: string,
  options?: SSEOptions<T, A>
): { eventSource: EventSource | null; close: () => void };

export function createSSEFetcher(
  sseUrl: string,
  baseFetcher?: (url: string, automat?: any) => Promise<any>,
  sseOptions?: SSEOptions
): (url: string, automat?: any) => Promise<any>;
