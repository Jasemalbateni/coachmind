/**
 * Season-plans repository — typed adapter between the SeasonPlan type in
 * the app and the `public.season_plans` table in Supabase.
 *
 * Row shape (see supabase/migrations/20260513120000_init_schema.sql):
 *   id, user_id, team_id, title, start_date, end_date, data jsonb,
 *   created_at, updated_at.
 *
 * Strategy:
 *   • Full SeasonPlan lives in `data` jsonb (includes the `entries[]`
 *     array, each entry pointing at a session_id).
 *   • Extracted columns mirror the scalar fields so the DB can filter
 *     plans by team or date range without parsing jsonb.
 *
 * `team_id` is NOT NULL on the table (a SeasonPlan must belong to a team).
 * We trust the app layer to enforce this; the repo throws if missing so a
 * bad write surfaces as a clear error rather than a constraint violation.
 *
 * Dates use Postgres `date`. The SeasonPlan type stores them as ISO
 * strings (`YYYY-MM-DD`), which Postgres accepts directly.
 */

import type { SeasonPlan } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCloudUserId } from '@/lib/cloud/cloudSession';

interface SeasonPlanRow {
  id: string;
  user_id: string;
  team_id: string;
  title: string;
  start_date: string;
  end_date: string;
  data: SeasonPlan;
  created_at: string;
  updated_at: string;
}

function client() {
  const c = getSupabaseBrowserClient();
  if (!c) throw new Error('[seasonPlans repo] Supabase client is not configured');
  return c;
}

function requireUserId(): string {
  const uid = getCloudUserId();
  if (!uid) throw new Error('[seasonPlans repo] no signed-in user');
  return uid;
}

function toRow(plan: SeasonPlan, userId: string): Omit<SeasonPlanRow, 'created_at' | 'updated_at'> {
  if (!plan.teamId) {
    throw new Error(`[seasonPlans repo] plan ${plan.id} has no teamId — required`);
  }
  return {
    id: plan.id,
    user_id: userId,
    team_id: plan.teamId,
    title: plan.title,
    start_date: plan.startDate,
    end_date: plan.endDate,
    data: plan,
  };
}

function fromRow(row: SeasonPlanRow): SeasonPlan {
  return {
    ...row.data,
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function listSeasonPlans(): Promise<SeasonPlan[]> {
  requireUserId();
  const { data, error } = await client()
    .from('season_plans')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as SeasonPlanRow[]).map(fromRow);
}

export async function getSeasonPlan(id: string): Promise<SeasonPlan | null> {
  requireUserId();
  const { data, error } = await client()
    .from('season_plans')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as SeasonPlanRow) : null;
}

export async function upsertSeasonPlan(plan: SeasonPlan): Promise<void> {
  const userId = requireUserId();
  const row = toRow(plan, userId);
  const { error } = await client().from('season_plans').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteSeasonPlan(id: string): Promise<void> {
  requireUserId();
  const { error } = await client().from('season_plans').delete().eq('id', id);
  if (error) throw error;
}
