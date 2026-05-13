'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Team, TeamPlayer } from '@/types';
import { buildSeedTeams } from '@/lib/seed';
import { makeNamespacedStorage } from '@/lib/cloud/cloudStorage';
import { getCloudUserId } from '@/lib/cloud/cloudSession';
import { enqueueTeamUpsert, enqueueTeamDelete } from '@/lib/cloud/teamSync';

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

/**
 * Cloud-write helpers — no-op when not signed in so the local-only flow
 * is byte-for-byte unchanged. Player edits are nested inside Team, so
 * each player mutation triggers a whole-team upsert (cheapest way to
 * persist the embedded `players[]` array).
 */
function syncUpsert(id: string): void {
  if (getCloudUserId()) enqueueTeamUpsert(id);
}
function syncDelete(id: string): void {
  if (getCloudUserId()) enqueueTeamDelete(id);
}

export const useTeamsStore = create<TeamsState>()(
  persist(
    (set, get) => ({
      teams: {},
      _seeded: false,

      /**
       * Demo seed for the local-only experience. Suppressed when signed-in
       * so fresh cloud accounts start with zero teams.
       */
      seedIfEmpty: () => {
        if (getCloudUserId()) return;
        const { teams, _seeded } = get();
        if (_seeded || Object.keys(teams).length > 0) return;
        set({ teams: buildSeedTeams(), _seeded: true });
      },

      addTeam: (team) => {
        set((s) => ({ teams: { ...s.teams, [team.id]: team } }));
        syncUpsert(team.id);
      },

      updateTeam: (id, updates) => {
        set((s) => {
          const t = s.teams[id];
          if (!t) return s;
          return { teams: { ...s.teams, [id]: { ...t, ...updates, updatedAt: new Date().toISOString() } } };
        });
        if (get().teams[id]) syncUpsert(id);
      },

      deleteTeam: (id) => {
        set((s) => {
          const { [id]: _, ...rest } = s.teams;
          return { teams: rest };
        });
        syncDelete(id);
      },

      addPlayer: (teamId, player) => {
        set((s) => {
          const t = s.teams[teamId];
          if (!t) return s;
          return { teams: { ...s.teams, [teamId]: { ...t, players: [...t.players, player], updatedAt: new Date().toISOString() } } };
        });
        if (get().teams[teamId]) syncUpsert(teamId);
      },

      updatePlayer: (teamId, playerId, updates) => {
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
        });
        if (get().teams[teamId]) syncUpsert(teamId);
      },

      deletePlayer: (teamId, playerId) => {
        set((s) => {
          const t = s.teams[teamId];
          if (!t) return s;
          return {
            teams: {
              ...s.teams,
              [teamId]: { ...t, players: t.players.filter((p) => p.id !== playerId), updatedAt: new Date().toISOString() },
            },
          };
        });
        if (get().teams[teamId]) syncUpsert(teamId);
      },
    }),
    {
      name: 'coach-teams-v1',
      storage: createJSONStorage(() => makeNamespacedStorage('coach-teams-v1')),
    }
  )
);
