/**
 * Server-side Supabase client for App Router server components, route
 * handlers, and server actions.
 *
 * Uses Next's `cookies()` API to share the session with the browser so RLS
 * sees the same `auth.uid()` on both sides.
 *
 * Returns `null` when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 * are not configured — callers must branch on this and fall back to local-only
 * behavior.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // `cookies().set` only works inside Server Actions / Route Handlers.
        // In Server Components it throws; we swallow the error so the middleware
        // can still refresh the session on the next request.
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* readonly cookies in a Server Component */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          /* readonly cookies in a Server Component */
        }
      },
    },
  });
}
