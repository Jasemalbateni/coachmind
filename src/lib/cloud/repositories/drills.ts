/**
 * Drill repository — typed adapter between the Drill type in the app and
 * the `public.drills` table in Supabase.
 *
 * Row shape (see supabase/migrations/20260513120000_init_schema.sql):
 *   id, user_id, title, folder_id, subcategory_id, team_id, parent_drill_id,
 *   is_favorite, sort_order, data jsonb, created_at, updated_at.
 *
 * Strategy: the full Drill object lives in `data` jsonb (round-trip is
 * trivial). Extracted columns are kept in sync on every write so the DB
 * can index/filter them efficiently and so RLS can match `auth.uid()`
 * against `user_id`.
 *
 * All four functions throw when:
 *   • Supabase isn't configured (caller must check `isSupabaseConfigured`)
 *   • There is no signed-in user (caller must check cloudSession.getCloudUserId)
 * The sync layer wraps every call in try/catch + retry, so throwing here
 * is fine.
 *
 * RLS guarantees we only ever see rows where `user_id = auth.uid()`, so
 * `listDrills()` returns only the current user's drills.
 */

import type { Drill } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCloudUserId } from '@/lib/cloud/cloudSession';

/** Shape of a row in public.drills (extracted columns + data payload). */
interface DrillRow {
  id: string;
  user_id: string;
  title: string;
  folder_id: string | null;
  subcategory_id: string | null;
  team_id: string | null;
  parent_drill_id: string | null;
  is_favorite: boolean;
  sort_order: number | null;
  data: Drill;
  created_at: string;
  updated_at: string;
}

function client() {
  const c = getSupabaseBrowserClient();
  if (!c) throw new Error('[drills repo] Supabase client is not configured');
  return c;
}

function requireUserId(): string {
  const uid = getCloudUserId();
  if (!uid) throw new Error('[drills repo] no signed-in user');
  return uid;
}

/**
 * Convert an in-memory Drill into the row shape expected by Postgres.
 * The full Drill is stored in `data`; extracted columns mirror its fields
 * so the DB can filter/index without parsing jsonb.
 */
function toRow(drill: Drill, userId: string): Omit<DrillRow, 'created_at' | 'updated_at'> {
  return {
    id: drill.id,
    user_id: userId,
    title: drill.title,
    folder_id: drill.folderId ?? null,
    subcategory_id: drill.subcategoryId ?? null,
    team_id: drill.teamId ?? null,
    parent_drill_id: drill.parentDrillId ?? null,
    is_favorite: Boolean(drill.isFavorite),
    sort_order: typeof drill.sortOrder === 'number' ? drill.sortOrder : null,
    data: drill,
  };
}

/**
 * Convert a DB row back into a Drill. We trust `row.data` as the source of
 * truth — the extracted columns are duplicates and should never disagree
 * because every write goes through `toRow`. If they ever do disagree (e.g.
 * an older migration), `row.data` wins; the `updated_at` from the DB
 * overrides the embedded one so timestamps stay monotonic.
 */
function fromRow(row: DrillRow): Drill {
  return {
    ...row.data,
    id: row.id,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Fetch every drill belonging to the current user. Newest first. */
export async function listDrills(): Promise<Drill[]> {
  requireUserId();
  const { data, error } = await client()
    .from('drills')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as DrillRow[]).map(fromRow);
}

/** Fetch a single drill by id. Returns null if not found (or not yours). */
export async function getDrill(id: string): Promise<Drill | null> {
  requireUserId();
  const { data, error } = await client()
    .from('drills')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as DrillRow) : null;
}

/**
 * Insert-or-update by id. The id is set client-side (Zustand already uses
 * crypto.randomUUID() on creation), so this is naturally idempotent — re-
 * running an upsert with the same id and a fresher payload just updates.
 *
 * Postgres' `set_updated_at` trigger refreshes `updated_at` on every UPDATE
 * — we don't need to send it from the client (so client-clock skew can't
 * break last-write-wins ordering).
 */
export async function upsertDrill(drill: Drill): Promise<void> {
  const userId = requireUserId();
  const row = toRow(drill, userId);
  const { error } = await client().from('drills').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

/** Delete by id. No-op if the row doesn't exist (or isn't yours). */
export async function deleteDrill(id: string): Promise<void> {
  requireUserId();
  const { error } = await client().from('drills').delete().eq('id', id);
  if (error) throw error;
}
