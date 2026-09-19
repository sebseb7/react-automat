import { PureComponent } from 'react';
import counterAutomat from '../automats/counterAutomat.js';
import notificationAutomat from '../automats/notificationAutomat.js';

/**
 * CascadeControls — left column of Section 02 (Notification Cascade).
 *
 * Demonstrates:
 * 1. Driving upstream transitions that cascade automatically into notificationAutomat.
 * 2. Hybrid state: upstream count from counterAutomat + local cascade triggers counter.
 * 3. Shows the complete wiring of `subscribeTo()`.
 */
class CascadeControls extends PureComponent {
  constructor(props) {
    super(props);
    // Hybrid initialization:
    this.state = {
      // 1. From upstream automat:
      upstreamCount: counterAutomat.state.count,
      // 2. Component-local state:
      customText: 'System heartbeat',
      cascadeFiredCount: 0,
    };
  }

  componentDidMount() {
    // Subscribe to upstream automat to display its current state
    this.unsubscribe = counterAutomat.subscribe(this, (state) => ({
      upstreamCount: state.count,
    }));
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  handleFireTrigger = (delta) => {
    this.setState((prev) => ({ cascadeFiredCount: prev.cascadeFiredCount + 1 }));
    counterAutomat.actions.increment(delta);
  };

  handleCustomNotice = () => {
    const { customText, upstreamCount } = this.state;
    this.setState((prev) => ({ cascadeFiredCount: prev.cascadeFiredCount + 1 }));
    notificationAutomat.actions.addNotice(customText, upstreamCount);
  };

  handleClear = () => {
    notificationAutomat.actions.clear();
  };

  render() {
    const { upstreamCount, customText, cascadeFiredCount } = this.state;

    return (
      <div className="card">
        <div className="card-header">
          <span className="card-icon">🌊</span>
          <h3>Cascade Trigger</h3>
          <span className="badge badge-cascade">upstream</span>
        </div>

        <div className="card-body">
          {/* Hybrid state display */}
          <div className="hybrid-state-bar">
            <div className="state-item">
              <div className="state-item-header">
                <span className="state-tag-automat">upstream</span>
                <span>counter count</span>
              </div>
              <span className="state-item-val">{upstreamCount}</span>
            </div>
            <div className="state-item">
              <div className="state-item-header">
                <span className="state-tag-local">local</span>
                <span>triggers fired</span>
              </div>
              <span className="state-item-val">{cascadeFiredCount}</span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
            Clicking a trigger button invokes <code className="inline-code">counterAutomat.actions.increment()</code>.
            Because <code className="inline-code">notificationAutomat</code> observes it with{' '}
            <code className="inline-code">subscribeTo()</code>, the downstream log derives a new
            message automatically without any component glue.
          </p>

          {/* Trigger buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <button
              id="btn-cascade-trigger-1"
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => this.handleFireTrigger(1)}
            >
              Trigger (+1)
            </button>
            <button
              id="btn-cascade-trigger-5"
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => this.handleFireTrigger(5)}
            >
              Trigger (+5)
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              type="text"
              className="input-field"
              value={customText}
              onChange={(e) => this.setState({ customText: e.target.value })}
              placeholder="Custom notification message..."
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={this.handleCustomNotice}
              style={{ whiteSpace: 'nowrap' }}
            >
              Post Notice
            </button>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-full"
            onClick={this.handleClear}
          >
            Clear Stream
          </button>

          <div className="code-snippet" style={{ marginTop: 16 }}>
            <pre>{`// Concise reactive pipeline (ternary returns null to skip, or object to update):
notificationAutomat.subscribeTo(
  counterAutomat,
  (upstream, my) =>
    upstream.count === 0
      ? null
      : {
          messages: [
            {
              id: Date.now(),
              text: \`Cascade: counter shifted to \${upstream.count}\`,
              time: new Date().toLocaleTimeString(),
              count: upstream.count,
            },
            ...my.messages.slice(0, 9),
          ],
        }
);`}</pre>
          </div>
        </div>
      </div>
    );
  }
}

export default CascadeControls;
