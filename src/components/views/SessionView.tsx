'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSessionsStore } from '@/store/sessionsStore';
import { useDrillsStore } from '@/store/drillsStore';
import { useTeamsStore } from '@/store/teamsStore';
import type { Intensity, SessionSection } from '@/types';

const INT_STYLES: Record<Intensity, { label: string; dot: string; text: string; bg: string }> = {
  low: { label: 'Low',  dot: 'bg-sky-400',    text: 'text-sky-400',    bg: 'bg-sky-900/30' },
  mid: { label: 'Mid',  dot: 'bg-amber-400',  text: 'text-amber-400',  bg: 'bg-amber-900/30' },
  high:{ label: 'High', dot: 'bg-red-400',    text: 'text-red-400',    bg: 'bg-red-900/30' },
};

const SECTION_LABELS: Record<SessionSection, { label: string; color: string }> = {
  warmup:   { label: 'Warm-up',   color: 'text-sky-400' },
  main:     { label: 'Main',      color: 'text-emerald-400' },
  game:     { label: 'Game',      color: 'text-amber-400' },
  cooldown: { label: 'Cool-down', color: 'text-violet-400' },
};

export default function SessionView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { sessions, seedIfEmpty } = useSessionsStore();
  const { drills, seedIfEmpty: seedDrills } = useDrillsStore();
  const { teams, seedIfEmpty: seedTeams } = useTeamsStore();

  const [fieldMode, setFieldMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => { seedDrills(); seedTeams(); }, [seedDrills, seedTeams]);
  useEffect(() => { const ids = Object.keys(drills); if (ids.length) seedIfEmpty(ids); }, [drills, seedIfEmpty]);

  const session = sessions[sessionId];
  useEffect(() => {
    const t = setTimeout(() => { if (!sessions[sessionId]) router.push('/sessions'); }, 1000);
    return () => clearTimeout(t);
  }, [sessionId, sessions, router]);

  // Keep current index in bounds
  useEffect(() => {
    if (session && currentIndex >= session.blocks.length) {
      setCurrentIndex(Math.max(0, session.blocks.length - 1));
    }
  }, [session, currentIndex]);

  // Track fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keyboard navigation in field mode
  useEffect(() => {
    if (!fieldMode || !session) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(i + 1, session.blocks.length - 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Escape' && isFullscreen) document.exitFullscreen();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fieldMode, session, isFullscreen]);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  if (!session) return <div className="flex-1 flex items-center justify-center text-gray-600">Loading…</div>;

  const team = session.teamId ? teams[session.teamId] : null;
  const totalMin = session.blocks.reduce((s, b) => s + b.durationMin, 0);

  const allEquipment = session.blocks
    .flatMap((b) => drills[b.drillId]?.equipment ?? [])
    .reduce((acc, eq) => { acc[eq] = (acc[eq] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  // ─── Field Mode ───────────────────────────────────────────────────────────────
  if (fieldMode) {
    const block = session.blocks[currentIndex];
    const drill = block ? drills[block.drillId] : null;
    const int = block ? INT_STYLES[block.intensity] : null;
    const sectionMeta = block?.section ? SECTION_LABELS[block.section] : null;
    const total = session.blocks.length;

    return (
      <div ref={containerRef} className={`flex-1 flex flex-col bg-gray-950 min-h-0 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        {/* Field mode top bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
          <button onClick={() => setFieldMode(false)} className="text-gray-500 hover:text-gray-300 text-sm">← Overview</button>
          <span className="text-gray-700">|</span>
          <span className="text-sm font-medium truncate">{session.title}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleFullscreen}
              className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs transition-colors">
              {isFullscreen ? 'Exit Full' : 'Fullscreen'}
            </button>
            <Link href={`/sessions/${sessionId}`}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-medium transition-colors">
              Edit
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-800 shrink-0">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
        </div>

        {/* Current drill */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl">
            {/* Progress counter */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-1">
                {session.blocks.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentIndex ? 'bg-emerald-400' : i < currentIndex ? 'bg-gray-600' : 'bg-gray-800'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-gray-400">
                {currentIndex + 1} <span className="text-gray-600">/ {total}</span>
              </span>
            </div>

            {block && (
              <div className={`bg-gray-900 border rounded-2xl p-6 ${sectionMeta ? '' : 'border-gray-800'}`}>
                {/* Section badge */}
                {sectionMeta && (
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionMeta.color}`}>
                    {sectionMeta.label}
                  </p>
                )}

                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{drill?.title ?? 'Unknown drill'}</h2>
                    {drill?.objective && <p className="text-sm text-gray-400">{drill.objective}</p>}
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="text-3xl font-bold text-white">{block.durationMin}<span className="text-lg text-gray-500"> min</span></span>
                    {int && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${int.text} ${int.bg}`}>
                        {int.label} intensity
                      </span>
                    )}
                  </div>
                </div>

                {/* Coaching points */}
                {drill?.coachingPoints && drill.coachingPoints.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Key Coaching Points</p>
                    <ul className="space-y-1.5">
                      {drill.coachingPoints.map((pt, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-300">
                          <span className="text-emerald-500 shrink-0">•</span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Drill details */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                  {drill?.ageGroup && <span>Age: {drill.ageGroup}</span>}
                  {drill?.playerCount && <span>Players: {drill.playerCount}</span>}
                  {drill?.areaSize && <span>Area: {drill.areaSize}</span>}
                  {drill?.pitch.type && <span>Pitch: {drill.pitch.type}</span>}
                </div>

                {/* Block notes */}
                {block.notes && (
                  <div className="bg-gray-800 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">Session Notes</p>
                    <p className="text-sm text-gray-300">{block.notes}</p>
                  </div>
                )}

                {/* Equipment */}
                {drill?.equipment && drill.equipment.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Equipment</p>
                    <div className="flex flex-wrap gap-1.5">
                      {drill.equipment.map((eq) => (
                        <span key={eq} className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">{eq}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors"
              >
                ← Previous
              </button>
              <span className="text-xs text-gray-600 shrink-0 w-16 text-center">
                {currentIndex + 1} / {total}
              </span>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
                disabled={currentIndex === total - 1}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Overview Mode ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto bg-gray-950 print:bg-white">
      <div className="max-w-3xl mx-auto p-6 print:p-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 print:hidden">
          <Link href={`/sessions/${session.id}`} className="text-gray-500 hover:text-gray-300 text-sm">← Builder</Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-xl font-bold truncate">{session.title}</h1>
          <div className="ml-auto flex items-center gap-2">
            {session.blocks.length > 0 && (
              <button
                onClick={() => { setCurrentIndex(0); setFieldMode(true); }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 rounded text-sm font-medium transition-colors"
              >
                Field Mode
              </button>
            )}
            <Link href={`/sessions/${sessionId}/print`} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 border border-orange-500 rounded text-sm font-medium transition-colors">
              Print
            </Link>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-2xl font-bold">{session.title}</h1>
          {(session.date || team) && <p className="text-sm text-gray-500">{[session.date, team?.name, session.trainingDay].filter(Boolean).join(' · ')}</p>}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Duration', value: `${totalMin} min` },
            { label: 'Drills', value: String(session.blocks.length) },
            { label: 'Age Group', value: session.ageGroup },
            { label: 'Players', value: session.playerCount },
          ].map((item) => item.value ? (
            <div key={item.label} className="bg-gray-900 rounded-lg p-3 print:border print:border-gray-200">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="text-sm font-medium">{item.value}</p>
            </div>
          ) : null)}
        </div>

        {/* Intensity bar */}
        {session.blocks.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-gray-500 mb-1">Session Load</p>
            <div className="flex h-3 rounded overflow-hidden gap-px">
              {session.blocks.map((b) => (
                <div key={b.id} title={drills[b.drillId]?.title}
                  style={{ width: `${Math.round((b.durationMin / totalMin) * 100)}%`, minWidth: 4 }}
                  className={`${b.intensity === 'low' ? 'bg-sky-500' : b.intensity === 'mid' ? 'bg-amber-500' : 'bg-red-500'} opacity-80`} />
              ))}
            </div>
          </div>
        )}

        {session.objective && (
          <div className="bg-gray-900 rounded-xl p-4 mb-4 print:border print:border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Objective</p>
            <p className="text-sm">{session.objective}</p>
          </div>
        )}

        {/* Blocks */}
        <div className="space-y-3 mb-6">
          {session.blocks.map((block, i) => {
            const drill = drills[block.drillId];
            const int = INT_STYLES[block.intensity];
            const sectionMeta = block.section ? SECTION_LABELS[block.section] : null;
            return (
              <div key={block.id}
                className="bg-gray-900 rounded-xl overflow-hidden print:border print:border-gray-200 print:break-inside-avoid cursor-pointer hover:border-gray-700 border border-gray-800 transition-colors"
                onClick={() => { setCurrentIndex(i); setFieldMode(true); }}
              >
                {sectionMeta && (
                  <div className="px-4 pt-2 pb-0">
                    <span className={`text-xs font-bold uppercase tracking-wider ${sectionMeta.color}`}>{sectionMeta.label}</span>
                  </div>
                )}
                <div className="flex items-start gap-3 p-4">
                  <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{drill?.title ?? 'Unknown drill'}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${int.text} bg-gray-800`}>{int.label}</span>
                      <span className="text-xs text-gray-500 ml-auto">{block.durationMin} min</span>
                    </div>
                    {drill?.objective && <p className="text-xs text-gray-500 mb-1">{drill.objective}</p>}
                    {block.notes && <p className="text-xs text-gray-500 italic">{block.notes}</p>}
                    {drill?.coachingPoints && drill.coachingPoints.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">Key Points:</p>
                        <ul className="space-y-0.5">
                          {drill.coachingPoints.slice(0, 3).map((pt, j) => (
                            <li key={j} className="text-xs text-gray-400 flex gap-1"><span className="text-emerald-600">•</span>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {Object.keys(allEquipment).length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4 print:border print:border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Equipment Summary</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(allEquipment).map((eq) => (
                <span key={eq} className="px-2 py-0.5 bg-gray-800 rounded text-xs print:border print:border-gray-300">{eq}</span>
              ))}
            </div>
          </div>
        )}

        {session.notes && (
          <div className="mt-4 bg-gray-900 rounded-xl p-4 print:border print:border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm">{session.notes}</p>
          </div>
        )}

        {session.blocks.length > 0 && (
          <div className="mt-6 text-center print:hidden">
            <button
              onClick={() => { setCurrentIndex(0); setFieldMode(true); }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition-colors"
            >
              Start Field Mode →
            </button>
            <p className="text-xs text-gray-600 mt-2">Navigate drills one at a time · Use ← → arrow keys</p>
          </div>
        )}
      </div>
    </div>
  );
}
