import { PureComponent } from 'react';
import {
  userStatsAutomat,
  systemMetricsAutomat,
  resetMultiApiDemo,
} from '../automats/combinedMultiAutomat.js';

/**
 * MultiApiIndividualControls — Left column of Section 07.
 *
 * Controls and monitors the two individual upstream automats:
 * 1. userStatsAutomat (delayed API, ~700ms)
 * 2. systemMetricsAutomat (delayed API, ~1300ms)
 */
export default class MultiApiIndividualControls extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      stats: userStatsAutomat.state,
      metrics: systemMetricsAutomat.state,
    };
  }

  componentDidMount() {
    this.unsubStats = userStatsAutomat.subscribe((stats) => {
      this.setState({ stats });
    });
    this.unsubMetrics = systemMetricsAutomat.subscribe((metrics) => {
      this.setState({ metrics });
    });
  }

  componentWillUnmount() {
    if (this.unsubStats) this.unsubStats();
    if (this.unsubMetrics) this.unsubMetrics();
  }

  handleFetchStats = () => {
    userStatsAutomat.getData({ reload: true });
  };

  handleFetchMetrics = () => {
    systemMetricsAutomat.getData({ reload: true });
  };

  handleResetAll = () => {
    resetMultiApiDemo();
  };

  render() {
    const { stats, metrics } = this.state;

    return (
      <div className="card">
        <div className="card-header">
          <span className="card-icon">🧩</span>
          <h3>Individual Delayed Automats</h3>
          <span className="badge badge-api">2 Upstream APIs</span>
        </div>

        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
            Two independent automats with simulated delayed APIs. You can trigger each individually,
            or let the combined automat trigger both concurrently.
          </p>

          {/* Upstream A: User Stats */}
          <div
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '12px 14px',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>🛡️</span>
                <strong style={{ fontSize: 13, color: 'var(--text-1)' }}>Automat A: User Stats</strong>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>(~700ms)</span>
              </div>
              <span
                className={`badge ${
                  stats.status === 'success'
                    ? 'badge-success'
                    : stats.status === 'pending'
                    ? 'badge-api'
                    : 'badge-cascade'
                }`}
                style={{ fontSize: 10 }}
              >
                {stats.status.toUpperCase()}
              </span>
            </div>

            {stats.status === 'pending' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12, color: 'var(--orange)' }}>
                <div className="spinner-gruvbox" style={{ width: 14, height: 14 }} />
                <span>Fetching User Stats API...</span>
              </div>
            )}

            {stats.status === 'success' && stats.data && (
              <div style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--surface-1)', padding: '6px 10px', borderRadius: 'var(--r-sm)', marginBottom: 8 }}>
                <strong style={{ color: 'var(--accent)' }}>{stats.data.name}</strong> · {stats.data.level} (Uptime: {stats.data.uptimeRating})
              </div>
            )}

            <button
              id="btn-fetch-stats"
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: 12, padding: '5px 10px' }}
              onClick={this.handleFetchStats}
            >
              {stats.status === 'success' ? '🔄 Reload Stats (~700ms)' : '▶️ Fetch Stats API (~700ms)'}
            </button>
          </div>

          {/* Upstream B: System Metrics */}
          <div
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '12px 14px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>📊</span>
                <strong style={{ fontSize: 13, color: 'var(--text-1)' }}>Automat B: System Metrics</strong>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>(~1300ms)</span>
              </div>
              <span
                className={`badge ${
                  metrics.status === 'success'
                    ? 'badge-success'
                    : metrics.status === 'pending'
                    ? 'badge-api'
                    : 'badge-cascade'
                }`}
                style={{ fontSize: 10 }}
              >
                {metrics.status.toUpperCase()}
              </span>
            </div>

            {metrics.status === 'pending' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12, color: 'var(--orange)' }}>
                <div className="spinner-gruvbox" style={{ width: 14, height: 14 }} />
                <span>Fetching System Metrics API...</span>
              </div>
            )}

            {metrics.status === 'success' && metrics.data && (
              <div style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--surface-1)', padding: '6px 10px', borderRadius: 'var(--r-sm)', marginBottom: 8 }}>
                Cluster: <strong style={{ color: 'var(--green)' }}>{metrics.data.clusterHealth}</strong> · {metrics.data.activeNodes} Nodes · {metrics.data.events.length} Events
              </div>
            )}

            <button
              id="btn-fetch-metrics"
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: 12, padding: '5px 10px' }}
              onClick={this.handleFetchMetrics}
            >
              {metrics.status === 'success' ? '🔄 Reload Metrics (~1300ms)' : '▶️ Fetch Metrics API (~1300ms)'}
            </button>
          </div>

          {/* Reset All Button */}
          <button
            id="btn-reset-multi-demo"
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', marginBottom: 14 }}
            onClick={this.handleResetAll}
          >
            🗑️ Reset Both to Idle (Clear Cache)
          </button>

          {/* Guided Testing Flow Hints */}
          <div className="info-box" style={{ marginTop: 0 }}>
            <div className="info-box-title">
              <span>💡</span> Two Verification Flows:
            </div>
            <ul style={{ fontSize: 12 }}>
              <li>
                <strong>Flow 1 (Instant Constructor Resolution):</strong> Click both fetch buttons above. Once both show <code className="inline-code">SUCCESS</code>, expand the Combined Dashboard on the right. Notice it resolves <strong>instantly in constructor with 1 render</strong>!
              </li>
              <li>
                <strong>Flow 2 (Concurrent Orchestration):</strong> Click <em>Reset Both to Idle</em>, then expand the Combined Dashboard directly. It triggers both APIs in parallel, finishing in ~1300ms total.
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}
