'use client';

/**
 * MiniPitchPreview — SVG renderer for drill thumbnails, print views, and any
 * non-interactive context that needs a faithful, scaled-down picture of a drill.
 *
 * SCALING ARCHITECTURE
 * ────────────────────
 * The editor (Konva `PitchCanvas`) draws into a logical coordinate system
 * sized `drill.pitch.width × drill.pitch.height` (typically 840×540 for full
 * field) and applies a uniform CSS-style scale so the whole logical surface —
 * positions AND element sizes — fits the visible container. Every element's
 * radius/width/height/strokeWidth/fontSize is expressed in those same logical
 * pitch pixels.
 *
 * Previous versions of this component rescaled positions to the display
 * viewport but left element sizes hard-coded in display pixels (player r=3,
 * cone offset ±2, goal w=3, etc.). The result: at small widths cones merged
 * into dots, at print width (600px) players were 3px against a 600px wide
 * field — the field was "resized" but the contents stayed fixed in display
 * space. Worse, several object types (circle, rectangle, text, link,
 * focus-zone, smart-cone-area, group) were silently skipped, so any drill
 * that used them looked incomplete.
 *
 * The fix is structural: this component now declares an SVG `viewBox` of
 * the logical pitch dimensions and authors every shape in those logical
 * units. SVG handles the scale-to-fit automatically. Sizes here are kept
 * deliberately identical to the editor (player r=16, cone size=16, ball
 * size=16, goal full=22×52 / small=20×38, stroke widths ~1.5–2) so the
 * thumbnail is a true miniature of what the user drew.
 *
 * Use this everywhere a non-interactive drill diagram is needed:
 *   - DrillsList cards (mode="thumbnail")
 *   - SessionTimeline blocks
 *   - DrillPicker rows
 *   - DrillView print path (mode="print")
 *   - SessionPrintView / SeasonPlanPrintView
 *
 * For the interactive editor + View page, use the Konva PitchCanvas (it
 * shares the same logical-pixel sizes, so the visual output is identical).
 */

import type {
  Drill,
  PlayerObject,
  ConeObject,
  BallObject,
  GoalObject,
  ArrowObject,
  ZoneObject,
  CircleShapeObject,
  RectangleObject,
  LineObject,
  CurvedLineObject,
  LinkObject,
  FocusZoneObject,
  SmartConeAreaObject,
  TextObject,
  GroupObject,
  CanvasObject,
} from '@/types';

interface Props {
  drill: Drill;
  /** Display width in CSS px. Aspect is preserved via the SVG viewBox. */
  width?: number;
  /** Display height in CSS px. Aspect is preserved via the SVG viewBox. */
  height?: number;
  className?: string;
  /**
   * Optional render mode. Currently all modes use the same scaling rules —
   * the flag is kept so future tweaks (e.g. heavier strokes for print) have
   * a single point to branch on without diverging the rendering logic.
   */
  mode?: 'thumbnail' | 'print' | 'view';
}

// ─── Editor-matched defaults (in LOGICAL pitch px — same units as the editor) ───

const PLAYER_R          = 16;   // editor: `r = 16 * playerScale`
const PLAYER_STROKE_W   = 1.5;
const PLAYER_NUMBER_FS  = 11;
const PLAYER_NAME_FS    = 9;
const CONE_DEFAULT_SIZE = 16;
const BALL_DEFAULT_SIZE = 16;
const GOAL_FULL_W       = 22;
const GOAL_FULL_H       = 52;
const GOAL_SMALL_W      = 20;
const GOAL_SMALL_H      = 38;
const ARROW_DEFAULT_SW  = 2;
const LINE_DEFAULT_SW   = 2;

// Pitch markings drawn in the SVG itself, in logical px.
const PITCH_LINE_W = 2;

// ─────────────────────────────────────────────────────────────────────────────

function teamFallbackColor(p: PlayerObject): string {
  if (p.color) return p.color;
  if (p.team === 'A') return '#3b82f6';
  if (p.team === 'B') return '#ef4444';
  return '#888888';
}

/**
 * Returns flat [{cx,cy}, …] positions for a smart-cone-area. Mirrors
 * `getSmartConePositions` in PitchCanvas so the thumbnail shows the same
 * number of cones the editor renders.
 */
