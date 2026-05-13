/**
 * Next.js middleware — Phase C (session refresh + route protection).
 *
 * Calls `updateSession()` which:
 *   • Refreshes the Supabase auth cookie on every navigation.
 *   • Redirects unauthenticated users to /login when they hit a path under
 *     PROTECTED_PREFIXES (and Supabase env vars are configured).
 *
 * Whitelist behaviour comes for free: any path that is NOT under one of the
 * protected prefixes is allowed through. The public landing page (/), the
 * login + signup pages, the OAuth callback, and the v2 prototype route are
 * therefore always reachable.
 *
 * In local-only mode (no env vars), updateSession is a no-op pass-through.
 */

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Top-level prefixes that require authentication when cloud mode is on.
// Drill editor routes (/drills/[id]) and view/print sub-routes are covered
// transitively by the /drills prefix.
const PROTECTED_PREFIXES = [
  '/drills',
  '/sessions',
  '/season-plans',
  '/teams',
  '/calendar',
];

export async function middleware(request: NextRequest) {
  return updateSession(request, { protectedPrefixes: PROTECTED_PREFIXES });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (build assets)
     * - _next/image   (image optimisation)
     * - favicon.ico, robots.txt, sitemap.xml
     * - icon / apple-icon / manifest
     * - any path that looks like a file (has an extension)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icon|apple-icon|manifest|.*\\..*).*)',
  ],
};
