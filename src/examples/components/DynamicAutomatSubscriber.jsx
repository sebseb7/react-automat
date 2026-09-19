import { PureComponent } from 'react';
import { indexAutomat, getOrCreateSlotAutomat } from '../automats/indexAutomat.js';

/**
 * DynamicAutomatSubscriber — right column.
 *
 * 1. Subscribes to the shared `indexAutomat`.
 * 2. Whenever `index` changes, it:
 *    - Unsubscribes from the previous Automat instance
 *    - Uses `index` to lookup or dynamically instantiate an Automat in `window.automats` Map
 *    - Immediately recalls its preserved state
 *    - Subscribes to the new Automat instance
 */
class DynamicAutomatSubscriber extends PureComponent {
  constructor(props) {
    super(props);
    const initialIndex = indexAutomat.state.index;
    const initialSlot = getOrCreateSlotAutomat(initialIndex);

    this.state = {
      currentIndex: initialIndex,
      slotState: initialSlot.state,
    };
  }

  componentDidMount() {
    // 1. Subscribe to the shared index automat
    this.unsubIndex = indexAutomat.subscribe((indexState) => {
      this.handleIndexChange(indexState.index);
    });

    // 2. Subscribe to the initial slot automat in window.automats
    this.subscribeToSlot(this.state.currentIndex);
  }

  componentWillUnmount() {
    if (this.unsubIndex) this.unsubIndex();
    if (this.unsubSlot) this.unsubSlot();
  }

  handleIndexChange(newIndex) {
    if (newIndex === this.state.currentIndex) return;

    // 💡 DYNAMIC RESUBSCRIPTION WORKFLOW:
    // 1. Unsubscribe from the previous Automat
    if (this.unsubSlot) {
      this.unsubSlot();
    }

    // 2. Lookup or dynamically instantiate the Automat for this index in window.automats:
    const slotAutomat = getOrCreateSlotAutomat(newIndex);

    // 3. Immediately recall the stored state:
    this.setState({
      currentIndex: newIndex,
      slotState: slotAutomat.state,
    });

    // 4. Resubscribe to the new instance:
    this.unsubSlot = slotAutomat.subscribe((slotState) => {
      this.setState({ slotState });
    });
  }

  subscribeToSlot(index) {
    const slotAutomat = getOrCreateSlotAutomat(index);
    this.unsubSlot = slotAutomat.subscribe((slotState) => {
      this.setState({ slotState });
    });
  }

  handleClickSlot = () => {
    const slotAutomat = getOrCreateSlotAutomat(this.state.currentIndex);
    slotAutomat.actions.click();
  };

  handleNotesChange = (e) => {
    const slotAutomat = getOrCreateSlotAutomat(this.state.currentIndex);
    slotAutomat.actions.setNotes(e.target.value);
  };

  handleResetSlot = () => {
    const slotAutomat = getOrCreateSlotAutomat(this.state.currentIndex);
    slotAutomat.actions.reset();
  };

  render() {
    const { currentIndex, slotState } = this.state;
    const map = typeof window !== 'undefined' ? window.automats : null;
    const allIndexes = map
      ? Array.from(map.keys())
          .filter((k) => typeof k === 'number' || !isNaN(Number(k)))
          .sort((a, b) => Number(a) - Number(b))
      : [];

    return (
      <div className="card card-display">
        <div className="card-header">
          <span className="card-icon">⚡</span>
          <h3>Dynamic Slot Automat (Resubscribed by Index)</h3>
          <span className="badge badge-cascade">Automat.get('slot_{currentIndex}') (window)</span>
        </div>

        <div className="card-body">
          {/* Active slot recalled state */}
          <div className="count-display-container" style={{ padding: '4px 0 14px' }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-3)', fontWeight: 700 }}>
              Recalled State for Automat #{currentIndex}
            </span>
            <span className="count-number" style={{ fontSize: 68, margin: '2px 0' }}>
              {slotState?.clicks ?? 0}
            </span>
            <span className="count-label">Clicks recorded on Slot #{currentIndex}</span>
          </div>

          {/* Slot mutation controls */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={this.handleClickSlot}
            >
              + Click Slot #{currentIndex}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={this.handleResetSlot}
            >
              Reset Slot
            </button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              className="input-field"
              value={slotState?.notes || ''}
              onChange={this.handleNotesChange}
              placeholder={`Notes for Slot #${currentIndex}...`}
              style={{ fontSize: 13 }}
            />
          </div>

          {/* Table showing all entries in window.automats */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
              All Instantiated Automats in window.automats Map:
            </span>
            <div style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '6px 10px', maxHeight: 96, overflowY: 'auto' }}>
              {allIndexes.map((idx) => {
                const aut = map.get(idx);
                const st = aut?.state || {};
                const isActive = idx === currentIndex;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '2px 0',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      color: isActive ? 'var(--accent)' : 'var(--text-2)',
                      fontWeight: isActive ? 700 : 400,
                    }}
                  >
                    <span>
                      {isActive ? '▸ ' : '  '}window.automats.get({idx})
                    </span>
                    <span>
                      clicks: <strong>{st.clicks ?? 0}</strong> · "{st.notes ?? ''}"
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Code snippet showing resubscription logic */}
          <div className="code-snippet">
            <pre>{`// Resubscribing to different Automat driven by shared index:
handleIndexChange(newIndex) {
  this.unsubSlot?.();                              // 1. Unsub old
  const slotAutomat = window.automats.get(newIndex)// 2. Access / create in Map
    ?? getOrCreateSlotAutomat(newIndex);
  this.setState({ slotState: slotAutomat.state }); // 3. Recall state!
  this.unsubSlot = slotAutomat.subscribe(this);    // 4. Resubscribe!
}`}</pre>
          </div>
        </div>
      </div>
    );
  }
}

export default DynamicAutomatSubscriber;
