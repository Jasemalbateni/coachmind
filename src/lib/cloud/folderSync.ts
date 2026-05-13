'use client';

/**
 * Folders + subcategories cloud-sync.
 *
 * Two independent entity-sync engines that both write into the single
 * `foldersStore` (which carries both folders and subcategories in one
 * Zustand store). Each engine has its own queue and status under
 * "folders" and "subcategories" in `cloudSyncStatus`, but they share a
 * single rehydrate (handled by `cloudSyncOrchestrator`).
 *
 * Important: setEntities for each engine touches ONLY its slice of the
 * store state. That keeps folder hydrate and subcategory hydrate from
 * clobbering each other when they finish in any order.
 */

import type { DrillFolder, FolderSubcategory } from '@/types';
import { useFoldersStore } from '@/store/foldersStore';
import { makeEntitySync } from './syncFactory';
import * as repo from './repositories/folders';

// ─── Folders ───────────────────────────────────────────────────────────────

const folders = makeEntitySync<DrillFolder>({
  name: 'folders',
  listAll: repo.listFolders,
  upsert: repo.upsertFolder,
  remove: repo.deleteFolder,
  getEntity: (id) => useFoldersStore.getState().folders[id],
  getEntities: () => useFoldersStore.getState().folders,
  // markSeeded is ignored — foldersStore has no `_seeded` flag.
  setEntities: (foldersMap) => useFoldersStore.setState({ folders: foldersMap }),
  getId: (f) => f.id,
  getUpdatedAt: (f) => f.updatedAt,
});

export const enqueueFolderUpsert = folders.enqueueUpsert;
export const enqueueFolderDelete = folders.enqueueDelete;
export const hydrateFoldersFromCloud = folders.hydrate;
export const clearFolderCloudState = folders.clear;

// ─── Subcategories ─────────────────────────────────────────────────────────

const subs = makeEntitySync<FolderSubcategory>({
  name: 'subcategories',
  listAll: repo.listSubcategories,
  upsert: repo.upsertSubcategory,
  remove: repo.deleteSubcategory,
  getEntity: (id) => useFoldersStore.getState().subcategories[id],
  getEntities: () => useFoldersStore.getState().subcategories,
  setEntities: (subsMap) => useFoldersStore.setState({ subcategories: subsMap }),
  getId: (s) => s.id,
  getUpdatedAt: (s) => s.updatedAt,
});

export const enqueueSubcategoryUpsert = subs.enqueueUpsert;
export const enqueueSubcategoryDelete = subs.enqueueDelete;
export const hydrateSubcategoriesFromCloud = subs.hydrate;
export const clearSubcategoryCloudState = subs.clear;
