'use client';

/**
 * Drill templates cloud-sync — built on `makeEntitySync`. Templates are
 * append-only in the UI (no in-place edits), so the factory's last-
 * write-wins logic falls back to `createdAt` for ordering — which is
 * fine: no concurrent updates means cloud == local for any common id.
 *
 * Status is published under "drillTemplates" in cloudSyncStatus.
 */

import { useDrillTemplatesStore, type DrillTemplateItem } from '@/store/drillTemplatesStore';
import { makeEntitySync } from './syncFactory';
import * as repo from './repositories/drillTemplates';

const sync = makeEntitySync<DrillTemplateItem>({
  name: 'drillTemplates',
  listAll: repo.listTemplates,
  upsert: repo.upsertTemplate,
  remove: repo.deleteTemplate,
  getEntity: (id) => useDrillTemplatesStore.getState().templates[id],
  getEntities: () => useDrillTemplatesStore.getState().templates,
  // drillTemplatesStore has no `_seeded` flag — markSeeded is ignored here.
  setEntities: (templates) => useDrillTemplatesStore.setState({ templates }),
  getId: (t) => t.id,
  getUpdatedAt: (t) => t.createdAt,
});

export const enqueueDrillTemplateUpsert = sync.enqueueUpsert;
export const enqueueDrillTemplateDelete = sync.enqueueDelete;
export const hydrateDrillTemplatesFromCloud = sync.hydrate;
export const clearDrillTemplateCloudState = sync.clear;
