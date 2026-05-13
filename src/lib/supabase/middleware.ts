/**
 * Supabase session-refresh + route-protection helper for Next.js middleware.
 *
 * On each request:
 *   1. Refreshes the auth cookie if the JWT expired.
 *   2. If `protectedPrefixes` is provided AND Supabase is configured AND no
 *      user is signed in AND the path matches one of the prefixes, redirects
 *      to /login with `?next=<original-path>`.
 *
 * When Supabase env vars are missing this is a no-op pass-through — local-only
 * mode keeps working unchanged.
 *
 * The function intentionally does NOT call `request.cookies` after building
 * `response`, because mutating `request.cookies` after the response is created
 * can leak cookies between requests in Next 14 middleware. We follow the
 * pattern from @supabase/ssr's reference middleware example.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface UpdateSessionOptions {
  /**
   * If provided, requests to a path whose prefix matches an entry will be
   * redirected to /login when no user is signed in. Ignored entirely when
   * Supabase is not configured.
   */
  protectedPrefixes?: string[];
}

export async function updateSession(
  request: NextRequest,
  options: UpdateSessionOptions = {}
): Promise<NextResponse> {
  // No Supabase configured → app runs in local-only mode. Pass through.
  if (!url || !anonKey) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, opts: CookieOptions) {
        request.cookies.set({ name, value, ...opts });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...opts });
      },
      remove(name: string, opts: CookieOptions) {
        request.cookies.set({ name, value: '', ...opts });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: '', ...opts });
      },
    },
  });

  // Calls /auth/v1/user and refreshes the JWT cookie as a side-effect.
  const { data } = await supabase.auth.getUser();

  // Route protection — only when the caller opted in.
  const prefixes = options.protectedPrefixes ?? [];
  if (prefixes.length > 0 && !data.user) {
    const pathname = request.nextUrl.pathname;
    const isProtected = prefixes.some(
      (p) => pathname === p || pathname.startsWith(p + '/')
    );
    if (isProtected) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      // Preserve the original destination so /login can bounce back after sign-in.
      redirectUrl.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
