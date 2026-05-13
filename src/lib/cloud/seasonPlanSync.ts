'use client';

/**
 * Season-plans cloud-sync — built on `makeEntitySync`. See syncFactory.ts
 * for queue / retry / hydrate / status semantics. Status is published
 * under the "seasonPlans" key in the global cloudSyncStatus store.
 *
 * Note: a SeasonPlan that is not linked to a team will fail the cloud
 * upsert (the table requires team_id NOT NULL). The factory's retry
 * logic will give up after MAX_ATTEMPTS and surface "Sync failed" rather
 * than spinning forever. The plan stays in the local Zustand state, so
 * the user can fix it by assigning a team — the next mutation re-queues
 * the upsert and the failure clears.
 */

import type { SeasonPlan } from '@/types';
import { useSeasonPlansStore } from '@/store/seasonPlansStore';
import { makeEntitySync } from './syncFactory';
import * as repo from './repositories/seasonPlans';

const sync = makeEntitySync<SeasonPlan>({
  name: 'seasonPlans',
  listAll: repo.listSeasonPlans,
  upsert: repo.upsertSeasonPlan,
  remove: repo.deleteSeasonPlan,
  getEntity: (id) => useSeasonPlansStore.getState().plans[id],
  getEntities: () => useSeasonPlansStore.getState().plans,
  // seasonPlansStore has no `_seeded` flag — markSeeded is ignored here.
  setEntities: (plans) => useSeasonPlansStore.setState({ plans }),
  getId: (p) => p.id,
  getUpdatedAt: (p) => p.updatedAt,
});

export const enqueueSeasonPlanUpsert = sync.enqueueUpsert;
export const enqueueSeasonPlanDelete = sync.enqueueDelete;
export const hydrateSeasonPlansFromCloud = sync.hydrate;
export const clearSeasonPlanCloudState = sync.clear;
