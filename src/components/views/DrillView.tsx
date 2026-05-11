'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDrillsStore } from '@/store/drillsStore';
import { useTeamsStore } from '@/store/teamsStore';

const PitchCanvas = dynamic(() => import('@/components/drill-editor/PitchCanvas'), { ssr: false });

export default function DrillView({ drillId }: { drillId: string }) {
  const router = useRouter();
  const { drills, seedIfEmpty } = useDrillsStore();
  const { teams, seedIfEmpty: seedTeams } = useTeamsStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => { seedIfEmpty(); seedTeams(); }, [seedIfEmpty, seedTeams]);

  const drill = drills[drillId];
  useEffect(() => {
    const t = setTimeout(() => { if (!drills[drillId]) router.push('/drills'); }, 1000);
    return () => clearTimeout(t);
  }, [drillId, drills, router]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keyboard navigation for coach mode
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) document.exitFullscreen?.();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const drillList = Object.values(drills).sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        const idx = drillList.findIndex((d) => d.id === drillId);
        if (e.key === 'ArrowRight' && idx < drillList.length - 1) {
          router.push(`/drills/${drillList[idx + 1].id}/view`);
        }
        if (e.key === 'ArrowLeft' && idx > 0) {
          router.push(`/drills/${drillList[idx - 1].id}/view`);
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [drillId, drills, isFullscreen, router, toggleFullscreen]);

  if (!drill) return <div className="flex-1 flex items-center justify-center text-gray-600">Loading…</div>;

  const team = drill.teamId ? teams[drill.teamId] : null;

  const drillList = Object.values(drills).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const currentIdx = drillList.findIndex((d) => d.id === drillId);
  const prevDrill = currentIdx > 0 ? drillList[currentIdx - 1] : null;
  const nextDrill = currentIdx < drillList.length - 1 ? drillList[currentIdx + 1] : null;

  const canvasHeight = isFullscreen
    ? '100vh'
    : Math.max(300, Math.min(drill.pitch.height, 480));

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto print:overflow-visible ${
        isFullscreen
          ? 'bg-gray-950 fixed inset-0 z-50 flex flex-col'
          : 'bg-gray-950 print:bg-white print:text-black'
      }`}
    >
      {/* Fullscreen overlay header */}
      {isFullscreen ? (
        <div className="bg-gray-900/90 border-b border-gray-800 px-6 py-3 flex items-center gap-4 shrink-0">
          <h1 className="text-xl font-bold flex-1">{drill.title}</h1>
          {team && <span className="text-sm text-emerald-400">{team.name}</span>}
          <div className="flex items-center gap-2">
            <button
              onClick={() => prevDrill && router.push(`/drills/${prevDrill.id}/view`)}
              disabled={!prevDrill}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-sm"
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-600">{currentIdx + 1} / {drillList.length}</span>
            <button
              onClick={() => nextDrill && router.push(`/drills/${nextDrill.id}/view`)}
              disabled={!nextDrill}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-sm"
            >
              Next →
            </button>
          </div>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm"
          >
            ✕ Exit
          </button>
        </div>
      ) : null}

      <div className={isFullscreen ? 'flex-1 min-h-0 flex flex-col' : 'max-w-4xl mx-auto p-6 print:p-0'}>
        {/* Normal header */}
        {!isFullscreen && (
          <div className="flex items-center gap-3 mb-6 print:hidden">
            <Link href={`/drills/${drill.id}`} className="text-gray-500 hover:text-gray-300 text-sm">← Editor</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-xl font-bold">{drill.title}</h1>
            <div className="ml-auto flex gap-2">
              {/* Navigation */}
              <button
                onClick={() => prevDrill && router.push(`/drills/${prevDrill.id}/view`)}
                disabled={!prevDrill}
                title={prevDrill?.title}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 border border-gray-700 rounded text-sm"
              >
                ← Prev
              </button>
              <span className="self-center text-xs text-gray-600">{currentIdx + 1}/{drillList.length}</span>
              <button
                onClick={() => nextDrill && router.push(`/drills/${nextDrill.id}/view`)}
                disabled={!nextDrill}
                title={nextDrill?.title}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 border border-gray-700 rounded text-sm"
              >
                Next →
              </button>
              <button
                onClick={toggleFullscreen}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm"
                title="Fullscreen (F)"
              >
                ⛶ Fullscreen
              </button>
              <button onClick={() => window.print()} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm">Print</button>
            </div>
          </div>
        )}

        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-2xl font-bold">{drill.title}</h1>
          {team && <p className="text-sm text-gray-500">{team.name} · {drill.trainingDay}</p>}
        </div>

        {/* Canvas */}
        <div
          className={`bg-gray-900 overflow-hidden mb-6 print:border print:border-gray-300 ${
            isFullscreen ? 'flex-1 min-h-0 rounded-none' : 'rounded-xl'
          }`}
          style={isFullscreen ? {} : { height: canvasHeight as number }}
        >
          <PitchCanvas
            drill={drill}
            selectedId={null}
            drawTool={null}
            drawFirstPoint={null}
            linkFromId={null}
            snapToGrid={false}
            zoom={1}
            showNames={true}
            onSelect={() => {}}
            onUpdateObject={() => {}}
            onAddObject={() => {}}
            onDeleteObject={() => {}}
            onCanvasPointClick={() => {}}
            onFinishDrawing={() => {}}
            stageRef={stageRef}
          />
        </div>

        {/* Metadata (hidden in fullscreen) */}
        {!isFullscreen && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Age Group', value: drill.ageGroup },
                { label: 'Players', value: drill.playerCount },
                { label: 'Area', value: drill.areaSize },
                { label: 'Duration', value: drill.durationMin ? `${drill.durationMin} min` : undefined },
              ].map((item) => item.value ? (
                <div key={item.label} className="bg-gray-900 rounded-lg p-3 print:border print:border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              ) : null)}
            </div>

            <div className="space-y-4">
              {drill.objective && (
                <Section title="Objective"><p className="text-sm text-gray-300 print:text-black">{drill.objective}</p></Section>
              )}
              {drill.coachingPoints && drill.coachingPoints.length > 0 && (
                <Section title="Coaching Points">
                  <ul className="space-y-1">
                    {drill.coachingPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300 print:text-black">
                        <span className="text-emerald-500 shrink-0 mt-0.5">•</span>{pt}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {drill.equipment && drill.equipment.length > 0 && (
                <Section title="Equipment">
                  <div className="flex flex-wrap gap-2">
                    {drill.equipment.map((eq, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300 print:border print:border-gray-300 print:text-black">{eq}</span>
                    ))}
                  </div>
                </Section>
              )}
              <div className="grid grid-cols-2 gap-4">
                {drill.progression && <Section title="Progression"><p className="text-sm text-gray-300 print:text-black">{drill.progression}</p></Section>}
                {drill.regression && <Section title="Regression"><p className="text-sm text-gray-300 print:text-black">{drill.regression}</p></Section>}
              </div>
              {drill.coachingCues && drill.coachingCues.length > 0 && (
                <Section title="Coaching Cues">
                  <ul className="space-y-1">
                    {drill.coachingCues.map((cue, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300 print:text-black">
                        <span className="text-sky-500 shrink-0 mt-0.5">→</span>{cue}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {drill.keyConstraints && drill.keyConstraints.length > 0 && (
                <Section title="Key Constraints">
                  <ul className="space-y-1">
                    {drill.keyConstraints.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300 print:text-black">
                        <span className="text-amber-500 shrink-0 mt-0.5">◆</span>{c}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {(drill.commonMistakes && drill.commonMistakes.length > 0) || (drill.corrections && drill.corrections.length > 0) ? (
                <div className="grid grid-cols-2 gap-4">
                  {drill.commonMistakes && drill.commonMistakes.length > 0 && (
                    <Section title="Common Mistakes">
                      <ul className="space-y-1">
                        {drill.commonMistakes.map((m, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300 print:text-black">
                            <span className="text-red-500 shrink-0 mt-0.5">✕</span>{m}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}
                  {drill.corrections && drill.corrections.length > 0 && (
                    <Section title="Corrections">
                      <ul className="space-y-1">
                        {drill.corrections.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300 print:text-black">
                            <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>{c}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}
                </div>
              ) : null}
              {drill.notes && <Section title="Notes"><p className="text-sm text-gray-300 print:text-black">{drill.notes}</p></Section>}
              {drill.tags && drill.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {drill.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-emerald-900/30 text-emerald-400 rounded text-xs print:border print:border-emerald-600 print:text-emerald-700">#{tag}</span>
                  ))}
                </div>
              )}

              {/* Coach mode hint */}
              <div className="text-xs text-gray-700 pt-2">
                Press <kbd className="bg-gray-800 px-1 rounded">F</kbd> for fullscreen ·{' '}
                <kbd className="bg-gray-800 px-1 rounded">←</kbd><kbd className="bg-gray-800 px-1 rounded">→</kbd> navigate drills
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 print:border print:border-gray-200 print:bg-white print:rounded-none print:p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}
