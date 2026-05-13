'use client';

/**
 * Drill cloud-sync — Phase D semantics, now built on the shared
 * `makeEntitySync` factory introduced in Phase E. Behaviour matches
 * Phase D: optimistic write queue, exponential backoff retry, capped
 * attempts, last-write-wins hydrate.
 *
 * The auth-state listener (rehydrate + hydrate on sign-in, clear on
 * sign-out) is centralised in `cloudSyncOrchestrator.ts` so multiple
 * entity syncs that share a Zustand store don't race on rehydrate.
 *
 * Public API kept stable for drillsStore and existing callers.
 */

import type { Drill } from '@/types';
import { useDrillsStore } from '@/store/drillsStore';
import { makeEntitySync } from './syncFactory';
import * as repo from './repositories/drills';

const sync = makeEntitySync<Drill>({
  name: 'drills',
  listAll: repo.listDrills,
  upsert: repo.upsertDrill,
  remove: repo.deleteDrill,
  getEntity: (id) => useDrillsStore.getState().drills[id],
  getEntities: () => useDrillsStore.getState().drills,
  setEntities: (drills, markSeeded) =>
    useDrillsStore.setState(markSeeded ? { drills, _seeded: true } : { drills }),
  getId: (d) => d.id,
  getUpdatedAt: (d) => d.updatedAt,
});

export const enqueueDrillUpsert = sync.enqueueUpsert;
export const enqueueDrillDelete = sync.enqueueDelete;
export const hydrateDrillsFromCloud = sync.hydrate;
export const clearDrillCloudState = sync.clear;

/**
 * @deprecated Phase D entry point. The unified `initCloudSync()` in
 * `cloudSyncOrchestrator.ts` now wires every entity's hydrate/clear on
 * auth state changes. Kept as a no-op so existing callers don't break.
 */
export function initDrillCloudSync(): void {
  /* see initCloudSync in cloudSyncOrchestrator.ts */
}
