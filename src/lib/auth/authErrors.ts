/**
 * Maps raw Supabase auth errors (and thrown exceptions) to user-friendly
 * messages.
 *
 * Security note: Supabase intentionally returns a single error code
 * (`invalid_credentials` / "Invalid login credentials") for BOTH
 *   - wrong password on an existing account, and
 *   - sign-in attempt for an account that does not exist.
 * This prevents user-enumeration attacks. We therefore surface a single
 * combined message for both cases — distinguishing them would either
 * require an insecure RPC ("does email exist?") or leak the same signal
 * via the UI. The combined message ("Incorrect email or password") is the
 * industry-standard safe phrasing.
 *
 * "Failed to fetch" is the message the browser puts on the TypeError that
 * `window.fetch` throws when it can't reach the server (DNS failure,
 * offline, CORS preflight blocked, project paused, …). The Supabase SDK
 * wraps that TypeError in an `AuthRetryableFetchError` whose `.name` is
 * "AuthRetryableFetchError" and `.status` is 0 — that's our network signal.
 */

import { AuthError } from '@supabase/supabase-js';

export type AuthErrorKind =
  | 'missing_fields'
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'rate_limited'
  | 'user_banned'
  | 'weak_password'
  | 'email_taken'
  | 'network'
  | 'not_configured'
  | 'unknown';

export interface MappedAuthError {
  kind: AuthErrorKind;
  /** User-facing copy — safe to render directly. */
  message: string;
  /** Original status code if known (0 = network). */
  status?: number;
  /** Original Supabase error code, if any. */
  code?: string;
}

const FRIENDLY: Record<AuthErrorKind, string> = {
  missing_fields:      'Please enter your email and password',
  invalid_credentials: 'Incorrect email or password',
  email_not_confirmed: 'Please confirm your email address before signing in. Check your inbox for the confirmation link.',
  rate_limited:        'Too many attempts. Please wait a moment and try again.',
  user_banned:         'This account has been disabled. Please contact support.',
  weak_password:       'Password is too weak. Use at least 8 characters with a mix of letters and numbers.',
  email_taken:         'An account with this email already exists. Try signing in instead.',
  network:             'Unable to connect to the server. Please check your connection and try again.',
  not_configured:      'Cloud sync is not configured on this build. The app runs in local-only mode.',
  unknown:             'Something went wrong. Please try again.',
};

/** True when the error looks like a network/fetch failure rather than an API response. */
function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof AuthError) {
    // AuthRetryableFetchError has status 0 and that specific name. Any 5xx
    // is also retryable-network from a UX standpoint.
    if ((err as AuthError).name === 'AuthRetryableFetchError') return true;
    const status = (err as { status?: number }).status;
    if (status === 0) return true;
    if (typeof status === 'number' && status >= 500) return true;
  }
  if (err && typeof err === 'object') {
    const e = err as { name?: string; status?: number; message?: string };
    if (e.name === 'AuthRetryableFetchError') return true;
    if (e.status === 0) return true;
    if (typeof e.message === 'string' && /failed to fetch|networkerror|load failed/i.test(e.message)) {
      return true;
    }
  }
  return false;
}

/**
 * Map a raw Supabase error (returned from `{ error }` destructure OR thrown
 * from a try/catch) to a kind + friendly message.
 *
 * Pass `null`/`undefined` to get `unknown`.
 */
export function mapAuthError(err: unknown): MappedAuthError {
  if (!err) return { kind: 'unknown', message: FRIENDLY.unknown };

  // Network / fetch failure — must take precedence over code/message inspection.
  if (isNetworkError(err)) {
    return { kind: 'network', message: FRIENDLY.network, status: 0 };
  }

  // Pull out code + status + message defensively. `err` may be a plain object
  // (some SDK paths) or an Error subclass.
  const e = err as { code?: string; status?: number; message?: string; name?: string };
  const code = e.code;
  const status = e.status;
  const message = e.message ?? '';

  // Code-based mapping (preferred — stable across translations).
  if (code) {
    switch (code) {
      case 'invalid_credentials':
      case 'user_not_found':
      case 'identity_not_found':
        return { kind: 'invalid_credentials', message: FRIENDLY.invalid_credentials, status, code };
      case 'email_not_confirmed':
      case 'phone_not_confirmed':
        return { kind: 'email_not_confirmed', message: FRIENDLY.email_not_confirmed, status, code };
      case 'over_request_rate_limit':
      case 'over_email_send_rate_limit':
      case 'over_sms_send_rate_limit':
        return { kind: 'rate_limited', message: FRIENDLY.rate_limited, status, code };
      case 'user_banned':
        return { kind: 'user_banned', message: FRIENDLY.user_banned, status, code };
      case 'weak_password':
        return { kind: 'weak_password', message: FRIENDLY.weak_password, status, code };
      case 'email_exists':
      case 'user_already_exists':
        return { kind: 'email_taken', message: FRIENDLY.email_taken, status, code };
    }
  }

  // Fall back to message-based heuristics (older Supabase versions, or
  // server-side messages we haven't seen yet).
  if (/invalid login credentials/i.test(message)) {
    return { kind: 'invalid_credentials', message: FRIENDLY.invalid_credentials, status, code };
  }
  if (/email not confirmed/i.test(message)) {
    return { kind: 'email_not_confirmed', message: FRIENDLY.email_not_confirmed, status, code };
  }
  if (/rate limit/i.test(message)) {
    return { kind: 'rate_limited', message: FRIENDLY.rate_limited, status, code };
  }
  if (/already (registered|exists)/i.test(message)) {
    return { kind: 'email_taken', message: FRIENDLY.email_taken, status, code };
  }
  if (/password/i.test(message) && /short|weak|6 characters/i.test(message)) {
    return { kind: 'weak_password', message: FRIENDLY.weak_password, status, code };
  }

  return { kind: 'unknown', message: FRIENDLY.unknown, status, code };
}

/**
 * Console logger for the auth lifecycle. Safe by construction: it never
 * receives, accepts, or interpolates the user's password. Call sites pass
 * sanitized field summaries only.
 *
 * Toggled off in production builds via `NEXT_PUBLIC_AUTH_DEBUG=0` for users
 * who don't want lifecycle noise — defaults to enabled in dev, disabled in
 * prod.
 */
const DEBUG_ENABLED = (() => {
  if (typeof process === 'undefined') return false;
  const flag = process.env.NEXT_PUBLIC_AUTH_DEBUG;
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
})();

export function authDebug(stage: string, info: Record<string, unknown> = {}): void {
  if (!DEBUG_ENABLED) return;
  // eslint-disable-next-line no-console
  console.info(`[auth] ${stage}`, info);
}

/** Redact an email so logs show domain + first char only. */
export function redactEmail(email: string): string {
  const trimmed = (email || '').trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return trimmed ? `${trimmed[0]}***` : '<empty>';
  return `${trimmed[0]}***${trimmed.slice(at)}`;
}
