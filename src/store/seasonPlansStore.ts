'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SeasonPlan, SeasonPlanEntry } from '@/types';
import { makeNamespacedStorage } from '@/lib/cloud/cloudStorage';
import { getCloudUserId } from '@/lib/cloud/cloudSession';
import { enqueueSeasonPlanUpsert, enqueueSeasonPlanDelete } from '@/lib/cloud/seasonPlanSync';

interface SeasonPlansState {
  plans: Record<string, SeasonPlan>;

  addPlan: (plan: SeasonPlan) => void;
  updatePlan: (id: string, updates: Partial<Omit<SeasonPlan, 'id' | 'createdAt'>>) => void;
  deletePlan: (id: string) => void;
  upsertEntry: (planId: string, entry: SeasonPlanEntry) => void;
  deleteEntry: (planId: string, entryId: string) => void;
}

/**
 * Cloud-write helpers. No-op when not signed in so the local-only flow
 * is unchanged. Mutations to a plan's `entries[]` count as a plan-level
 * change — the array lives inside `data` jsonb so a whole-plan upsert
 * is the cheapest way to persist it.
 */
function syncUpsert(planId: string): void {
  if (getCloudUserId()) enqueueSeasonPlanUpsert(planId);
}
function syncDelete(planId: string): void {
  if (getCloudUserId()) enqueueSeasonPlanDelete(planId);
}

export const useSeasonPlansStore = create<SeasonPlansState>()(
  persist(
    (set, get) => ({
      plans: {},

      addPlan: (plan) => {
        set((s) => ({ plans: { ...s.plans, [plan.id]: plan } }));
        syncUpsert(plan.id);
      },

      updatePlan: (id, updates) => {
        set((s) => {
          const p = s.plans[id];
          if (!p) return s;
          return { plans: { ...s.plans, [id]: { ...p, ...updates, updatedAt: new Date().toISOString() } } };
        });
        if (get().plans[id]) syncUpsert(id);
      },

      deletePlan: (id) => {
        set((s) => {
          const { [id]: _, ...rest } = s.plans;
          return { plans: rest };
        });
        syncDelete(id);
      },

      upsertEntry: (planId, entry) => {
        set((s) => {
          const p = s.plans[planId];
          if (!p) return s;
          const exists = p.entries.findIndex((e) => e.id === entry.id) !== -1;
          const entries = exists
            ? p.entries.map((e) => e.id === entry.id ? entry : e)
            : [...p.entries, entry];
          return { plans: { ...s.plans, [planId]: { ...p, entries, updatedAt: new Date().toISOString() } } };
        });
        if (get().plans[planId]) syncUpsert(planId);
      },

      deleteEntry: (planId, entryId) => {
        set((s) => {
          const p = s.plans[planId];
          if (!p) return s;
          return { plans: { ...s.plans, [planId]: { ...p, entries: p.entries.filter((e) => e.id !== entryId), updatedAt: new Date().toISOString() } } };
        });
        if (get().plans[planId]) syncUpsert(planId);
      },
    }),
    {
      name: 'coach-season-plans-v1',
      storage: createJSONStorage(() => makeNamespacedStorage('coach-season-plans-v1')),
    }
  )
);