function smartConePoints(w: number, h: number, extra: number): { cx: number; cy: number }[] {
  const pts: { cx: number; cy: number }[] = [
    { cx: 0, cy: 0 }, { cx: w, cy: 0 }, { cx: w, cy: h }, { cx: 0, cy: h },
  ];
  if (extra > 0) {
    for (let i = 1; i <= extra; i++) { const t = i / (extra + 1); pts.push({ cx: t * w, cy: 0 }); }
    for (let i = 1; i <= extra; i++) { const t = i / (extra + 1); pts.push({ cx: w, cy: t * h }); }
    for (let i = 1; i <= extra; i++) { const t = i / (extra + 1); pts.push({ cx: (1 - t) * w, cy: h }); }
    for (let i = 1; i <= extra; i++) { const t = i / (extra + 1); pts.push({ cx: 0, cy: (1 - t) * h }); }
  }
  return pts;
}

/** Triangle cone in logical pitch px. */
function ConeShape({ cx, cy, size, color, opacity = 1 }: { cx: number; cy: number; size: number; color: string; opacity?: number }) {
  const h = size; // tip-to-base height in editor matches polygon used in canvas (radius = size/2)
  const halfBase = size / 2;
  return (
    <polygon
      points={`${cx},${cy - h / 2} ${cx - halfBase},${cy + h / 2} ${cx + halfBase},${cy + h / 2}`}
      fill={color}
      opacity={opacity}
    />
  );
}

