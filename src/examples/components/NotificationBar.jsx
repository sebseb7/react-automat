import { PureComponent } from 'react';
import notificationAutomat from '../automats/notificationAutomat.js';

/**
 * NotificationBar — right column of Section 02 (Notification Cascade).
 *
 * HYBRID STATE PATTERN:
 * - Shared state: `messages` from notificationAutomat (derived from counterAutomat via cascade).
 * - Local state: `filter` ('all' | 'positive' | 'negative') private to this component.
 *
 * Displays the resulting notifications in real-time.
 */
class NotificationBar extends PureComponent {
  constructor(props) {
    super(props);
    // Hybrid initialization:
    this.state = {
      // 1. Initialized directly from automat:
      messages: notificationAutomat.state.messages,
      // 2. Component-local filter state:
      filter: 'all',
    };
  }

  componentDidMount() {
    // Subscriber handling for React lifecycle
    this.unsubscribe = notificationAutomat.subscribe(this);
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  handleFilterChange = (filter) => {
    // Purely local state update
    this.setState({ filter });
  };

  render() {
    const { messages, filter } = this.state;

    const filteredMessages = messages.filter((m) => {
      if (filter === 'positive') return m.count >= 0;
      if (filter === 'negative') return m.count < 0;
      return true;
    });

    return (
      <div className="card">
        <div className="card-header">
          <span className="card-icon">🔔</span>
          <h3>Notification Stream</h3>
          <span className="badge badge-cascade">downstream</span>
          {messages.length > 0 && (
            <span className="notif-count-badge">{messages.length} total</span>
          )}
        </div>

        <div className="card-body">
          {/* Hybrid state display */}
          <div className="hybrid-state-bar">
            <div className="state-item">
              <div className="state-item-header">
                <span className="state-tag-automat">cascade</span>
                <span>items in stream</span>
              </div>
              <span className="state-item-val">{messages.length}</span>
            </div>
            <div className="state-item">
              <div className="state-item-header">
                <span className="state-tag-local">local</span>
                <span>active filter</span>
              </div>
              <span className="state-item-val">{filter.toUpperCase()}</span>
            </div>
          </div>

          {/* Local filter control */}
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Filter stream <span className="state-tag-local">local</span>
            </span>
            <div className="segmented-control" role="group" aria-label="Notification filter">
              {['all', 'positive', 'negative'].map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`seg-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => this.handleFilterChange(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredMessages.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 140 }}>
              <span className="empty-state-icon">💤</span>
              <p>No notifications matching "{filter}".</p>
              <p className="empty-state-sub">Trigger counter changes to see cascade notifications.</p>
            </div>
          ) : (
            <ul className="notification-list" aria-live="polite" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {filteredMessages.map((msg) => (
                <li key={msg.id} className="notification-item">
                  <span className="notif-time">{msg.time}</span>
                  <span className="notif-text">{msg.text}</span>
                  <span
                    className="notif-count-pill"
                    style={{
                      background: msg.count >= 0 ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {msg.count}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="code-snippet" style={{ marginTop: 16 }}>
            <pre>{`// 4. Downstream component consumes the cascade:
class NotificationBar extends PureComponent {
  constructor(props) {
    super(props);
    // Reads directly from downstream notificationAutomat:
    this.state = {
      messages: notificationAutomat.state.messages, // ← derived from cascade
      filter: 'all',                                // ← component-local state
    };
  }

  componentDidMount() {
    // Re-renders automatically whenever the cascade emits new messages:
    this.unsub = notificationAutomat.subscribe(this);
  }

  componentWillUnmount() {
    this.unsub();
  }

  render() {
    const { messages, filter } = this.state;
    return <ul>{messages.map((m) => <li key={m.id}>{m.text}</li>)}</ul>;
  }
}`}</pre>
          </div>
        </div>
      </div>
    );
  }
}

export default NotificationBar;
