'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Drill } from '@/types';
import { makeNamespacedStorage } from '@/lib/cloud/cloudStorage';
import { getCloudUserId } from '@/lib/cloud/cloudSession';
import { enqueueDrillTemplateUpsert, enqueueDrillTemplateDelete } from '@/lib/cloud/drillTemplateSync';

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

function syncUpsert(id: string): void {
  if (getCloudUserId()) enqueueDrillTemplateUpsert(id);
}
function syncDelete(id: string): void {
  if (getCloudUserId()) enqueueDrillTemplateDelete(id);
}

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
        syncUpsert(item.id);
        return item;
      },

      deleteTemplate: (id) => {
        set((s) => {
          const { [id]: _, ...rest } = s.templates;
          return { templates: rest };
        });
        syncDelete(id);
      },
    }),
    {
      name: 'coach-drill-templates-v1',
      storage: createJSONStorage(() => makeNamespacedStorage('coach-drill-templates-v1')),
    }
  )
);
