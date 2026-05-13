/**
 * Sessions repository — typed adapter between the Session type in the app
 * and the `public.sessions` table in Supabase.
 *
 * Row shape (see supabase/migrations/20260513120000_init_schema.sql):
 *   id, user_id, title, team_id, date, data jsonb, created_at, updated_at.
 *
 * Strategy mirrors `repositories/drills.ts`:
 *   • Full Session lives in `data` jsonb so the rich `blocks[]` array
 *     (and any free-form metadata) round-trips losslessly.
 *   • Extracted columns (title, team_id, date) are kept in sync on every
 *     write so the DB can index/filter them.
 *
 * `date` in the DB is a real Postgres `date` type, but `Session.date` is a
 * free-form string in the app. We coerce: only ISO-prefixed values like
 * "2026-05-13" or "2026-05-13T…" are extracted to the column; anything else
 * is preserved inside `data.date` and stored as NULL on the column. This
 * keeps the column queryable without losing the user's original string.
 */

import type { Session } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCloudUserId } from '@/lib/cloud/cloudSession';

interface SessionRow {
  id: string;
  user_id: string;
  title: string;
  team_id: string | null;
  date: string | null;
  data: Session;
  created_at: string;
  updated_at: string;
}

function client() {
  const c = getSupabaseBrowserClient();
  if (!c) throw new Error('[sessions repo] Supabase client is not configured');
  return c;
}

function requireUserId(): string {
  const uid = getCloudUserId();
  if (!uid) throw new Error('[sessions repo] no signed-in user');
  return uid;
}

/** Coerce free-form Session.date → DB `date` column, or null if not parseable. */
function extractDate(d: string | undefined): string | null {
  if (!d) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(d);
  return match ? match[1] : null;
}

function toRow(session: Session, userId: string): Omit<SessionRow, 'created_at' | 'updated_at'> {
  return {
    id: session.id,
    user_id: userId,
    title: session.title,
    team_id: session.teamId ?? null,
    date: extractDate(session.date),
    data: session,
  };
}

function fromRow(row: SessionRow): Session {
  return {
    ...row.data,
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function listSessions(): Promise<Session[]> {
  requireUserId();
  const { data, error } = await client()
    .from('sessions')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as SessionRow[]).map(fromRow);
}

export async function getSession(id: string): Promise<Session | null> {
  requireUserId();
  const { data, error } = await client()
    .from('sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as SessionRow) : null;
}

export async function upsertSession(session: Session): Promise<void> {
  const userId = requireUserId();
  const row = toRow(session, userId);
  const { error } = await client().from('sessions').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteSession(id: string): Promise<void> {
  requireUserId();
  const { error } = await client().from('sessions').delete().eq('id', id);
  if (error) throw error;
}
