'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CalendarEvent } from '@/types';
import { makeNamespacedStorage } from '@/lib/cloud/cloudStorage';
import { getCloudUserId } from '@/lib/cloud/cloudSession';
import { enqueueCalendarUpsert, enqueueCalendarDelete } from '@/lib/cloud/calendarSync';

interface CalendarState {
  events: Record<string, CalendarEvent>;

  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  bulkAddEvents: (events: CalendarEvent[]) => void;
  /** Upsert a calendar event linked to a season plan entry. Creates or updates. */
  syncSeasonPlanEntry: (entryId: string, date: string, title: string, teamId?: string, sessionId?: string) => void;
  /** Remove the calendar event that was created from a season plan entry. */
  clearSeasonPlanEntry: (entryId: string) => void;
}

/** Stamp every mutation with a fresh updatedAt so cloud sync can pick the
 *  newer side on hydrate. */
function stamp<T extends CalendarEvent>(event: T): T {
  return { ...event, updatedAt: new Date().toISOString() };
}

function syncUpsert(id: string): void {
  if (getCloudUserId()) enqueueCalendarUpsert(id);
}
function syncDelete(id: string): void {
  if (getCloudUserId()) enqueueCalendarDelete(id);
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: {},

      addEvent: (event) => {
        const stamped = stamp(event);
        set((s) => ({ events: { ...s.events, [stamped.id]: stamped } }));
        syncUpsert(stamped.id);
      },

      updateEvent: (id, updates) => {
        set((s) => {
          const e = s.events[id];
          if (!e) return s;
          return { events: { ...s.events, [id]: stamp({ ...e, ...updates }) } };
        });
        if (get().events[id]) syncUpsert(id);
      },

      deleteEvent: (id) => {
        set((s) => {
          const { [id]: _, ...rest } = s.events;
          return { events: rest };
        });
        syncDelete(id);
      },

      bulkAddEvents: (events) => {
        const now = new Date().toISOString();
        set((s) => {
          const map: Record<string, CalendarEvent> = { ...s.events };
          events.forEach((e) => { map[e.id] = { ...e, updatedAt: e.updatedAt ?? now }; });
          return { events: map };
        });
        // Enqueue each event for cloud sync individually so a single bad
        // event doesn't block the rest.
        if (getCloudUserId()) events.forEach((e) => syncUpsert(e.id));
      },

      syncSeasonPlanEntry: (entryId, date, title, teamId, sessionId) => {
        const existing = Object.values(get().events).find((e) => e.seasonPlanEntryId === entryId);
        const ev: CalendarEvent = stamp({
          id: existing?.id ?? crypto.randomUUID(),
          title,
          date,
          type: 'training',
          teamId: teamId || undefined,
          sessionId: sessionId || undefined,
          seasonPlanEntryId: entryId,
          status: existing?.status ?? 'planned',
        });
        set((s) => ({ events: { ...s.events, [ev.id]: ev } }));
        syncUpsert(ev.id);
      },

      clearSeasonPlanEntry: (entryId) => {
        const existing = Object.values(get().events).find((e) => e.seasonPlanEntryId === entryId);
        if (!existing) return;
        set((s) => {
          const { [existing.id]: _, ...rest } = s.events;
          return { events: rest };
        });
        syncDelete(existing.id);
      },
    }),
    {
      name: 'coach-calendar-v1',
      storage: createJSONStorage(() => makeNamespacedStorage('coach-calendar-v1')),
    }
  )
);
