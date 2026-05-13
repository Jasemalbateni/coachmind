'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Drill, CanvasObject, DrillStep } from '@/types';
import { buildSeedDrills } from '@/lib/seed';
import { drillsZustandStorage } from '@/lib/cloud/drillStorage';
import { getCloudUserId } from '@/lib/cloud/cloudSession';
import { enqueueDrillUpsert, enqueueDrillDelete } from '@/lib/cloud/drillSync';

interface DrillsState {
  drills: Record<string, Drill>;
  _seeded: boolean;

  seedIfEmpty: () => void;
  addDrill: (drill: Drill) => void;
  updateDrill: (id: string, updates: Partial<Omit<Drill, 'id' | 'createdAt'>>) => void;
  deleteDrill: (id: string) => void;
  duplicateDrill: (id: string) => Drill | null;
  addObject: (drillId: string, obj: CanvasObject) => void;
  updateObject: (drillId: string, objId: string, updates: Partial<CanvasObject>) => void;
  deleteObject: (drillId: string, objId: string) => void;
  setObjects: (drillId: string, objects: CanvasObject[]) => void;
  // Steps
  addDrillStep: (drillId: string, step: DrillStep) => void;
  setStepObjects: (drillId: string, stepId: string, objects: CanvasObject[]) => void;
  updateDrillStepLabel: (drillId: string, stepId: string, label: string) => void;
  removeDrillStep: (drillId: string, stepId: string) => void;
  // Favorites
  toggleFavorite: (drillId: string) => void;
}

/**
 * Mutating helpers all funnel through `syncUpsert` / `syncDelete` so the
 * Supabase write fires exactly once per logical change. When the user is
 * signed out, both helpers are no-ops (cloudSession returns null) and the
 * store behaves exactly like the original local-only implementation.
 */
function syncUpsert(id: string): void {
  if (getCloudUserId()) enqueueDrillUpsert(id);
}
function syncDelete(id: string): void {
  if (getCloudUserId()) enqueueDrillDelete(id);
}

export const useDrillsStore = create<DrillsState>()(
  persist(
    (set, get) => ({
      drills: {},
      _seeded: false,

      /**
       * Populate the store with demo drills if empty. Suppressed entirely
       * when a cloud user is present — fresh accounts must start clean,
       * not with the sample data we ship for local-only / offline users.
       */
      seedIfEmpty: () => {
        if (getCloudUserId()) return;
        const { drills, _seeded } = get();
        if (_seeded || Object.keys(drills).length > 0) return;
        set({ drills: buildSeedDrills(), _seeded: true });
      },

      addDrill: (drill) => {
        set((s) => ({ drills: { ...s.drills, [drill.id]: drill } }));
        syncUpsert(drill.id);
      },

      updateDrill: (id, updates) => {
        set((s) => {
          const existing = s.drills[id];
          if (!existing) return s;
          return { drills: { ...s.drills, [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() } } };
        });
        if (get().drills[id]) syncUpsert(id);
      },

      deleteDrill: (id) => {
        set((s) => {
          const { [id]: _, ...rest } = s.drills;
          return { drills: rest };
        });
        syncDelete(id);
      },

      duplicateDrill: (id) => {
        const { drills, addDrill } = get();
        const original = drills[id];
        if (!original) return null;
        const copy: Drill = {
          ...original,
          id: crypto.randomUUID(),
          title: `${original.title} (copy)`,
          objects: original.objects.map((o) => ({ ...o, id: crypto.randomUUID() })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addDrill(copy); // already enqueues
        return copy;
      },

      addObject: (drillId, obj) => {
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return { drills: { ...s.drills, [drillId]: { ...d, objects: [...d.objects, obj], updatedAt: new Date().toISOString() } } };
        });
        if (get().drills[drillId]) syncUpsert(drillId);
      },

      updateObject: (drillId, objId, updates) => {
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return {
            drills: {
              ...s.drills,
              [drillId]: {
                ...d,
                objects: d.objects.map((o) => o.id === objId ? ({ ...o, ...updates } as CanvasObject) : o),
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
        if (get().drills[drillId]) syncUpsert(drillId);
      },

      deleteObject: (drillId, objId) => {
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return { drills: { ...s.drills, [drillId]: { ...d, objects: d.objects.filter((o) => o.id !== objId), updatedAt: new Date().toISOString() } } };
        });
        if (get().drills[drillId]) syncUpsert(drillId);
      },

      setObjects: (drillId, objects) => {
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return { drills: { ...s.drills, [drillId]: { ...d, objects, updatedAt: new Date().toISOString() } } };
        });
        if (get().drills[drillId]) syncUpsert(drillId);
      },

      addDrillStep: (drillId, step) => {
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return { drills: { ...s.drills, [drillId]: { ...d, steps: [...(d.steps ?? []), step], updatedAt: new Date().toISOString() } } };
        });
        if (get().drills[drillId]) syncUpsert(drillId);
      },

      setStepObjects: (drillId, stepId, objects) => {
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          const steps = (d.steps ?? []).map((st) => st.id === stepId ? { ...st, objects } : st);
          return { drills: { ...s.drills, [drillId]: { ...d, steps, updatedAt: new Date().toISOString() } } };
        });
        if (get().drills[drillId]) syncUpsert(drillId);
      },

      updateDrillStepLabel: (drillId, stepId, label) => {
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          const steps = (d.steps ?? []).map((st) => st.id === stepId ? { ...st, label } : st);
          return { drills: { ...s.drills, [drillId]: { ...d, steps, updatedAt: new Date().toISOString() } } };
        });
        if (get().drills[drillId]) syncUpsert(drillId);
      },

      removeDrillStep: (drillId, stepId) => {
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return { drills: { ...s.drills, [drillId]: { ...d, steps: (d.steps ?? []).filter((st) => st.id !== stepId), updatedAt: new Date().toISOString() } } };
        });
        if (get().drills[drillId]) syncUpsert(drillId);
      },

      toggleFavorite: (drillId) => {
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return { drills: { ...s.drills, [drillId]: { ...d, isFavorite: !d.isFavorite, updatedAt: new Date().toISOString() } } };
        });
        if (get().drills[drillId]) syncUpsert(drillId);
      },
    }),
    {
      name: 'coach-drills-v2',
      // Per-user namespaced storage — see src/lib/cloud/drillStorage.ts.
      // When signed-out, this writes to "coach-drills-v2" (unchanged).
      // When signed-in,  this writes to "coach-drills-v2:user-<id>".
      storage: createJSONStorage(() => drillsZustandStorage),
    }
  )
);
