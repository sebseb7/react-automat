// Ensure scroll-blocking events (wheel, touchstart, touchmove) default to passive: true
// Eliminates Chrome "[Violation] Added non-passive event listener to a scroll-blocking 'wheel' event"
if (typeof window !== 'undefined' && typeof EventTarget !== 'undefined') {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const scrollEvents = new Set(['wheel', 'mousewheel', 'touchstart', 'touchmove']);

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    let opts = options;
    if (scrollEvents.has(type)) {
      if (typeof options === 'boolean') {
        opts = { capture: options, passive: true };
      } else if (typeof options === 'object' && options !== null) {
        if (options.passive === undefined) {
          opts = { ...options, passive: true };
        }
      } else if (options === undefined) {
        opts = { passive: true };
      }
    }
    return originalAddEventListener.call(this, type, listener, opts);
  };
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
