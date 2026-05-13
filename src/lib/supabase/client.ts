/**
 * Browser-side Supabase client.
 *
 * Returns a singleton `SupabaseClient` when `NEXT_PUBLIC_SUPABASE_URL` +
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` are both set in the environment.
 *
 * If either is missing the helper returns `null` instead of throwing — the
 * rest of the app branches on `isSupabaseConfigured()` to fall back to
 * local-only mode (Zustand + localStorage). This is how Phase B can ship
 * without breaking the existing local experience.
 *
 * The anon key is intentionally public. Row Level Security policies on the
 * server are the real access boundary — never put a service-role key here.
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let cached: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  if (!url || !anonKey) {
    cached = null;
    return null;
  }
  cached = createBrowserClient(url, anonKey);
  return cached;
}
