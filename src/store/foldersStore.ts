'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DrillFolder, FolderSubcategory } from '@/types';
import { makeNamespacedStorage } from '@/lib/cloud/cloudStorage';
import { getCloudUserId } from '@/lib/cloud/cloudSession';
import {
  enqueueFolderUpsert,
  enqueueFolderDelete,
  enqueueSubcategoryUpsert,
  enqueueSubcategoryDelete,
} from '@/lib/cloud/folderSync';

interface FoldersState {
  folders: Record<string, DrillFolder>;
  subcategories: Record<string, FolderSubcategory>;
  addFolder: (folder: DrillFolder) => void;
  updateFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  addSubcategory: (sub: FolderSubcategory) => void;
  updateSubcategory: (id: string, name: string) => void;
  deleteSubcategory: (id: string) => void;
}

/**
 * Cloud-write helpers. No-op when not signed in so the local-only flow
 * (and Phase A→D) is unchanged.
 *
 * Folder deletion: server-side ON DELETE CASCADE removes any
 * subcategories pointing at the deleted folder. We mirror that locally
 * (deleteFolder cascades in Zustand) so the two views stay in sync.
 * We do NOT enqueue per-subcategory deletes from here — the DB cascade
 * is the source of truth and re-doing the work would just add no-ops.
 */
function syncFolderUpsert(id: string): void {
  if (getCloudUserId()) enqueueFolderUpsert(id);
}
function syncFolderDelete(id: string): void {
  if (getCloudUserId()) enqueueFolderDelete(id);
}
function syncSubUpsert(id: string): void {
  if (getCloudUserId()) enqueueSubcategoryUpsert(id);
}
function syncSubDelete(id: string): void {
  if (getCloudUserId()) enqueueSubcategoryDelete(id);
}

export const useFoldersStore = create<FoldersState>()(
  persist(
    (set) => ({
      folders: {},
      subcategories: {},

      addFolder: (folder) => {
        set((s) => ({ folders: { ...s.folders, [folder.id]: folder } }));
        syncFolderUpsert(folder.id);
      },

      updateFolder: (id, name) => {
        set((s) => {
          const f = s.folders[id];
          if (!f) return s;
          return { folders: { ...s.folders, [id]: { ...f, name, updatedAt: new Date().toISOString() } } };
        });
        syncFolderUpsert(id);
      },

      deleteFolder: (id) => {
        set((s) => {
          const { [id]: _, ...rest } = s.folders;
          // Local cascade — match the DB's ON DELETE CASCADE on
          // folder_subcategories.folder_id.
          const filteredSubs = Object.fromEntries(
            Object.entries(s.subcategories).filter(([, sub]) => sub.folderId !== id)
          );
          return { folders: rest, subcategories: filteredSubs };
        });
        syncFolderDelete(id);
      },

      addSubcategory: (sub) => {
        set((s) => ({ subcategories: { ...s.subcategories, [sub.id]: sub } }));
        syncSubUpsert(sub.id);
      },

      updateSubcategory: (id, name) => {
        set((s) => {
          const sub = s.subcategories[id];
          if (!sub) return s;
          return { subcategories: { ...s.subcategories, [id]: { ...sub, name, updatedAt: new Date().toISOString() } } };
        });
        syncSubUpsert(id);
      },

      deleteSubcategory: (id) => {
        set((s) => {
          const { [id]: _, ...rest } = s.subcategories;
          return { subcategories: rest };
        });
        syncSubDelete(id);
      },
    }),
    {
      name: 'coach-folders-v1',
      storage: createJSONStorage(() => makeNamespacedStorage('coach-folders-v1')),
    }
  )
);
