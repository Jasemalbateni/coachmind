'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Session, SessionBlock } from '@/types';
import { buildSeedSessions } from '@/lib/seed';

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

const storageImpl = {
  getItem: (name: string) => { if (typeof window === 'undefined') return null; try { return localStorage.getItem(name); } catch { return null; } },
  setItem: (name: string, value: string) => { if (typeof window === 'undefined') return; try { localStorage.setItem(name, value); } catch { /**/ } },
  removeItem: (name: string) => { if (typeof window === 'undefined') return; try { localStorage.removeItem(name); } catch { /**/ } },
};

export const useSessionsStore = create<SessionsState>()(
  persist(
    (set, get) => ({
      sessions: {},
      _seeded: false,

      seedIfEmpty: (drillIds) => {
        const { sessions, _seeded } = get();
        if (_seeded || Object.keys(sessions).length > 0) return;
        set({ sessions: buildSeedSessions(drillIds), _seeded: true });
      },

      addSession: (session) =>
        set((s) => ({ sessions: { ...s.sessions, [session.id]: session } })),

      updateSession: (id, updates) =>
        set((s) => {
          const existing = s.sessions[id];
          if (!existing) return s;
          return { sessions: { ...s.sessions, [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() } } };
        }),

      deleteSession: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.sessions;
          return { sessions: rest };
        }),

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
        addSession(copy);
        return copy;
      },

      addBlock: (sessionId, block) =>
        set((s) => {
          const session = s.sessions[sessionId];
          if (!session) return s;
          return { sessions: { ...s.sessions, [sessionId]: { ...session, blocks: [...session.blocks, block], updatedAt: new Date().toISOString() } } };
        }),

      updateBlock: (sessionId, blockId, updates) =>
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
        }),

      deleteBlock: (sessionId, blockId) =>
        set((s) => {
          const session = s.sessions[sessionId];
          if (!session) return s;
          return { sessions: { ...s.sessions, [sessionId]: { ...session, blocks: session.blocks.filter((b) => b.id !== blockId), updatedAt: new Date().toISOString() } } };
        }),

      reorderBlocks: (sessionId, blocks) =>
        set((s) => {
          const session = s.sessions[sessionId];
          if (!session) return s;
          return { sessions: { ...s.sessions, [sessionId]: { ...session, blocks, updatedAt: new Date().toISOString() } } };
        }),
    }),
    { name: 'coach-sessions-v2', storage: createJSONStorage(() => storageImpl) }
  )
);
