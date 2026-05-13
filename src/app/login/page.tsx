'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

// useSearchParams() requires a Suspense boundary during static prerender.
// We wrap the form in <Suspense> at the page boundary so the rest of the
// page (the marketing left panel) can still render eagerly.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Surface auth-callback errors (?error=…) on first paint.
  useEffect(() => {
    const e = searchParams.get('error');
    if (e) setError(decodeURIComponent(e));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isSupabaseConfigured()) {
      setError('Cloud sync is not configured on this build. The app runs in local-only mode.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // Honour ?next=… so the middleware can bounce users back to where they
    // came from after sign-in.
    const next = searchParams.get('next') || '/drills';
    router.push(next);
    router.refresh();
  };

  return (
    <div className="min-h-screen-dvh bg-[#080c14] flex">

      {/* ── Left panel ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-14 overflow-hidden bg-[#0c1220]">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#FF6A00] opacity-[0.07] blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#FF6A00] opacity-[0.04] blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#FF6A00] rounded-lg flex items-center justify-center font-black text-[12px] text-white shadow-lg shadow-[#FF6A00]/30">
            CM
          </div>
          <span className="font-bold text-white tracking-tight text-lg">CoachMind</span>
        </div>

        {/* Feature highlights */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl font-black text-white leading-snug mb-3">
              Your complete<br />
              <span className="text-[#FF6A00]">coaching workspace.</span>
            </h2>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              Everything you need to design drills, plan sessions, and organise your full season — in one platform.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { icon: '⚽', title: 'Drill Library', desc: 'Build and organise your entire drill catalogue with tags, folders, and tactical diagrams.' },
              { icon: '📋', title: 'Session Builder', desc: 'Sequence drills into structured sessions with drag-and-drop timeline blocks.' },
              { icon: '📅', title: 'Season Planner', desc: 'Map your full competitive season week-by-week with periodisation tracking.' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#FF6A00]/10 border border-[#FF6A00]/15 flex items-center justify-center text-lg flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold mb-0.5">{f.title}</p>
                  <p className="text-white/35 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative">
          <p className="text-white/20 text-xs leading-relaxed italic">
            "The best coaches don't just train harder — they plan smarter."
          </p>
        </div>
      </div>

      {/* ── Right panel (form) ─────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-16">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-12">
          <div className="w-8 h-8 bg-[#FF6A00] rounded-lg flex items-center justify-center font-black text-[11px] text-white shadow-lg shadow-[#FF6A00]/30">
            CM
          </div>
          <span className="font-bold text-white tracking-tight text-base">CoachMind</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-9">
            <h1 className="text-2xl font-black text-white mb-2">Welcome back</h1>
            <p className="text-white/40 text-sm">Sign in to your CoachMind account</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#FF6A00]/50 focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Password
                </label>
                <a href="#" className="text-xs text-[#FF6A00]/70 hover:text-[#FF6A00] transition-colors">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#FF6A00]/50 focus:bg-white/[0.07] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#FF6A00] hover:bg-[#e85f00] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-[#FF6A00]/20 text-sm tracking-wide mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/30">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#FF6A00]/80 hover:text-[#FF6A00] font-semibold transition-colors">
              Create one free
            </Link>
          </p>
        </div>

        <p className="mt-16 text-white/10 text-xs">© 2026 CoachMind</p>
      </div>
    </div>
  );
}
