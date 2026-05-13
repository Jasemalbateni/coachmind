'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setInfo('');

    if (!isSupabaseConfigured()) {
      setError('Cloud sync is not configured on this build. The app runs in local-only mode.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // `display_name` is read by the on-signup trigger to populate
        // public.profiles.display_name (see 20260513120100_profiles_trigger.sql).
        data: { display_name: name },
        // Email-confirmation redirect target. Skipped in dev when
        // auth.email.enable_confirmations = false in supabase/config.toml.
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // If email confirmation is required (prod), Supabase returns user but no
    // session — show a "check your inbox" message. Otherwise we're signed in
    // immediately and can route into the app.
    if (data.session) {
      router.push('/drills');
      router.refresh();
    } else {
      setInfo('Check your inbox for a confirmation link to finish signing up.');
    }
  };

  return (
    <div className="min-h-screen-dvh bg-[#080c14] flex">

      {/* ── Left panel ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-14 overflow-hidden bg-[#0c1220]">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#00B8D4] opacity-[0.07] blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#00B8D4] opacity-[0.04] blur-3xl" />
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
              Start coaching<br />
              <span className="text-[#00B8D4]">with precision.</span>
            </h2>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              Join coaches who plan smarter, train better, and develop their squads with CoachMind&apos;s professional toolkit.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { icon: '🎯', title: 'Tactical Canvas', desc: 'Draw live tactical diagrams with arrows, zones, and player movement patterns.' },
              { icon: '👥', title: 'Team Hub', desc: 'Manage your squad, set formations, and apply them directly to your training drills.' },
              { icon: '🗂', title: 'Smart Organisation', desc: 'Folders, subcategories, favourites, and smart tags — find any drill instantly.' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#00B8D4]/10 border border-[#00B8D4]/15 flex items-center justify-center text-lg flex-shrink-0">
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
            "Precision in planning creates confidence on the pitch."
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
            <h1 className="text-2xl font-black text-white mb-2">Create your account</h1>
            <p className="text-white/40 text-sm">Free to start — no credit card required</p>
          </div>

          {info && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Full name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#00B8D4]/50 focus:bg-white/[0.07] transition-all"
              />
            </div>

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
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#00B8D4]/50 focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#00B8D4]/50 focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Confirm password
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); if (error) setError(''); }}
                placeholder="Re-enter your password"
                className={`w-full px-4 py-3 rounded-xl bg-white/[0.05] border text-white placeholder-white/20 text-sm focus:outline-none transition-all ${
                  error
                    ? 'border-red-500/60 focus:border-red-500/80'
                    : 'border-white/[0.08] focus:border-[#00B8D4]/50 focus:bg-white/[0.07]'
                }`}
              />
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#FF6A00] hover:bg-[#e85f00] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-[#FF6A00]/20 text-sm tracking-wide mt-2">
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/30">
            Already have an account?{' '}
            <Link href="/login" className="text-[#FF6A00]/80 hover:text-[#FF6A00] font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-16 text-white/10 text-xs">© 2026 CoachMind</p>
      </div>
    </div>
  );
}