/** Player jersey circle + optional number / name / GK marker. */
function PlayerShape({ p }: { p: PlayerObject }) {
  const isGK = p.isGoalkeeper || p.number === '1' || p.number === '12';
  const fill = isGK ? '#d97706' : teamFallbackColor(p);
  const stroke = p.strokeColor ?? 'rgba(255,255,255,0.9)';
  const r = PLAYER_R;
  return (
    <g transform={`translate(${p.x} ${p.y})${p.rotation ? ` rotate(${p.rotation})` : ''}`}>
      <circle r={r} fill={fill} stroke={stroke} strokeWidth={PLAYER_STROKE_W} />
      {p.showNumber !== false && p.number && (
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={PLAYER_NUMBER_FS}
          fontWeight={700}
          fill={p.numberColor ?? 'white'}
          // Render text in the SVG's own coordinate space so it scales with the
          // viewBox. No `style` font-family needed — inherits from the SVG host.
        >
          {p.number}
        </text>
      )}
      {isGK && (
        <text
          x={0}
          y={r * 0.62}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={7}
          fontWeight={700}
          fill="rgba(255,255,255,0.9)"
        >
          GK
        </text>
      )}
      {p.bib && (
        <path
          // Approximate the editor's Arc bib (190° wedge from -95°) as a path.
          d={`M ${-r * 0.85} ${-r * 0.25} A ${r} ${r} 0 0 1 ${r * 0.85} ${-r * 0.25} L 0 ${r * 0.08} Z`}
          fill={p.bibColor ?? '#fbbf24'}
          opacity={0.62}
        />
      )}
    </g>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MiniPitchPreview({
  drill,
  width = 80,
  height = 50,
  className = '',
  // mode reserved for future per-context tweaks; intentionally unused today
  // so all callsites share identical scaling logic.
  mode: _mode,
}: Props) {
  const PW = drill.pitch.width;
  const PH = drill.pitch.height;

  // Pitch markings appear LIGHTER than the editor's white lines so the
  // thumbnail reads quickly without overwhelming the actual drill elements.
  const grass = drill.pitch.colors?.grass ?? '#1e5c35';
  const line = 'rgba(255,255,255,0.32)';

  // Recursively flatten groups so we can sort the full object list into
  // visual layers (zones/shapes → lines/arrows → players/balls/goals/cones).
  // The editor uses the same layering — keeping it identical here is what
  // makes the thumbnail a faithful miniature.
  const flatten = (objs: CanvasObject[], dx = 0, dy = 0): CanvasObject[] => {
    const out: CanvasObject[] = [];
    for (const o of objs) {
      if (o.type === 'group') {
        const g = o as GroupObject;
        // Group transforms only translate the children's coordinates by (g.x, g.y).
        // Rotation on groups is not flattened in the thumbnail — it's rare and the
        // proportional positions still read correctly without it.
        out.push(...flatten(g.children, dx + g.x, dy + g.y));
      } else if ('x' in o) {
        out.push({ ...o, x: (o as { x: number }).x + dx, y: (o as { y: number }).y + dy } as CanvasObject);
      } else if ('startX' in o) {
        const a = o as ArrowObject;
        out.push({
          ...a,
          startX: a.startX + dx,
          startY: a.startY + dy,
          endX: a.endX + dx,
          endY: a.endY + dy,
        } as CanvasObject);
      } else {
        out.push(o);
      }
    }
    return out;
  };

  const all = flatten(drill.objects);

  // A lookup so arrow/link rendering can follow attached players, mirroring
  // the editor's startPlayerId/endPlayerId behaviour.
  const playersById: Record<string, PlayerObject> = {};
  for (const o of all) if (o.type === 'player') playersById[o.id] = o as PlayerObject;

  const isShapeLayer = (o: CanvasObject) =>
    o.type === 'zone' || o.type === 'rectangle' || o.type === 'circle' || o.type === 'focus-zone' || o.type === 'smart-cone-area';
  const isLineLayer = (o: CanvasObject) =>
    o.type === 'arrow' || o.type === 'line' || o.type === 'curved' || o.type === 'link';
  const isTopLayer = (o: CanvasObject) =>
    o.type === 'player' || o.type === 'cone' || o.type === 'ball' || o.type === 'goal' || o.type === 'text';

  // Stable per-arrow marker id so each arrow tip inherits its own color.
  // We deduplicate by color to avoid bloating the <defs>.
  const arrowColors = new Set<string>();
  for (const o of all) {
    if (o.type === 'arrow') arrowColors.add((o as ArrowObject).color || '#fbbf24');
  }

  // Resolve arrow endpoints (handle player-attached arrows).
  const arrowEndpoints = (a: ArrowObject) => {
    const start = a.startPlayerId ? playersById[a.startPlayerId] : null;
    const end = a.endPlayerId ? playersById[a.endPlayerId] : null;
    return {
      sx: start ? start.x : a.startX,
      sy: start ? start.y : a.startY,
      ex: end ? end.x : a.endX,
      ey: end ? end.y : a.endY,
    };
  };

  // Field markings differ by pitch type. We draw them in logical units so
  // they scale exactly the same as the drill content above them.
  const showCenterLine = drill.pitch.type !== 'third' && drill.pitch.type !== 'plain';
  const showMarkings = drill.pitch.type !== 'plain';
  const cx = PW / 2;
  const cy = PH / 2;
  const centerR = Math.min(PW, PH) * 0.12;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${PW} ${PH}`}
      preserveAspectRatio="xMidYMid meet"
      className={`rounded shrink-0 ${className}`}
      style={{ display: 'block', background: grass }}
      // SVG text is rendered in logical (viewBox) units, so font sizes here
      // are in pitch-pixels — they shrink proportionally with the display size.
    >
      {/* Pitch markings */}
      {showMarkings && (
        <>
          <rect
            x={PITCH_LINE_W / 2}
            y={PITCH_LINE_W / 2}
            width={PW - PITCH_LINE_W}
            height={PH - PITCH_LINE_W}
            fill="none"
            stroke={line}
            strokeWidth={PITCH_LINE_W}
          />
          {showCenterLine && (
            <line x1={cx} y1={PITCH_LINE_W} x2={cx} y2={PH - PITCH_LINE_W} stroke={line} strokeWidth={PITCH_LINE_W * 0.7} />
          )}
          <circle cx={cx} cy={cy} r={centerR} fill="none" stroke={line} strokeWidth={PITCH_LINE_W * 0.7} />
          <circle cx={cx} cy={cy} r={PITCH_LINE_W * 1.5} fill={line} />
        </>
      )}

      {/* Arrow markers — one per unique color so tips inherit the line color. */}
      <defs>
        {Array.from(arrowColors).map((color) => (
          <marker
            key={`m-${color}`}
            id={`mp-arrow-${cssEscape(color)}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerUnits="userSpaceOnUse"
            markerWidth={10}
            markerHeight={10}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
      </defs>

      {/* Layer 1 — zones / shapes / focus-zone / smart-cone-area */}
      {all.filter(isShapeLayer).map((obj) => renderShape(obj))}

      {/* Layer 2 — arrows / lines / curves / links */}
      {all.filter(isLineLayer).map((obj) => renderLine(obj, playersById, arrowEndpoints))}

      {/* Layer 3 — players / cones / balls / goals / text */}
      {all.filter(isTopLayer).map((obj) => renderTop(obj))}
    </svg>
  );
}

/** RFC-compliant escape for SVG ids — keeps `#` colors usable in id refs. */
function cssEscape(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, (c) => `_${c.charCodeAt(0).toString(16)}`);
}

