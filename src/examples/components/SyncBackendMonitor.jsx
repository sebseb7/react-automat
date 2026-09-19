import { PureComponent } from 'react';
import { syncCounterAutomat } from '../automats/syncCounterAutomat.js';

/**
 * SyncBackendMonitor — right column.
 *
 * Observes syncCounterAutomat and inspects the real-time server database state
 * and HTTP POST payloads transmitted during auto-sync.
 */
class SyncBackendMonitor extends PureComponent {
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

  render() {
    const { index, count, syncStatus, lastSyncedAt, backendRecords } = this.state;
    const isSyncing = syncStatus === 'syncing';

    return (
      <div className="card card-display">
        <div className="card-header">
          <span className="card-icon">📡</span>
          <h3>Backend Server Database Monitor</h3>
          <span className="badge badge-api">POST /api/counter</span>
        </div>

        <div className="card-body">
          {/* Last Transmitted Payload */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
              HTTP POST Payload (Sent Automatically on Change):
            </span>
            <div style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <div style={{ color: 'var(--text-3)', marginBottom: 4 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>POST</span> /api/counter
              </div>
              <div style={{ color: isSyncing ? 'var(--orange)' : 'var(--aqua)' }}>
                {JSON.stringify({ index, count }, null, 2)}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: isSyncing ? 'var(--orange)' : 'var(--green)', borderTop: '1px solid var(--surface-2)', paddingTop: 4 }}>
                {isSyncing ? '⏳ Transmitting request to server…' : `✓ 200 OK — Saved at ${lastSyncedAt}`}
              </div>
            </div>
          </div>

          {/* Server-Side Database Records across all indexes */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
              Backend Server Database (Persisted Records):
            </span>
            <div style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '8px 12px', maxHeight: 120, overflowY: 'auto' }}>
              {backendRecords && backendRecords.length > 0 ? (
                backendRecords.map((rec) => {
                  const isActive = rec.index === index;
                  return (
                    <div
                      key={rec.index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 0',
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                        borderBottom: '1px solid var(--surface-2)',
                        color: isActive ? 'var(--accent)' : 'var(--text-2)',
                        fontWeight: isActive ? 700 : 400,
                      }}
                    >
                      <span>
                        {isActive ? '▸ ' : '  '}Index #{rec.index}
                      </span>
                      <span>
                        Server Count: <strong>{rec.count}</strong>
                      </span>
                      <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
                        {rec.updatedAt}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-3)', fontSize: 12, padding: '4px 0' }}>
                  No backend records yet.
                </div>
              )}
            </div>
          </div>

          {/* Code Snippet */}
          <div className="code-snippet">
            <pre>{`// Component rendering API-backed automat state:
class SyncBackendMonitor extends PureComponent {
  componentDidMount() {
    // Re-renders automatically on both optimistic update and POST resolution!
    this.unsubscribe = syncCounterAutomat.subscribe(this);
  }
}`}</pre>
          </div>
        </div>
      </div>
    );
  }
}

export default SyncBackendMonitor;
