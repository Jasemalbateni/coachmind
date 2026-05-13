/**
 * Drill templates repository — typed adapter between DrillTemplateItem
 * (a saved-template snapshot in the app) and the `public.drill_templates`
 * table.
 *
 * Row shape (see supabase/migrations/20260513120000_init_schema.sql):
 *   id, user_id, title, data jsonb, created_at.
 *
 * Note the absence of an `updated_at` column — templates are append-only
 * in the current UI (addTemplate / deleteTemplate; no in-place updates).
 * For last-write-wins ordering we use `created_at` as the entity
 * timestamp; without concurrent edits this is functionally equivalent.
 *
 * The full DrillTemplateItem (id, title, createdAt, drill) lives in
 * `data` jsonb so the embedded Drill round-trips losslessly with all its
 * objects[] / steps[] / coaching metadata.
 */

import type { DrillTemplateItem } from '@/store/drillTemplatesStore';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCloudUserId } from '@/lib/cloud/cloudSession';

interface DrillTemplateRow {
  id: string;
  user_id: string;
  title: string;
  data: DrillTemplateItem;
  created_at: string;
}

function client() {
  const c = getSupabaseBrowserClient();
  if (!c) throw new Error('[drillTemplates repo] Supabase client is not configured');
  return c;
}

function requireUserId(): string {
  const uid = getCloudUserId();
  if (!uid) throw new Error('[drillTemplates repo] no signed-in user');
  return uid;
}

function toRow(tpl: DrillTemplateItem, userId: string): Omit<DrillTemplateRow, 'created_at'> {
  return {
    id: tpl.id,
    user_id: userId,
    title: tpl.title,
    data: tpl,
  };
}

function fromRow(row: DrillTemplateRow): DrillTemplateItem {
  return {
    ...row.data,
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function listTemplates(): Promise<DrillTemplateItem[]> {
  requireUserId();
  const { data, error } = await client()
    .from('drill_templates')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DrillTemplateRow[]).map(fromRow);
}

export async function getTemplate(id: string): Promise<DrillTemplateItem | null> {
  requireUserId();
  const { data, error } = await client()
    .from('drill_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as DrillTemplateRow) : null;
}

export async function upsertTemplate(tpl: DrillTemplateItem): Promise<void> {
  const userId = requireUserId();
  const row = toRow(tpl, userId);
  const { error } = await client().from('drill_templates').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  requireUserId();
  const { error } = await client().from('drill_templates').delete().eq('id', id);
  if (error) throw error;
}