// ─── Renderers split by layer for clarity ────────────────────────────────────

function renderShape(obj: CanvasObject): React.ReactNode {
  if (obj.type === 'zone') {
    const z = obj as ZoneObject;
    return (
      <rect
        key={z.id}
        x={z.x}
        y={z.y}
        width={z.width}
        height={z.height}
        fill={z.fill}
        fillOpacity={z.opacity}
        stroke={z.strokeColor || 'none'}
        strokeWidth={z.strokeWidth ?? 0}
        transform={z.rotation ? `rotate(${z.rotation} ${z.x + z.width / 2} ${z.y + z.height / 2})` : undefined}
      />
    );
  }
  if (obj.type === 'rectangle') {
    const r = obj as RectangleObject;
    return (
      <rect
        key={r.id}
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={r.fill ?? 'none'}
        fillOpacity={r.fillOpacity ?? 0}
        stroke={r.stroke}
        strokeWidth={r.strokeWidth}
        strokeDasharray={r.dashed ? `${r.strokeWidth * 3},${r.strokeWidth * 2}` : undefined}
        opacity={r.opacity ?? 1}
        transform={r.rotation ? `rotate(${r.rotation} ${r.x + r.width / 2} ${r.y + r.height / 2})` : undefined}
      />
    );
  }
  if (obj.type === 'circle') {
    const c = obj as CircleShapeObject;
    return (
      <circle
        key={c.id}
        cx={c.x}
        cy={c.y}
        r={c.radius}
        fill={c.fill ?? 'none'}
        fillOpacity={c.fillOpacity ?? 0}
        stroke={c.stroke}
        strokeWidth={c.strokeWidth}
        strokeDasharray={c.dashed ? `${c.strokeWidth * 3},${c.strokeWidth * 2}` : undefined}
        opacity={c.opacity ?? 1}
      />
    );
  }
  if (obj.type === 'focus-zone') {
    const fz = obj as FocusZoneObject;
    const oa = fz.overlayOpacity ?? 0.3;
    // Drawn as 4 dark rects so the highlighted area "punches through" — same
    // technique the editor uses.
    return (
      <g key={fz.id}>
        {fz.y > 0 && <rect x={0} y={0} width={'100%'} height={fz.y} fill="#000" opacity={oa} />}
        <rect x={0} y={fz.y + fz.height} width={'100%'} height={'100%'} fill="#000" opacity={oa} />
        <rect x={0} y={fz.y} width={fz.x} height={fz.height} fill="#000" opacity={oa} />
        <rect x={fz.x + fz.width} y={fz.y} width={'100%'} height={fz.height} fill="#000" opacity={oa} />
      </g>
    );
  }
  if (obj.type === 'smart-cone-area') {
    const a = obj as SmartConeAreaObject;
    const pts = smartConePoints(a.width, a.height, a.extraConesPerSide);
    return (
      <g
        key={a.id}
        transform={`translate(${a.x} ${a.y})${a.rotation ? ` rotate(${a.rotation} ${a.width / 2} ${a.height / 2})` : ''}`}
      >
        {a.showBorder && (
          <rect
            x={0}
            y={0}
            width={a.width}
            height={a.height}
            fill="none"
            stroke={a.borderColor}
            strokeWidth={2}
            strokeDasharray={a.borderDashed ? '8,6' : undefined}
          />
        )}
        {pts.map((p, i) => (
          <ConeShape key={i} cx={p.cx} cy={p.cy} size={CONE_DEFAULT_SIZE} color={a.coneColor} />
        ))}
      </g>
    );
  }
  return null;
}

