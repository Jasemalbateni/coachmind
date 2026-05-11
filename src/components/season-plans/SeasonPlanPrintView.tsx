'use client';

import { useEffect } from 'react';
import { useSeasonPlansStore } from '@/store/seasonPlansStore';
import { useTeamsStore } from '@/store/teamsStore';
import { useSessionsStore } from '@/store/sessionsStore';
import { useDrillsStore } from '@/store/drillsStore';
import MiniPitchPreview from '@/components/MiniPitchPreview';
import type { Intensity, Session, SessionSection } from '@/types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const INT_LABELS: Record<Intensity, string> = { low: 'Low', mid: 'Mid', high: 'High' };
const INT_COLORS: Record<Intensity, { bg: string; text: string }> = {
  low:  { bg: '#dbeafe', text: '#1e40af' },
  mid:  { bg: '#fef3c7', text: '#92400e' },
  high: { bg: '#fee2e2', text: '#991b1b' },
};

// CoachMind brand
const BRAND = {
  orange: '#FF6A00',
  dark: '#263238',
  bg: '#F4F4F4',
  accent: '#00B8D4',
  highlight: '#FFC857',
};

const SECTION_LABELS: Record<SessionSection, { label: string; color: string }> = {
  warmup:   { label: 'Warm-up',   color: BRAND.accent },
  main:     { label: 'Main',      color: BRAND.orange },
  game:     { label: 'Game',      color: BRAND.highlight },
  cooldown: { label: 'Cool-down', color: '#8b5cf6' },
};

/** Derive an overall session intensity from its blocks (weighted average → rounded). */
function sessionIntensity(session: Session): Intensity {
  if (!session.blocks.length) return 'mid';
  const map: Record<Intensity, number> = { low: 1, mid: 2, high: 3 };
  const avg = session.blocks.reduce((sum, b) => sum + map[b.intensity], 0) / session.blocks.length;
  if (avg < 1.5) return 'low';
  if (avg < 2.5) return 'mid';
  return 'high';
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('default', { day: 'numeric', month: 'short' });
}

