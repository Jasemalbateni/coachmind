'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSessionsStore } from '@/store/sessionsStore';
import { useDrillsStore } from '@/store/drillsStore';
import { useTeamsStore } from '@/store/teamsStore';
import MiniPitchPreview from '@/components/MiniPitchPreview';
import type { Intensity, SessionSection } from '@/types';

const BRAND = {
  orange: '#FF6A00',
  dark: '#263238',
  bg: '#F4F4F4',
  accent: '#00B8D4',
  highlight: '#FFC857',
};

const INT_LABELS: Record<Intensity, string> = { low: 'Low', mid: 'Mid', high: 'High' };
const INT_COLORS: Record<Intensity, { bg: string; text: string }> = {
  low:  { bg: '#dbeafe', text: '#1e40af' },
  mid:  { bg: '#fef3c7', text: '#92400e' },
  high: { bg: '#fee2e2', text: '#991b1b' },
};
const SECTION_LABELS: Record<SessionSection, { label: string; color: string }> = {
  warmup:   { label: 'Warm-up',   color: BRAND.accent },
  main:     { label: 'Main',      color: BRAND.orange },
  game:     { label: 'Game',      color: BRAND.highlight },
  cooldown: { label: 'Cool-down', color: '#8b5cf6' },
};

export default function SessionPrintView({ sessionId }: { sessionId: string }) {
  const { sessions, seedIfEmpty } = useSessionsStore();
  const { drills, seedIfEmpty: seedDrills } = useDrillsStore();
  const { teams, seedIfEmpty: seedTeams } = useTeamsStore();

  useEffect(() => { seedDrills(); seedTeams(); }, [seedDrills, seedTeams]);
  useEffect(() => {
    const ids = Object.keys(drills);
    if (ids.length) seedIfEmpty(ids);
  }, [drills, seedIfEmpty]);

  const session = sessions[sessionId];
  if (!session) {
    return <div className="flex-1 flex items-center justify-center text-slate-400 p-8">Session not found.</div>;
  }

  const team = session.teamId ? teams[session.teamId] : null;
  const totalMin = session.blocks.reduce((s, b) => s + b.durationMin, 0);

  return (
    <>
      {/*
        Print CSS:
        - Landscape A4
        - Each drill page = one printed page
        - No app chrome in print (NavBar hidden via globals.css)
      */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 12mm; }

          .session-print-toolbar { display: none !important; }

          /* Each drill starts on a fresh page. We try to keep each drill on
             one page, but if its coaching points / cues run long the content
             must flow naturally to a second page instead of being clipped —
             that's why we don't set max-height or overflow:hidden here. */
          .drill-print-page {
            page-break-before: always;
            break-before: page;
          }

          /* Cover page is the first sheet — no leading page break. */
          .cover-print-page {
            page-break-before: avoid;
            break-before: avoid;
          }
        }
      `}</style>

      {/* ── Screen toolbar ─────────────────────────────────────────────────── */}
      <div className="session-print-toolbar no-print h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0 shadow-sm">
        <Link href={`/sessions/${sessionId}/view`} className="text-slate-400 hover:text-slate-700 text-sm">← Back</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">{session.title} — Print Preview</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400">{session.blocks.length} drill{session.blocks.length !== 1 ? 's' : ''} · {totalMin} min · Landscape A4</span>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            style={{ backgroundColor: BRAND.orange }}
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* ── Printable content area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-white">

        {/* Cover / overview page */}
        <div className="cover-print-page p-10 min-h-screen print:min-h-0 print:p-0">
          {/* Session header */}
          <div className="mb-8 pb-6 border-b-4" style={{ borderColor: BRAND.orange }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: BRAND.orange }} />
                  <h1 className="text-4xl font-bold" style={{ color: BRAND.dark }}>{session.title}</h1>
                </div>
                <div className="ml-5 flex flex-wrap gap-4 text-slate-500 mt-2">
                  {session.date && <span>{session.date}</span>}
                  {team && <span className="font-medium" style={{ color: BRAND.dark }}>{team.name}</span>}
                  {session.ageGroup && <span>{session.ageGroup}</span>}
                  {session.playerCount && <span>{session.playerCount} players</span>}
                </div>
              </div>
              <div className="shrink-0 rounded-2xl p-5 text-center" style={{ backgroundColor: BRAND.bg, minWidth: 140 }}>
                <p className="text-4xl font-bold" style={{ color: BRAND.orange }}>{totalMin}</p>
                <p className="text-sm text-slate-500">minutes</p>
                <p className="text-2xl font-bold mt-1" style={{ color: BRAND.dark }}>{session.blocks.length}</p>
                <p className="text-sm text-slate-500">drills</p>
              </div>
            </div>

            {session.objective && (
              <div className="ml-5 mt-4 px-5 py-3 rounded-xl" style={{ backgroundColor: BRAND.accent + '15', borderLeft: `4px solid ${BRAND.accent}` }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: BRAND.accent }}>Session Objective</p>
                <p className="text-slate-700">{session.objective}</p>
              </div>
            )}
          </div>

          {/* Session overview table */}
          <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: BRAND.dark }}>Session Plan</h2>
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="grid text-xs font-bold uppercase tracking-wider text-white"
              style={{ gridTemplateColumns: '44px 44px 1fr 100px 80px', backgroundColor: BRAND.dark }}>
              <div className="px-3 py-3">#</div>
              <div className="px-2 py-3">Diagram</div>
              <div className="px-4 py-3">Drill</div>
              <div className="px-3 py-3 text-center">Duration</div>
              <div className="px-3 py-3 text-center">Intensity</div>
            </div>
            {session.blocks.map((block, i) => {
              const drill = drills[block.drillId];
              const intStyle = INT_COLORS[block.intensity];
              const sectionMeta = block.section ? SECTION_LABELS[block.section] : null;
              return (
                <div key={block.id}
                  className={`grid border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                  style={{ gridTemplateColumns: '44px 44px 1fr 100px 80px' }}>
                  <div className="px-3 py-3 flex items-center justify-center">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: BRAND.orange }}>
                      {i + 1}
                    </span>
                  </div>
                  <div className="px-1 py-2 flex items-center">
                    {drill && <MiniPitchPreview drill={drill} width={36} height={24} />}
                  </div>
                  <div className="px-4 py-3">
                    {sectionMeta && (
                      <span className="text-xs font-bold uppercase tracking-wider mr-2" style={{ color: sectionMeta.color }}>
                        {sectionMeta.label} ·
                      </span>
                    )}
                    <span className="font-semibold" style={{ color: BRAND.dark }}>{drill?.title ?? 'Unknown drill'}</span>
                    {drill?.objective && <p className="text-xs text-slate-500 truncate mt-0.5">{drill.objective}</p>}
                    {block.notes && <p className="text-xs text-slate-400 italic mt-0.5">{block.notes}</p>}
                  </div>
                  <div className="px-3 py-3 flex items-center justify-center">
                    <span className="text-lg font-bold" style={{ color: BRAND.dark }}>{block.durationMin}<span className="text-sm font-normal text-slate-500"> min</span></span>
                  </div>
                  <div className="px-3 py-3 flex items-center justify-center">
                    <span className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{ backgroundColor: intStyle.bg, color: intStyle.text }}>
                      {INT_LABELS[block.intensity]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {session.notes && (
            <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: BRAND.highlight + '20', borderLeft: `4px solid ${BRAND.highlight}` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: BRAND.dark }}>Session Notes</p>
              <p className="text-slate-700">{session.notes}</p>
            </div>
          )}
        </div>

        {/* One page per drill */}
        {session.blocks.map((block, i) => {
          const drill = drills[block.drillId];
          if (!drill) return null;
          const intStyle = INT_COLORS[block.intensity];
          const sectionMeta = block.section ? SECTION_LABELS[block.section] : null;

          return (
            <div key={block.id} className="drill-print-page p-10 print:p-0">
              {/* Drill page header */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b-2" style={{ borderColor: BRAND.orange + '40' }}>
                {/* Session name watermark */}
                <span className="text-xs text-slate-400 font-medium">{session.title}</span>
                <span className="text-slate-300 text-xs">·</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: BRAND.orange }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  {sectionMeta && (
                    <span className="text-xs font-bold uppercase tracking-wider mr-2" style={{ color: sectionMeta.color }}>
                      {sectionMeta.label} ·
                    </span>
                  )}
                  <span className="text-2xl font-bold" style={{ color: BRAND.dark }}>{drill.title}</span>
                  {drill.objective && <p className="text-sm text-slate-500 mt-0.5">{drill.objective}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-3xl font-bold" style={{ color: BRAND.dark }}>{block.durationMin}<span className="text-base font-normal text-slate-500"> min</span></p>
                  <span className="text-sm px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: intStyle.bg, color: intStyle.text }}>
                    {INT_LABELS[block.intensity]}
                  </span>
                </div>
              </div>

              {/* Two-column layout: large diagram left, details right */}
              <div className="flex gap-8">
                {/* Left: Large drill diagram */}
                <div className="shrink-0" style={{ width: 460 }}>
                  <div className="rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm">
                    <MiniPitchPreview drill={drill} width={460} height={296} className="w-full" />
                  </div>
                  {/* Stats strip under diagram */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { label: 'Age Group', value: drill.ageGroup },
                      { label: 'Players', value: drill.playerCount },
                      { label: 'Area', value: drill.areaSize },
                    ].filter((x) => x.value).map((x) => (
                      <div key={x.label} className="px-3 py-2 rounded-xl text-center" style={{ backgroundColor: BRAND.bg }}>
                        <p className="text-xs text-slate-400">{x.label}</p>
                        <p className="text-sm font-bold" style={{ color: BRAND.dark }}>{x.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Drill details */}
                <div className="flex-1 min-w-0">
                  {/* Description */}
                  {drill.description && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: BRAND.accent }}>Description</p>
                      <p className="text-slate-700 leading-relaxed">{drill.description}</p>
                    </div>
                  )}

                  {/* Coaching points */}
                  {drill.coachingPoints && drill.coachingPoints.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: BRAND.orange }}>Key Coaching Points</p>
                      <ul className="space-y-1.5">
                        {drill.coachingPoints.map((pt, j) => (
                          <li key={j} className="flex gap-2.5 text-sm">
                            <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: BRAND.orange }} />
                            <span className="text-slate-700">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Coaching cues */}
                  {drill.coachingCues && drill.coachingCues.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: BRAND.accent }}>Coaching Cues</p>
                      <ul className="space-y-1">
                        {drill.coachingCues.slice(0, 4).map((cue, j) => (
                          <li key={j} className="flex gap-2 text-sm text-slate-700">
                            <span className="text-xs shrink-0" style={{ color: BRAND.accent }}>→</span>{cue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Common Mistakes */}
                  {drill.commonMistakes && drill.commonMistakes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#ef4444' }}>Common Mistakes</p>
                      <ul className="space-y-1">
                        {drill.commonMistakes.map((m, j) => (
                          <li key={j} className="flex gap-2 text-sm">
                            <span className="text-xs shrink-0 text-red-400">✕</span>
                            <span className="text-slate-700">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Corrections */}
                  {drill.corrections && drill.corrections.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#22c55e' }}>Corrections</p>
                      <ul className="space-y-1">
                        {drill.corrections.map((c, j) => (
                          <li key={j} className="flex gap-2 text-sm">
                            <span className="text-xs shrink-0 text-emerald-500">✓</span>
                            <span className="text-slate-700">{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Constraints */}
                  {drill.keyConstraints && drill.keyConstraints.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: BRAND.dark }}>Key Constraints</p>
                      <ul className="space-y-1">
                        {drill.keyConstraints.map((kc, j) => (
                          <li key={j} className="flex gap-2 text-sm">
                            <span className="text-xs shrink-0 text-slate-400">·</span>
                            <span className="text-slate-700">{kc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Block notes */}
                  {block.notes && (
                    <div className="mb-4 px-3 py-2.5 rounded-xl" style={{ backgroundColor: BRAND.highlight + '20', borderLeft: `3px solid ${BRAND.highlight}` }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: BRAND.dark }}>Coach Note</p>
                      <p className="text-sm text-slate-700">{block.notes}</p>
                    </div>
                  )}

                  {/* Drill notes */}
                  {drill.notes && (
                    <div className="mb-4 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-bold uppercase tracking-wider mb-0.5 text-slate-500">Drill Notes</p>
                      <p className="text-sm text-slate-700">{drill.notes}</p>
                    </div>
                  )}

                  {/* Progression / Regression row */}
                  {(drill.progression || drill.regression) && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {drill.progression && (
                        <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#f0fdf4', borderLeft: `3px solid #22c55e` }}>
                          <p className="text-xs font-bold text-emerald-700 mb-0.5">Progression ↑</p>
                          <p className="text-xs text-slate-700">{drill.progression}</p>
                        </div>
                      )}
                      {drill.regression && (
                        <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#fffbeb', borderLeft: `3px solid #f59e0b` }}>
                          <p className="text-xs font-bold text-amber-700 mb-0.5">Regression ↓</p>
                          <p className="text-xs text-slate-700">{drill.regression}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Equipment */}
                  {drill.equipment && drill.equipment.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: BRAND.dark }}>Equipment</p>
                      <div className="flex flex-wrap gap-1.5">
                        {drill.equipment.map((eq) => (
                          <span key={eq} className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600">{eq}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Page footer */}
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-300">
                <span style={{ color: BRAND.orange }}>CoachDesigner</span>
                <span style={{ color: BRAND.dark }}>{session.title}</span>
                <span>Drill {i + 1} of {session.blocks.length}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
