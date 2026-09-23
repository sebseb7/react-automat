import { PureComponent } from 'react';
import { profileAsyncAutomat } from '../automats/profileAsyncAutomat.js';

let secondaryMountSequence = 0;
const mountHistoryLog = [];

/**
 * Secondary Consumer Component.
 * Unmounted and remounted by the parent collapsible toggle.
 *
 * Demonstrates:
 * When this component mounts while data is already in memory:
 * 1. `profileAsyncAutomat.getData()` returns { status: 'success', data } synchronously in `constructor()`.
 * 2. 1st render displays final data immediately with ZERO delay.
 * 3. `componentDidMount()` subscribes, but no state changes occur.
 * 4. RENDER COUNT STAYS AT 1! No 2nd render is necessary!
 */
class SecondaryProfileConsumer extends PureComponent {
  _renderCount = 0;
  _constructorStatus = 'uninitialized';
  _mountId = 0;

  constructor(props) {
    super(props);
    this._mountId = ++secondaryMountSequence;

    // 1. 💡 Synchronous read in constructor:
    this.state = profileAsyncAutomat.getData();
    this._constructorStatus = this.state.status;

    mountHistoryLog.unshift({
      mountId: this._mountId,
      time: new Date().toLocaleTimeString(),
      statusInConstructor: this._constructorStatus,
      hadDataImmediately: this._constructorStatus === 'success',
    });
  }

  componentDidMount() {
    // 2. Subscribe for updates (e.g. if Primary triggers a refetch or reset):
    this.unsubscribe = profileAsyncAutomat.subscribe(this);
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  render() {
    this._renderCount++;
    const { status, data } = this.state;
    const isSingleRenderSuccess = this._renderCount === 1 && status === 'success';

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
        {/* Mount Diagnostic Bar */}
        <div className="hybrid-state-bar" style={{ marginBottom: 14 }}>
          <div className="state-item">
            <div className="state-item-header">
              <span className="state-tag-automat">Lifecycle Stats</span>
              <span>Session Mount</span>
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
            <span className="state-item-val" style={{ color: this._renderCount === 1 ? 'var(--green)' : 'var(--orange)' }}>
              #{this._renderCount}
              <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, color: 'var(--text-3)' }}>
                {this._renderCount === 1 ? '(Single render!)' : '(Pending + Complete)'}
              </span>
            </span>
          </div>
        </div>

        {/* Big visual banner when 0 second renders occurred */}
        {isSingleRenderSuccess && (
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
              Zero 2nd render! Data was resolved in the constructor (<code className="inline-code">status: &apos;success&apos;</code>).
            </span>
          </div>
        )}

        {/* Content View */}
        {status === 'pending' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="spinner-gruvbox" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: 13, color: 'var(--orange)' }}>Loading API in background...</div>
          </div>
        )}

        {status === 'idle' && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-3)', fontSize: 13 }}>
            Automat is currently idle. (Open primary view or click refetch).
          </div>
        )}

        {status === 'success' && data && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 26 }}>{data.avatar}</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                  {data.name} <span style={{ fontSize: 12, color: 'var(--text-3)' }}>({data.handle})</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--aqua)' }}>{data.role}</div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--surface-1)', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
              Connected to: <code className="inline-code">{data.endpoint}</code> (Ping: <strong style={{ color: 'var(--green)' }}>{data.pingMs}ms</strong>)
            </div>
          </div>
        )}
      </div>
    );
  }
}

/**
 * AsyncApiCollapsibleView — Right column of Section 06.
 *
 * Provides a collapsible panel that dynamically mounts and unmounts the
 * `SecondaryProfileConsumer` component.
 */
export default class AsyncApiCollapsibleView extends PureComponent {
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
    const automatState = profileAsyncAutomat.state;

    return (
      <div className="card">
        <div className="card-header">
          <span className="card-icon">📂</span>
          <h3>Collapsible Consumer (Unmount Test)</h3>
          <span className="badge badge-cascade">No 2nd Render</span>
        </div>

        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
            Toggle the collapsible below to <strong>completely unmount and remount</strong> this
            component. When data is already loaded in <code className="inline-code">profileAsyncAutomat</code>,
            its constructor immediately receives the cached payload — rendering in <strong>1 render with no 2nd render</strong>.
          </p>

          {/* Current Automat Status Hint */}
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
              Automat Cache State:
            </span>
            <span
              className={`badge ${
                automatState.status === 'success'
                  ? 'badge-success'
                  : automatState.status === 'pending'
                  ? 'badge-api'
                  : 'badge-cascade'
              }`}
            >
              {automatState.status.toUpperCase()}
              {automatState.status === 'success' ? ' (Data Ready)' : ''}
            </span>
          </div>

          {/* Collapsible Toggle Button */}
          <button
            id="btn-toggle-collapsible-consumer"
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
                ? 'Unmount Secondary Component (Collapse)'
                : 'Mount Secondary Component (Expand)'}
            </span>
          </button>

          {/* Dynamically Mounted Child Component */}
          {isMounted ? (
            <SecondaryProfileConsumer />
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
              Component is currently <strong>UNMOUNTED</strong> from the React tree.
              <br />
              Click the button above to mount it and observe the constructor read.
            </div>
          )}

          {/* Session Mount History Log */}
          {mountHistoryLog.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
                Session Mount History:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 110, overflowY: 'auto' }}>
                {mountHistoryLog.slice(0, 5).map((entry) => (
                  <div
                    key={entry.mountId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--surface-0)',
                      padding: '4px 8px',
                      borderRadius: 'var(--r-sm)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span>Mount #{entry.mountId} ({entry.time})</span>
                    <span style={{ color: entry.hadDataImmediately ? 'var(--green)' : 'var(--orange)' }}>
                      {entry.hadDataImmediately ? '⚡ 1 render (instant)' : '⏳ 2 renders (pending)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}
