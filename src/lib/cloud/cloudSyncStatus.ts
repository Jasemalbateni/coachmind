'use client';

/**
 * Global sync-status store — one entry per cloud-synced entity type
 * (drills, sessions, plans, folders, subcategories). Each entity sync
 * publishes its status here; the UI subscribes once and renders a
 * combined view.
 *
 *   synced  — queue empty, last write succeeded
 *   syncing — actively flushing pending writes
 *   offline — last write failed, backing off and retrying
 *   failed  — gave up on an item after max attempts
 *
 * The combined status (see `combineStatuses`) is "worst wins":
 *   any failed   → failed
 *   else any offline → offline
 *   else any syncing → syncing
 *   else             → synced
 */

import { create } from 'zustand';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'failed';

export interface SyncEntry {
  status: SyncStatus;
  pending: number;
  lastSyncedAt: string | null;
}

interface CloudSyncStatusState {
  entries: Record<string, SyncEntry>;
  updateEntity: (name: string, partial: Partial<SyncEntry>) => void;
  resetEntity: (name: string) => void;
}

const EMPTY_ENTRY: SyncEntry = { status: 'synced', pending: 0, lastSyncedAt: null };

export const useCloudSyncStatus = create<CloudSyncStatusState>((set) => ({
  entries: {},
  updateEntity: (name, partial) =>
    set((s) => ({
      entries: {
        ...s.entries,
        [name]: { ...EMPTY_ENTRY, ...s.entries[name], ...partial },
      },
    })),
  resetEntity: (name) =>
    set((s) => ({
      entries: { ...s.entries, [name]: { ...EMPTY_ENTRY } },
    })),
}));

/** "Worst wins" rollup across every entry. */
export function combineStatuses(entries: Record<string, SyncEntry>): {
  status: SyncStatus;
  pending: number;
  lastSyncedAt: string | null;
} {
  const values = Object.values(entries);
  if (values.length === 0) return { status: 'synced', pending: 0, lastSyncedAt: null };

  const pending = values.reduce((sum, e) => sum + e.pending, 0);

  let status: SyncStatus = 'synced';
  for (const e of values) {
    if (e.status === 'failed') {
      status = 'failed';
      break;
    }
    // status here is 'synced' | 'syncing' | 'offline' — never 'failed' (we
    // would have broken out above). Offline trumps syncing trumps synced.
    if (e.status === 'offline') status = 'offline';
    else if (e.status === 'syncing' && status === 'synced') status = 'syncing';
  }

  // Most-recent successful sync across all entities (best wins for this one).
  const last = values
    .map((e) => (e.lastSyncedAt ? Date.parse(e.lastSyncedAt) : 0))
    .reduce((a, b) => (a > b ? a : b), 0);
  const lastSyncedAt = last > 0 ? new Date(last).toISOString() : null;

  return { status, pending, lastSyncedAt };
}
