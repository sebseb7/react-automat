import { PureComponent } from 'react';
import { Automat } from '../../lib/index.js';

/**
 * UnconnectedPartialSubscriber
 *
 * Demonstrates:
 * 1. UNCONNECTED OBJECT: Absolutely NO import of `cartAutomat.js`!
 *    The component has no module-level dependency on the cart store.
 *    Instead, it discovers and binds to it strictly via the named window registry:
 *    `Automat.get('cart')` (or `window.__AUTOMATS__.get('cart')`).
 *
 * 2. PARTIAL SUBSCRIBER:
 *    Subscribes ONLY to a slice: `couponCode` via array selector `['couponCode']`.
 *    - Changes to items, prices, or quantities produce 0 re-renders.
 *    - Changes to couponCode trigger immediate updates.
 *
 * 3. UNCONNECTED ACTION DISPATCH:
 *    Calls actions directly on the resolved instance:
 *    `Automat.get('cart')?.actions.setCouponCode(...)` without importing anything.
 */
export default class UnconnectedPartialSubscriber extends PureComponent {
  _renderCount = 0;

  constructor(props) {
    super(props);

    // 1. Resolve store solely via named window object (no imports of cartAutomat!)
    const store = typeof window !== 'undefined' ? (Automat.get('cart') || window.__AUTOMATS__?.get('cart')) : null;

    this.state = {
      // Extract only partial slice: couponCode
      couponCode: store?.state?.couponCode || '',
      connected: Boolean(store),
    };
  }

  componentDidMount() {
    // 2. Discover store from named window object
    const store = Automat.get('cart') || (typeof window !== 'undefined' && window.__AUTOMATS__?.get('cart'));

    if (store) {
      // 3. Partial subscription using key array selector: ['couponCode']
      // Automat performs shallow-equality on { couponCode } and skips setState
      // when items, quantities, or prices change!
      this.unsubscribe = store.subscribe(this, ['couponCode']);
      this.setState({ connected: true, couponCode: store.state?.couponCode || '' });
    }
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  handleQuickCoupon = (code) => {
    // Dispatch action through unconnected named window reference
    const store = Automat.get('cart') || window.__AUTOMATS__?.get('cart');
    store?.actions.setCouponCode(code);
  };

  render() {
    this._renderCount++;
    const { couponCode, connected } = this.state;

    return (
      <div className="card card-display" style={{ borderLeft: '3px solid var(--accent-light)' }}>
        <div className="card-header">
          <span className="card-icon">🔌</span>
          <h3>Unconnected Partial Subscriber</h3>
          <span className="badge badge-cascade">Zero Store Imports</span>
        </div>

        <div className="card-body">
          {/* Status & Efficiency stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Component Renders: <strong style={{ color: 'var(--accent-light)' }}>#{this._renderCount}</strong>
            </span>
            <span className={`badge ${connected ? 'badge-success' : 'badge-warning'}`}>
              {connected ? 'window.__AUTOMATS__.get("cart")' : 'Disconnected'}
            </span>
          </div>

          {/* Connection Architecture Badge */}
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 12,
              marginBottom: 16,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--accent-light)', marginBottom: 4 }}>
              🌐 Unconnected Architecture:
            </div>
            <div>
              • <strong>No Store Import:</strong> Does not import <code>cartAutomat</code>. Resolves solely via <code>Automat.get(&apos;cart&apos;)</code>.<br />
              • <strong>Partial Selector:</strong> Subscribed strictly via <code>store.subscribe(this, [&apos;couponCode&apos;])</code>.<br />
              • <strong>Render Guard:</strong> Adding/deleting items or changing quantities triggers <strong>0 re-renders</strong> here.
            </div>
          </div>

          {/* Observed Partial Value */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
              Observed Partial Slice (couponCode):
            </span>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 6,
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'monospace',
                fontSize: 14,
                color: couponCode ? 'var(--green)' : 'var(--text-3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{couponCode ? `Active Coupon: "${couponCode}"` : '(No coupon applied)'}</span>
              {couponCode && (
                <span className="badge badge-success" style={{ fontSize: 11 }}>
                  Applied
                </span>
              )}
            </div>
          </div>

          {/* Action Dispatch via Unconnected Reference */}
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
              Dispatch Action via Named Window Reference:
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => this.handleQuickCoupon('AUTOMAT25')}
              >
                Apply &quot;AUTOMAT25&quot;
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => this.handleQuickCoupon('FREESHIP')}
              >
                Apply &quot;FREESHIP&quot;
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => this.handleQuickCoupon('')}
              >
                Clear Coupon
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
