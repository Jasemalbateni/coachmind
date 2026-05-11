import Link from 'next/link';

export default function V2LandingPage() {
  return (
    <div className="min-h-screen-dvh bg-[#0a0f1c] flex flex-col items-center justify-center text-white">
      <div className="text-center max-w-lg px-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#63C0B0] flex items-center justify-center">
            <span className="text-xl font-black text-[#0a0f1c]">CM</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">CoachMind</h1>
            <p className="text-sm text-[#63C0B0] font-medium">V2 — New Editor</p>
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-4 text-white">
          Design Drills with Precision
        </h2>
        <p className="text-[#9CA3AF] mb-8 leading-relaxed">
          A completely redesigned football drill builder with a clean canvas engine,
          powerful tactic arrows, and full undo/redo history.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {[
            'Full-pitch canvas',
            'Tactic arrows',
            'Smart cone areas',
            'Team formations',
            'Undo / Redo',
            'Keyboard shortcuts',
            'Grid snapping',
          ].map(f => (
            <span
              key={f}
              className="px-3 py-1 rounded-full text-xs font-medium bg-[#1e293b] text-[#9CA3AF] border border-[#2d3748]"
            >
              {f}
            </span>
          ))}
        </div>

        <Link
          href="/v2/editor/new"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#63C0B0] text-[#0a0f1c] font-semibold text-sm hover:bg-[#4BA898] transition-colors shadow-lg shadow-[#63C0B0]/20"
        >
          <span>Open Editor</span>
          <span>→</span>
        </Link>

        <p className="mt-4 text-xs text-[#374151]">
          <Link href="/" className="hover:text-[#6B7280] transition-colors">
            ← Back to V1
          </Link>
        </p>
      </div>
    </div>
  );
}
