import { PureComponent } from 'react';
import { cartAutomat } from '../automats/cartAutomat.js';

/**
 * CartBadgeDisplay — right column of the Partial Subscription example.
 *
 * Demonstrates partial state subscription:
 * Subscribes ONLY to `state.items.length`, regardless of list content!
 *
 * When item quantities change or coupon codes are typed, `items.length` remains
 * unchanged. The internal shallow equality check skips `setState()`, resulting in
 * ZERO re-renders for this component.
 */
class CartBadgeDisplay extends PureComponent {
  _renderCount = 0;
  _badgeRef = null;

  constructor(props) {
    super(props);
    // 1. Initial read: extract only what this component needs
    this.state = {
      badgeCount: cartAutomat.state.items.length,
    };
  }

  componentDidMount() {
    // 2. 💡 PARTIAL SUBSCRIPTION:
    // Selector maps to { badgeCount: state.items.length }.
    // When items are added/removed, badgeCount changes -> setState() is called.
    // When item quantities/names change or coupon is typed, badgeCount is unchanged -> setState() is SKIPPED!
    this.unsubscribe = cartAutomat.subscribe(this, (state) => ({
      badgeCount: state.items.length,
    }));
  }

  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.badgeCount !== this.state.badgeCount && this._badgeRef) {
      this._badgeRef.classList.remove('count-animate');
      void this._badgeRef.offsetWidth;
      this._badgeRef.classList.add('count-animate');
    }
  }

  render() {
    this._renderCount++;
    const { badgeCount } = this.state;

    return (
      <div className="card card-display">
        <div className="card-header">
          <span className="card-icon">🏷️</span>
          <h3>Cart Badge (Partial Subscriber)</h3>
          <span className="badge badge-api">Selector: items.length</span>
        </div>

        <div className="card-body">
          {/* Render count & efficiency indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Badge Renders: <strong style={{ color: 'var(--green)' }}>#{this._renderCount}</strong>
            </span>
            <span className="state-tag-automat" style={{ fontSize: 11 }}>
              shallowEqual guarded
            </span>
          </div>

          {/* Visual Navbar / Cart Badge Mockup */}
          <div
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              padding: '24px 20px',
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
              Simulated App Navigation Bar
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 16,
                background: 'var(--surface-1)',
                padding: '10px 20px',
                borderRadius: 'var(--r-xl)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-2)' }}>
                Store Header
              </span>

              <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

              {/* Shopping Cart Icon with Badge */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ fontSize: 26, lineHeight: 1 }} role="img" aria-label="cart">
                  🛒
                </span>

                {/* Animated Badge Count */}
                <span
                  ref={(el) => { this._badgeRef = el; }}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -10,
                    background: 'var(--orange)',
                    color: 'var(--surface-0)',
                    fontWeight: 800,
                    fontSize: 12,
                    minWidth: 20,
                    height: 20,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 5px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                  }}
                >
                  {badgeCount}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-1)' }}>
              Badge displays <strong style={{ color: 'var(--orange)' }}>{badgeCount} unique items</strong> in cart
            </div>
          </div>

          {/* Explanation Callout */}
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '12px',
              marginBottom: 16,
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-bright)', marginBottom: 6 }}>
              🔍 Why Partial State Subscription Matters:
            </div>
            <ul style={{ paddingLeft: 16, color: 'var(--text-2)' }}>
              <li>
                <strong>Quantity changes (+ / −)</strong> modify item content, but <code>items.length</code> remains {badgeCount}. <code>Automat</code> detects that <code>lastSlice</code> is shallow-equal to <code>nextSlice</code> and <strong>skips <code>this.setState()</code> completely</strong>.
              </li>
              <li>
                <strong>Typing coupon codes</strong> updates unrelated state, also triggering <strong>0 renders</strong> here.
              </li>
              <li>
                <strong>Adding or removing an item</strong> alters <code>items.length</code>, immediately updating the badge number!
              </li>
            </ul>
          </div>

          {/* Canonical Code Snippet */}
          <div className="code-snippet">
            <pre>{`// Partial subscription to ONLY the list length:
class CartBadgeDisplay extends PureComponent {
  constructor(props) {
    super(props);
    this.state = { badgeCount: cartAutomat.state.items.length };
  }

  componentDidMount() {
    // 💡 Regardless of item content/quantity/price changes,
    // only re-renders when items.length changes:
    this.unsubscribe = cartAutomat.subscribe(this, (state) => ({
      badgeCount: state.items.length,
    }));
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  render() {
    return <span>Cart: {this.state.badgeCount}</span>;
  }
}`}</pre>
          </div>
        </div>
      </div>
    );
  }
}

export default CartBadgeDisplay;