export default function SeasonPlanPrintView({ planId }: { planId: string }) {
  const { plans } = useSeasonPlansStore();
  const { teams, seedIfEmpty: seedTeams } = useTeamsStore();
  const { sessions, seedIfEmpty: seedSessions } = useSessionsStore();
  const { drills, seedIfEmpty: seedDrills } = useDrillsStore();

  useEffect(() => { seedTeams(); seedDrills(); }, [seedTeams, seedDrills]);
  useEffect(() => {
    const ids = Object.keys(drills);
    if (ids.length) seedSessions(ids);
  }, [drills, seedSessions]);

  const plan = plans[planId];
  if (!plan) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 p-8">
        Plan not found.
      </div>
    );
  }

  const team = plan.teamId ? teams[plan.teamId] : null;
  const entryByDate = Object.fromEntries(plan.entries.map((e) => [e.date, e]));

  // Every calendar day in range
  function getAllDates(start: string, end: string): Date[] {
    const dates: Date[] = [];
    const endDate = new Date(end);
    const cur = new Date(start);
    while (cur <= endDate) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  // Training days only (or every day if team hasn't set training days)
  function getTrainingDates(start: string, end: string, trainingDays: string[]): Date[] {
    return getAllDates(start, end).filter((d) => {
      const dayName = DAY_NAMES[d.getDay()];
      return trainingDays.length === 0 || trainingDays.includes(dayName);
    });
  }

  const trainingDays = team?.trainingDays ?? [];
  const trainingDates = getTrainingDates(plan.startDate, plan.endDate, trainingDays);

  // Group training dates by ISO week (keyed by week start date)
  const byWeek: Map<string, Date[]> = new Map();
  for (const d of trainingDates) {
    const ws = startOfWeek(d);
    const key = ws.toISOString().slice(0, 10);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(d);
  }

  // Always render every week in chronological order — covers the full season.
  const weekEntries = Array.from(byWeek.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, dates], idx) => ({
      weekLabel: `Week ${idx + 1}`,
      weekStart: new Date(key),
      dates,
    }));

  const totalDrills = plan.entries.reduce((sum, e) => {
    const s = e.sessionId ? sessions[e.sessionId] : null;
    return sum + (s ? s.blocks.length : 0);
  }, 0);
  const assignedCount = plan.entries.filter((e) => e.sessionId).length;

  return (
    <>
      {/*
        Print CSS:
        - A4 portrait → enough vertical room for full drill cards
        - One printed page per week (page-break-before on each .print-week)
        - A week is allowed to overflow into a 2nd page if it has many drills,
          but individual drill cards must never split across pages.
      */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm 12mm 14mm 12mm; }
          html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }

          /* Cover page: always first, no leading break */
          .print-cover {
            page-break-before: avoid;
            break-before: avoid;
            page-break-after: always;
            break-after: page;
          }

          /* Each week starts on its own page; if it overflows it continues on the next page */
          .print-week {
            page-break-before: always;
            break-before: page;
          }

          /* Drill cards never split across pages */
          .print-drill {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Day block also stays together when possible (a single drill day fits on one page) */
          .print-day {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Hide screen-only chrome */
          .screen-only { display: none !important; }
        }

        /* Screen preview width matches A4 portrait for accurate visual */
        .a4-portrait {
          max-width: 210mm;
          margin: 0 auto;
        }
      `}</style>

      {/* Toolbar — screen only */}
      <div className="no-print h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0 shadow-sm">
        <a href={`/season-plans/${planId}`} className="text-slate-400 hover:text-slate-700 text-sm">← Back to Editor</a>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">{plan.title} — Print View</span>
        <span className="text-xs text-slate-400 ml-2">
          {weekEntries.length} weeks · {assignedCount} sessions · {totalDrills} drills · A4 portrait
        </span>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-2 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          style={{ backgroundColor: BRAND.orange }}
        >
          Print / Save PDF
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-100 print:bg-white py-6 print:py-0" id="print-area">
        <div className="a4-portrait bg-white print:bg-white px-10 py-10 print:p-0 shadow-sm print:shadow-none">
          {/* ── Cover page ────────────────────────────────────────────────── */}
          <section className="print-cover">
            <div className="pb-6 mb-8 border-b-4" style={{ borderColor: BRAND.orange }}>
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: BRAND.orange }} />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">CoachMind · Season Plan</p>
                      <h1 className="text-3xl font-bold leading-tight" style={{ color: BRAND.dark }}>{plan.title}</h1>
                    </div>
                  </div>
                  {team && (
                    <div className="flex items-center gap-2 ml-5 mb-2">
                      <div className="w-4 h-4 rounded-full" style={{ background: `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor})` }} />
                      <span className="font-semibold" style={{ color: BRAND.dark }}>{team.name}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500 text-sm">{team.ageGroup}</span>
                    </div>
                  )}
                  <p className="text-slate-500 ml-5 text-sm">
                    {new Date(plan.startDate).toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' → '}
                    {new Date(plan.endDate).toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {trainingDays.length > 0 && (
                    <p className="text-slate-500 ml-5 text-sm mt-1">
                      Training days: <span className="font-semibold" style={{ color: BRAND.dark }}>{trainingDays.join(', ')}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Weeks', value: weekEntries.length, color: BRAND.orange },
                { label: 'Training days', value: trainingDates.length, color: BRAND.accent },
                { label: 'Sessions assigned', value: assignedCount, color: BRAND.highlight },
                { label: 'Total drills', value: totalDrills, color: BRAND.dark },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl px-4 py-3 border border-slate-200" style={{ backgroundColor: BRAND.bg }}>
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{s.label}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Table of contents */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Contents</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {weekEntries.map(({ weekLabel, weekStart, dates }) => {
                  const weekEnd = dates[dates.length - 1];
                  const assigned = dates.reduce((n, d) => {
                    const e = entryByDate[d.toISOString().slice(0, 10)];
                    return n + (e?.sessionId ? 1 : 0);
                  }, 0);
                  return (
                    <div key={weekLabel} className="flex items-center text-sm">
                      <span className="font-semibold" style={{ color: BRAND.dark }}>{weekLabel}</span>
                      <span className="mx-2 text-slate-300">·</span>
                      <span className="text-slate-500">{formatDateShort(weekStart)} – {formatDateShort(weekEnd)}</span>
                      <span className="flex-1 mx-2 border-b border-dotted border-slate-300" />
                      <span className="text-xs font-semibold" style={{ color: assigned > 0 ? BRAND.orange : '#cbd5e1' }}>
                        {assigned} session{assigned === 1 ? '' : 's'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="mt-10 text-[10px] text-slate-300 text-center">
              Generated by CoachMind · {new Date().toLocaleDateString()}
            </p>
          </section>

          {/* ── One section per week ──────────────────────────────────────── */}
          {weekEntries.map(({ weekLabel, weekStart, dates }) => {
            const weekEnd = dates[dates.length - 1];

            // Only training days that have a session attached or a note appear in the page body
            const meaningfulDays = dates.filter((d) => {
              const e = entryByDate[d.toISOString().slice(0, 10)];
              return !!(e?.sessionId || e?.notes);
            });

            return (
              <section key={weekLabel} className="print-week">
                {/* Week header */}
                <div className="flex items-center gap-3 mb-5 pb-3 border-b-2" style={{ borderColor: BRAND.orange + '30' }}>
                  <div className="px-3 py-1.5 rounded-lg text-white text-sm font-bold shadow-sm" style={{ backgroundColor: BRAND.dark }}>
                    {weekLabel}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: BRAND.dark }}>
                      {formatDateShort(weekStart)} – {formatDateShort(weekEnd)}
                    </p>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                      {meaningfulDays.length} of {dates.length} training day{dates.length === 1 ? '' : 's'} planned
                    </p>
                  </div>
                  <div className="flex-1 h-px bg-slate-100" />
                  <p className="text-xs font-bold text-slate-300">{plan.title}</p>
                </div>

                {meaningfulDays.length === 0 ? (
                  <p className="italic text-slate-400 text-sm py-6 text-center">
                    No sessions assigned this week.
                  </p>
                ) : (
                  meaningfulDays.map((d) => {
                    const dateStr = d.toISOString().slice(0, 10);
                    const entry = entryByDate[dateStr];
                    const session = entry?.sessionId ? sessions[entry.sessionId] : null;
                    const si = session ? sessionIntensity(session) : null;
                    const ic = si ? INT_COLORS[si] : null;
                    const dayName = DAY_NAMES[d.getDay()];

                    return (
                      <div key={dateStr} className="print-day mb-6">
                        {/* Day strip */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="rounded-xl px-3 py-2 text-center shrink-0" style={{ backgroundColor: BRAND.bg, minWidth: 64 }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">{dayName.slice(0, 3)}</p>
                            <p className="text-xl font-bold leading-tight" style={{ color: BRAND.dark }}>{d.getDate()}</p>
                            <p className="text-[10px] text-slate-400 leading-none">{d.toLocaleDateString('default', { month: 'short' })}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            {session ? (
                              <>
                                <p className="font-bold text-base leading-tight" style={{ color: BRAND.dark }}>{session.title}</p>
                                {session.objective && (
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{session.objective}</p>
                                )}
                              </>
                            ) : (
                              <p className="text-sm italic text-slate-400">No session</p>
                            )}
                          </div>
                          {si && ic && (
                            <span className="text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0"
                              style={{ backgroundColor: ic.bg, color: ic.text }}>
                              {INT_LABELS[si]}
                            </span>
                          )}
                        </div>

                        {/* Per-drill cards */}
                        {session && session.blocks.length > 0 && (
                          <div className="space-y-3 ml-1">
                            {session.blocks.map((block, bi) => {
                              const drill = drills[block.drillId];
                              if (!drill) return null;
                              const blockInt = INT_COLORS[block.intensity];
                              const sec = block.section ? SECTION_LABELS[block.section] : null;

                              return (
                                <div
                                  key={block.id}
                                  className="print-drill rounded-xl border border-slate-200 overflow-hidden"
                                  style={{ backgroundColor: '#FFFFFF' }}
                                >
                                  {/* Drill header */}
                                  <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100" style={{ backgroundColor: BRAND.bg }}>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                      style={{ backgroundColor: BRAND.orange }}>
                                      {bi + 1}
                                    </div>
                                    {sec && (
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                                        style={{ backgroundColor: sec.color + '20', color: sec.color }}>
                                        {sec.label}
                                      </span>
                                    )}
                                    <p className="font-bold text-sm flex-1 min-w-0 truncate" style={{ color: BRAND.dark }}>
                                      {drill.title}
                                    </p>
                                    <span className="text-xs font-semibold text-slate-500 shrink-0">
                                      {block.durationMin} min
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0"
                                      style={{ backgroundColor: blockInt.bg, color: blockInt.text }}>
                                      {INT_LABELS[block.intensity]}
                                    </span>
                                  </div>

                                  {/* Drill body: large diagram + text */}
                                  <div className="flex gap-4 p-3">
                                    {/* Large diagram */}
                                    <div className="shrink-0">
                                      <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                        <MiniPitchPreview drill={drill} width={300} height={190} />
                                      </div>
                                      {/* Stats strip */}
                                      {(drill.ageGroup || drill.playerCount || drill.areaSize) && (
                                        <div className="mt-2 flex gap-1.5">
                                          {[
                                            { label: 'Age', value: drill.ageGroup },
                                            { label: 'Players', value: drill.playerCount },
                                            { label: 'Area', value: drill.areaSize },
                                          ].filter((x) => x.value).map((x) => (
                                            <div key={x.label} className="flex-1 px-2 py-1 rounded text-center" style={{ backgroundColor: BRAND.bg }}>
                                              <p className="text-[9px] uppercase text-slate-400 leading-none">{x.label}</p>
                                              <p className="text-[11px] font-bold leading-tight mt-0.5" style={{ color: BRAND.dark }}>{x.value}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Text column */}
                                    <div className="flex-1 min-w-0">
                                      {(drill.description || drill.objective) && (
                                        <div className="mb-2.5">
                                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: BRAND.accent }}>
                                            Description
                                          </p>
                                          <p className="text-[12px] leading-snug text-slate-700">
                                            {drill.description ?? drill.objective}
                                          </p>
                                        </div>
                                      )}

                                      {drill.coachingPoints && drill.coachingPoints.length > 0 && (
                                        <div className="mb-2">
                                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: BRAND.orange }}>
                                            Technical / Coaching Points
                                          </p>
                                          <ul className="space-y-1">
                                            {drill.coachingPoints.map((pt, j) => (
                                              <li key={j} className="flex gap-2 text-[12px] leading-snug">
                                                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: BRAND.orange }} />
                                                <span className="text-slate-700">{pt}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {drill.coachingCues && drill.coachingCues.length > 0 && (
                                        <div className="mb-1">
                                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: BRAND.accent }}>
                                            Cues
                                          </p>
                                          <ul className="space-y-0.5">
                                            {drill.coachingCues.slice(0, 3).map((cue, j) => (
                                              <li key={j} className="flex gap-1.5 text-[11px] text-slate-700 leading-snug">
                                                <span className="shrink-0" style={{ color: BRAND.accent }}>→</span>
                                                {cue}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {block.notes && (
                                        <p className="mt-2 text-[11px] italic text-slate-500 border-l-2 pl-2"
                                          style={{ borderColor: BRAND.highlight }}>
                                          {block.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {entry?.notes && (
                          <div className="mt-2 ml-1 px-3 py-2 rounded-lg border-l-4 text-xs italic text-slate-600"
                            style={{ borderColor: BRAND.highlight, backgroundColor: BRAND.highlight + '15' }}>
                            <span className="font-semibold not-italic mr-1" style={{ color: BRAND.dark }}>Note:</span>
                            {entry.notes}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Per-week footer */}
                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-300">
                  <span>{plan.title}</span>
                  <span>{weekLabel} · {formatDateShort(weekStart)} – {formatDateShort(weekEnd)}</span>
                  <span>CoachMind</span>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
