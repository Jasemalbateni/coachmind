'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Session, SessionBlock } from '@/types';
import { buildSeedSessions } from '@/lib/seed';
import { makeNamespacedStorage } from '@/lib/cloud/cloudStorage';
import { getCloudUserId } from '@/lib/cloud/cloudSession';
import { enqueueSessionUpsert, enqueueSessionDelete } from '@/lib/cloud/sessionSync';

interface SessionsState {
  sessions: Record<string, Session>;
  _seeded: boolean;

  seedIfEmpty: (drillIds: string[]) => void;
  addSession: (session: Session) => void;
  updateSession: (id: string, updates: Partial<Omit<Session, 'id' | 'createdAt'>>) => void;
  deleteSession: (id: string) => void;
  duplicateSession: (id: string) => Session | null;
  addBlock: (sessionId: string, block: SessionBlock) => void;
  updateBlock: (sessionId: string, blockId: string, updates: Partial<SessionBlock>) => void;
  deleteBlock: (sessionId: string, blockId: string) => void;
  reorderBlocks: (sessionId: string, blocks: SessionBlock[]) => void;
}

/**
 * Funnel every cloud write through these helpers so a single mutation
 * upserts exactly once. Both are no-ops when not signed in, so the local-
 * only behaviour of the store is unchanged.
 */
function syncUpsert(id: string): void {
  if (getCloudUserId()) enqueueSessionUpsert(id);
}
function syncDelete(id: string): void {
  if (getCloudUserId()) enqueueSessionDelete(id);
}

export const useSessionsStore = create<SessionsState>()(
  persist(
    (set, get) => ({
      sessions: {},
      _seeded: false,

      /**
       * Demo seed for the local-only experience. Suppressed when signed-in
       * so fresh cloud accounts start clean.
       */
      seedIfEmpty: (drillIds) => {
        if (getCloudUserId()) return;
        const { sessions, _seeded } = get();
        if (_seeded || Object.keys(sessions).length > 0) return;
        set({ sessions: buildSeedSessions(drillIds), _seeded: true });
      },

      addSession: (session) => {
        set((s) => ({ sessions: { ...s.sessions, [session.id]: session } }));
        syncUpsert(session.id);
      },

      updateSession: (id, updates) => {
        set((s) => {
          const existing = s.sessions[id];
          if (!existing) return s;
          return { sessions: { ...s.sessions, [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() } } };
        });
        if (get().sessions[id]) syncUpsert(id);
      },

      deleteSession: (id) => {
        set((s) => {
          const { [id]: _, ...rest } = s.sessions;
          return { sessions: rest };
        });
        syncDelete(id);
      },

      duplicateSession: (id) => {
        const { sessions, addSession } = get();
        const original = sessions[id];
        if (!original) return null;
        const copy: Session = {
          ...original,
          id: crypto.randomUUID(),
          title: `${original.title} (copy)`,
          blocks: original.blocks.map((b) => ({ ...b, id: crypto.randomUUID() })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addSession(copy); // already enqueues
        return copy;
      },

      addBlock: (sessionId, block) => {
        set((s) => {
          const session = s.sessions[sessionId];
          if (!session) return s;
          return { sessions: { ...s.sessions, [sessionId]: { ...session, blocks: [...session.blocks, block], updatedAt: new Date().toISOString() } } };
        });
        if (get().sessions[sessionId]) syncUpsert(sessionId);
      },

      updateBlock: (sessionId, blockId, updates) => {
        set((s) => {
          const session = s.sessions[sessionId];
          if (!session) return s;
          return {
            sessions: {
              ...s.sessions,
              [sessionId]: {
                ...session,
                blocks: session.blocks.map((b) => b.id === blockId ? { ...b, ...updates } : b),
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
        if (get().sessions[sessionId]) syncUpsert(sessionId);
      },

      deleteBlock: (sessionId, blockId) => {
        set((s) => {
          const session = s.sessions[sessionId];
          if (!session) return s;
          return { sessions: { ...s.sessions, [sessionId]: { ...session, blocks: session.blocks.filter((b) => b.id !== blockId), updatedAt: new Date().toISOString() } } };
        });
        if (get().sessions[sessionId]) syncUpsert(sessionId);
      },

      reorderBlocks: (sessionId, blocks) => {
        set((s) => {
          const session = s.sessions[sessionId];
          if (!session) return s;
          return { sessions: { ...s.sessions, [sessionId]: { ...session, blocks, updatedAt: new Date().toISOString() } } };
        });
        if (get().sessions[sessionId]) syncUpsert(sessionId);
      },
    }),
    {
      name: 'coach-sessions-v2',
      storage: createJSONStorage(() => makeNamespacedStorage('coach-sessions-v2')),
    }
  )
);
