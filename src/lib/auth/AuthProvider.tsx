'use client';

/**
 * AuthProvider — single source of truth for the signed-in user on the client.
 *
 * Reads the current session once on mount, then subscribes to
 * supabase.auth.onAuthStateChange so every component re-renders the moment
 * the user signs in, signs out, or refreshes their token.
 *
 * When Supabase env vars are missing the provider stays in "local-only"
 * mode: user is null, loading is false, signOut() is a no-op. This keeps
 * the existing Zustand/localStorage flow working unchanged.
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { setCloudUserId } from '@/lib/cloud/cloudSession';
import { initCloudSync } from '@/lib/cloud/cloudSyncOrchestrator';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** True when the env vars are set and we're talking to Supabase. */
  cloudEnabled: boolean;
  /** Sign out and redirect to /login. No-op when cloud mode is off. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  cloudEnabled: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const cloudEnabled = isSupabaseConfigured();

  // When cloud is off we resolve to "not loading, no user" synchronously so
  // the rest of the tree never sees a stuck loading spinner in local mode.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(cloudEnabled);

  // Track the last user id we broadcast to cloudSession so we only fire the
  // hydrate/clear chain on real transitions (signed-out → signed-in or
  // signed-in → signed-out), not on every TOKEN_REFRESHED event.
  const lastBroadcastUid = useRef<string | null>(null);

  useEffect(() => {
    if (!cloudEnabled) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    // Register the cloud-sync orchestrator once. Idempotent — additional
    // calls are no-ops, so re-mounting AuthProvider doesn't double-subscribe.
    // The orchestrator wires every entity sync (drills, sessions, plans,
    // folders, subcategories) to the cloudSession listener.
    initCloudSync();

    let mounted = true;

    const broadcast = (nextUid: string | null) => {
      if (lastBroadcastUid.current === nextUid) return;
      lastBroadcastUid.current = nextUid;
      setCloudUserId(nextUid);
    };

    // Hydrate from the current session on mount.
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const u = data.user ?? null;
      setUser(u);
      setLoading(false);
      broadcast(u?.id ?? null);
    });

    // Keep in sync with future sign-in / sign-out / token refresh events.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      broadcast(u?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [cloudEnabled]);

  const signOut = useCallback(async () => {
    if (!cloudEnabled) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    // Push to /login so the user lands on the right screen immediately. The
    // middleware would catch them on the next protected nav anyway, but this
    // is faster and avoids a flash of authenticated UI.
    router.push('/login');
    router.refresh();
  }, [cloudEnabled, router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, cloudEnabled, signOut }),
    [user, loading, cloudEnabled, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
