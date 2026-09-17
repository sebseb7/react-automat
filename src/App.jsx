import { PureComponent } from 'react';
import CounterButton from './examples/components/CounterButton.jsx';
import CounterDisplay from './examples/components/CounterDisplay.jsx';
import CascadeControls from './examples/components/CascadeControls.jsx';
import NotificationBar from './examples/components/NotificationBar.jsx';
import SyncCounterControls from './examples/components/SyncCounterControls.jsx';
import SyncBackendMonitor from './examples/components/SyncBackendMonitor.jsx';
import IndexSelector from './examples/components/IndexSelector.jsx';
import DynamicAutomatSubscriber from './examples/components/DynamicAutomatSubscriber.jsx';

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
            State lives independently of mounting — zero prop drilling.
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
            </div>

            <div className="two-columns">
              <IndexSelector />
              <DynamicAutomatSubscriber />
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
