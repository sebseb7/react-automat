import { Automat } from '../../lib/index.js';

/**
 * Simulated dummy API with realistic asynchronous latency.
 *
 * @param {number} delayMs
 * @param {boolean} shouldFail
 * @returns {Promise<object>}
 */
export async function fetchDummyProfile(delayMs = 800, shouldFail = false) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  if (shouldFail) {
    throw new Error('Simulated upstream gateway timeout (HTTP 504 Gateway Timeout)');
  }

  return {
    id: 'usr_8492',
    name: 'Elena Rostova',
    handle: '@elena_dev',
    role: 'Principal Systems Architect',
    avatar: '👩‍💻',
    statusMessage: 'Optimizing reactive state pipelines',
    quota: { used: 74, total: 100, unit: 'GB' },
    endpoint: 'us-east-1.cloud.automat.internal',
    pingMs: Math.floor(18 + Math.random() * 15),
    tags: ['Production', 'Kubernetes', 'WebSockets', 'GraphQL'],
    lastFetchedAt: new Date().toLocaleTimeString(),
  };
}

/**
 * Async API-backed Automat.
 *
 * Demonstrates:
 * 1. An Automat that fetches an API with simulated latency.
 * 2. When a component accesses `getData()` in its constructor while status is 'idle',
 *    it receives `{ status: 'pending' }` immediately and renders the pending state (1st render).
 * 3. Once the API completes, `setState` notifies subscribers, re-rendering with data (2nd render).
 * 4. When a different component (or the same component remounted via a collapsible)
 *    calls `getData()`, the data is ALREADY in memory (`status === 'success'`).
 *    It returns synchronously in constructor, rendering immediately with NO 2nd render needed!
 */
export const profileAsyncAutomat = new Automat(
  {
    status: 'idle', // 'idle' | 'pending' | 'success' | 'error'
    data: null,
    error: null,
    delayMs: 800,
    fetchCount: 0,
    lastFetchedAt: null,
  },
  {
    setDelay(delayMs) {
      profileAsyncAutomat.setState({ delayMs: Math.max(100, Number(delayMs) || 800) });
    },

    reset() {
      profileAsyncAutomat.setState({
        status: 'idle',
        data: null,
        error: null,
      });
    },

    async triggerError() {
      const { delayMs, fetchCount } = profileAsyncAutomat.state;
      profileAsyncAutomat.setState({ status: 'pending', error: null });
      try {
        await fetchDummyProfile(delayMs, true);
      } catch (err) {
        profileAsyncAutomat.setState({
          status: 'error',
          error: err.message,
          fetchCount: fetchCount + 1,
        });
      }
    },
  },
  {
    name: 'profile_async',
    persist: false,
    loader: async (automat) => {
      const { delayMs, fetchCount } = automat.state;
      const data = await fetchDummyProfile(delayMs, false);
      return {
        data,
        fetchCount: fetchCount + 1,
        lastFetchedAt: data.lastFetchedAt,
      };
    },
  }
);
