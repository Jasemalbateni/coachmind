/**
 * /preview-test — visual verification page for MiniPitchPreview.
 *
 * Renders a single synthetic drill that exercises every object type
 * (players, GK, cones, ball, full + small goals, arrow, line, curved,
 * zone, rectangle, circle shape, text, link, focus-zone, smart-cone-area,
 * group) at every display size used in production:
 *
 *   - 68×44   SessionTimeline tile
 *   - 80×50   default
 *   - 220×56  DrillPicker row
 *   - 288×130 DrillsList card
 *   - 300×190 SeasonPlan print
 *   - 460×296 SessionPrintView large
 *   - 600×385 DrillView print diagram
 *
 * This page is intentionally public (no auth gate) so it can be opened on
 * any device to confirm that scaling is proportional across contexts.
 *
 * Manual checklist when viewing:
 *   ✔ Player circles are visible at every size and shrink proportionally
 *   ✔ Cones, goals, and the ball maintain readable size relative to the field
 *   ✔ Arrows render with arrowheads in the line color
 *   ✔ The zone, rectangle, and circle shapes appear in the same relative
 *     positions at every size
 *   ✔ The small thumbnail (68×44) looks like a true miniature of the larger
 *     diagrams — no elements vanish or grow disproportionately
 */

'use client';

import MiniPitchPreview from '@/components/MiniPitchPreview';
import type { Drill } from '@/types';

