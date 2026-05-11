'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CalendarEvent } from '@/types';

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

const storageImpl = {
  getItem: (name: string) => { if (typeof window === 'undefined') return null; try { return localStorage.getItem(name); } catch { return null; } },
  setItem: (name: string, value: string) => { if (typeof window === 'undefined') return; try { localStorage.setItem(name, value); } catch { /**/ } },
  removeItem: (name: string) => { if (typeof window === 'undefined') return; try { localStorage.removeItem(name); } catch { /**/ } },
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      events: {},

      addEvent: (event) =>
        set((s) => ({ events: { ...s.events, [event.id]: event } })),

      updateEvent: (id, updates) =>
        set((s) => {
          const e = s.events[id];
          if (!e) return s;
          return { events: { ...s.events, [id]: { ...e, ...updates } } };
        }),

      deleteEvent: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.events;
          return { events: rest };
        }),

      bulkAddEvents: (events) =>
        set((s) => {
          const map: Record<string, CalendarEvent> = { ...s.events };
          events.forEach((e) => { map[e.id] = e; });
          return { events: map };
        }),

      syncSeasonPlanEntry: (entryId, date, title, teamId, sessionId) =>
        set((s) => {
          const existing = Object.values(s.events).find((e) => e.seasonPlanEntryId === entryId);
          const ev: CalendarEvent = {
            id: existing?.id ?? crypto.randomUUID(),
            title,
            date,
            type: 'training',
            teamId: teamId || undefined,
            sessionId: sessionId || undefined,
            seasonPlanEntryId: entryId,
            status: existing?.status ?? 'planned',
          };
          return { events: { ...s.events, [ev.id]: ev } };
        }),

      clearSeasonPlanEntry: (entryId) =>
        set((s) => {
          const existing = Object.values(s.events).find((e) => e.seasonPlanEntryId === entryId);
          if (!existing) return s;
          const { [existing.id]: _, ...rest } = s.events;
          return { events: rest };
        }),
    }),
    { name: 'coach-calendar-v1', storage: createJSONStorage(() => storageImpl) }
  )
);