function renderLine(
  obj: CanvasObject,
  playersById: Record<string, PlayerObject>,
  arrowEndpoints: (a: ArrowObject) => { sx: number; sy: number; ex: number; ey: number },
): React.ReactNode {
  if (obj.type === 'arrow') {
    const a = obj as ArrowObject;
    const { sx, sy, ex, ey } = arrowEndpoints(a);
    const color = a.color || '#fbbf24';
    const sw = a.strokeWidth ?? ARROW_DEFAULT_SW;
    return (
      <line
        key={a.id}
        x1={sx}
        y1={sy}
        x2={ex}
        y2={ey}
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={a.style === 'dashed' ? `${sw * 3},${sw * 2}` : undefined}
        markerEnd={`url(#mp-arrow-${cssEscape(color)})`}
      />
    );
  }
  if (obj.type === 'line') {
    const l = obj as LineObject;
    const sw = l.strokeWidth ?? LINE_DEFAULT_SW;
    return (
      <line
        key={l.id}
        x1={l.startX}
        y1={l.startY}
        x2={l.endX}
        y2={l.endY}
        stroke={l.color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={l.dashed ? `${sw * 3},${sw * 2}` : undefined}
      />
    );
  }
  if (obj.type === 'curved') {
    const c = obj as CurvedLineObject;
    const sw = c.strokeWidth ?? LINE_DEFAULT_SW;
    return (
      <path
        key={c.id}
        d={`M ${c.startX} ${c.startY} Q ${c.cpX} ${c.cpY} ${c.endX} ${c.endY}`}
        fill="none"
        stroke={c.color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={c.dashed ? `${sw * 3},${sw * 2}` : undefined}
      />
    );
  }
  if (obj.type === 'link') {
    const lk = obj as LinkObject;
    const from = playersById[lk.fromPlayerId];
    const to = playersById[lk.toPlayerId];
    if (!from || !to) return null;
    return (
      <line
        key={lk.id}
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={lk.color}
        strokeWidth={1.5}
        strokeDasharray={lk.dashed ? '6,4' : undefined}
        opacity={0.7}
      />
    );
  }
  return null;
}

function renderTop(obj: CanvasObject): React.ReactNode {
  if (obj.type === 'player') {
    return <PlayerShape key={obj.id} p={obj as PlayerObject} />;
  }
  if (obj.type === 'cone') {
    const c = obj as ConeObject;
    return <ConeShape key={c.id} cx={c.x} cy={c.y} size={c.size ?? CONE_DEFAULT_SIZE} color={c.color} />;
  }
  if (obj.type === 'ball') {
    const b = obj as BallObject;
    const r = (b.size ?? BALL_DEFAULT_SIZE) / 2;
    return (
      <g key={b.id} transform={`translate(${b.x} ${b.y})${b.rotation ? ` rotate(${b.rotation})` : ''}`}>
        <circle r={r} fill="white" stroke="#1a1a2e" strokeWidth={1.5} />
        <path
          d={`M 0 ${-r * 0.55} L ${r * 0.5} ${-r * 0.17} L ${r * 0.3} ${r * 0.45} L ${-r * 0.3} ${r * 0.45} L ${-r * 0.5} ${-r * 0.17} Z`}
          fill="#1a1a2e"
          opacity={0.85}
        />
      </g>
    );
  }
  if (obj.type === 'goal') {
    const g = obj as GoalObject;
    const isFull = g.size === 'full';
    const gw = g.imgW ?? (isFull ? GOAL_FULL_W : GOAL_SMALL_W);
    const gh = g.imgH ?? (isFull ? GOAL_FULL_H : GOAL_SMALL_H);
    return (
      <g key={g.id} transform={`translate(${g.x} ${g.y})${g.rotation ? ` rotate(${g.rotation})` : ''}`}>
        <rect
          x={-gw / 2}
          y={-gh / 2}
          width={gw}
          height={gh}
          fill="rgba(255,255,255,0.18)"
          stroke="white"
          strokeWidth={1.5}
        />
        <line x1={-gw / 2} y1={-gh / 2} x2={-gw / 2} y2={gh / 2} stroke="white" strokeWidth={2} />
        <line x1={gw / 2} y1={-gh / 2} x2={gw / 2} y2={gh / 2} stroke="white" strokeWidth={2} />
      </g>
    );
  }
  if (obj.type === 'text') {
    const t = obj as TextObject;
    return (
      <g key={t.id} transform={`translate(${t.x} ${t.y})${t.rotation ? ` rotate(${t.rotation})` : ''}`}>
        {t.showBox && (
          <rect
            x={-2}
            y={-t.fontSize}
            width={t.width}
            height={t.fontSize * 1.6}
            fill="none"
            stroke={t.boxBorderColor}
            strokeWidth={t.boxBorderWidth}
            rx={2}
          />
        )}
        <text
          x={t.align === 'center' ? t.width / 2 : t.align === 'right' ? t.width : 0}
          y={0}
          textAnchor={t.align === 'center' ? 'middle' : t.align === 'right' ? 'end' : 'start'}
          fontSize={t.fontSize}
          fontWeight={t.fontWeight === 'bold' ? 700 : 400}
          fontStyle={t.fontStyle}
          fill={t.color}
        >
          {t.text}
        </text>
      </g>
    );
  }
  return null;
}
