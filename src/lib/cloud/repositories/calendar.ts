/**
 * Calendar events repository — flat relational mapping (no jsonb payload).
 *
 * Row shape (see supabase/migrations/20260513120000_init_schema.sql):
 *   id, user_id, title, date, type, status, team_id, session_id,
 *   season_plan_entry_id, notes, created_at, updated_at.
 *
 * Notes:
 *   • `type` and `status` columns are CHECK-constrained on the DB to the
 *     CalendarEventType / CalendarEventStatus unions. Sending a value
 *     outside those sets fails the write; the TypeScript type already
 *     forbids it client-side, so this is just defence in depth.
 *   • `date` is a Postgres `date` (not timestamp). We pass the string
 *     through; Postgres parses YYYY-MM-DD natively.
 *   • `season_plan_entry_id` is plain text — it references an entry id
 *     that lives INSIDE a SeasonPlan's `entries[]` jsonb array, which
 *     Postgres can't FK-link. App layer keeps it in sync.
 *   • `team_id` / `session_id` are real FKs (ON DELETE SET NULL).
 */

import type { CalendarEvent } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCloudUserId } from '@/lib/cloud/cloudSession';

interface CalendarEventRow {
  id: string;
  user_id: string;
  title: string;
  date: string;
  type: CalendarEvent['type'];
  status: CalendarEvent['status'] | null;
  team_id: string | null;
  session_id: string | null;
  season_plan_entry_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function client() {
  const c = getSupabaseBrowserClient();
  if (!c) throw new Error('[calendar repo] Supabase client is not configured');
  return c;
}

function requireUserId(): string {
  const uid = getCloudUserId();
  if (!uid) throw new Error('[calendar repo] no signed-in user');
  return uid;
}

function toRow(ev: CalendarEvent, userId: string): Omit<CalendarEventRow, 'created_at' | 'updated_at'> {
  return {
    id: ev.id,
    user_id: userId,
    title: ev.title,
    date: ev.date,
    type: ev.type,
    status: ev.status ?? null,
    team_id: ev.teamId ?? null,
    session_id: ev.sessionId ?? null,
    season_plan_entry_id: ev.seasonPlanEntryId ?? null,
    notes: ev.notes ?? null,
  };
}

function fromRow(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    type: row.type,
    status: row.status ?? undefined,
    teamId: row.team_id ?? undefined,
    sessionId: row.session_id ?? undefined,
    seasonPlanEntryId: row.season_plan_entry_id ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function listEvents(): Promise<CalendarEvent[]> {
  requireUserId();
  const { data, error } = await client()
    .from('calendar_events')
    .select('*')
    .order('date', { ascending: true });
  if (error) throw error;
  return (data as CalendarEventRow[]).map(fromRow);
}

export async function getEvent(id: string): Promise<CalendarEvent | null> {
  requireUserId();
  const { data, error } = await client()
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as CalendarEventRow) : null;
}

export async function upsertEvent(event: CalendarEvent): Promise<void> {
  const userId = requireUserId();
  const row = toRow(event, userId);
  const { error } = await client().from('calendar_events').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  requireUserId();
  const { error } = await client().from('calendar_events').delete().eq('id', id);
  if (error) throw error;
}
