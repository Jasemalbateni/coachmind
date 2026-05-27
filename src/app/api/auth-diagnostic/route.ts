/**
 * /api/auth-diagnostic — read-only probe to help triage "Failed to fetch".
 *
 * The login page hits this when it receives a network-class auth error and
 * renders the result inline. The endpoint never exposes secrets:
 *
 *   - It does NOT echo the anon key. Only `anonKeyPresent` (bool) and the
 *     key's *length* (so we can spot accidentally-empty / wrapped-in-quotes
 *     values) are returned.
 *   - It does NOT echo the full URL. Only the host (`*.supabase.co`) and the
 *     project ref slug (first DNS label) are returned.
 *
 * What it does:
 *   1. Reads NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 *      from the runtime env.
 *   2. Validates that the URL parses.
 *   3. Issues a GET to `${url}/auth/v1/health` with a 5s timeout. The auth
 *      health endpoint is unauthenticated and returns 200 with `{ "version":
 *      "...", "name": "GoTrue", "description": "..." }` when the project is
 *      live, or fails at the DNS/TCP layer when the project is paused/deleted.
 *   4. Returns a small JSON report classifying the failure.
 *
 * Possible outcomes:
 *   - { configured: false }                        → env vars missing
 *   - { reachable: true, status: 200 }             → project is healthy; the
 *                                                    original "Failed to fetch"
 *                                                    must be a browser-side
 *                                                    issue (CORS, extension, …)
 *   - { reachable: false, errorName: 'TypeError',
 *       errorMessage: 'fetch failed', cause: 'ENOTFOUND' }
 *                                                  → DNS does not resolve —
 *                                                    project is paused or
 *                                                    deleted. Surface a clear
 *                                                    "restore the project"
 *                                                    hint.
 *   - { reachable: false, status: 5xx }            → server is up but unhealthy
 */

import { NextResponse } from 'next/server';

// Run on the Node runtime so we get a proper Error.cause chain (DNS error
// codes are exposed via `err.cause.code` on Node fetch, not on the Edge
// runtime). The middleware does not match this path so there is no auth
// gate to bypass.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ReachabilityReport {
  reachable: boolean;
  /** HTTP status if a response was received. */
  status?: number;
  /** Round-trip in ms. */
  latencyMs?: number;
  /** `Error.name` for the thrown exception, if any. */
  errorName?: string;
  /** `Error.message`, truncated. */
  errorMessage?: string;
  /** Lowest-level error code (e.g. `ENOTFOUND`, `ECONNREFUSED`, `ETIMEDOUT`). */
  cause?: string;
}

interface DiagnosticReport {
  configured: boolean;
  urlValid: boolean;
  /** `*.supabase.co` host (no path, no protocol). Empty when URL is missing/invalid. */
  supabaseHost: string;
  /** First DNS label of the host — Supabase's "project ref". */
  projectRef: string;
  anonKeyPresent: boolean;
  /** Length only — useful for spotting empty / quoted-in env vars. */
  anonKeyLength: number;
  reachability: ReachabilityReport | null;
  /** Plain-English hint a human can act on. */
  hint: string;
}

const HEALTH_TIMEOUT_MS = 5000;

async function probeHealth(url: string): Promise<ReachabilityReport> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
      method: 'GET',
      signal: controller.signal,
      // Cache: 'no-store' so a stale CDN response doesn't mask a now-paused project.
      cache: 'no-store',
    });
    return {
      reachable: res.ok,
      status: res.status,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const e = err as { name?: string; message?: string; cause?: { code?: string } };
    return {
      reachable: false,
      latencyMs: Date.now() - start,
      errorName: e.name,
      errorMessage: (e.message || '').slice(0, 200),
      cause: e.cause?.code,
    };
  } finally {
    clearTimeout(timer);
  }
}

function deriveHint(report: Omit<DiagnosticReport, 'hint'>): string {
  if (!report.configured) {
    return 'Supabase environment variables are not set on this server. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (and redeploy on Vercel).';
  }
  if (!report.urlValid) {
    return 'NEXT_PUBLIC_SUPABASE_URL is set but does not parse as a URL — check for stray quotes, spaces, or a missing https:// prefix.';
  }
  if (!report.anonKeyPresent || report.anonKeyLength < 100) {
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or implausibly short — a real anon JWT is ~180+ chars. Check for accidental empty value or quote-wrapping.';
  }
  const r = report.reachability;
  if (!r) return 'Diagnostic did not run.';
  if (r.reachable) {
    return 'Supabase health endpoint is reachable from the server. The browser-side "Failed to fetch" is therefore CORS, an ad-blocker / privacy extension, or a captive portal on the user\'s network — not the project.';
  }
  if (r.cause === 'ENOTFOUND' || /ENOTFOUND|getaddrinfo/i.test(r.errorMessage || '')) {
    return `DNS does not resolve for ${report.supabaseHost}. The Supabase project "${report.projectRef}" is paused or has been deleted. Restore it at https://supabase.com/dashboard/project/${report.projectRef} — free-tier projects auto-pause after 1 week of inactivity. If the project was deleted, create a new one, update both env vars, and re-run the migrations under ./supabase/migrations.`;
  }
  if (r.cause === 'ECONNREFUSED') {
    return `Server-side TCP connection refused. The URL is wrong or the host is down.`;
  }
  if (r.cause === 'ETIMEDOUT' || r.errorName === 'AbortError') {
    return `Health check timed out after ${HEALTH_TIMEOUT_MS}ms. The Supabase region is slow or unreachable from this server.`;
  }
  if (typeof r.status === 'number' && r.status >= 500) {
    return `Supabase responded with ${r.status}. The project is up but the auth service is unhealthy — check the Supabase status page.`;
  }
  return `Reachability check failed: ${r.errorName ?? 'error'} — ${r.errorMessage ?? 'no message'}.`;
}

export async function GET(): Promise<NextResponse> {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  const configured = Boolean(rawUrl) && Boolean(rawKey);

  let urlValid = false;
  let supabaseHost = '';
  let projectRef = '';
  try {
    if (rawUrl) {
      const parsed = new URL(rawUrl);
      urlValid = parsed.protocol === 'https:' || parsed.protocol === 'http:';
      supabaseHost = parsed.host;
      projectRef = parsed.host.split('.')[0] ?? '';
    }
  } catch {
    urlValid = false;
  }

  const reachability = urlValid ? await probeHealth(rawUrl) : null;

  const partial: Omit<DiagnosticReport, 'hint'> = {
    configured,
    urlValid,
    supabaseHost,
    projectRef,
    anonKeyPresent: Boolean(rawKey),
    anonKeyLength: rawKey.length,
    reachability,
  };

  const report: DiagnosticReport = { ...partial, hint: deriveHint(partial) };
  return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
}
