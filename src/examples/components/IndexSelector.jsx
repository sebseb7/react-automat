import { PureComponent } from 'react';
import { indexAutomat } from '../automats/indexAutomat.js';

/**
 * IndexSelector — left column.
 *
 * A standard PureComponent driving indexAutomat (like Example 1).
 * Clicking +/- changes the shared `index` value.
 */
class IndexSelector extends PureComponent {
  constructor(props) {
    super(props);
    this.state = indexAutomat.state;
  }

  componentDidMount() {
    this.unsubscribe = indexAutomat.subscribe(this);
  }

  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  }

  handleIncrement = () => {
    indexAutomat.actions.increment(1);
  };

  handleDecrement = () => {
    indexAutomat.actions.decrement(1);
  };

  handleSelect = (i) => {
    indexAutomat.actions.setIndex(i);
  };

  render() {
    const { index } = this.state;

    return (
      <div className="card">
        <div className="card-header">
          <span className="card-icon">🔢</span>
          <h3>Shared Index Counter</h3>
          <span className="badge badge-local">shared index</span>
        </div>

        <div className="card-body">
          {/* Current Index Display */}
          <div className="ctrl-current-value">
            <span className="ctrl-current-label">Shared Automat Index</span>
            <span className="ctrl-current-num">{index}</span>
          </div>

          {/* +/- Controls */}
          <div className="counter-controls">
            <button
              id="btn-index-dec"
              type="button"
              className="btn btn-circle btn-secondary"
              onClick={this.handleDecrement}
              disabled={index <= 0}
              aria-label="Previous index"
            >
              −
            </button>

            <button
              id="btn-index-inc"
              type="button"
              className="btn btn-circle btn-primary"
              onClick={this.handleIncrement}
              aria-label="Next index"
            >
              +
            </button>
          </div>

          {/* Quick jump pills */}
          <div style={{ margin: '14px 0 10px', textAlign: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
              Quick jump to index:
            </span>
            <div className="segmented-control">
              {[0, 1, 2, 3, 4].map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`seg-btn ${index === i ? 'active' : ''}`}
                  onClick={() => this.handleSelect(i)}
                >
                  #{i}
                </button>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', margin: '8px 0 14px' }}>
            Changing this index causes the right side to dynamically lookup, instantiate, and resubscribe to{' '}
            <code className="inline-code">{`window.automats.get(${index})`}</code>.
          </p>

          <div className="code-snippet">
            <pre>{`// 1. Shared index automat:
const indexAutomat = new Automat({ index: 0 }, {
  increment() { indexAutomat.setState({ index: indexAutomat.state.index + 1 }); },
  decrement() { indexAutomat.setState({ index: indexAutomat.state.index - 1 }); },
});

// 2. Left component triggers the index change:
indexAutomat.actions.increment();`}</pre>
          </div>
        </div>
      </div>
    );
  }
}

export default IndexSelector;
