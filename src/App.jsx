import { PureComponent } from 'react';
import CounterButton from './examples/components/CounterButton.jsx';
import CounterDisplay from './examples/components/CounterDisplay.jsx';
import CascadeControls from './examples/components/CascadeControls.jsx';
import NotificationBar from './examples/components/NotificationBar.jsx';
import SyncCounterControls from './examples/components/SyncCounterControls.jsx';
import SyncBackendMonitor from './examples/components/SyncBackendMonitor.jsx';
import IndexSelector from './examples/components/IndexSelector.jsx';
import DynamicAutomatSubscriber from './examples/components/DynamicAutomatSubscriber.jsx';
import CartManager from './examples/components/CartManager.jsx';
import CartBadgeDisplay from './examples/components/CartBadgeDisplay.jsx';
import AsyncApiPrimaryView from './examples/components/AsyncApiPrimaryView.jsx';
import AsyncApiCollapsibleView from './examples/components/AsyncApiCollapsibleView.jsx';
import MultiApiIndividualControls from './examples/components/MultiApiIndividualControls.jsx';
import MultiApiCombinedDashboard from './examples/components/MultiApiCombinedDashboard.jsx';

class App extends PureComponent {
  render() {
    return (
      <div className="app">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="app-header">
          <div className="logo">
            <span className="logo-icon">⚙</span>
            <span className="logo-text">automat</span>
            <span className="logo-version">v0.1.0</span>
          </div>
          <p className="tagline">
            Observable state management for React{' '}
            <code className="inline-code">PureComponent</code>
            <br />
            State lives independently of mounting — zero prop drilling · Optional Window and IndexedDB persistence.
          </p>
        </header>

        <main className="app-main">
          {/* ── Example 1: Counter ────────────────────────────────── */}
          <section className="example-section" aria-labelledby="ex1-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">01</span>
                <h2 id="ex1-title">Counter</h2>
              </div>
              <p>
                Two independent <code className="inline-code">PureComponent</code>s
                synchronized by a single <code className="inline-code">counterAutomat</code>.
                Neither knows the other exists — they both subscribe to the same state container.
              </p>
              <div className="flow-diagram" aria-label="Data flow">
                <span className="flow-node">counterAutomat</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">CounterButton</span>
                <span className="flow-sep">&amp;</span>
                <span className="flow-node flow-node-component">CounterDisplay</span>
              </div>
            </div>

            <div className="two-columns">
              <CounterButton />
              <CounterDisplay />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 2: Cascade ───────────────────────────────── */}
          <section className="example-section" aria-labelledby="ex2-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">02</span>
                <h2 id="ex2-title">Notification Cascade</h2>
              </div>
              <p>
                <code className="inline-code">subscribeTo()</code> connects two automats into a
                <strong> reactive pipeline</strong>. Clicking triggers in <code className="inline-code">CascadeControls</code> mutates{' '}
                <code className="inline-code">counterAutomat</code> (upstream). This automatically invokes the{' '}
                <code className="inline-code">subscribeTo()</code> transform callback, updating{' '}
                <code className="inline-code">notificationAutomat</code> (downstream), which then re-renders{' '}
                <code className="inline-code">NotificationBar</code> without any prop drilling or shared component parent.
              </p>
              <div className="flow-diagram" aria-label="Cascade data flow">
                <span className="flow-node">User Click</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">counterAutomat.actions.increment()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">subscribeTo(upstream, transform)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">notificationAutomat.setState()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">NotificationBar</span>
              </div>

              <div className="info-box">
                <div className="info-box-title">
                  <span>ℹ️</span> How <code>subscribeTo(upstreamAutomat, transform)</code> Works
                </div>
                <ul>
                  <li>
                    <strong><code>upstreamState</code>:</strong> The newly emitted state from the upstream automat (e.g. <code>{`{ count: 1 }`}</code>).
                  </li>
                  <li>
                    <strong><code>myState</code>:</strong> The current state of this downstream automat right before updating (e.g. <code>{`{ messages: [...] }`}</code>). Acts as an accumulator to prepend events and cap history.
                  </li>
                  <li>
                    <strong>Return Value:</strong> The returned partial state object is automatically applied via <code>this.setState(partial)</code>, notifying downstream UI subscribers.
                  </li>
                  <li>
                    <strong>Conditional Filtering:</strong> Return <code>null</code> or <code>undefined</code> to selectively skip updates and avoid triggering renders.
                  </li>
                </ul>
              </div>
            </div>

            <div className="two-columns">
              <CascadeControls />
              <NotificationBar />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 3: API Auto-Sync ─────────────────────────── */}
          <section className="example-section" aria-labelledby="ex3-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">03</span>
                <h2 id="ex3-title">API-Backed Auto-Sync Counter (POST)</h2>
              </div>
              <p>
                <code className="inline-code">syncCounterAutomat</code> manages an indexed counter that automatically
                synchronizes its mutations to the backend via HTTP <code className="inline-code">POST /api/counter</code>.
                State updates are applied <strong>optimistically</strong> for instant UI response, followed by asynchronous
                background synchronization and status tracking without any component-level <code className="inline-code">fetch</code> or lifecycle glue.
              </p>
              <div className="flow-diagram" aria-label="API auto-sync flow">
                <span className="flow-node">User Click</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">Optimistic setState()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">POST /api/counter</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">Backend Database Updated</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">Sync Status 200 OK</span>
              </div>
            </div>

