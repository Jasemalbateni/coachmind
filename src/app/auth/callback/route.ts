/**
 * OAuth / magic-link callback handler.
 *
 * Supabase auth flows (email confirmation, password recovery, third-party
 * OAuth) redirect the browser to this URL with a `code` query param. We
 * exchange that code for a session cookie, then bounce the user to the
 * intended destination (`?next=…`, default `/drills`).
 *
 * Phase B ships this endpoint so the Supabase Auth UI redirect can resolve
 * once email/password sign-up is wired in Phase C.
 *
 * When Supabase env vars are missing the endpoint redirects home with an
 * error param so the user sees a clear failure instead of a 500.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/drills';

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=supabase_not_configured`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
