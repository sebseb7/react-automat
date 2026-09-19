import { PureComponent, Suspense } from 'react';
import { profileAutomat } from '../automats/profileAutomat.js';

/**
 * Component 1: Standard PureComponent without React Suspense.
 * Checks `profileAutomat.isReady` and handles loading state manually.
 */
class ProfileWithoutSuspense extends PureComponent {
  _renderCount = 0;

  constructor(props) {
    super(props);
    this.state = {
      profile: profileAutomat.state,
    };
  }

  componentDidMount() {
    this.unsubscribe = profileAutomat.subscribe(this, (state) => ({
      profile: state,
    }));
  }

  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  }

  render() {
    this._renderCount++;
    const { profile } = this.state;
    const isReady = profileAutomat.isReady && profile !== null;

    return (
      <div className="card-body" style={{ minHeight: 220 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span className="badge badge-api">Mode: Without Suspense</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Renders: <strong style={{ color: 'var(--accent)' }}>#{this._renderCount}</strong>
          </span>
        </div>

        {!isReady ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8, animation: 'spin 1s linear infinite' }}>⏳</div>
            <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>Fetching from /api/profile...</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              (isReady is false; state is in null/default state)
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: '#fff',
                fontWeight: 700
              }}>
                {profile.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 17, color: 'var(--text-1)' }}>{profile.name}</h4>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{profile.role} · {profile.department}</span>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>API Fetch Sequence: <strong>#{profile.fetchCount}</strong></span>
              <span style={{ color: 'var(--text-3)' }}>Loaded at: {profile.loadedAt}</span>
            </div>
          </div>
        )}
      </div>
    );
  }
}

/**
 * Component 2: PureComponent utilizing React Suspense via `profileAutomat.read()`.
 */
class ProfileSuspenseConsumer extends PureComponent {
  _renderCount = 0;

  componentDidMount() {
    // Subscribe to re-render when future mutations occur
    this.unsubscribe = profileAutomat.subscribe(this);
  }

  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  }

  render() {
    this._renderCount++;
    // Reads from automat — throws profileAutomat.ready if not ready!
    const profile = profileAutomat.read();

    return (
      <div className="card-body" style={{ minHeight: 220 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span className="badge badge-cascade">Mode: With React Suspense</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Renders: <strong style={{ color: 'var(--accent)' }}>#{this._renderCount}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: '#fff',
            fontWeight: 700
          }}>
            {profile?.name?.charAt(0) || 'S'}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 17, color: 'var(--text-1)' }}>{profile?.name}</h4>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{profile?.role} · {profile?.department}</span>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>API Fetch Sequence: <strong>#{profile?.fetchCount}</strong></span>
          <span style={{ color: 'var(--text-3)' }}>Loaded at: {profile?.loadedAt}</span>
        </div>
      </div>
    );
  }
}

/**
 * Fallback shown by <Suspense> while profileAutomat is unready.
 */
function SuspenseFallback() {
  return (
    <div className="card-body" style={{ minHeight: 220, textAlign: 'center', padding: '36px 0' }}>
      <div style={{ fontSize: 24, marginBottom: 8, animation: 'pulse 1.2s ease-in-out infinite' }}>⚡</div>
      <div style={{ fontWeight: 600, color: 'var(--accent-light)' }}>
        Suspended by React Suspense Fallback
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
        profileAutomat.read() threw the ready Promise; Suspense caught it!
      </div>
    </div>
  );
}

/**
 * Main Controller Component managing Tabs and Demonstrating setDirty / Unmount behaviors.
 */