            <div className="two-columns">
              <SyncCounterControls />
              <SyncBackendMonitor />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 4: Dynamic Map Resubscription ──────────── */}
          <section className="example-section" aria-labelledby="ex4-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">04</span>
                <h2 id="ex4-title">Dynamic Window Map (Index-Driven Resubscription)</h2>
              </div>
              <p>
                The left side is a standard <code className="inline-code">indexAutomat</code> counter (like Example 1).
                On the right side, that counter’s value is used to dynamically lookup, instantiate, and resubscribe to
                a different <code className="inline-code">Automat</code> stored in <code className="inline-code">window.automats = new Map()</code>.
                Stepping through indexes unhooks from the old Automat, subscribes to the new one, and instantly recalls its preserved state.
              </p>
              <div className="flow-diagram" aria-label="Index-driven resubscription flow">
                <span className="flow-node">Shared Index: N</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">window.automats.get(N)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">Unsub Old / Sub New</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">Recall State for Slot #N</span>
              </div>

              <div className="info-box">
                <div className="info-box-title">
                  <span>💾</span> Built-in Persistence: <code>persist: false</code> (Window) &amp; <code>persist: true</code> (IndexedDB)
                </div>
                <ul>
                  <li>
                    <strong>Window Object (<code>persist: false</code>):</strong> When an automat is configured with <code>name</code>, it registers in the <code>window</code> object. Its state persists across component unmounts and HMR reloads. Global lookup is available via <code>Automat.get(name)</code>.
                  </li>
                  <li>
                    <strong>IndexedDB (<code>persist: true</code>):</strong> Setting <code>persist: true</code> automatically synchronizes state snapshots to IndexedDB under the automat's <code>name</code>, surviving full page reloads and browser restarts.
                  </li>
                </ul>
              </div>
            </div>

            <div className="two-columns">
              <IndexSelector />
              <DynamicAutomatSubscriber />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 5: Partial State Subscription ────────────── */}
          <section className="example-section" aria-labelledby="ex5-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">05</span>
                <h2 id="ex5-title">Partial State Subscription (Cart Length vs Content)</h2>
              </div>
              <p>
                A subscriber can subscribe to only part of an automat’s state. The <code className="inline-code">CartBadgeDisplay</code> on
                the right subscribes <strong>only to list length</strong> (<code className="inline-code">items.length</code>) using a slice selector.
                Modifying item quantities, changing names, or typing coupon codes mutates <code className="inline-code">cartAutomat</code> state,
                but because the list length is unchanged, <code className="inline-code">Automat</code>’s internal shallow equality check skips <code className="inline-code">setState()</code> — producing <strong>zero badge re-renders</strong>.
                With <code className="inline-code">{`{ name: 'cart', persist: true }`}</code>, this cart state also automatically survives full page reloads via IndexedDB.
              </p>
              <div className="flow-diagram" aria-label="Partial subscription data flow">
                <span className="flow-node">cartAutomat.setState()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">selector(state)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">shallowEqual(last, next)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">Render ONLY on Length Change</span>
              </div>
            </div>

            <div className="two-columns">
              <CartManager />
              <CartBadgeDisplay />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 6: Async Fetch & Constructor Cache ──────── */}
          <section className="example-section" aria-labelledby="ex6-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">06</span>
                <h2 id="ex6-title">Async API Fetch &amp; Constructor Cache (Instant Re-Mount)</h2>
              </div>
              <p>
                An automat fetching asynchronous data via a simulated delayed API. When the primary component mounts,
                calling <code className="inline-code">profileAsyncAutomat.getData()</code> in its constructor returns{' '}
                <code className="inline-code">{`{ status: 'pending' }`}</code>, rendering a loading state (1st render), then re-rendering
                when the fetch finishes (2nd render). When a second component mounts (or when unmounted and remounted via the collapsible toggle),
                the data is <strong>already loaded in memory</strong> — the constructor receives the resolved payload synchronously, rendering in{' '}
                <strong>1 render with zero 2nd render</strong>.
              </p>
              <div className="flow-diagram" aria-label="Async fetch and constructor cache flow">
                <span className="flow-node">Mount 1 Constructor</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">status: 'pending' (Render #1)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">API Resolves</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">Render #2 (Data)</span>
                <span className="flow-sep">|</span>
                <span className="flow-node">Mount 2 (Collapsible)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">Constructor Has Data (1 Render Only)</span>
              </div>
            </div>

            <div className="two-columns">
              <AsyncApiPrimaryView />
              <AsyncApiCollapsibleView />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 7: Combined Multi-API Automats ────────────── */}
          <section className="example-section" aria-labelledby="ex7-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">07</span>
                <h2 id="ex7-title">Combined Multi-API Automats (Concurrent Orchestration)</h2>
              </div>
              <p>
                Three automats in an orchestrated graph: two with delayed APIs (<code className="inline-code">userStatsAutomat</code> at ~700ms and{' '}
                <code className="inline-code">systemMetricsAutomat</code> at ~1300ms), and one combined automat created with{' '}
                <code className="inline-code">Automat.combine()</code>. When accessed while upstreams are idle, it triggers both to load in parallel,
                merging results when both finish. However, if both have <strong>already been accessed earlier</strong>, the combined automat resolves{' '}
                <strong>instantly in the component constructor</strong> with zero delay and a single render.
              </p>
              <div className="flow-diagram" aria-label="Combined multi-API flow">
                <span className="flow-node">combinedDashboardAutomat.getData()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">Check Upstreams</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">If Idle: Fetch Concurrently (~1300ms parallel)</span>
                <span className="flow-sep">|</span>
                <span className="flow-node">If Cached: Instant Constructor Return (1 Render)</span>
              </div>
            </div>

            <div className="two-columns">
              <MultiApiIndividualControls />
              <MultiApiCombinedDashboard />
            </div>
          </section>
        </main>

        <footer className="app-footer">
          <p>
            <code className="inline-code">automat</code> · MIT ·{' '}
            State is independent of component lifecycle
          </p>
        </footer>
      </div>
    );
  }
}

export default App;
