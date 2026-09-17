import { PureComponent } from 'react';
import { syncCounterAutomat } from '../automats/syncCounterAutomat.js';

/**
 * SyncCounterControls — left column.
 *
 * Controls the indexed counter. Every mutation optimistically updates the UI
 * and automatically dispatches an HTTP POST /api/counter in the background.
 */
class SyncCounterControls extends PureComponent {
  constructor(props) {
    super(props);
    this.state = syncCounterAutomat.state;
  }

  componentDidMount() {
    this.unsubscribe = syncCounterAutomat.subscribe(this);
  }

  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  }

  handleIncrement = (step = 1) => {
    syncCounterAutomat.actions.increment(step);
  };

  handleDecrement = (step = 1) => {
    syncCounterAutomat.actions.decrement(step);
  };

  handleReset = () => {
    syncCounterAutomat.actions.reset();
  };

  handleIndexChange = (idx) => {
    syncCounterAutomat.actions.setIndex(idx);
  };

  render() {
    const { index, count, syncStatus, lastSyncedAt, error } = this.state;
    const isSyncing = syncStatus === 'syncing';

    return (
      <div className="card">
        <div className="card-header">
          <span className="card-icon">🔄</span>
          <h3>Auto-Sync Indexed Counter</h3>
          <span className={`badge ${isSyncing ? 'badge-cascade' : 'badge-local'}`}>
            {isSyncing ? 'POST syncing…' : 'POST synced'}
          </span>
        </div>

        <div className="card-body">
          {/* Index Selector */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
              Select Counter Index:
            </span>
            <div className="segmented-control">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`seg-btn ${index === i ? 'active' : ''}`}
                  onClick={() => this.handleIndexChange(i)}
                  disabled={isSyncing}
                >
                  Counter #{i}
                </button>
              ))}
            </div>
          </div>

          {/* Current Value Display */}
          <div className="ctrl-current-value" style={{ marginBottom: 14 }}>
            <span className="ctrl-current-label">Counter #{index} (Local UI Value)</span>
            <span className="ctrl-current-num">{count}</span>
          </div>

          {/* Action Buttons */}
          <div className="counter-controls" style={{ gap: 14, marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn-circle btn-secondary"
              onClick={() => this.handleDecrement(1)}
              aria-label="Decrement"
            >
              −
            </button>
            <button
              type="button"
              className="btn btn-circle btn-primary"
              onClick={() => this.handleIncrement(1)}
              aria-label="Increment"
            >
              +
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => this.handleIncrement(5)}
            >
              +5 Quick Add
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={this.handleReset}
            >
              Reset to 0
            </button>
          </div>

          {/* Sync Status Banner */}
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--surface-0)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isSyncing ? (
                <>
                  <span className="spinner-sm" />
                  <span style={{ color: 'var(--orange)' }}>POST /api/counter in flight…</span>
                </>
              ) : (
                <>
                  <span style={{ color: 'var(--green)' }}>✓</span>
                  <span style={{ color: 'var(--text-2)' }}>Backend in sync</span>
                </>
              )}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontSize: 11 }}>
              {lastSyncedAt}
            </span>
          </div>

          {error && (
            <div className="weather-error" style={{ marginBottom: 12 }}>
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Code Snippet */}
          <div className="code-snippet">
            <pre>{`// Optimistic local update + automatic background POST sync:
async increment(step = 1) {
  const next = syncCounterAutomat.state.count + step;
  syncCounterAutomat.setState({ count: next, syncStatus: 'syncing' });

  // Auto-sync via HTTP POST /api/counter:
  const res = await fetch('/api/counter', {
    method: 'POST',
    body: JSON.stringify({ index, count: next }),
  });
  syncCounterAutomat.setState({ syncStatus: 'synced' });
}`}</pre>
          </div>
        </div>
      </div>
    );
  }
}

export default SyncCounterControls;
