/**
 * Generic per-user namespaced `localStorage` adapter.
 *
 * Routes Zustand `persist` reads/writes to one of two keys based on the
 * current cloud session:
 *
 *   • Signed-out → `<rootKey>`              (unchanged from local-only era)
 *   • Signed-in  → `<rootKey>:user-<userId>`
 *
 * The original local-only key is NEVER overwritten by a signed-in session,
 * so pre-auth data is preserved and remains available after sign-out (or
 * for the Phase G "import to cloud" flow).
 *
 * Each store calls `makeNamespacedStorage(rootKey)` once and passes the
 * result to `createJSONStorage`. Per-entity sync code triggers
 * `useXStore.persist.rehydrate()` whenever the cloud user changes.
 *
 * SSR-safe: every operation no-ops when `window` is undefined.
 */

import { getCloudUserId } from './cloudSession';

interface NamespacedStorage {
  getItem(name: string): string | null;
  setItem(name: string, value: string): void;
  removeItem(name: string): void;
}

export function makeNamespacedStorage(_rootKey: string): NamespacedStorage {
  // rootKey is informational — Zustand passes its own `name` through
  // to each call, so we honour that. The argument exists so callers can
  // self-document which store the adapter belongs to.
  void _rootKey;

  function keyFor(name: string): string {
    const uid = getCloudUserId();
    return uid ? `${name}:user-${uid}` : name;
  }

  return {
    getItem(name) {
      if (typeof window === 'undefined') return null;
      try {
        return localStorage.getItem(keyFor(name));
      } catch {
        return null;
      }
    },
    setItem(name, value) {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(keyFor(name), value);
      } catch {
        /* quota / private mode → ignore */
      }
    },
    removeItem(name) {
      if (typeof window === 'undefined') return;
      try {
        localStorage.removeItem(keyFor(name));
      } catch {
        /* ignore */
      }
    },
  };
}
