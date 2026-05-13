/**
 * cloudSession — module-level handle on "who is signed in right now".
 *
 * Pure JS state (no React), so non-component code (Zustand storage adapter,
 * sync queue, repositories) can read it synchronously. AuthProvider is the
 * single writer: it calls `setCloudUserId(user.id | null)` on every auth
 * state change.
 *
 * Subscribers (storage adapter, sync queue) register via `onCloudUserChange`
 * and react to transitions (hydrate from cloud on sign-in, clear cloud state
 * on sign-out).
 */

export type CloudUserId = string | null;

let currentUserId: CloudUserId = null;

type Listener = (userId: CloudUserId) => void;
const listeners = new Set<Listener>();

export function getCloudUserId(): CloudUserId {
  return currentUserId;
}

export function setCloudUserId(userId: CloudUserId): void {
  if (currentUserId === userId) return;
  currentUserId = userId;
  // Iterate via forEach so we don't need ES2015 downlevel iteration on Set.
  listeners.forEach((fn) => {
    try {
      fn(userId);
    } catch (err) {
      // A bad listener must not break the rest of the chain.
      console.error('[cloudSession] listener threw', err);
    }
  });
}

/** Subscribe to user-id changes. Returns an unsubscribe function. */
export function onCloudUserChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
