'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Drill, CanvasObject, DrillStep } from '@/types';
import { buildSeedDrills } from '@/lib/seed';

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

const storageImpl = {
  getItem: (name: string) => { if (typeof window === 'undefined') return null; try { return localStorage.getItem(name); } catch { return null; } },
  setItem: (name: string, value: string) => { if (typeof window === 'undefined') return; try { localStorage.setItem(name, value); } catch { /**/ } },
  removeItem: (name: string) => { if (typeof window === 'undefined') return; try { localStorage.removeItem(name); } catch { /**/ } },
};

export const useDrillsStore = create<DrillsState>()(
  persist(
    (set, get) => ({
      drills: {},
      _seeded: false,

      seedIfEmpty: () => {
        const { drills, _seeded } = get();
        if (_seeded || Object.keys(drills).length > 0) return;
        set({ drills: buildSeedDrills(), _seeded: true });
      },

      addDrill: (drill) =>
        set((s) => ({ drills: { ...s.drills, [drill.id]: drill } })),

      updateDrill: (id, updates) =>
        set((s) => {
          const existing = s.drills[id];
          if (!existing) return s;
          return { drills: { ...s.drills, [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() } } };
        }),

      deleteDrill: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.drills;
          return { drills: rest };
        }),

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
        addDrill(copy);
        return copy;
      },

      addObject: (drillId, obj) =>
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return { drills: { ...s.drills, [drillId]: { ...d, objects: [...d.objects, obj], updatedAt: new Date().toISOString() } } };
        }),

      updateObject: (drillId, objId, updates) =>
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
        }),

      deleteObject: (drillId, objId) =>
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return { drills: { ...s.drills, [drillId]: { ...d, objects: d.objects.filter((o) => o.id !== objId), updatedAt: new Date().toISOString() } } };
        }),

      setObjects: (drillId, objects) =>
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return { drills: { ...s.drills, [drillId]: { ...d, objects, updatedAt: new Date().toISOString() } } };
        }),

      addDrillStep: (drillId, step) =>
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return { drills: { ...s.drills, [drillId]: { ...d, steps: [...(d.steps ?? []), step], updatedAt: new Date().toISOString() } } };
        }),

      setStepObjects: (drillId, stepId, objects) =>
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          const steps = (d.steps ?? []).map((st) => st.id === stepId ? { ...st, objects } : st);
          return { drills: { ...s.drills, [drillId]: { ...d, steps, updatedAt: new Date().toISOString() } } };
        }),

      updateDrillStepLabel: (drillId, stepId, label) =>
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          const steps = (d.steps ?? []).map((st) => st.id === stepId ? { ...st, label } : st);
          return { drills: { ...s.drills, [drillId]: { ...d, steps, updatedAt: new Date().toISOString() } } };
        }),

      removeDrillStep: (drillId, stepId) =>
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return { drills: { ...s.drills, [drillId]: { ...d, steps: (d.steps ?? []).filter((st) => st.id !== stepId), updatedAt: new Date().toISOString() } } };
        }),

      toggleFavorite: (drillId) =>
        set((s) => {
          const d = s.drills[drillId];
          if (!d) return s;
          return { drills: { ...s.drills, [drillId]: { ...d, isFavorite: !d.isFavorite, updatedAt: new Date().toISOString() } } };
        }),
    }),
    { name: 'coach-drills-v2', storage: createJSONStorage(() => storageImpl) }
  )
);