export default class ApiBoundExample extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'without-suspense', // 'without-suspense' | 'with-suspense' | 'unmounted'
      logMessage: null,
      tick: 0,
    };
  }

  componentDidMount() {
    // Monitor status changes on automat
    this.unsubMonitor = profileAutomat.subscribe(() => {
      this.forceUpdate();
    });
  }

  componentWillUnmount() {
    if (this.unsubMonitor) this.unsubMonitor();
  }

  handleSetDirty = () => {
    profileAutomat.setDirty();
    const subs = profileAutomat.subscriberCount;
    if (subs > 0) {
      this.setState({
        logMessage: `setDirty() called with ${subs} subscriber(s) mounted → Immediate reload started!`,
      });
    } else {
      this.setState({
        logMessage: `setDirty() called with 0 subscribers → Reload deferred until read() or subscribe()!`,
      });
    }
  };

  handleManualRead = () => {
    try {
      const data = profileAutomat.read();
      this.setState({
        logMessage: `Manual read() called! State was ready: ${JSON.stringify(data)}`,
      });
    } catch (promiseOrErr) {
      if (typeof promiseOrErr?.then === 'function') {
        this.setState({
          logMessage: `Manual read() triggered deferred reload! Awaiting ready promise...`,
        });
        promiseOrErr.then((res) => {
          this.setState({
            logMessage: `Deferred reload finished! Data: ${res.name} (Fetch #${res.fetchCount})`,
          });
        });
      } else {
        this.setState({ logMessage: `Error: ${promiseOrErr.message}` });
      }
    }
  };

  handleAwaitReady = async () => {
    this.setState({ logMessage: 'Awaiting profileAutomat.ready...' });
    const data = await profileAutomat.ready;
    this.setState({
      logMessage: `profileAutomat.ready resolved with: ${data ? data.name : 'null'} (Fetch #${data?.fetchCount})`,
    });
  };

  handleSilentReload = async () => {
    this.setState({ logMessage: 'Silent reload() in progress (isReady remains true, no flash)...' });
    try {
      const fresh = await profileAutomat.reload();
      this.setState({
        logMessage: `Silent reload() finished! Fresh data: ${fresh.name} (Fetch #${fresh.fetchCount}) without unready flash!`,
      });
    } catch (err) {
      this.setState({ logMessage: `Reload failed: ${err.message}` });
    }
  };

  render() {
    const { activeTab, logMessage } = this.state;
    const isReady = profileAutomat.isReady;
    const isDirty = profileAutomat.isDirty;
    const subsCount = profileAutomat.subscriberCount;
    const currentState = profileAutomat.state;

    return (
      <div className="two-columns" style={{ alignItems: 'flex-start' }}>
        {/* Left Column: Tabbed Subscriber Interface */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="card-icon">🌐</span>
                <h3>Backend-Bound Automat</h3>
              </div>
              <span className="badge badge-api">url: &quot;/api/profile&quot;</span>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: 4, marginTop: 14, width: '100%', borderBottom: '1px solid var(--border)' }}>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'without-suspense' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
                onClick={() => this.setState({ activeTab: 'without-suspense' })}
              >
                1. Without Suspense
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'with-suspense' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
                onClick={() => this.setState({ activeTab: 'with-suspense' })}
              >
                2. With Suspense
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'unmounted' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
                onClick={() => this.setState({ activeTab: 'unmounted' })}
              >
                3. Unmounted Tab
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'without-suspense' && <ProfileWithoutSuspense />}

          {activeTab === 'with-suspense' && (
            <Suspense fallback={<SuspenseFallback />}>
              <ProfileSuspenseConsumer />
            </Suspense>
          )}

          {activeTab === 'unmounted' && (
            <div className="card-body" style={{ minHeight: 220, textAlign: 'center', padding: '28px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📴</div>
              <h4 style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>Subscriber Unmounted</h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', maxWidth: 360, marginInline: 'auto' }}>
                Neither subscriber is mounted. If you click <strong>Set Dirty</strong> now, state resets to null/default,
                but the backend fetch is <strong>deferred</strong> until a subscriber mounts or <code>read()</code> is called.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Invalidation & Deferred Reload Controls */}
        <div className="card card-display">
          <div className="card-header">
            <span className="card-icon">⚡</span>
            <h3>Dirty State &amp; Reload Inspector</h3>
            <span className={`badge ${isReady ? 'badge-success' : 'badge-warning'}`}>
              {isReady ? 'Ready' : 'Not Ready'}
            </span>
          </div>

          <div className="card-body">
            {/* Realtime Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', display: 'block' }}>isReady</span>
                <strong style={{ fontSize: 16, color: isReady ? 'var(--accent)' : '#f59e0b' }}>
                  {isReady ? 'true' : 'false'}
                </strong>
              </div>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', display: 'block' }}>isDirty</span>
                <strong style={{ fontSize: 16, color: isDirty ? '#ef4444' : 'var(--text-2)' }}>
                  {isDirty ? 'true' : 'false'}
                </strong>
              </div>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', display: 'block' }}>Subscribers</span>
                <strong style={{ fontSize: 16, color: subsCount > 0 ? 'var(--accent-light)' : 'var(--text-3)' }}>
                  {subsCount}
                </strong>
              </div>
            </div>

            {/* Current State Snapshot */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
                Current automat.state (resets to null when dirty):
              </span>
              <pre style={{
                margin: 0,
                padding: '10px 12px',
                fontSize: 12,
                borderRadius: 6,
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                overflowX: 'auto',
                color: currentState ? '#6ee7b7' : '#f87171'
              }}>
                {currentState ? JSON.stringify(currentState, null, 2) : 'null (unready / dirty)'}
              </pre>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={this.handleSetDirty}
                style={{ width: '100%' }}
              >
                ⚡ Call profileAutomat.setDirty() (Resets state, causes reload)
              </button>

              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={this.handleSilentReload}
                style={{ width: '100%', borderColor: 'var(--accent)', color: 'var(--accent-light)' }}
                title="Reloads data without resetting state or marking unready"
              >
                🔄 Call profileAutomat.reload() (Silent refresh, no flash)
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={this.handleManualRead}
                  style={{ flex: 1 }}
                  title="Demonstrates triggering reload via read() when unmounted"
                >
                  📖 Call read()
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={this.handleAwaitReady}
                  style={{ flex: 1 }}
                  title="Awaits profileAutomat.ready promise"
                >
                  ⏳ await ready
                </button>
              </div>
            </div>

            {/* Status Log Box */}
            {logMessage && (
              <div style={{
                fontSize: 12,
                padding: '8px 10px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 6,
                color: 'var(--text-2)'
              }}>
                💡 {logMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
