import { PureComponent } from 'react';
import { profileAsyncAutomat } from '../automats/profileAsyncAutomat.js';

/**
 * AsyncApiPrimaryView — Left column of Section 06.
 *
 * Demonstrates:
 * 1. Initial access to an asynchronous Automat: constructor calls `profileAsyncAutomat.getData()`.
 * 2. On first mount when data is not yet loaded, status is 'pending'.
 * 3. The component renders `pending` (Render #1).
 * 4. In `componentDidMount()`, it subscribes to updates.
 * 5. When the simulated API fetch completes, `setState` runs and the component renders again (Render #2).
 */
export default class AsyncApiPrimaryView extends PureComponent {
  _renderCount = 0;
  _constructorStatus = 'uninitialized';

  constructor(props) {
    super(props);
    // 1. Initial read in constructor triggers the async loader if idle:
    this.state = profileAsyncAutomat.getData();
    this._constructorStatus = this.state.status;
  }

  componentDidMount() {
    // 2. Subscribe to receive update when API fetch completes:
    this.unsubscribe = profileAsyncAutomat.subscribe(this);
  }

  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  }

  handleReload = () => {
    profileAsyncAutomat.reload();
  };

  handleReset = () => {
    profileAsyncAutomat.actions.reset();
  };

  handleSimulateError = () => {
    profileAsyncAutomat.actions.triggerError();
  };

  handleDelayChange = (ms) => {
    profileAsyncAutomat.actions.setDelay(ms);
  };

  render() {
    this._renderCount++;
    const { status, data, error, delayMs, fetchCount, lastFetchedAt } = this.state;

    return (
      <div className="card">
        <div className="card-header">
          <span className="card-icon">⚡</span>
          <h3>Primary API Consumer</h3>
          <span className="badge badge-api">Constructor getData()</span>
        </div>

        <div className="card-body">
          {/* Diagnostic render & constructor status bar */}
          <div className="hybrid-state-bar" style={{ marginBottom: 14 }}>
            <div className="state-item">
              <div className="state-item-header">
                <span className="state-tag-automat">Mount Renders</span>
                <span>Render Count</span>
              </div>
              <span className="state-item-val" style={{ color: this._renderCount === 2 ? 'var(--green)' : 'var(--accent)' }}>
                #{this._renderCount}
                <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, color: 'var(--text-3)' }}>
                  ({this._renderCount === 1 ? '1st: Pending' : '2nd: Completed'})
                </span>
              </span>
            </div>

            <div className="state-item">
              <div className="state-item-header">
                <span className="state-tag-local">Constructor Read</span>
                <span>Initial Status</span>
              </div>
              <span className="state-item-val" style={{ color: this._constructorStatus === 'pending' ? 'var(--orange)' : 'var(--green)' }}>
                {this._constructorStatus}
              </span>
            </div>
          </div>

          {/* Main Visual Display Area */}
          <div
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              padding: '20px',
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            {/* Status: IDLE */}
            {status === 'idle' && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>💤</span>
                <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
                  Cache Cleared (State: Idle)
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
                  Calling <code className="inline-code">getData()</code> will launch the delayed API request.
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={this.handleReload}
                >
                  Fetch Profile Now ({delayMs}ms delay)
                </button>
              </div>
            )}

            {/* Status: PENDING */}
            {status === 'pending' && (
              <div style={{ padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div className="spinner-gruvbox" />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--orange)', fontSize: 14 }}>
                      Simulating API fetch... ({delayMs}ms delay)
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      Constructor received <code className="inline-code">status: 'pending'</code>. Rendering 1st pass.
                    </div>
                  </div>
                </div>

                {/* Animated Gruvbox skeleton loaders */}
                <div className="skeleton-bar" style={{ width: '45%', height: 16, marginBottom: 10 }} />
                <div className="skeleton-bar" style={{ width: '85%', height: 12, marginBottom: 8 }} />
                <div className="skeleton-bar" style={{ width: '65%', height: 12, marginBottom: 14 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="skeleton-bar" style={{ width: 60, height: 20, borderRadius: 'var(--r-sm)' }} />
                  <div className="skeleton-bar" style={{ width: 80, height: 20, borderRadius: 'var(--r-sm)' }} />
                  <div className="skeleton-bar" style={{ width: 70, height: 20, borderRadius: 'var(--r-sm)' }} />
                </div>
              </div>
            )}

            {/* Status: ERROR */}
            {status === 'error' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>⚠️</span>
                <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>
                  API Fetch Failed
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 14 }}>
                  {error}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={this.handleReload}
                >
                  Retry Fetch
                </button>
              </div>
            )}

            {/* Status: SUCCESS */}
            {status === 'success' && data && (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 34, lineHeight: 1 }}>{data.avatar}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-bright)' }}>
                        {data.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {data.handle} · <span style={{ color: 'var(--aqua)' }}>{data.role}</span>
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: 10 }}>
                    200 OK
                  </span>
                </div>

                <div
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    padding: '10px 12px',
                    fontSize: 12,
                    color: 'var(--text-2)',
                    marginBottom: 12,
                    fontStyle: 'italic',
                  }}
                >
                  &ldquo;{data.statusMessage}&rdquo;
                </div>

                {/* Quota bar & latency ping */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div style={{ background: 'var(--surface-1)', padding: '8px 10px', borderRadius: 'var(--r-sm)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>
                      Cloud Quota ({data.quota.used}/{data.quota.total} {data.quota.unit})
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(data.quota.used / data.quota.total) * 100}%`,
                          background: 'var(--accent)',
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ background: 'var(--surface-1)', padding: '8px 10px', borderRadius: 'var(--r-sm)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Cluster Latency</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
                      ⚡ {data.pingMs}ms <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)' }}>to internal VPC</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {data.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10,
                        padding: '2px 7px',
                        background: 'var(--surface-2)',
                        borderRadius: 'var(--r-sm)',
                        color: 'var(--text-2)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Latency Simulator & Control Actions */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>Simulated Network Latency:</span>
              <strong style={{ color: 'var(--accent)' }}>{delayMs}ms</strong>
            </div>
            <div className="segmented-control" style={{ width: '100%', display: 'flex' }}>
              <button
                type="button"
                className={`seg-btn ${delayMs === 300 ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => this.handleDelayChange(300)}
              >
                Fast (300ms)
              </button>
              <button
                type="button"
                className={`seg-btn ${delayMs === 800 ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => this.handleDelayChange(800)}
              >
                Normal (800ms)
              </button>
              <button
                type="button"
                className={`seg-btn ${delayMs === 1800 ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => this.handleDelayChange(1800)}
              >
                Slow (1.8s)
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              id="btn-primary-refetch"
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={this.handleReload}
            >
              🔄 Force Reload
            </button>
            <button
              id="btn-primary-reset"
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={this.handleReset}
            >
              🗑️ Clear Cache (Idle)
            </button>
            <button
              id="btn-primary-error"
              type="button"
              className="btn btn-secondary"
              title="Simulate 504 Timeout"
              onClick={this.handleSimulateError}
            >
              💥 Timeout
            </button>
          </div>

          {/* Footer Metadata */}
          <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
            <span>API Fetch Calls: <strong style={{ color: 'var(--text-1)' }}>{fetchCount}</strong></span>
            <span>Last Sync: <strong style={{ color: 'var(--text-1)' }}>{lastFetchedAt || 'Never'}</strong></span>
          </div>
        </div>
      </div>
    );
  }
}
