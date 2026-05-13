'use client';

/**
 * Calendar events cloud-sync — built on `makeEntitySync`.
 * Status published under "calendar" in cloudSyncStatus.
 *
 * Calendar events are flat relational rows (no jsonb), so the row mapper
 * does the field-by-field translation in `repositories/calendar.ts`. The
 * sync engine itself is the same factory used by every other entity.
 */

import type { CalendarEvent } from '@/types';
import { useCalendarStore } from '@/store/calendarStore';
import { makeEntitySync } from './syncFactory';
import * as repo from './repositories/calendar';

const sync = makeEntitySync<CalendarEvent>({
  name: 'calendar',
  listAll: repo.listEvents,
  upsert: repo.upsertEvent,
  remove: repo.deleteEvent,
  getEntity: (id) => useCalendarStore.getState().events[id],
  getEntities: () => useCalendarStore.getState().events,
  // calendarStore has no `_seeded` flag — markSeeded is ignored here.
  setEntities: (events) => useCalendarStore.setState({ events }),
  getId: (e) => e.id,
  getUpdatedAt: (e) => e.updatedAt,
});

export const enqueueCalendarUpsert = sync.enqueueUpsert;
export const enqueueCalendarDelete = sync.enqueueDelete;
export const hydrateCalendarFromCloud = sync.hydrate;
export const clearCalendarCloudState = sync.clear;
