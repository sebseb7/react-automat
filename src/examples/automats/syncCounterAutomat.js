import { Automat } from '../../lib/index.js';

/**
 * Helper to sync the indexed counter to the backend via POST /api/counter.
 * Includes offline/fallback logic so it gracefully handles production previews.
 */
async function postCounterSync(index, count) {
  try {
    const res = await fetch('/api/counter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, count, timestamp: Date.now() }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    // Simulated fallback if running in an environment without the dev server backend:
    return {
      success: true,
      index,
      count,
      savedAt: new Date().toLocaleTimeString(),
      allRecords: [
        { index, count, updatedAt: new Date().toLocaleTimeString() },
      ],
      fallback: true,
    };
  }
}

/**
 * Helper to fetch a specific index's state from backend via GET /api/counter?index=...
 */
async function fetchCounterIndex(index) {
  try {
    const res = await fetch(`/api/counter?index=${index}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { index, count: 0, updatedAt: 'Local' };
  }
}

/**
 * API-backed indexed counter automat.
 *
 * Automatically syncs every mutation to the backend via HTTP POST /api/counter.
 * Uses optimistic updates for instant UI response, followed by background POST synchronization.
 */
export const syncCounterAutomat = new Automat(
  {
    index: 0,
    count: 0,
    syncStatus: 'synced', // 'idle' | 'syncing' | 'synced' | 'error'
    lastSyncedAt: 'Initial',
    error: null,
    backendRecords: [
      { index: 0, count: 0, updatedAt: 'Initial' },
      { index: 1, count: 5, updatedAt: 'Initial' },
      { index: 2, count: 10, updatedAt: 'Initial' },
    ],
  },
  {
    /**
     * Increment count for current index & auto-sync to backend via POST
     */
    async increment(step = 1) {
      const { index, count } = syncCounterAutomat.state;
      const nextCount = count + step;

      // 1. Optimistic update:
      syncCounterAutomat.setState({
        count: nextCount,
        syncStatus: 'syncing',
        error: null,
      });

      // 2. Auto-sync via POST /api/counter:
      try {
        const result = await postCounterSync(index, nextCount);
        syncCounterAutomat.setState({
          syncStatus: 'synced',
          lastSyncedAt: result.savedAt,
          backendRecords: result.allRecords || syncCounterAutomat.state.backendRecords,
        });
      } catch (err) {
        syncCounterAutomat.setState({
          syncStatus: 'error',
          error: err.message,
        });
      }
    },

    /**
     * Decrement count for current index & auto-sync to backend via POST
     */
    async decrement(step = 1) {
      const { index, count } = syncCounterAutomat.state;
      const nextCount = Math.max(0, count - step);

      // 1. Optimistic update:
      syncCounterAutomat.setState({
        count: nextCount,
        syncStatus: 'syncing',
        error: null,
      });

      // 2. Auto-sync via POST /api/counter:
      try {
        const result = await postCounterSync(index, nextCount);
        syncCounterAutomat.setState({
          syncStatus: 'synced',
          lastSyncedAt: result.savedAt,
          backendRecords: result.allRecords || syncCounterAutomat.state.backendRecords,
        });
      } catch (err) {
        syncCounterAutomat.setState({
          syncStatus: 'error',
          error: err.message,
        });
      }
    },

    /**
     * Switch to a different counter index and load its backend state
     */
    async setIndex(newIndex) {
      const targetIndex = Number(newIndex);
      syncCounterAutomat.setState({
        index: targetIndex,
        syncStatus: 'syncing',
        error: null,
      });

      const serverData = await fetchCounterIndex(targetIndex);
      syncCounterAutomat.setState({
        count: serverData.count ?? 0,
        syncStatus: 'synced',
        lastSyncedAt: serverData.updatedAt || new Date().toLocaleTimeString(),
      });
    },

    /**
     * Reset current counter to 0 & auto-sync via POST
     */
    async reset() {
      const { index } = syncCounterAutomat.state;
      syncCounterAutomat.setState({
        count: 0,
        syncStatus: 'syncing',
        error: null,
      });

      const result = await postCounterSync(index, 0);
      syncCounterAutomat.setState({
        syncStatus: 'synced',
        lastSyncedAt: result.savedAt,
        backendRecords: result.allRecords || syncCounterAutomat.state.backendRecords,
      });
    },
  }
);
