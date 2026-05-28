'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDrillsStore } from '@/store/drillsStore';
import { useTeamsStore } from '@/store/teamsStore';
import MiniPitchPreview from '@/components/MiniPitchPreview';

const PitchCanvas = dynamic(() => import('@/components/drill-editor/PitchCanvas'), { ssr: false });

// CoachMind brand — matches SessionPrintView / SeasonPlanPrintView
const BRAND = {
  orange: '#FF6A00',
  dark: '#263238',
  accent: '#00B8D4',
  highlight: '#FFC857',
};

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

  // View canvas height: pin to the pitch's natural aspect so the drill is
  // drawn 1:1 with the editor — no vertical squashing, no horizontal padding
  // bars. We previously capped at 480px which clipped tall pitches into a
  // smaller box and made the View look "not fully shown" compared to the
  // editor. The Konva canvas applies its own ResizeObserver-driven scale so
  // it always fits the actual visible width regardless of the value here.
  const canvasHeight = isFullscreen
    ? '100vh'
    : Math.max(360, Math.min(drill.pitch.height * 1.15, 640));

  // Print diagram size — fits comfortably in the left ~60% of A4 landscape.
  // Slightly narrower than the previous 700px to give the right info panel
  // enough room for the full set of Info-panel fields.
  const PRINT_DIAGRAM_W = 600;
  const PRINT_DIAGRAM_H = Math.round((drill.pitch.height / drill.pitch.width) * PRINT_DIAGRAM_W);

  // Compact bullet-list section used throughout the right column of the print.
  type BulletSectionProps = {
    label: string;
    color: string;
    items: string[];
    marker?: 'dot' | 'arrow' | 'cross' | 'check' | 'diamond';
  };
  const PrintBulletSection = ({ label, color, items, marker = 'dot' }: BulletSectionProps) => {
    if (!items || items.length === 0) return null;
    const markerEl = (i: number) => {
      if (marker === 'dot') {
        return (
          <span style={{
            position: 'absolute', left: 0, top: '1.4mm',
            width: '1.4mm', height: '1.4mm', borderRadius: '50%', background: color,
          }} />
        );
      }
      const txt = marker === 'arrow' ? '→' : marker === 'cross' ? '✕' : marker === 'check' ? '✓' : '◆';
      return (
        <span style={{
          position: 'absolute', left: 0, top: 0,
          fontSize: '8pt', lineHeight: 1.3, color, fontWeight: 700,
        }}>{txt}</span>
      );
    };
    return (
      <section style={{ marginBottom: '2.2mm', breakInside: 'avoid' as const, pageBreakInside: 'avoid' }}>
        <p style={{
          fontSize: '6.8pt', fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.06em', color, margin: '0 0 0.8mm 0',
        }}>{label}</p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {items.map((pt, i) => (
            <li key={i} style={{
              margin: '0 0 0.7mm 0', paddingLeft: '3.5mm', position: 'relative',
              color: BRAND.dark, fontSize: '8.5pt', lineHeight: 1.3,
            }}>
              {markerEl(i)}
              {pt}
            </li>
          ))}
        </ul>
      </section>
    );
  };

  const PrintProse = ({ label, color, value, mutedBody }: { label: string; color: string; value?: string; mutedBody?: boolean }) => {
    if (!value) return null;
    return (
      <section style={{ marginBottom: '2.2mm', breakInside: 'avoid' as const, pageBreakInside: 'avoid' }}>
        <p style={{
          fontSize: '6.8pt', fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.06em', color, margin: '0 0 0.8mm 0',
        }}>{label}</p>
        <p style={{ margin: 0, color: mutedBody ? '#334155' : BRAND.dark, fontSize: '8.5pt', lineHeight: 1.35 }}>
          {value}
        </p>
      </section>
    );
  };

  return (
    <>
      {/*
        Single-drill print rules — scoped to this route only.
        The `<style>` element only exists in the DOM while DrillView is
        mounted (which is solely on /drills/[id]/view), so the @page rule
        does NOT leak into SessionPrintView or SeasonPlanPrintView.

        Layout strategy: hide the screen-layout entirely in print, and
        unhide a dedicated landscape print block. One drill = one page.
      */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          /* Take over the page — screen layout off, print layout on. */
          .drill-view-screen { display: none !important; }
          .drill-view-print {
            display: grid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

    <div
      ref={containerRef}
      className={`drill-view-screen flex-1 overflow-y-auto print:overflow-visible ${
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
            themeId={drill.theme}
            playerScale={drill.playerScale ?? 1}
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

    {/*
      ───────────────────────────────────────────────────────────────────
      Single-drill print layout — A4 landscape, target = one page.

      Hidden on screen (`display: none` inline), revealed by the
      `@media print` rule above which sets `display: grid !important`.
      Uses MiniPitchPreview (SVG) instead of the Konva canvas because
      SVG renders sharper for print and doesn't need viewport sizing.

      Layout (top → bottom, left → right):
        ┌── Header (full width: logo + title + meta pills + duration) ──┐
        │ Left col (60%)                │ Right col (40%)               │
        │ • Diagram                     │ • Objective                   │
        │ • Metadata grid (4 cards)     │ • Description                 │
        │ • Team / Day strip            │ • Coaching Points             │
        │ • Progression / Regression    │ • Coaching Cues               │
        │ • Notes                       │ • Common Mistakes             │
        │                               │ • Corrections                 │
        │                               │ • Key Constraints             │
        │                               │ • Equipment chips             │
        │                               │ • Tags chips                  │
        └── Footer (full width) ────────────────────────────────────────┘

      Every section auto-hides if its field is empty. Bullets and prose
      use 8.5pt at line-height 1.3 so a typical filled-in drill fits on
      one landscape page; long content overflows naturally to a second
      page rather than being clipped.
    */}
    <div
      className="drill-view-print"
      style={{
        display: 'none',
        gridTemplateColumns: '60% 40%',
        gridTemplateRows: 'auto 1fr auto',
        columnGap: '5mm',
        rowGap: '2.5mm',
        padding: '2mm',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        color: BRAND.dark,
        background: '#ffffff',
      }}
    >
      {/* ── Header — full width across the top ── */}
      <header
        style={{
          gridColumn: '1 / -1',
          gridRow: '1',
          paddingBottom: '2mm',
          borderBottom: `0.8mm solid ${BRAND.orange}`,
          display: 'flex',
          alignItems: 'center',
          gap: '3.5mm',
        }}
      >
        <div
          style={{
            width: '10mm',
            height: '10mm',
            background: BRAND.orange,
            borderRadius: '2mm',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 900,
            fontSize: '10pt',
            letterSpacing: '-0.5px',
            flexShrink: 0,
          }}
        >
          CM
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: '16pt',
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.1,
              color: BRAND.dark,
            }}
          >
            {drill.title}
          </h1>
          <p
            style={{
              fontSize: '8.5pt',
              color: '#64748b',
              margin: '0.8mm 0 0 0',
              lineHeight: 1.3,
            }}
          >
            {[
              team?.name,
              drill.ageGroup,
              drill.playerCount ? `${drill.playerCount} players` : null,
              drill.areaSize,
              drill.trainingDay,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </p>
        </div>
        {drill.durationMin ? (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p
              style={{
                fontSize: '20pt',
                fontWeight: 900,
                color: BRAND.orange,
                margin: 0,
                lineHeight: 1,
              }}
            >
              {drill.durationMin}
            </p>
            <p style={{ fontSize: '7.5pt', color: '#64748b', margin: '0.8mm 0 0 0' }}>min</p>
          </div>
        ) : null}
      </header>

      {/* ── Left column — diagram, metadata, prose ── */}
      <div
        style={{
          gridColumn: '1',
          gridRow: '2',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.5mm',
          minWidth: 0,
        }}
      >
        {/* Diagram */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              borderRadius: '2mm',
              border: '0.3mm solid #cbd5e1',
              boxShadow: '0 0.5mm 1.5mm rgba(0,0,0,0.06)',
              overflow: 'hidden',
              lineHeight: 0,
              maxWidth: '100%',
            }}
          >
            <MiniPitchPreview
              drill={drill}
              width={PRINT_DIAGRAM_W}
              height={PRINT_DIAGRAM_H}
            />
          </div>
        </div>

        {/* Metadata cards — 4-up; only renders cells that exist */}
        {(drill.ageGroup || drill.playerCount || drill.areaSize || drill.durationMin) && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.8mm',
            }}
          >
            {[
              { label: 'Age Group', value: drill.ageGroup },
              { label: 'Players', value: drill.playerCount },
              { label: 'Area', value: drill.areaSize },
              { label: 'Duration', value: drill.durationMin ? `${drill.durationMin} min` : null },
            ]
              .filter((x) => x.value)
              .map((x) => (
                <div
                  key={x.label}
                  style={{
                    padding: '1.5mm 2mm',
                    background: '#f8fafc',
                    border: '0.3mm solid #e2e8f0',
                    borderRadius: '1.5mm',
                    textAlign: 'center',
                  }}
                >
                  <p style={{
                    fontSize: '6.5pt', color: '#94a3b8', margin: 0,
                    textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700,
                  }}>{x.label}</p>
                  <p style={{
                    fontSize: '9.5pt', color: BRAND.dark, margin: '0.5mm 0 0 0',
                    fontWeight: 700, lineHeight: 1.1,
                  }}>{x.value}</p>
                </div>
              ))}
          </div>
        )}

        {/* Progression / Regression — 2 columns */}
        {(drill.progression || drill.regression) && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: drill.progression && drill.regression ? '1fr 1fr' : '1fr',
              gap: '2mm',
            }}
          >
            {drill.progression && (
              <div
                style={{
                  padding: '1.8mm 2.2mm',
                  background: '#f0fdf4',
                  borderLeft: '0.6mm solid #22c55e',
                  borderRadius: '1.2mm',
                  breakInside: 'avoid' as const,
                  pageBreakInside: 'avoid',
                }}
              >
                <p style={{
                  fontSize: '6.8pt', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: '#15803d', margin: 0,
                }}>Progression ↑</p>
                <p style={{
                  margin: '0.8mm 0 0 0', color: BRAND.dark,
                  fontSize: '8.5pt', lineHeight: 1.3,
                }}>{drill.progression}</p>
              </div>
            )}
            {drill.regression && (
              <div
                style={{
                  padding: '1.8mm 2.2mm',
                  background: '#fffbeb',
                  borderLeft: '0.6mm solid #f59e0b',
                  borderRadius: '1.2mm',
                  breakInside: 'avoid' as const,
                  pageBreakInside: 'avoid',
                }}
              >
                <p style={{
                  fontSize: '6.8pt', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: '#b45309', margin: 0,
                }}>Regression ↓</p>
                <p style={{
                  margin: '0.8mm 0 0 0', color: BRAND.dark,
                  fontSize: '8.5pt', lineHeight: 1.3,
                }}>{drill.regression}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes — full width under prose */}
        {drill.notes && (
          <div
            style={{
              padding: '1.8mm 2.2mm',
              background: `${BRAND.highlight}1f`,
              borderLeft: `0.6mm solid ${BRAND.highlight}`,
              borderRadius: '1.2mm',
              breakInside: 'avoid' as const,
              pageBreakInside: 'avoid',
            }}
          >
            <p style={{
              fontSize: '6.8pt', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: BRAND.dark, margin: 0,
            }}>Notes</p>
            <p style={{
              margin: '0.8mm 0 0 0', color: BRAND.dark,
              fontSize: '8.5pt', lineHeight: 1.3,
            }}>{drill.notes}</p>
          </div>
        )}
      </div>

      {/* ── Right column — dense info panel ── */}
      <aside
        style={{
          gridColumn: '2',
          gridRow: '2',
          fontSize: '8.5pt',
          lineHeight: 1.3,
          minWidth: 0,
        }}
      >
        <PrintProse label="Objective" color={BRAND.accent} value={drill.objective} />
        <PrintProse label="Description" color={BRAND.accent} value={drill.description} mutedBody />

        <PrintBulletSection
          label="Coaching Points"
          color={BRAND.orange}
          items={drill.coachingPoints ?? []}
          marker="dot"
        />
        <PrintBulletSection
          label="Coaching Cues"
          color={BRAND.accent}
          items={drill.coachingCues ?? []}
          marker="arrow"
        />
        <PrintBulletSection
          label="Common Mistakes"
          color="#dc2626"
          items={drill.commonMistakes ?? []}
          marker="cross"
        />
        <PrintBulletSection
          label="Corrections"
          color="#16a34a"
          items={drill.corrections ?? []}
          marker="check"
        />
        <PrintBulletSection
          label="Key Constraints"
          color={BRAND.dark}
          items={drill.keyConstraints ?? []}
          marker="diamond"
        />

        {drill.equipment && drill.equipment.length > 0 ? (
          <section style={{ marginBottom: '2.2mm', breakInside: 'avoid' as const, pageBreakInside: 'avoid' }}>
            <p style={{
              fontSize: '6.8pt', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: BRAND.accent, margin: '0 0 0.8mm 0',
            }}>Equipment</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2mm' }}>
              {drill.equipment.map((eq, i) => (
                <span
                  key={i}
                  style={{
                    padding: '0.5mm 1.8mm',
                    border: '0.3mm solid #cbd5e1',
                    borderRadius: '1.2mm',
                    fontSize: '8pt',
                    color: '#475569',
                    background: '#f8fafc',
                  }}
                >
                  {eq}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {drill.tags && drill.tags.length > 0 ? (
          <section style={{ breakInside: 'avoid' as const, pageBreakInside: 'avoid' }}>
            <p style={{
              fontSize: '6.8pt', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: BRAND.dark, margin: '0 0 0.8mm 0',
            }}>Tags</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2mm' }}>
              {drill.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '0.4mm 1.6mm',
                    background: `${BRAND.highlight}33`,
                    color: '#92400e',
                    borderRadius: '1.2mm',
                    fontSize: '7.8pt',
                    fontWeight: 600,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </aside>

      {/* ── Footer — full width ── */}
      <footer
        style={{
          gridColumn: '1 / -1',
          gridRow: '3',
          marginTop: '1.5mm',
          paddingTop: '1.5mm',
          borderTop: '0.3mm solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '7pt',
          color: '#94a3b8',
        }}
      >
        <span>CoachMind</span>
        <span style={{ fontWeight: 600, color: '#64748b' }}>{drill.title}</span>
        <span>{new Date().toLocaleDateString()}</span>
      </footer>
    </div>
  </>
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
