'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Drill } from '@/types';

export interface DrillTemplateItem {
  id: string;
  title: string;
  createdAt: string;
  drill: Drill;
}

interface DrillTemplatesState {
  templates: Record<string, DrillTemplateItem>;
  addTemplate: (drill: Drill) => DrillTemplateItem;
  deleteTemplate: (id: string) => void;
}

const storageImpl = {
  getItem: (name: string) => { if (typeof window === 'undefined') return null; try { return localStorage.getItem(name); } catch { return null; } },
  setItem: (name: string, value: string) => { if (typeof window === 'undefined') return; try { localStorage.setItem(name, value); } catch { /**/ } },
  removeItem: (name: string) => { if (typeof window === 'undefined') return; try { localStorage.removeItem(name); } catch { /**/ } },
};

export const useDrillTemplatesStore = create<DrillTemplatesState>()(
  persist(
    (set) => ({
      templates: {},

      addTemplate: (drill) => {
        const item: DrillTemplateItem = {
          id: crypto.randomUUID(),
          title: drill.title,
          createdAt: new Date().toISOString(),
          drill,
        };
        set((s) => ({ templates: { ...s.templates, [item.id]: item } }));
        return item;
      },

      deleteTemplate: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.templates;
          return { templates: rest };
        }),
    }),
    { name: 'coach-drill-templates-v1', storage: createJSONStorage(() => storageImpl) }
  )
);
