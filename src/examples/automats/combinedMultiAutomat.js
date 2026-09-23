import { Automat } from '../../lib/index.js';

/**
 * Simulated delayed API #1: User Stats (~700ms latency)
 */
export async function fetchUserStats(delayMs = 700) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return {
    name: 'Sarah Connor',
    handle: '@sconnor_ops',
    avatar: '🛡️',
    level: 'Tier-1 Defense Architect',
    deploymentsCount: 94,
    uptimeRating: '99.98%',
    lastAuditScore: '98/100',
    fetchedAt: new Date().toLocaleTimeString(),
  };
}

/**
 * Simulated delayed API #2: System Metrics & Events (~1300ms latency)
 */
export async function fetchSystemMetrics(delayMs = 1300) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return {
    clusterHealth: 'Healthy',
    activeNodes: 16,
    avgResponseMs: 19,
    events: [
      { id: 1, type: 'firewall', text: 'Firewall updated: VPC ingress port 8443 opened', time: '2m ago' },
      { id: 2, type: 'kernel', text: 'Kernel security patch automat_v0.1.0 verified', time: '14m ago' },
      { id: 3, type: 'backup', text: 'Automated disk snapshot created (3.2 GB)', time: '40m ago' },
    ],
    fetchedAt: new Date().toLocaleTimeString(),
  };
}

/**
 * Automat A: User Stats (Delayed API)
 */
export const userStatsAutomat = new Automat(
  {
    status: 'idle', // 'idle' | 'pending' | 'success' | 'error'
    data: null,
    error: null,
    delayMs: 700,
    fetchCount: 0,
  },
  {
    reset() {
      userStatsAutomat.setState({ status: 'idle', data: null, error: null });
    },
  },
  {
    name: 'user_stats_multi',
    persist: false,
    loader: async (automat) => {
      const { delayMs, fetchCount } = automat.state;
      const data = await fetchUserStats(delayMs);
      return { data, fetchCount: fetchCount + 1 };
    },
  }
);

/**
 * Automat B: System Metrics (Delayed API)
 */
export const systemMetricsAutomat = new Automat(
  {
    status: 'idle', // 'idle' | 'pending' | 'success' | 'error'
    data: null,
    error: null,
    delayMs: 1300,
    fetchCount: 0,
  },
  {
    reset() {
      systemMetricsAutomat.setState({ status: 'idle', data: null, error: null });
    },
  },
  {
    name: 'system_metrics_multi',
    persist: false,
    loader: async (automat) => {
      const { delayMs, fetchCount } = automat.state;
      const data = await fetchSystemMetrics(delayMs);
      return { data, fetchCount: fetchCount + 1 };
    },
  }
);

/**
 * Automat C: Combined Dashboard Automat
 *
 * Combines `userStatsAutomat` and `systemMetricsAutomat`.
 *
 * Invariants:
 * 1. If accessed when both upstreams are idle:
 *    Triggers BOTH upstreams to fetch concurrently in parallel.
 *    Tracks live progress (0/2 -> 1/2 -> 2/2) and transitions to 'success'
 *    when both finish (total time ~1300ms instead of 2000ms sequential).
 * 2. If accessed when both upstreams were ALREADY loaded earlier:
 *    Resolves INSTANTLY in the component constructor!
 *    State has `status: 'success'` and complete data on the 1st render (no 2nd render).
 */
export const combinedDashboardAutomat = Automat.combine(
  [userStatsAutomat, systemMetricsAutomat],
  (statsState, metricsState) => {
    const statsDone = statsState?.status === 'success';
    const metricsDone = metricsState?.status === 'success';
    const doneCount = (statsDone ? 1 : 0) + (metricsDone ? 1 : 0);

    return {
      stats: statsState?.data || null,
      metrics: metricsState?.data || null,
      statsStatus: statsState?.status || 'idle',
      metricsStatus: metricsState?.status || 'idle',
      doneCount,
      totalCount: 2,
      progressText: `${doneCount}/2 sources resolved`,
      lastCombinedAt: new Date().toLocaleTimeString(),
    };
  },
  {
    name: 'combined_dashboard',
    persist: false,
  }
);

/**
 * Helper to reset all three automats back to idle for testing.
 */
export function resetMultiApiDemo() {
  userStatsAutomat.actions.reset();
  systemMetricsAutomat.actions.reset();
  combinedDashboardAutomat.setState({
    status: 'idle',
    stats: null,
    metrics: null,
    statsStatus: 'idle',
    metricsStatus: 'idle',
    doneCount: 0,
    totalCount: 2,
    progressText: '0/2 sources resolved',
  });
}
