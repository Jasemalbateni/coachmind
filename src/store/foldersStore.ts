'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DrillFolder, FolderSubcategory } from '@/types';

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

const storageImpl = {
  getItem: (name: string) => { if (typeof window === 'undefined') return null; try { return localStorage.getItem(name); } catch { return null; } },
  setItem: (name: string, value: string) => { if (typeof window === 'undefined') return; try { localStorage.setItem(name, value); } catch { /**/ } },
  removeItem: (name: string) => { if (typeof window === 'undefined') return; try { localStorage.removeItem(name); } catch { /**/ } },
};

export const useFoldersStore = create<FoldersState>()(
  persist(
    (set) => ({
      folders: {},
      subcategories: {},

      addFolder: (folder) =>
        set((s) => ({ folders: { ...s.folders, [folder.id]: folder } })),

      updateFolder: (id, name) =>
        set((s) => {
          const f = s.folders[id];
          if (!f) return s;
          return { folders: { ...s.folders, [id]: { ...f, name, updatedAt: new Date().toISOString() } } };
        }),

      deleteFolder: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.folders;
          // Also remove all subcategories belonging to this folder
          const filteredSubs = Object.fromEntries(
            Object.entries(s.subcategories).filter(([, sub]) => sub.folderId !== id)
          );
          return { folders: rest, subcategories: filteredSubs };
        }),

      addSubcategory: (sub) =>
        set((s) => ({ subcategories: { ...s.subcategories, [sub.id]: sub } })),

      updateSubcategory: (id, name) =>
        set((s) => {
          const sub = s.subcategories[id];
          if (!sub) return s;
          return { subcategories: { ...s.subcategories, [id]: { ...sub, name, updatedAt: new Date().toISOString() } } };
        }),

      deleteSubcategory: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.subcategories;
          return { subcategories: rest };
        }),
    }),
    { name: 'coach-folders-v1', storage: createJSONStorage(() => storageImpl) }
  )
);
