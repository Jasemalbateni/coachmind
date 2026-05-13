'use client';

/**
 * Teams cloud-sync — same semantics as drillSync / sessionSync. See
 * syncFactory.ts for queue / retry / hydrate / status details. Status
 * is published under the "teams" key in cloudSyncStatus.
 *
 * Important ordering: the orchestrator runs `hydrateTeamsFromCloud()`
 * BEFORE `hydrateSeasonPlansFromCloud()` so the season_plans.team_id
 * FK can be satisfied when local-only plans are recovered (queued for
 * upsert) — otherwise the plan upsert would fail with a 23503 constraint
 * violation until the team upsert lands.
 */

import type { Team } from '@/types';
import { useTeamsStore } from '@/store/teamsStore';
import { makeEntitySync } from './syncFactory';
import * as repo from './repositories/teams';

const sync = makeEntitySync<Team>({
  name: 'teams',
  listAll: repo.listTeams,
  upsert: repo.upsertTeam,
  remove: repo.deleteTeam,
  getEntity: (id) => useTeamsStore.getState().teams[id],
  getEntities: () => useTeamsStore.getState().teams,
  setEntities: (teams, markSeeded) =>
    useTeamsStore.setState(markSeeded ? { teams, _seeded: true } : { teams }),
  getId: (t) => t.id,
  getUpdatedAt: (t) => t.updatedAt,
});

export const enqueueTeamUpsert = sync.enqueueUpsert;
export const enqueueTeamDelete = sync.enqueueDelete;
export const hydrateTeamsFromCloud = sync.hydrate;
export const clearTeamCloudState = sync.clear;
