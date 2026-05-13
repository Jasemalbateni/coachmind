/**
 * Folders + subcategories repository.
 *
 * Two tiny entities, both pure relational (no jsonb payload — they have
 * a handful of scalar fields each):
 *
 *   public.drill_folders         (id, user_id, name, ...)
 *   public.folder_subcategories  (id, user_id, folder_id → drill_folders, name, ...)
 *
 * The DB enforces ON DELETE CASCADE on `folder_subcategories.folder_id`,
 * so deleting a folder server-side automatically removes its subs. The
 * client-side `deleteFolder` mutation in foldersStore mirrors that cascade
 * locally, so local and cloud state stay in lockstep.
 */

import type { DrillFolder, FolderSubcategory } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCloudUserId } from '@/lib/cloud/cloudSession';

interface FolderRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface SubcategoryRow {
  id: string;
  user_id: string;
  folder_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

function client() {
  const c = getSupabaseBrowserClient();
  if (!c) throw new Error('[folders repo] Supabase client is not configured');
  return c;
}

function requireUserId(): string {
  const uid = getCloudUserId();
  if (!uid) throw new Error('[folders repo] no signed-in user');
  return uid;
}

// ─── Folders ───────────────────────────────────────────────────────────────

function folderToRow(folder: DrillFolder, userId: string): Omit<FolderRow, 'created_at' | 'updated_at'> {
  return { id: folder.id, user_id: userId, name: folder.name };
}

function folderFromRow(row: FolderRow): DrillFolder {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listFolders(): Promise<DrillFolder[]> {
  requireUserId();
  const { data, error } = await client()
    .from('drill_folders')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as FolderRow[]).map(folderFromRow);
}

export async function upsertFolder(folder: DrillFolder): Promise<void> {
  const userId = requireUserId();
  const { error } = await client()
    .from('drill_folders')
    .upsert(folderToRow(folder, userId), { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteFolder(id: string): Promise<void> {
  requireUserId();
  const { error } = await client().from('drill_folders').delete().eq('id', id);
  if (error) throw error;
}

// ─── Subcategories ─────────────────────────────────────────────────────────

function subcategoryToRow(sub: FolderSubcategory, userId: string): Omit<SubcategoryRow, 'created_at' | 'updated_at'> {
  return { id: sub.id, user_id: userId, folder_id: sub.folderId, name: sub.name };
}

function subcategoryFromRow(row: SubcategoryRow): FolderSubcategory {
  return {
    id: row.id,
    folderId: row.folder_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSubcategories(): Promise<FolderSubcategory[]> {
  requireUserId();
  const { data, error } = await client()
    .from('folder_subcategories')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as SubcategoryRow[]).map(subcategoryFromRow);
}

export async function upsertSubcategory(sub: FolderSubcategory): Promise<void> {
  const userId = requireUserId();
  const { error } = await client()
    .from('folder_subcategories')
    .upsert(subcategoryToRow(sub, userId), { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteSubcategory(id: string): Promise<void> {
  requireUserId();
  const { error } = await client().from('folder_subcategories').delete().eq('id', id);
  if (error) throw error;
}
