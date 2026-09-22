import { PureComponent } from 'react';
import { combinedDashboardAutomat } from '../automats/combinedMultiAutomat.js';

let combinedMountCounter = 0;

/**
 * CombinedDashboardView — dynamically mounted child component.
 *
 * Demonstrates:
 * 1. If upstreams were already fetched earlier:
 *    Constructor immediately receives { status: 'success', stats, metrics }.
 *    Renders in 1 render with 0ms delay!
 * 2. If upstreams were idle:
 *    Constructor receives { status: 'pending' }, triggering both in parallel.
 *    Renders progress (0/2 -> 1/2 -> 2/2) and then the complete dashboard.
 */
class CombinedDashboardView extends PureComponent {
  _renderCount = 0;
  _constructorStatus = 'uninitialized';
  _mountId = 0;

  constructor(props) {
    super(props);
    this._mountId = ++combinedMountCounter;

    // 1. Synchronous read in constructor:
    this.state = combinedDashboardAutomat.getData();
    this._constructorStatus = this.state.status;
  }

  componentDidMount() {
    this.unsubscribe = combinedDashboardAutomat.subscribe(this);
  }

  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  }

  render() {
    this._renderCount++;
    const {
      status,
      stats,
      metrics,
      statsStatus,
      metricsStatus,
      doneCount,
      totalCount,
      progressText,
    } = this.state;

    const isInstantSuccess = this._constructorStatus === 'success' && this._renderCount === 1;

    return (
      <div
        style={{
          background: 'var(--surface-0)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '18px',
          marginTop: 12,
        }}
      >
        {/* Diagnostic Bar */}
        <div className="hybrid-state-bar" style={{ marginBottom: 14 }}>
          <div className="state-item">
            <div className="state-item-header">
              <span className="state-tag-automat">Dashboard Mount</span>
              <span>Mount Number</span>
            </div>
            <span className="state-item-val" style={{ color: 'var(--accent)' }}>
              Mount #{this._mountId}
            </span>
          </div>

          <div className="state-item">
            <div className="state-item-header">
              <span className="state-tag-local">Render Efficiency</span>
              <span>Renders this Mount</span>
            </div>
            <span
              className="state-item-val"
              style={{ color: this._renderCount === 1 ? 'var(--green)' : 'var(--orange)' }}
            >
              #{this._renderCount}
              <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, color: 'var(--text-3)' }}>
                {this._renderCount === 1 ? '(Single render!)' : `(Progressive update)`}
              </span>
            </span>
          </div>
        </div>

        {/* Instant Constructor Resolution Callout */}
        {isInstantSuccess && (
          <div
            style={{
              background: 'rgba(184, 187, 38, 0.15)',
              border: '1px solid rgba(184, 187, 38, 0.4)',
              borderRadius: 'var(--r-md)',
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--green)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <span>⚡</span>
            <span>
              <strong>Instant Resolution!</strong> Both upstreams were already in memory. Constructor received full payload immediately — <strong>1 render total</strong>!
            </span>
          </div>
        )}

        {/* Pending / Concurrent Loading Dual Progress View */}
        {status === 'pending' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="spinner-gruvbox" style={{ width: 14, height: 14 }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--orange)' }}>
                  Loading dual sources in parallel...
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {progressText || `${doneCount || 0}/${totalCount || 2} loaded`}
              </span>
            </div>

            {/* Dual Source Progress Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  background: 'var(--surface-1)',
                  padding: '8px 10px',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Source A (Stats, ~700ms)</div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: statsStatus === 'success' ? 'var(--green)' : 'var(--orange)',
                  }}
                >
                  {statsStatus === 'success' ? '✅ Loaded' : '⏳ Fetching...'}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--surface-1)',
                  padding: '8px 10px',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Source B (Metrics, ~1300ms)</div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: metricsStatus === 'success' ? 'var(--green)' : 'var(--orange)',
                  }}
                >
                  {metricsStatus === 'success' ? '✅ Loaded' : '⏳ Fetching...'}
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${((doneCount || 0) / (totalCount || 2)) * 100}%`,
                  background: 'var(--accent)',
                  transition: 'width 0.25s ease',
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        )}

        {/* Combined Dashboard View (Success) */}
        {status === 'success' && stats && metrics && (
          <div>
            {/* Merged Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--surface-1)',
                padding: '10px 14px',
                borderRadius: 'var(--r-md)',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{stats.avatar}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-bright)' }}>
                    {stats.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--aqua)' }}>{stats.level}</div>
                </div>
              </div>
              <span className="badge badge-success" style={{ fontSize: 10 }}>
                Combined 200 OK
              </span>
            </div>

            {/* Quick Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              <div style={{ background: 'var(--surface-1)', padding: '8px', borderRadius: 'var(--r-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Deployments</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{stats.deploymentsCount}</div>
              </div>
              <div style={{ background: 'var(--surface-1)', padding: '8px', borderRadius: 'var(--r-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Uptime</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{stats.uptimeRating}</div>
              </div>
              <div style={{ background: 'var(--surface-1)', padding: '8px', borderRadius: 'var(--r-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Active Nodes</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{metrics.activeNodes}</div>
              </div>
            </div>

            {/* Recent Events from Source B */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
              Live Infrastructure Events (from Source B):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {metrics.events.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    background: 'var(--surface-1)',
                    padding: '5px 8px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: 'var(--text-2)' }}>{evt.text}</span>
                  <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{evt.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}

/**
 * MultiApiCombinedDashboard — Right column of Section 07.
 *
 * Provides a collapsible panel to mount and unmount the combined dashboard.
 */
export default class MultiApiCombinedDashboard extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isMounted: false,
    };
  }

  toggleMount = () => {
    this.setState((prev) => ({ isMounted: !prev.isMounted }));
  };

  render() {
    const { isMounted } = this.state;
    const combinedState = combinedDashboardAutomat.state;

    return (
      <div className="card">
        <div className="card-header">
          <span className="card-icon">⚡</span>
          <h3>Combined Dashboard Automat</h3>
          <span className="badge badge-success">Automat.combine()</span>
        </div>

        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
            Combines two upstream automats. If both are already loaded, accessing this
            automat resolves <strong>instantly in constructor with 1 render</strong>. If not, it triggers
            both to load concurrently in parallel.
          </p>

          {/* Current Upstream Status Indicator */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--surface-0)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '8px 12px',
              fontSize: 12,
              marginBottom: 14,
            }}
          >
            <span style={{ color: 'var(--text-3)' }}>
              Upstream Readiness:
            </span>
            <span
              className={`badge ${
                combinedState.status === 'success'
                  ? 'badge-success'
                  : combinedState.status === 'pending'
                  ? 'badge-api'
                  : 'badge-cascade'
              }`}
            >
              {combinedState.status === 'success'
                ? 'BOTH READY (Instant Constructor)'
                : combinedState.status === 'pending'
                ? 'SYNCING UPSTREAMS'
                : 'IDLE (Will trigger parallel fetch)'}
            </span>
          </div>

          {/* Mount / Unmount Toggle Button */}
          <button
            id="btn-toggle-combined-dashboard"
            type="button"
            className="btn"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 16px',
              background: isMounted ? 'var(--surface-2)' : 'var(--accent)',
              color: isMounted ? 'var(--text-1)' : 'var(--text-dark)',
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
            }}
            onClick={this.toggleMount}
          >
            <span>{isMounted ? '🔼' : '🔽'}</span>
            <span>
              {isMounted
                ? 'Unmount Combined Dashboard (Collapse)'
                : 'Mount Combined Dashboard (Expand)'}
            </span>
          </button>

          {/* Mounted View or Unmounted Hint */}
          {isMounted ? (
            <CombinedDashboardView />
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '28px 16px',
                color: 'var(--text-3)',
                fontSize: 12,
                fontStyle: 'italic',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--r-lg)',
                marginTop: 12,
              }}
            >
              Dashboard component is currently <strong>UNMOUNTED</strong>.
              <br />
              Click the button above to mount and inspect constructor resolution.
            </div>
          )}
        </div>
      </div>
    );
  }
}
