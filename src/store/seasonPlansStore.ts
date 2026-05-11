'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SeasonPlan, SeasonPlanEntry } from '@/types';

interface SeasonPlansState {
  plans: Record<string, SeasonPlan>;

  addPlan: (plan: SeasonPlan) => void;
  updatePlan: (id: string, updates: Partial<Omit<SeasonPlan, 'id' | 'createdAt'>>) => void;
  deletePlan: (id: string) => void;
  upsertEntry: (planId: string, entry: SeasonPlanEntry) => void;
  deleteEntry: (planId: string, entryId: string) => void;
}

const storageImpl = {
  getItem: (name: string) => { if (typeof window === 'undefined') return null; try { return localStorage.getItem(name); } catch { return null; } },
  setItem: (name: string, value: string) => { if (typeof window === 'undefined') return; try { localStorage.setItem(name, value); } catch { /**/ } },
  removeItem: (name: string) => { if (typeof window === 'undefined') return; try { localStorage.removeItem(name); } catch { /**/ } },
};

export const useSeasonPlansStore = create<SeasonPlansState>()(
  persist(
    (set) => ({
      plans: {},

      addPlan: (plan) =>
        set((s) => ({ plans: { ...s.plans, [plan.id]: plan } })),

      updatePlan: (id, updates) =>
        set((s) => {
          const p = s.plans[id];
          if (!p) return s;
          return { plans: { ...s.plans, [id]: { ...p, ...updates, updatedAt: new Date().toISOString() } } };
        }),

      deletePlan: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.plans;
          return { plans: rest };
        }),

      upsertEntry: (planId, entry) =>
        set((s) => {
          const p = s.plans[planId];
          if (!p) return s;
          const exists = p.entries.findIndex((e) => e.id === entry.id) !== -1;
          const entries = exists
            ? p.entries.map((e) => e.id === entry.id ? entry : e)
            : [...p.entries, entry];
          return { plans: { ...s.plans, [planId]: { ...p, entries, updatedAt: new Date().toISOString() } } };
        }),

      deleteEntry: (planId, entryId) =>
        set((s) => {
          const p = s.plans[planId];
          if (!p) return s;
          return { plans: { ...s.plans, [planId]: { ...p, entries: p.entries.filter((e) => e.id !== entryId), updatedAt: new Date().toISOString() } } };
        }),
    }),
    { name: 'coach-season-plans-v1', storage: createJSONStorage(() => storageImpl) }
  )
);
