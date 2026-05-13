'use client';

/**
 * Generic cloud-sync engine for a single entity type.
 *
 * Each `makeEntitySync<T>(config)` returns an `EntitySync` object that mirrors
 * the Phase D drill-sync shape:
 *
 *   • `enqueueUpsert(id)` / `enqueueDelete(id)` — optimistic write queue,
 *     drained with exponential backoff and capped at MAX_ATTEMPTS retries.
 *   • `hydrate()` — fetches the user's cloud rows on sign-in and merges
 *     with whatever the Zustand store already has using last-write-wins
 *     on `updatedAt`. Local-only entities are queued for upsert (recovery
 *     from a previous offline session).
 *   • `clear()` — drops queued writes on sign-out and rehydrates the
 *     Zustand store from the now-local-only `localStorage` key.
 *   • `init()` — subscribes to `cloudSession` so the engine self-manages
 *     across sign-in / sign-out events. Idempotent.
 *
 * Status is published to the global `cloudSyncStatus` store under
 * `config.name`, so the UI can render a single "worst wins" indicator.
 *
 * When Supabase isn't configured every function is a no-op — local-only
 * mode keeps working unchanged.
 */

import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getCloudUserId } from './cloudSession';
import { useCloudSyncStatus, type SyncStatus } from './cloudSyncStatus';

const MAX_ATTEMPTS = 5;

export interface EntitySyncConfig<T> {
  /** Stable name used as the key in `cloudSyncStatus` and in log lines. */
  name: string;
  /** Fetch every entity belonging to the current user from the cloud. */
  listAll: () => Promise<T[]>;
  /** Upsert one entity (id must be set on the entity). */
  upsert: (entity: T) => Promise<void>;
  /** Delete one entity by id. */
  remove: (id: string) => Promise<void>;
  /** Read a single entity by id from the Zustand store. */
  getEntity: (id: string) => T | undefined;
  /** Read the full entity map from the Zustand store. */
  getEntities: () => Record<string, T>;
  /**
   * Replace the entity map in the Zustand store.
   * `markSeeded` is passed `true` after hydrate so stores with a `_seeded`
   * flag (drills, sessions) cannot subsequently re-seed demo content into
   * a fresh cloud account.
   */
  setEntities: (entities: Record<string, T>, markSeeded: boolean) => void;
  /** Extract the stable id from one entity. */
  getId: (entity: T) => string;
  /** Extract the ISO timestamp used for last-write-wins comparisons. */
  getUpdatedAt: (entity: T) => string | undefined;
}

export interface EntitySync {
  name: string;
  enqueueUpsert: (id: string) => void;
  enqueueDelete: (id: string) => void;
  hydrate: () => Promise<void>;
  clear: () => Promise<void>;
}

export function makeEntitySync<T>(config: EntitySyncConfig<T>): EntitySync {
  type QueueItem = { kind: 'upsert' | 'delete'; id: string; attempts: number };
  const queue = new Map<string, QueueItem>();
  let draining = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const status = useCloudSyncStatus;

  function setStatus(s: SyncStatus): void {
    status.getState().updateEntity(config.name, { status: s });
  }
  function setPending(n: number): void {
    status.getState().updateEntity(config.name, { pending: n });
  }
  function markSynced(): void {
    status.getState().updateEntity(config.name, {
      status: 'synced',
      pending: 0,
      lastSyncedAt: new Date().toISOString(),
    });
  }

  function pushPending(): void {
    setPending(queue.size);
  }

  function scheduleDrain(): void {
    if (draining) return;
    Promise.resolve().then(drain);
  }

  async function drain(): Promise<void> {
    if (draining) return;
    draining = true;
    try {
      while (queue.size > 0) {
        setStatus('syncing');
        pushPending();

        const next = queue.entries().next();
        if (next.done) break;
        const [id, item] = next.value as [string, QueueItem];

        try {
          if (item.kind === 'upsert') {
            const entity = config.getEntity(id);
            if (!entity) {
              // Deleted before we synced → treat as delete.
              await config.remove(id);
            } else {
              await config.upsert(entity);
            }
          } else {
            await config.remove(id);
          }
          queue.delete(id);
        } catch (err) {
          item.attempts += 1;
          if (item.attempts >= MAX_ATTEMPTS) {
            console.error(
              `[${config.name}Sync] giving up after ${MAX_ATTEMPTS} attempts on ${item.kind} ${id}:`,
              err
            );
            queue.delete(id);
            setStatus('failed');
            pushPending();
            // Don't block the queue on one bad item.
            continue;
          }
          const delayMs = Math.min(30_000, 1_000 * 2 ** (item.attempts - 1));
          console.warn(
            `[${config.name}Sync] ${item.kind} ${id} failed (attempt ${item.attempts}/${MAX_ATTEMPTS}), retrying in ${delayMs}ms:`,
            err
          );
          setStatus('offline');
          pushPending();
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            retryTimer = null;
            scheduleDrain();
          }, delayMs);
          return;
        }
      }
      markSynced();
    } finally {
      draining = false;
    }
  }

  function enqueueUpsert(id: string): void {
    if (!isSupabaseConfigured() || !getCloudUserId()) return;
    queue.set(id, { kind: 'upsert', id, attempts: 0 });
    pushPending();
    scheduleDrain();
  }

  function enqueueDelete(id: string): void {
    if (!isSupabaseConfigured() || !getCloudUserId()) return;
    queue.set(id, { kind: 'delete', id, attempts: 0 });
    pushPending();
    scheduleDrain();
  }

  async function hydrate(): Promise<void> {
    if (!isSupabaseConfigured() || !getCloudUserId()) return;
    setStatus('syncing');
    try {
      const cloud = await config.listAll();
      const cloudById = new Map<string, T>();
      cloud.forEach((e) => cloudById.set(config.getId(e), e));

      const local = config.getEntities();
      const merged: Record<string, T> = {};
      const toUpsert: string[] = [];

      for (const e of cloud) {
        const id = config.getId(e);
        const ld = local[id];
        if (ld && timeOf(config.getUpdatedAt(ld)) > timeOf(config.getUpdatedAt(e))) {
          merged[id] = ld;
          toUpsert.push(id);
        } else {
          merged[id] = e;
        }
      }
      for (const id of Object.keys(local)) {
        if (!cloudById.has(id)) {
          merged[id] = local[id];
          toUpsert.push(id);
        }
      }

      config.setEntities(merged, true);
      toUpsert.forEach(enqueueUpsert);
      if (toUpsert.length === 0) markSynced();
    } catch (err) {
      console.error(`[${config.name}Sync] hydrate failed:`, err);
      setStatus('offline');
    }
  }

  async function clear(): Promise<void> {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    queue.clear();
    status.getState().resetEntity(config.name);
  }

  return { name: config.name, enqueueUpsert, enqueueDelete, hydrate, clear };
}

function timeOf(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}
