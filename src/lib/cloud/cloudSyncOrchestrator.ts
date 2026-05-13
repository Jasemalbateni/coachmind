'use client';

/**
 * Cloud-sync orchestrator.
 *
 * Owns the single subscription to `cloudSession`. On every transition
 * between signed-out and signed-in (and vice versa), it:
 *
 *   1. Rehydrates each Zustand store from the namespaced `localStorage`
 *      adapter so the cached per-user state is reflected in memory.
 *      Each store is rehydrated EXACTLY ONCE per transition, which avoids
 *      the race where two entity syncs that share a store (folders +
 *      subcategories) would each rehydrate and clobber the other's
 *      hydrate.
 *
 *   2. Fires `hydrate()` on each entity sync. Two phases:
 *      (a) parent entities: teams, drills, sessions, folders,
 *          subcategories, drill templates.
 *      (b) child entities: season plans (FK → teams) and calendar events
 *          (FKs → teams + sessions). These wait until (a) finishes so
 *          "local-only" rows that get recovery-queued for upsert can
 *          satisfy their foreign keys.
 *
 *   3. On sign-out, drops every queue + resets every status entry.
 *
 * Idempotent: `initCloudSync()` is safe to call multiple times; only the
 * first call wires the listener.
 */

import { isSupabaseConfigured } from '@/lib/supabase/client';
import { onCloudUserChange } from './cloudSession';
import { useDrillsStore } from '@/store/drillsStore';
import { useSessionsStore } from '@/store/sessionsStore';
import { useSeasonPlansStore } from '@/store/seasonPlansStore';
import { useFoldersStore } from '@/store/foldersStore';
import { useTeamsStore } from '@/store/teamsStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useDrillTemplatesStore } from '@/store/drillTemplatesStore';

import { hydrateDrillsFromCloud,           clearDrillCloudState }         from './drillSync';
import { hydrateSessionsFromCloud,         clearSessionCloudState }       from './sessionSync';
import { hydrateSeasonPlansFromCloud,      clearSeasonPlanCloudState }    from './seasonPlanSync';
import {
  hydrateFoldersFromCloud,                  clearFolderCloudState,
  hydrateSubcategoriesFromCloud,            clearSubcategoryCloudState,
} from './folderSync';
import { hydrateTeamsFromCloud,            clearTeamCloudState }          from './teamSync';
import { hydrateCalendarFromCloud,         clearCalendarCloudState }      from './calendarSync';
import { hydrateDrillTemplatesFromCloud,   clearDrillTemplateCloudState } from './drillTemplateSync';

type PersistAware = { persist?: { rehydrate?: () => Promise<void> | void } };

async function rehydrate(store: unknown): Promise<void> {
  const s = store as PersistAware;
  if (s.persist?.rehydrate) await s.persist.rehydrate();
}

async function rehydrateAllStores(): Promise<void> {
  await Promise.all([
    rehydrate(useDrillsStore),
    rehydrate(useSessionsStore),
    rehydrate(useSeasonPlansStore),
    rehydrate(useFoldersStore),
    rehydrate(useTeamsStore),
    rehydrate(useCalendarStore),
    rehydrate(useDrillTemplatesStore),
  ]);
}

let initialized = false;

export function initCloudSync(): void {
  if (initialized) return;
  if (!isSupabaseConfigured()) return;
  initialized = true;

  onCloudUserChange(async (uid) => {
    // 1. Reflect the namespaced localStorage cache into Zustand memory.
    await rehydrateAllStores();

    if (uid) {
      // 2a. Parent entities — no inter-FK between them.
      await Promise.all([
        hydrateTeamsFromCloud(),
        hydrateDrillsFromCloud(),
        hydrateSessionsFromCloud(),
        hydrateFoldersFromCloud(),
        hydrateSubcategoriesFromCloud(),
        hydrateDrillTemplatesFromCloud(),
      ]);

      // 2b. Child entities whose rows reference parents via real FKs.
      //     Running these AFTER 2a means any local-only row queued for
      //     recovery-upsert can find its parent server-side.
      await Promise.all([
        hydrateSeasonPlansFromCloud(),
        hydrateCalendarFromCloud(),
      ]);
    } else {
      // 3. Sign-out: drop queued writes and reset every status entry.
      //    Local-only localStorage is now active again thanks to the
      //    rehydrate in step 1.
      await Promise.all([
        clearDrillCloudState(),
        clearSessionCloudState(),
        clearSeasonPlanCloudState(),
        clearFolderCloudState(),
        clearSubcategoryCloudState(),
        clearTeamCloudState(),
        clearCalendarCloudState(),
        clearDrillTemplateCloudState(),
      ]);
    }
  });
}
