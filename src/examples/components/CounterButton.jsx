import { PureComponent } from 'react';
import counterAutomat from '../automats/counterAutomat.js';

/**
 * CounterButton — left column.
 *
 * HYBRID STATE PATTERN:
 * - Shared state: `count` comes from counterAutomat.
 * - Local state: `step` (increment size) and `localClicks` (click counter)
 *   are private to this component.
 *
 * 1. Constructor combines direct automat access with local component state.
 * 2. componentDidMount registers with counterAutomat.subscribe(this).
 * 3. React's setState shallow-merges updates, so local fields remain untouched
 *    when the automat notifies this component of count updates.
 */
class CounterButton extends PureComponent {
  constructor(props) {
    super(props);
    // Hybrid initialization:
    this.state = {
      // 1. Initialized directly from the automat:
      count: counterAutomat.state.count,
      // 2. Component-local state:
      step: 1,
      localClicks: 0,
    };
  }

  componentDidMount() {
    // Subscriber handling for React lifecycle management
    this.unsubscribe = counterAutomat.subscribe(this);
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  handleSetStep = (step) => {
    // Purely local state update
    this.setState({ step });
  };

  handleIncrement = () => {
    const { step, localClicks } = this.state;
    // Update local clicks counter
    this.setState({ localClicks: localClicks + 1 });
    // Trigger automat action with local step
    counterAutomat.actions.increment(step);
  };

  handleDecrement = () => {
    const { step, localClicks } = this.state;
    this.setState({ localClicks: localClicks + 1 });
    counterAutomat.actions.decrement(step);
  };

  handleReset = () => {
    const { localClicks } = this.state;
    this.setState({ localClicks: localClicks + 1 });
    counterAutomat.actions.reset();
  };

  render() {
    const { count, step, localClicks } = this.state;

    return (
      <div className="card">
        <div className="card-header">
          <span className="card-icon">⚡</span>
          <h3>Counter Controls</h3>
          <span className="badge badge-local">hybrid state</span>
        </div>

        <div className="card-body">
          {/* Hybrid State breakdown */}
          <div className="hybrid-state-bar">
            <div className="state-item">
              <div className="state-item-header">
                <span className="state-tag-automat">automat</span>
                <span>shared</span>
              </div>
              <span className="state-item-val">{count}</span>
            </div>
            <div className="state-item">
              <div className="state-item-header">
                <span className="state-tag-local">local</span>
                <span>button clicks</span>
              </div>
              <span className="state-item-val">{localClicks}</span>
            </div>
          </div>

          {/* Local step selector */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Step size <span className="state-tag-local">local</span>
            </span>
            <div className="segmented-control" role="group" aria-label="Step size">
              {[1, 5, 10].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`seg-btn ${step === s ? 'active' : ''}`}
                  onClick={() => this.handleSetStep(s)}
                >
                  ±{s}
                </button>
              ))}
            </div>
          </div>

          {/* +/- controls */}
          <div className="counter-controls">
            <button
              id="btn-decrement"
              className="btn btn-circle btn-secondary"
              onClick={this.handleDecrement}
              aria-label={`Decrement by ${step}`}
            >
              −
            </button>

            <button
              id="btn-increment"
              className="btn btn-circle btn-primary"
              onClick={this.handleIncrement}
              aria-label={`Increment by ${step}`}
            >
              +
            </button>
          </div>

          <button
            id="btn-reset"
            className="btn btn-ghost btn-full"
            onClick={this.handleReset}
          >
            Reset Count to 0
          </button>

          <div className="code-snippet">
            <pre>{`// 1. Instantiate the automat outside React:
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
class CounterButton extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      count: counterAutomat.state.count, // ← from automat
      step: 1,                           // ← component-local
      localClicks: 0,                    // ← component-local
    };
  }

  componentDidMount() {
    this.unsub = counterAutomat.subscribe(this);
  }

  componentWillUnmount() {
    this.unsub();
  }
}`}</pre>
          </div>
        </div>
      </div>
    );
  }
}

export default CounterButton;