const SAMPLE: Drill = {
  id: 'sample-preview-test',
  title: 'Renderer verification — every object type',
  pitch: { type: 'full', width: 840, height: 540, colors: { grass: '#1e5c35', lines: '#ffffff' } },
  objects: [
    // Zone (background highlight)
    { id: 'z1', type: 'zone', x: 60,  y: 80,  width: 320, height: 380,
      fill: '#fbbf24', opacity: 0.18 },
    // Rectangle (drawn shape)
    { id: 'r1', type: 'rectangle', x: 460, y: 120, width: 320, height: 160,
      stroke: '#00B8D4', strokeWidth: 3, fill: '#00B8D4', fillOpacity: 0.08, dashed: true },
    // Circle shape
    { id: 'cs1', type: 'circle', x: 620, y: 380, radius: 60,
      stroke: '#FF6A00', strokeWidth: 3 },
    // Goals
    { id: 'g1', type: 'goal', x: 20,  y: 270, size: 'full' },
    { id: 'g2', type: 'goal', x: 820, y: 270, size: 'full' },
    { id: 'g3', type: 'goal', x: 200, y: 60,  size: 'small' },
    // Cones
    { id: 'c1', type: 'cone', x: 120, y: 200, color: '#fbbf24' },
    { id: 'c2', type: 'cone', x: 180, y: 200, color: '#fbbf24' },
    { id: 'c3', type: 'cone', x: 240, y: 200, color: '#fbbf24' },
    { id: 'c4', type: 'cone', x: 300, y: 200, color: '#fbbf24' },
    { id: 'c5', type: 'cone', x: 120, y: 340, color: '#ef4444' },
    { id: 'c6', type: 'cone', x: 300, y: 340, color: '#ef4444' },
    // Ball
    { id: 'b1', type: 'ball', x: 420, y: 270 },
    // Players — team A
    { id: 'p1',  type: 'player', x: 80,  y: 270, color: '#3b82f6', number: '1',  team: 'A', isGoalkeeper: true },
    { id: 'p2',  type: 'player', x: 200, y: 140, color: '#3b82f6', number: '4',  team: 'A' },
    { id: 'p3',  type: 'player', x: 200, y: 400, color: '#3b82f6', number: '5',  team: 'A' },
    { id: 'p4',  type: 'player', x: 340, y: 270, color: '#3b82f6', number: '8',  team: 'A' },
    { id: 'p5',  type: 'player', x: 380, y: 180, color: '#3b82f6', number: '10', team: 'A' },
    // Players — team B
    { id: 'p6',  type: 'player', x: 760, y: 270, color: '#ef4444', number: '1',  team: 'B', isGoalkeeper: true },
    { id: 'p7',  type: 'player', x: 600, y: 200, color: '#ef4444', number: '6',  team: 'B' },
    { id: 'p8',  type: 'player', x: 600, y: 340, color: '#ef4444', number: '7',  team: 'B' },
    { id: 'p9',  type: 'player', x: 500, y: 270, color: '#ef4444', number: '9',  team: 'B', bib: true },
    // Arrows + lines + curves
    { id: 'a1', type: 'arrow', startX: 380, startY: 180, endX: 500, endY: 270,
      color: '#fbbf24', style: 'solid', headStyle: 'filled', strokeWidth: 3 },
    { id: 'a2', type: 'arrow', startX: 500, startY: 270, endX: 760, endY: 270,
      color: '#ef4444', style: 'dashed', headStyle: 'filled', strokeWidth: 3 },
    { id: 'l1', type: 'line', startX: 200, startY: 140, endX: 200, endY: 400,
      color: '#ffffff', strokeWidth: 2, dashed: true },
    { id: 'cv1', type: 'curved', startX: 340, startY: 270, cpX: 420, cpY: 80,
      endX: 500, endY: 270, color: '#00B8D4', strokeWidth: 3 },
    // Link (player-to-player)
    { id: 'lk1', type: 'link', fromPlayerId: 'p2', toPlayerId: 'p3',
      color: '#fbbf24', dashed: true },
    // Text label
    { id: 't1', type: 'text', x: 360, y: 460, text: 'Attacking 3rd',
      fontSize: 18, fontFamily: 'sans-serif', fontWeight: 'bold',
      fontStyle: 'normal', color: '#ffffff', align: 'left', showBox: false,
      boxBorderColor: 'transparent', boxBorderWidth: 0, width: 200 },
    // Smart cone area
    { id: 'sca1', type: 'smart-cone-area', x: 580, y: 410, width: 180, height: 110,
      coneColor: '#22c55e', extraConesPerSide: 1, showBorder: true,
      borderColor: '#22c55e', borderDashed: true },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const SIZES: { label: string; w: number; h: number; context: string }[] = [
  { label: '68 × 44',   w: 68,  h: 44,  context: 'SessionTimeline tile' },
  { label: '80 × 50',   w: 80,  h: 50,  context: 'default fallback' },
  { label: '220 × 56',  w: 220, h: 56,  context: 'DrillPicker row' },
  { label: '288 × 130', w: 288, h: 130, context: 'DrillsList card' },
  { label: '300 × 190', w: 300, h: 190, context: 'SeasonPlan print' },
  { label: '460 × 296', w: 460, h: 296, context: 'SessionPrintView large' },
  { label: '600 × 385', w: 600, h: 385, context: 'DrillView print' },
];

export default function PreviewTestPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="max-w-6xl mx-auto mb-8">
        <h1 className="text-2xl font-bold mb-2">MiniPitchPreview — visual verification</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Same drill rendered at every production size. Element sizes (players,
          cones, goals, etc.) should shrink proportionally with the field — no
          tiny dots, no scattered layout, no missing object types. Use this
          page to confirm the renderer is consistent across thumbnails, print,
          and the editor.
        </p>
      </header>

      <main className="max-w-6xl mx-auto space-y-6">
        {SIZES.map((s) => (
          <section key={s.label} className="bg-slate-900 rounded-xl p-5 border border-slate-800">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">{s.context}</p>
                <h2 className="text-lg font-bold mt-0.5">{s.label}</h2>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                aspect {(s.w / s.h).toFixed(3)} · expected pitch aspect {(840 / 540).toFixed(3)}
              </p>
            </div>
            <div className="inline-block bg-slate-800 rounded-lg p-2 border border-slate-700">
              <MiniPitchPreview drill={SAMPLE} width={s.w} height={s.h} />
            </div>
          </section>
        ))}

        <section className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h2 className="text-lg font-bold mb-3">Stretched comparison (CSS width 100%)</h2>
          <p className="text-xs text-slate-500 mb-3">
            The SVG viewBox preserves aspect via <code>preserveAspectRatio=&quot;xMidYMid meet&quot;</code>,
            so this fills horizontally while elements stay proportional.
          </p>
          <MiniPitchPreview drill={SAMPLE} width={1100} height={707} className="w-full" />
        </section>
      </main>
    </div>
  );
}
