import { Automat } from '../../lib/index.js';

/**
 * Backend API-bound Automat.
 *
 * Demonstrates:
 * 1. Binding to backend API URL via `url: '/api/profile'`.
 * 2. Awaiting ready state via `await profileAutomat.ready`.
 * 3. React Suspense support via `profileAutomat.read()`.
 * 4. Standard subscriber support via `subscribe(this)`.
 * 5. Invalidation via `profileAutomat.setDirty()`:
 *    - Resets state to null (since no defaults were given) or default state.
 *    - When mounted (subscribers > 0): reloads immediately.
 *    - When unmounted (subscribers == 0): defers reload until read() or subscribe().
 */
export const profileAutomat = new Automat(
  null, // No defaults passed -> resets to null state when set dirty
  {
    setDirty() {
      profileAutomat.setDirty();
    },
  },
  {
    name: 'profile',
    url: '/api/profile',
  }
);
