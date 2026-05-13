/**
 * Teams repository — typed adapter between the Team type and the
 * `public.teams` table.
 *
 * Row shape (see supabase/migrations/20260513120000_init_schema.sql):
 *   id, user_id, name, age_group, data jsonb, created_at, updated_at.
 *
 * Strategy mirrors drills/sessions: full Team (including colors,
 * training_days[], players[]) lives in `data` jsonb. Extracted columns
 * (name, age_group) let the DB filter without parsing jsonb.
 *
 * Important downstream consequence: season_plans.team_id is a real FK
 * with `references public.teams(id)`. A SeasonPlan upsert will fail until
 * the referenced team exists server-side — so the orchestrator hydrates
 * teams BEFORE season_plans (see cloudSyncOrchestrator.ts).
 */

import type { Team } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCloudUserId } from '@/lib/cloud/cloudSession';

interface TeamRow {
  id: string;
  user_id: string;
  name: string;
  age_group: string | null;
  data: Team;
  created_at: string;
  updated_at: string;
}

function client() {
  const c = getSupabaseBrowserClient();
  if (!c) throw new Error('[teams repo] Supabase client is not configured');
  return c;
}

function requireUserId(): string {
  const uid = getCloudUserId();
  if (!uid) throw new Error('[teams repo] no signed-in user');
  return uid;
}

function toRow(team: Team, userId: string): Omit<TeamRow, 'created_at' | 'updated_at'> {
  return {
    id: team.id,
    user_id: userId,
    name: team.name,
    age_group: team.ageGroup || null,
    data: team,
  };
}

function fromRow(row: TeamRow): Team {
  return {
    ...row.data,
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function listTeams(): Promise<Team[]> {
  requireUserId();
  const { data, error } = await client()
    .from('teams')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as TeamRow[]).map(fromRow);
}

export async function getTeam(id: string): Promise<Team | null> {
  requireUserId();
  const { data, error } = await client()
    .from('teams')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as TeamRow) : null;
}

export async function upsertTeam(team: Team): Promise<void> {
  const userId = requireUserId();
  const row = toRow(team, userId);
  const { error } = await client().from('teams').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteTeam(id: string): Promise<void> {
  requireUserId();
  const { error } = await client().from('teams').delete().eq('id', id);
  if (error) throw error;
}
