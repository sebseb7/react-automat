import { PureComponent } from 'react';
import counterAutomat from '../automats/counterAutomat.js';

/**
 * CounterDisplay — right column.
 *
 * HYBRID STATE PATTERN:
 * - Shared state: `count` comes from counterAutomat.
 * - Local state: `format` ('dec' | 'hex') is private to this component.
 *
 * Demonstrates that CounterDisplay can maintain its own presentation preferences
 * while staying in sync with the shared automat state.
 */
class CounterDisplay extends PureComponent {
  /** @type {HTMLElement|null} */
  _numRef = null;

  constructor(props) {
    super(props);
    // Hybrid initialization:
    this.state = {
      // 1. Initialized directly from automat:
      count: counterAutomat.state.count,
      // 2. Component-local presentation state:
      format: 'dec',
    };
  }

  componentDidMount() {
    // Subscriber handling for React lifecycle
    this.unsubscribe = counterAutomat.subscribe(this);
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  componentDidUpdate(prevProps, prevState) {
    // Pop animation whenever shared automat count changes
    if (prevState.count !== this.state.count) {
      if (this._numRef) {
        this._numRef.classList.remove('count-animate');
        void this._numRef.offsetWidth;
        this._numRef.classList.add('count-animate');
      }
    }
  }

  handleFormatChange = (format) => {
    // Purely local state update
    this.setState({ format });
  };

  formatValue(count, format) {
    if (format === 'hex') {
      return (count < 0 ? '-' : '') + '0x' + Math.abs(count).toString(16).toUpperCase();
    }
    return count;
  }

  render() {
    const { count, format } = this.state;
    const formatted = this.formatValue(count, format);

    return (
      <div className="card card-display">
        <div className="card-header">
          <span className="card-icon">📊</span>
          <h3>Counter Display</h3>
          <span className="badge badge-local">hybrid state</span>
        </div>

        <div className="card-body">
          {/* Hybrid State breakdown */}
          <div className="hybrid-state-bar">
            <div className="state-item">
              <div className="state-item-header">
                <span className="state-tag-automat">automat</span>
                <span>shared count</span>
              </div>
              <span className="state-item-val">{count}</span>
            </div>
            <div className="state-item">
              <div className="state-item-header">
                <span className="state-tag-local">local</span>
                <span>format preference</span>
              </div>
              <span className="state-item-val">{format.toUpperCase()}</span>
            </div>
          </div>

          {/* Local format selector */}
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Display format <span className="state-tag-local">local</span>
            </span>
            <div className="segmented-control" role="group" aria-label="Display format">
              {['dec', 'hex'].map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`seg-btn ${format === f ? 'active' : ''}`}
                  onClick={() => this.handleFormatChange(f)}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="count-display-container">
            {/* Gradient number with pop animation on change */}
            <span
              className="count-number"
              ref={(el) => { this._numRef = el; }}
              aria-live="polite"
              aria-atomic="true"
            >
              {formatted}
            </span>
            <span className="count-label">{format.toUpperCase()} format</span>
            <span className="count-hint">
              Independent PureComponent — no shared parent
            </span>
          </div>

          <div className="code-snippet">
            <pre>{`// 1. Instantiate automat outside React:
const counterAutomat = new Automat(
  { count: 0 },
  {
    increment(step = 1) {
      counterAutomat.setState({ count: counterAutomat.state.count + step });
    },
    decrement(step = 1) {
      counterAutomat.setState({ count: counterAutomat.state.count - step });
    },
  }
);

// 2. PureComponent with hybrid state:
class CounterDisplay extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      count: counterAutomat.state.count, // ← from automat
      format: 'dec',                     // ← component-local state
    };
  }

  componentDidMount() {
    this.unsub = counterAutomat.subscribe(this);
  }

  componentWillUnmount() {
    this.unsub();
  }

  render() {
    const { count, format } = this.state;
    const value = format === 'hex' ? '0x' + count.toString(16) : count;
    return <span>{value}</span>;
  }
}`}</pre>
          </div>
        </div>
      </div>
    );
  }
}

export default CounterDisplay;
