'use client';

/**
 * Sessions cloud-sync — same semantics as drillSync (see syncFactory.ts).
 * Optimistic write queue + exponential backoff retry + last-write-wins
 * hydrate; status published under the "sessions" key in the global
 * `cloudSyncStatus` store.
 */

import type { Session } from '@/types';
import { useSessionsStore } from '@/store/sessionsStore';
import { makeEntitySync } from './syncFactory';
import * as repo from './repositories/sessions';

const sync = makeEntitySync<Session>({
  name: 'sessions',
  listAll: repo.listSessions,
  upsert: repo.upsertSession,
  remove: repo.deleteSession,
  getEntity: (id) => useSessionsStore.getState().sessions[id],
  getEntities: () => useSessionsStore.getState().sessions,
  setEntities: (sessions, markSeeded) =>
    useSessionsStore.setState(markSeeded ? { sessions, _seeded: true } : { sessions }),
  getId: (s) => s.id,
  getUpdatedAt: (s) => s.updatedAt,
});

export const enqueueSessionUpsert = sync.enqueueUpsert;
export const enqueueSessionDelete = sync.enqueueDelete;
export const hydrateSessionsFromCloud = sync.hydrate;
export const clearSessionCloudState = sync.clear;
