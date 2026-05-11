import Link from 'next/link';

const FEATURES = [
  {
    icon: '⚽',
    title: 'Drill Library',
    desc: 'Build, save, and organise your entire drill catalogue. Tag by phase, format, and intensity — find any drill instantly.',
    accent: 'border-[#FF6A00]/20 bg-[#FF6A00]/5',
    iconBg: 'bg-[#FF6A00]/10',
  },
  {
    icon: '📋',
    title: 'Session Builder',
    desc: 'Sequence drills into structured training sessions with drag-and-drop blocks. Set intensity, timing, and objectives.',
    accent: 'border-[#00B8D4]/20 bg-[#00B8D4]/5',
    iconBg: 'bg-[#00B8D4]/10',
  },
  {
    icon: '📅',
    title: 'Season Planner',
    desc: 'Map your full competitive season week-by-week. Track periodisation, loading, and tactical focus across every cycle.',
    accent: 'border-[#FFC857]/20 bg-[#FFC857]/5',
    iconBg: 'bg-[#FFC857]/10',
  },
  {
    icon: '🎯',
    title: 'Tactical Canvas',
    desc: 'Draw live tactical diagrams with arrows, zones, and player movements. Visualise every run, press, and pattern.',
    accent: 'border-emerald-500/20 bg-emerald-500/5',
    iconBg: 'bg-emerald-500/10',
  },
  {
    icon: '👥',
    title: 'Team Hub',
    desc: 'Manage your squad, assign positions, and apply real formations directly to your tactical drills in one click.',
    accent: 'border-violet-500/20 bg-violet-500/5',
    iconBg: 'bg-violet-500/10',
  },
  {
    icon: '🗂',
    title: 'Smart Organisation',
    desc: 'Folders, subcategories, favourites, and smart tags. Every drill, session, and plan — exactly where you need it.',
    accent: 'border-pink-500/20 bg-pink-500/5',
    iconBg: 'bg-pink-500/10',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Design your drills',
    desc: 'Use the tactical canvas to place players, draw movement patterns, and define coaching objectives for every exercise.',
    color: '#FF6A00',
  },
  {
    num: '02',
    title: 'Build sessions',
    desc: 'Sequence your drills into structured training blocks. Set intensity, duration, and phase for each session segment.',
    color: '#00B8D4',
  },
  {
    num: '03',
    title: 'Plan your season',
    desc: 'Spread your sessions across the full calendar. Balance workloads, track periodisation, and stay ahead of schedule.',
    color: '#FFC857',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-white font-sans overflow-x-hidden">

      {/* ── Ambient background glows ──────────────────────── */}
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute -top-48 left-1/4 w-[800px] h-[800px] rounded-full bg-[#FF6A00] opacity-[0.04] blur-3xl" />
        <div className="absolute top-1/2 right-0 w-[600px] h-[600px] rounded-full bg-[#00B8D4] opacity-[0.04] blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-[#FF6A00] opacity-[0.025] blur-3xl" />
      </div>

      {/* ── Top navigation ────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.05] backdrop-blur-xl bg-[#080c14]/80">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#FF6A00] rounded-lg flex items-center justify-center font-black text-[11px] text-white shadow-lg shadow-[#FF6A00]/30">
              CM
            </div>
            <span className="font-bold text-white tracking-tight text-base">CoachMind</span>
          </div>

          {/* Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/40">
            <a href="#features" className="hover:text-white/80 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white/80 transition-colors">How it works</a>
          </nav>

          {/* Auth CTAs */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="hidden sm:block text-sm text-white/50 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-[#FF6A00] hover:bg-[#e85f00] text-white px-4 py-2 rounded-lg transition-all shadow-md shadow-[#FF6A00]/25">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative pt-28 pb-24 px-5 sm:px-8 text-center">
        <div className="max-w-4xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#FF6A00]/25 bg-[#FF6A00]/8 text-[#FF6A00] text-[11px] font-bold uppercase tracking-[0.18em] mb-9">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00] animate-pulse" />
            The professional coaching platform
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.04] mb-6">
            Design the Way<br />
            <span className="text-[#FF6A00]">Champions Train.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed">
            CoachMind gives football coaches a complete digital workspace — build drills,
            design tactical sessions, and plan full season cycles with precision.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20">
            <Link
              href="/signup"
              className="w-full sm:w-auto text-center px-9 py-3.5 bg-[#FF6A00] hover:bg-[#e85f00] text-white font-bold rounded-xl transition-all shadow-xl shadow-[#FF6A00]/25 text-sm tracking-wide">
              Start for free →
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto text-center px-9 py-3.5 border border-white/[0.1] hover:border-white/[0.2] text-white/60 hover:text-white font-medium rounded-xl transition-all text-sm">
              Sign in to your account
            </Link>
          </div>

          {/* Stats */}
          <div className="inline-flex items-center gap-10 sm:gap-16 px-8 py-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm">
            {[
              { value: '10k+', label: 'Coaches' },
              { value: '50k+', label: 'Drills saved' },
              { value: '200k+', label: 'Sessions built' },
            ].map((s, i) => (
              <div key={s.label} className={`text-center ${i > 0 ? 'border-l border-white/[0.08] pl-10 sm:pl-16' : ''}`}>
                <p className="text-2xl sm:text-3xl font-black text-white mb-0.5">{s.value}</p>
                <p className="text-xs text-white/30 tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────── */}
      <section id="features" className="py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FF6A00] mb-4">Everything you need</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">Built for the modern coach</h2>
            <p className="text-white/35 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              From individual drill design to full season planning — every layer of your coaching work, in one place.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`group p-6 rounded-2xl border ${f.accent} hover:scale-[1.01] transition-all duration-300 cursor-default`}>
                <div className={`w-11 h-11 ${f.iconBg} rounded-xl flex items-center justify-center text-xl mb-5`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-white text-[15px] mb-2">{f.title}</h3>
                <p className="text-sm text-white/38 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ──────────────────────────────────────── */}
      <section id="workflow" className="py-24 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#00B8D4] mb-4">Your workflow</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">From drill to season plan</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="p-7 rounded-2xl border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04] transition-all">
                <p className="text-5xl font-black mb-5" style={{ color: step.color }}>{step.num}</p>
                <h3 className="font-bold text-white text-[15px] mb-2.5">{step.title}</h3>
                <p className="text-sm text-white/38 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tactical & technical callout ──────────────────── */}
      <section className="py-16 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                label: 'Tactical Development',
                title: 'Coach the game, not just the training.',
                desc: 'Design drills with live tactical arrows — runs, passes, presses, dribbles, defensive lines. Teach your team how to play, not just what to do.',
                color: '#FF6A00',
                border: 'border-[#FF6A00]/15',
                bg: 'from-[#FF6A00]/8 to-transparent',
              },
              {
                label: 'Technical Development',
                title: 'Repeat. Refine. Master.',
                desc: 'Structure progressive drill sequences that build technical mastery. Link drills as progressions, regressions, and variations with full coaching notes.',
                color: '#00B8D4',
                border: 'border-[#00B8D4]/15',
                bg: 'from-[#00B8D4]/8 to-transparent',
              },
            ].map((card) => (
              <div
                key={card.label}
                className={`p-8 rounded-2xl border ${card.border} bg-gradient-to-br ${card.bg}`}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: card.color }}>
                  {card.label}
                </p>
                <h3 className="text-xl font-black text-white mb-3 leading-snug">{card.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="py-28 px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative overflow-hidden p-12 sm:p-16 rounded-3xl border border-[#FF6A00]/15 bg-gradient-to-b from-[#FF6A00]/8 via-[#FF6A00]/4 to-transparent">
            <div aria-hidden className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#FF6A00] opacity-10 rounded-full blur-3xl" />
            <p className="relative text-[11px] font-bold uppercase tracking-[0.22em] text-[#FF6A00] mb-5">Start today</p>
            <h2 className="relative text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
              Start coaching smarter.
            </h2>
            <p className="relative text-white/38 text-base mb-9 max-w-md mx-auto leading-relaxed">
              Join coaches who use CoachMind to work faster, plan better, and develop their teams with precision.
            </p>
            <Link
              href="/signup"
              className="relative inline-block px-10 py-4 bg-[#FF6A00] hover:bg-[#e85f00] text-white font-bold rounded-xl transition-all shadow-2xl shadow-[#FF6A00]/30 text-sm tracking-wide">
              Create your free account →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-10 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-[#FF6A00] rounded flex items-center justify-center font-black text-[9px] text-white">
              CM
            </div>
            <span className="text-white/25 text-sm font-medium">CoachMind</span>
          </div>
          <p className="text-white/15 text-xs">© 2026 CoachMind. Professional coaching platform.</p>
          <div className="flex items-center gap-6 text-xs text-white/25">
            <Link href="/login" className="hover:text-white/50 transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-white/50 transition-colors">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
