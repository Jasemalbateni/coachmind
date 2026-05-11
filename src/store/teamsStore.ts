'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Team, TeamPlayer } from '@/types';
import { buildSeedTeams } from '@/lib/seed';

interface TeamsState {
  teams: Record<string, Team>;
  _seeded: boolean;

  seedIfEmpty: () => void;
  addTeam: (team: Team) => void;
  updateTeam: (id: string, updates: Partial<Omit<Team, 'id' | 'createdAt'>>) => void;
  deleteTeam: (id: string) => void;
  addPlayer: (teamId: string, player: TeamPlayer) => void;
  updatePlayer: (teamId: string, playerId: string, updates: Partial<TeamPlayer>) => void;
  deletePlayer: (teamId: string, playerId: string) => void;
}

const storageImpl = {
  getItem: (name: string) => { if (typeof window === 'undefined') return null; try { return localStorage.getItem(name); } catch { return null; } },
  setItem: (name: string, value: string) => { if (typeof window === 'undefined') return; try { localStorage.setItem(name, value); } catch { /**/ } },
  removeItem: (name: string) => { if (typeof window === 'undefined') return; try { localStorage.removeItem(name); } catch { /**/ } },
};

export const useTeamsStore = create<TeamsState>()(
  persist(
    (set, get) => ({
      teams: {},
      _seeded: false,

      seedIfEmpty: () => {
        const { teams, _seeded } = get();
        if (_seeded || Object.keys(teams).length > 0) return;
        set({ teams: buildSeedTeams(), _seeded: true });
      },

      addTeam: (team) =>
        set((s) => ({ teams: { ...s.teams, [team.id]: team } })),

      updateTeam: (id, updates) =>
        set((s) => {
          const t = s.teams[id];
          if (!t) return s;
          return { teams: { ...s.teams, [id]: { ...t, ...updates, updatedAt: new Date().toISOString() } } };
        }),

      deleteTeam: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.teams;
          return { teams: rest };
        }),

      addPlayer: (teamId, player) =>
        set((s) => {
          const t = s.teams[teamId];
          if (!t) return s;
          return { teams: { ...s.teams, [teamId]: { ...t, players: [...t.players, player], updatedAt: new Date().toISOString() } } };
        }),

      updatePlayer: (teamId, playerId, updates) =>
        set((s) => {
          const t = s.teams[teamId];
          if (!t) return s;
          return {
            teams: {
              ...s.teams,
              [teamId]: {
                ...t,
                players: t.players.map((p) => p.id === playerId ? { ...p, ...updates } : p),
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      deletePlayer: (teamId, playerId) =>
        set((s) => {
          const t = s.teams[teamId];
          if (!t) return s;
          return {
            teams: {
              ...s.teams,
              [teamId]: { ...t, players: t.players.filter((p) => p.id !== playerId), updatedAt: new Date().toISOString() },
            },
          };
        }),
    }),
    { name: 'coach-teams-v1', storage: createJSONStorage(() => storageImpl) }
  )
);
