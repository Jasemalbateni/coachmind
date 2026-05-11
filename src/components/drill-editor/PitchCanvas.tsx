'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Stage, Layer, Rect, Circle, Line as KonvaLine, Arc,
  RegularPolygon, Arrow as KonvaArrow, Text, Group, Transformer, Path as KonvaPath,
  Image as KonvaImage,
} from 'react-konva';
import type Konva from 'konva';
import type {
  Drill, CanvasObject, PlayerObject, ConeObject, BallObject, GoalObject,
  ArrowObject, ZoneObject, CircleShapeObject, RectangleObject, LineObject, CurvedLineObject, LinkObject,
  FocusZoneObject, SmartConeAreaObject, TextObject, GroupObject,
} from '@/types';

export type DrawTool =
  | 'arrow' | 'line' | 'curved' | 'rect' | 'circle' | 'link'
  | 'tac-run' | 'tac-pass' | 'tac-dribble' | 'tac-press'
  | 'tac-lane' | 'tac-defline' | 'tac-support'
  | 'smart-pass' | 'smart-dribble' | 'smart-run'
  | 'focus-zone' | 'smart-cone-area' | 'text'
  | null;

// ─── Field asset image cache (module-level, shared across renders) ────────────

const FIELD_IMGS: Record<string, HTMLImageElement> = {};
const FIELD_ASSET_KEYS = [
  'cone', 'blue-cone', 'red-cone', 'green-cone', 'yellow-cone',
  'ball', 'large-goal', 'mini-goal',
] as const;

const SNAP_THRESHOLD = 10; // pitch pixels

// ─── Zigzag path helper ───────────────────────────────────────────────────────

/** Returns flat [x,y,x,y,...] points for a zigzag line from (sx,sy) to (ex,ey) */
function getZigzagPoints(sx: number, sy: number, ex: number, ey: number): number[] {
  const d = Math.hypot(ex - sx, ey - sy);
  if (d < 2) return [sx, sy, ex, ey];
  const dxN = (ex - sx) / d;
  const dyN = (ey - sy) / d;
  const pxN = -dyN; // perpendicular
  const pyN = dxN;
  const amplitude = Math.min(10, d * 0.12); // scale amplitude with length, cap at 10
  const steps = Math.max(4, Math.round(d / 14));
  const pts: number[] = [sx, sy];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const cx = sx + t * (ex - sx);
    const cy = sy + t * (ey - sy);
    const side = (i % 2 === 0) ? 1 : -1;
    pts.push(cx + pxN * amplitude * side, cy + pyN * amplitude * side);
  }
  pts.push(ex, ey);
  return pts;
}

// ─── Smart cone positions ─────────────────────────────────────────────────────

/** Returns cone positions relative to the smart cone area's local origin (0,0). */
function getSmartConePositions(w: number, h: number, extra: number): { cx: number; cy: number }[] {
  const pts: { cx: number; cy: number }[] = [
    { cx: 0, cy: 0 }, { cx: w, cy: 0 }, { cx: w, cy: h }, { cx: 0, cy: h },
  ];
  if (extra > 0) {
    for (let i = 1; i <= extra; i++) { const t = i / (extra + 1); pts.push({ cx: t * w, cy: 0 }); }       // top
    for (let i = 1; i <= extra; i++) { const t = i / (extra + 1); pts.push({ cx: w, cy: t * h }); }       // right
    for (let i = 1; i <= extra; i++) { const t = i / (extra + 1); pts.push({ cx: (1 - t) * w, cy: h }); } // bottom
    for (let i = 1; i <= extra; i++) { const t = i / (extra + 1); pts.push({ cx: 0, cy: (1 - t) * h }); } // left
  }
  return pts;
}

// ─── Draw snap helpers ────────────────────────────────────────────────────────

const DRAW_SNAP_THRESHOLD = 15;

/**
 * Screen-space distance (in stage pixels) the pointer must travel after
 * pressing down before we treat the gesture as a drag rather than a tap.
 * Tuned to avoid accidental tiny shapes from hand tremor / touch jitter.
 */
const DRAW_DRAG_THRESHOLD_PX = 4;

/** Tools that take 2+ points and therefore support the press-drag-release flow. */
function isTwoPointDrawTool(t: DrawTool): boolean {
  if (!t) return false;
  // Single-point tools (text drops a label, link picks two players via clicks on them).
  return t !== 'text' && t !== 'link';
}

/**
 * Minimum pitch-pixel drag distance required to actually commit a shape via
 * the drag flow. Mirrors the minimum-size checks the parent applies in
 * handleCanvasPointClick — keeps the drag UX consistent with the click UX,
 * and avoids a confusing state where the parent rejects a tiny shape.
 */
function getMinDragPitchDistance(t: DrawTool): number {
  switch (t) {
    case 'rect':
    case 'circle': return 5;
    case 'focus-zone': return 10;
    case 'smart-cone-area': return 20;
    default: return 1; // arrows, lines, curved: any non-zero drag is fine
  }
}

function getDrawSnapPoints(objects: CanvasObject[]): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (const obj of objects) {
    if (obj.type === 'arrow' || obj.type === 'line') {
      const o = obj as ArrowObject;
      pts.push({ x: o.startX, y: o.startY });
      pts.push({ x: o.endX, y: o.endY });
      pts.push({ x: (o.startX + o.endX) / 2, y: (o.startY + o.endY) / 2 });
    } else if (obj.type === 'curved') {
      const o = obj as CurvedLineObject;
      pts.push({ x: o.startX, y: o.startY });
      pts.push({ x: o.endX, y: o.endY });
    }
  }
  return pts;
}

// ─── Alignment snap helpers ────────────────────────────────────────────────────

function getSnapTargets(objects: CanvasObject[], excludeId: string): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const obj of objects) {
    if (obj.id === excludeId) continue;
    if ('startX' in obj) {
      const a = obj as ArrowObject;
      const mx = (a.startX + a.endX) / 2;
      const my = (a.startY + a.endY) / 2;
      xs.push(a.startX, mx, a.endX);
      ys.push(a.startY, my, a.endY);
    } else if ('width' in obj && 'x' in obj) {
      const z = obj as ZoneObject;
      xs.push(z.x, z.x + z.width / 2, z.x + z.width);
      ys.push(z.y, z.y + z.height / 2, z.y + z.height);
    } else if ('radius' in obj && 'x' in obj) {
      const c = obj as CircleShapeObject;
      xs.push(c.x - c.radius, c.x, c.x + c.radius);
      ys.push(c.y - c.radius, c.y, c.y + c.radius);
    } else if ('x' in obj) {
      xs.push((obj as PlayerObject).x);
      ys.push((obj as PlayerObject).y);
    }
  }
  return { xs, ys };
}

function snapToTargets(
  nx: number, ny: number,
  xs: number[], ys: number[]
): { x: number; y: number; guideX?: number; guideY?: number } {
  let x = nx, y = ny;
  let guideX: number | undefined, guideY: number | undefined;
  let bestDX = SNAP_THRESHOLD, bestDY = SNAP_THRESHOLD;
  for (const tx of xs) {
    const d = Math.abs(x - tx);
    if (d < bestDX) { bestDX = d; x = tx; guideX = tx; }
  }
  for (const ty of ys) {
    const d = Math.abs(y - ty);
    if (d < bestDY) { bestDY = d; y = ty; guideY = ty; }
  }
  return { x, y, guideX, guideY };
}

// ─── Marquee selection helpers ────────────────────────────────────────────────

type Bounds = { x1: number; y1: number; x2: number; y2: number };

function getObjectBounds(obj: CanvasObject, allObjs: CanvasObject[], playerScl: number): Bounds | null {
  switch (obj.type) {
    case 'player': {
      const o = obj as PlayerObject;
      const r = playerScl * 16 + 4;
      return { x1: o.x - r, y1: o.y - r, x2: o.x + r, y2: o.y + r };
    }
    case 'cone': {
      const o = obj as ConeObject;
      const r = (o.size ?? 16) / 2 + 2;
      return { x1: o.x - r, y1: o.y - r, x2: o.x + r, y2: o.y + r };
    }
    case 'ball': {
      const o = obj as BallObject;
      const r = (o.size ?? 16) / 2 + 2;
      return { x1: o.x - r, y1: o.y - r, x2: o.x + r, y2: o.y + r };
    }
    case 'goal': {
      const o = obj as GoalObject;
      const isFullGoal = o.size === 'full';
      const gW = (o.imgW ?? (isFullGoal ? 22 : 20)) / 2 + 4;
      const gH = (o.imgH ?? (isFullGoal ? 52 : 38)) / 2 + 4;
      return { x1: o.x - gW, y1: o.y - gH, x2: o.x + gW, y2: o.y + gH };
    }
    case 'arrow':
    case 'line': {
      const o = obj as ArrowObject;
      return {
        x1: Math.min(o.startX, o.endX), y1: Math.min(o.startY, o.endY),
        x2: Math.max(o.startX, o.endX), y2: Math.max(o.startY, o.endY),
      };
    }
    case 'curved': {
      const o = obj as CurvedLineObject;
      return {
        x1: Math.min(o.startX, o.cpX, o.endX), y1: Math.min(o.startY, o.cpY, o.endY),
        x2: Math.max(o.startX, o.cpX, o.endX), y2: Math.max(o.startY, o.cpY, o.endY),
      };
    }
    case 'zone': {
      const o = obj as ZoneObject;
      return { x1: o.x, y1: o.y, x2: o.x + o.width, y2: o.y + o.height };
    }
    case 'circle': {
      const o = obj as CircleShapeObject;
      return { x1: o.x - o.radius, y1: o.y - o.radius, x2: o.x + o.radius, y2: o.y + o.radius };
    }
    case 'rectangle': {
      const o = obj as RectangleObject;
      return { x1: o.x, y1: o.y, x2: o.x + o.width, y2: o.y + o.height };
    }
    case 'link': {
      const o = obj as LinkObject;
      const from = allObjs.find((x) => x.id === o.fromPlayerId) as PlayerObject | undefined;
      const to = allObjs.find((x) => x.id === o.toPlayerId) as PlayerObject | undefined;
      if (!from || !to) return null;
      return {
        x1: Math.min(from.x, to.x), y1: Math.min(from.y, to.y),
        x2: Math.max(from.x, to.x), y2: Math.max(from.y, to.y),
      };
    }
    case 'focus-zone': {
      const o = obj as FocusZoneObject;
      return { x1: o.x, y1: o.y, x2: o.x + o.width, y2: o.y + o.height };
    }
    case 'smart-cone-area': {
      const o = obj as SmartConeAreaObject;
      return { x1: o.x, y1: o.y, x2: o.x + o.width, y2: o.y + o.height };
    }
    case 'text': {
      const o = obj as TextObject;
      const h = (o.fontSize ?? 16) * 1.4 + 8;
      return { x1: o.x, y1: o.y, x2: o.x + (o.width ?? 120), y2: o.y + h };
    }
    default: return null;
  }
}

function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.x1 <= b.x2 && a.x2 >= b.x1 && a.y1 <= b.y2 && a.y2 >= b.y1;
}

// ─── Pitch Background ─────────────────────────────────────────────────────────

function PitchBackground({ pitch }: { pitch: Drill['pitch'] }) {
  const { type, width: W, height: H, colors } = pitch;
  const grassColor = colors?.grass ?? '#2d6a4f';
  const grassSecondary = colors?.grassSecondary;
  const lineColor = colors?.lines ?? 'rgba(255,255,255,0.75)';

  if (type === 'plain') {
    return (
      <>
        <Rect x={0} y={0} width={W} height={H} fill={grassColor} listening={false} name="pitch-bg" />
        <Rect x={0} y={0} width={W} height={H} fill="transparent" name="pitch-bg" listening={false} />
      </>
    );
  }

  const M = 30;
  const IW = W - 2 * M;
  const IH = H - 2 * M;
  const SX = IW / 105;
  const SY = IH / 68;
  const LP = { stroke: lineColor, strokeWidth: 1.5, listening: false, fill: 'transparent' };
  const penaltyW = 40.32 * SY;
  const penaltyD = 16.5 * SX;
  const goalAreaW = 18.32 * SY;
  const goalAreaD = 5.5 * SX;
  const circleR = 9.15 * Math.min(SX, SY);
  const pSpotX = 11 * SX;
  const goalW = 7.32 * SY;
  const goalD = 14;

  const stripe = (i: number) => (
    <Rect key={i} x={M + i * (IW / 7)} y={M} width={IW / 7} height={IH}
      fill={i % 2 === 0 ? (grassSecondary ?? 'rgba(0,0,0,0.05)') : 'transparent'} listening={false} />
  );

  if (type === 'full') {
    return (
      <>
        <Rect x={0} y={0} width={W} height={H} fill={grassColor} listening={false} name="pitch-bg" />
        {Array.from({ length: 7 }).map((_, i) => stripe(i))}
        <Rect x={M} y={M} width={IW} height={IH} {...LP} />
        <KonvaLine points={[M + IW / 2, M, M + IW / 2, M + IH]} {...LP} />
        <Circle x={M + IW / 2} y={M + IH / 2} radius={circleR} {...LP} />
        <Circle x={M + IW / 2} y={M + IH / 2} radius={3} fill={lineColor} listening={false} />
        <Rect x={M} y={M + (IH - penaltyW) / 2} width={penaltyD} height={penaltyW} {...LP} />
        <Rect x={M} y={M + (IH - goalAreaW) / 2} width={goalAreaD} height={goalAreaW} {...LP} />
        <Circle x={M + pSpotX} y={M + IH / 2} radius={3} fill={lineColor} listening={false} />
        <Rect x={M - goalD} y={M + (IH - goalW) / 2} width={goalD} height={goalW} stroke={lineColor} strokeWidth={1.5} fill="rgba(255,255,255,0.08)" listening={false} />
        <Rect x={M + IW - penaltyD} y={M + (IH - penaltyW) / 2} width={penaltyD} height={penaltyW} {...LP} />
        <Rect x={M + IW - goalAreaD} y={M + (IH - goalAreaW) / 2} width={goalAreaD} height={goalAreaW} {...LP} />
        <Circle x={M + IW - pSpotX} y={M + IH / 2} radius={3} fill={lineColor} listening={false} />
        <Rect x={M + IW} y={M + (IH - goalW) / 2} width={goalD} height={goalW} stroke={lineColor} strokeWidth={1.5} fill="rgba(255,255,255,0.08)" listening={false} />
        <Arc x={M} y={M} innerRadius={0} outerRadius={7} angle={90} rotation={0} {...LP} />
        <Arc x={M + IW} y={M} innerRadius={0} outerRadius={7} angle={90} rotation={90} {...LP} />
        <Arc x={M} y={M + IH} innerRadius={0} outerRadius={7} angle={90} rotation={270} {...LP} />
        <Arc x={M + IW} y={M + IH} innerRadius={0} outerRadius={7} angle={90} rotation={180} {...LP} />
      </>
    );
  }

  if (type === 'half') {
    return (
      <>
        <Rect x={0} y={0} width={W} height={H} fill={grassColor} listening={false} name="pitch-bg" />
        {Array.from({ length: 7 }).map((_, i) => stripe(i))}
        <Rect x={M} y={M} width={IW} height={IH} {...LP} />
        <KonvaLine points={[M, M, M + IW, M]} {...LP} />
        <Arc x={M + IW / 2} y={M} innerRadius={0} outerRadius={circleR} angle={180} rotation={0} {...LP} />
        <Circle x={M + IW / 2} y={M} radius={3} fill={lineColor} listening={false} />
        <Rect x={M + (IW - penaltyW) / 2} y={M + IH - penaltyD} width={penaltyW} height={penaltyD} {...LP} />
        <Rect x={M + (IW - goalAreaW) / 2} y={M + IH - goalAreaD} width={goalAreaW} height={goalAreaD} {...LP} />
        <Circle x={M + IW / 2} y={M + IH - pSpotX} radius={3} fill={lineColor} listening={false} />
        <Rect x={M + (IW - goalW) / 2} y={M + IH} width={goalW} height={goalD} stroke={lineColor} strokeWidth={1.5} fill="rgba(255,255,255,0.08)" listening={false} />
      </>
    );
  }

  // third
  return (
    <>
      <Rect x={0} y={0} width={W} height={H} fill={grassColor} listening={false} name="pitch-bg" />
      {Array.from({ length: 7 }).map((_, i) => stripe(i))}
      <Rect x={M} y={M} width={IW} height={IH} {...LP} />
      <Rect x={M + (IW - penaltyW) / 2} y={M + IH - penaltyD} width={penaltyW} height={penaltyD} {...LP} />
      <Rect x={M + (IW - goalAreaW) / 2} y={M + IH - goalAreaD} width={goalAreaW} height={goalAreaD} {...LP} />
      <Circle x={M + IW / 2} y={M + IH - pSpotX} radius={3} fill={lineColor} listening={false} />
      <Rect x={M + (IW - goalW) / 2} y={M + IH} width={goalW} height={goalD} stroke={lineColor} strokeWidth={1.5} fill="rgba(255,255,255,0.08)" listening={false} />
    </>
  );
}

// ─── Canvas Props ─────────────────────────────────────────────────────────────

export interface PitchCanvasProps {
  drill: Drill;
  selectedId: string | null;
  drawTool: DrawTool;
  drawFirstPoint: { x: number; y: number } | null;
  /** Second control point for 3-click curved line drawing */
  drawSecondPoint?: { x: number; y: number } | null;
  linkFromId: string | null;
  snapToGrid: boolean;
  zoom: number;
  showNames: boolean;
  selectedIds?: string[];
  /** Animated position overrides (for play simulation) keyed by object id */
  positionOverrides?: Record<string, { x: number; y: number }>;
  onSelect: (id: string | null) => void;
  onMultiSelect?: (id: string) => void;
  onMarqueeSelect?: (ids: string[], additive: boolean) => void;
  onUpdateObject: (id: string, updates: Partial<CanvasObject>) => void;
  onAddObject: (obj: CanvasObject) => void;
  onDeleteObject: (id: string) => void;
  onCanvasPointClick: (pos: { x: number; y: number }, targetId: string | null) => void;
  /**
   * Drag-flow commit. Called once on pointer release after a successful
   * press-drag-release gesture, with explicit start (press) + end (release)
   * positions. Bypasses the click state-machine so start/end can never be
   * swapped by stale React state. Optional — if omitted, the canvas falls
   * back to two-call click semantics.
   */
  onCanvasDragCommit?: (start: { x: number; y: number }, end: { x: number; y: number }) => void;
  onFinishDrawing: () => void;
  onZoomChange?: (zoom: number) => void;
  onDropAtPoint?: (type: string, data: Record<string, unknown>, pos: { x: number; y: number }) => void;
  /** Called on right-click over any canvas object — provides screen coords for context menu */
  onContextMenuObject?: (id: string, x: number, y: number) => void;
  /** Called when user completes an Alt+Drag — creates a copy at the drop position */
  onAltDragCopy?: (original: CanvasObject, newPos: { x?: number; y?: number; startX?: number; startY?: number; endX?: number; endY?: number }) => void;
  stageRef: React.RefObject<Konva.Stage>;
  /** Global player scale factor (0.5–2.0, default 1) */
  playerScale?: number;
}

export default function PitchCanvas({
  drill, selectedId, drawTool, drawFirstPoint, drawSecondPoint = null, linkFromId,
  snapToGrid, zoom, showNames, selectedIds = [], positionOverrides = {},
  onSelect, onMultiSelect, onMarqueeSelect,
  onUpdateObject, onAddObject, onDeleteObject,
  onCanvasPointClick, onCanvasDragCommit, onFinishDrawing, onZoomChange, onDropAtPoint,
  onContextMenuObject, onAltDragCopy,
  stageRef,
  playerScale = 1,
}: PitchCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [containerSize, setContainerSize] = useState({ w: 840, h: 540 });
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);

  // Preload field asset images (client-side only)
  const [, forceImageUpdate] = useState(0);
  useEffect(() => {
    let pending = 0;
    FIELD_ASSET_KEYS.forEach(key => {
      if (FIELD_IMGS[key]) return;
      pending++;
      const img = new window.Image();
      FIELD_IMGS[key] = img;
      img.onload = img.onerror = () => {
        pending--;
        if (pending === 0) forceImageUpdate(n => n + 1);
      };
      img.src = `/field-assets/${key}.png`;
    });
  }, []);

  // Marquee state
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  const marqueeActiveRef = useRef(false);
  const didMarqueeRef = useRef(false);

  /** Drag start position of the actively-dragged object */
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  /** Snapshot of all multi-selected object positions at drag start */
  const multiDragStartRef = useRef<Record<string, Record<string, number>>>({});
  /** Alt+Drag: original object + start pos — used to revert original and create copy on drop */
  const altDragRef = useRef<{ obj: CanvasObject; x: number; y: number } | null>(null);
  /** Guide lines state (managed with ref to avoid excessive re-renders) */
  const snapGuidesRef = useRef<{ x?: number; y?: number }>({});
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({});

  const [drawSnapTarget, setDrawSnapTarget] = useState<{ x: number; y: number } | null>(null);
  const drawSnapTargetRef = useRef<{ x: number; y: number } | null>(null);

  /**
   * Draw drag-flow state. Lets the user draw a 2-point shape via
   * press → drag → release in addition to the existing two-click flow.
   * The drag flow stays inactive until the pointer moves past the
   * threshold (in screen pixels), so tiny taps still fall through to
   * the click handler. Works for mouse, touch, and Apple Pencil since
   * Konva normalises all of those to the same onMouse* events.
   */
  const drawDragRef = useRef<{
    startStagePos: { x: number; y: number };
    startPitchPos: { x: number; y: number };
    startTargetId: string | null;
    isDragging: boolean;
  } | null>(null);
  /** Mirrors drawDragRef.startPitchPos in state once dragging starts, so the preview re-renders. */
  const [activeDragStart, setActiveDragStart] = useState<{ x: number; y: number } | null>(null);
  /** Set right before we commit a drag on pointerup so the synthetic onClick that follows is ignored. */
  const didDrawDragRef = useRef(false);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [textareaStyle, setTextareaStyle] = useState<React.CSSProperties>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track shift key for rotation snap
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true); };
    const onUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  const PITCH_W = drill.pitch.width;
  const PITCH_H = drill.pitch.height;
  const baseScale = Math.min(containerSize.w / PITCH_W, containerSize.h / PITCH_H);
  const scale = baseScale * zoom;
  const offsetX = Math.max(0, (containerSize.w - PITCH_W * scale) / 2);
  const offsetY = Math.max(0, (containerSize.h - PITCH_H * scale) / 2);

  const snap = useCallback((v: number) => snapToGrid ? Math.round(v / 10) * 10 : v, [snapToGrid]);

  const stageToPitch = useCallback((pos: { x: number; y: number }) => ({
    x: snap((pos.x - offsetX) / scale),
    y: snap((pos.y - offsetY) / scale),
  }), [offsetX, offsetY, scale, snap]);

  // Raw pitch coords without grid snap (for marquee)
  const stageToPitchRaw = useCallback((pos: { x: number; y: number }) => ({
    x: (pos.x - offsetX) / scale,
    y: (pos.y - offsetY) / scale,
  }), [offsetX, offsetY, scale]);

  // Sync transformer to selected node
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    const sel = selectedId ? stageRef.current.findOne('#' + selectedId) : null;
    const selectedObj = drill.objects.find((o) => o.id === selectedId);
    const isLocked = selectedObj && 'locked' in selectedObj && selectedObj.locked;
    trRef.current.nodes(sel && !isLocked ? [sel] : []);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId, stageRef, drill.objects]);

  // Keyboard delete
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (!selectedId || drawTool) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement as HTMLElement)?.tagName ?? '')) return;
      onDeleteObject(selectedId);
      onSelect(null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedId, drawTool, onDeleteObject, onSelect]);

  useEffect(() => {
    if (!drawTool) {
      setPreviewPos(null);
      setDrawSnapTarget(null);
      drawSnapTargetRef.current = null;
      drawDragRef.current = null;
      setActiveDragStart(null);
      didDrawDragRef.current = false;
    }
    if (drawTool) {
      // Cancel any active marquee when a draw tool becomes active
      setMarqueeStart(null);
      setMarqueeEnd(null);
      marqueeActiveRef.current = false;
    }
  }, [drawTool]);

  // ─── Constrain to nearest 45° ─────────────────────────────────────────────
  const constrainToStraight = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const dist = Math.hypot(dx, dy);
    return { x: from.x + Math.cos(snapped) * dist, y: from.y + Math.sin(snapped) * dist };
  };

  const updateSnapGuides = useCallback((g: { x?: number; y?: number }) => {
    if (g.x !== snapGuidesRef.current.x || g.y !== snapGuidesRef.current.y) {
      snapGuidesRef.current = g;
      setSnapGuides(g);
    }
  }, []);

  const finishTextEdit = useCallback(() => {
    if (!editingTextId) return;
    onUpdateObject(editingTextId, { text: editingValue } as Partial<CanvasObject>);
    setEditingTextId(null);
  }, [editingTextId, editingValue, onUpdateObject]);

  // ─── Event handlers ────────────────────────────────────────────────────────
  // Stage handlers accept both MouseEvent and TouchEvent because we bind the
  // same functions to onMouseDown/Move/Up AND onTouchStart/Move/End on the
  // Stage. iPad Safari doesn't reliably synthesise mousemove from touchmove
  // in Konva's normalisation path, so listening for both is the most robust
  // way to get smooth press-drag-release on touch and Apple Pencil.

  type CanvasPointerEvent = Konva.KonvaEventObject<MouseEvent | TouchEvent>;

  const handleStageMouseDown = (e: CanvasPointerEvent) => {
    // Right/middle button → never start marquee or drag-draw. TouchEvent has
    // no `button` property — only branch when it's actually a MouseEvent.
    if ('button' in e.evt && e.evt.button !== undefined && e.evt.button !== 0) return;

    // ── Draw drag-flow start ───────────────────────────────────────────────
    // Only arm a drag when we're at the *start* of a draw gesture (no points
    // committed yet). Mid-gesture clicks (e.g. curved phase 2/3) keep the
    // original click semantics.
    if (
      drawTool &&
      isTwoPointDrawTool(drawTool) &&
      !drawFirstPoint &&
      !drawSecondPoint
    ) {
      const stagePos = stageRef.current?.getPointerPosition();
      if (!stagePos) return;
      const pitchPos = stageToPitch(stagePos);
      const target = e.target;
      const targetId = (target === e.target.getStage() || target.name() === 'pitch-bg')
        ? null
        : (target.id() || (target.parent?.id() ?? null));
      drawDragRef.current = {
        startStagePos: stagePos,
        startPitchPos: pitchPos,
        startTargetId: targetId,
        isDragging: false,
      };
      return;
    }

    // ── Marquee start (no tool active) ─────────────────────────────────────
    if (drawTool) return;
    const isEmpty = e.target === e.target.getStage() || e.target.name() === 'pitch-bg';
    if (!isEmpty) return;
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return;
    const pitchPos = stageToPitchRaw(pos);
    marqueeActiveRef.current = true;
    setMarqueeStart(pitchPos);
    setMarqueeEnd(pitchPos);
  };

  const handleStageMouseUp = (e: CanvasPointerEvent) => {
    // ── Draw drag-flow: commit on release if we actually dragged ───────────
    const dd = drawDragRef.current;
    drawDragRef.current = null;

    if (dd && drawTool && dd.isDragging) {
      const stagePos = stageRef.current?.getPointerPosition();
      setActiveDragStart(null);
      if (stagePos) {
        let endPitchPos = stageToPitch(stagePos);
        if (e.evt.shiftKey && drawTool !== 'link') {
          endPitchPos = constrainToStraight(dd.startPitchPos, endPitchPos);
        }
        if (drawSnapTargetRef.current) endPitchPos = drawSnapTargetRef.current;

        // Below-minimum drag → fall through to the click handler. That way the
        // release point still becomes the first point, and the user can click
        // again to place the second — they never end up with "nothing happened".
        const dragDist = Math.hypot(endPitchPos.x - dd.startPitchPos.x, endPitchPos.y - dd.startPitchPos.y);
        if (dragDist < getMinDragPitchDistance(drawTool)) {
          setPreviewPos(null);
          return;
        }

        // Konva fires onClick after onMouseUp; tell the click handler to
        // ignore it so we don't get a spurious extra point.
        didDrawDragRef.current = true;

        // Atomic commit: parent receives both points in one call and never
        // consults the click state-machine, so start/end can't be swapped.
        // Falls back to the click path if no drag handler was provided.
        if (onCanvasDragCommit) {
          onCanvasDragCommit(dd.startPitchPos, endPitchPos);
        } else {
          // Legacy path — kept for callers that haven't wired onCanvasDragCommit yet.
          onCanvasPointClick(dd.startPitchPos, dd.startTargetId);
          const endPos = endPitchPos;
          requestAnimationFrame(() => onCanvasPointClick(endPos, null));
        }
        setPreviewPos(null);
        setDrawSnapTarget(null);
        drawSnapTargetRef.current = null;
      }
      return;
    }
    setActiveDragStart(null);

    // ── Marquee finish ─────────────────────────────────────────────────────
    if (!marqueeActiveRef.current) return;
    marqueeActiveRef.current = false;

    const start = marqueeStart;
    const end = marqueeEnd;
    setMarqueeStart(null);
    setMarqueeEnd(null);

    if (!start || !end) return;

    const x1 = Math.min(start.x, end.x);
    const y1 = Math.min(start.y, end.y);
    const x2 = Math.max(start.x, end.x);
    const y2 = Math.max(start.y, end.y);

    // Tiny movement → treat as a plain click, let the click handler deal with it
    if (x2 - x1 < 3 && y2 - y1 < 3) return;

    didMarqueeRef.current = true;

    const marqueeBounds: Bounds = { x1, y1, x2, y2 };
    const hitIds = drill.objects
      .map((o) => ({ id: o.id, bounds: getObjectBounds(o, drill.objects, playerScale) }))
      .filter(({ bounds }) => bounds !== null && boundsIntersect(bounds as Bounds, marqueeBounds))
      .map(({ id }) => id);

    if (onMarqueeSelect) onMarqueeSelect(hitIds, e.evt.shiftKey);
  };

  const handleStageClick = (e: CanvasPointerEvent) => {
    // Suppress click deselect if we just completed a marquee drag
    if (didMarqueeRef.current) {
      didMarqueeRef.current = false;
      return;
    }
    // Suppress the synthetic click that Konva fires right after a drag-draw release
    if (didDrawDragRef.current) {
      didDrawDragRef.current = false;
      return;
    }

    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return;
    const pitchPos = stageToPitch(pos);

    if (drawTool) {
      const target = e.target;
      const targetId = (target === e.target.getStage() || target.name() === 'pitch-bg')
        ? null : target.id() || (target.parent?.id() ?? null);
      const snappedPos = drawSnapTargetRef.current ?? pitchPos;
      onCanvasPointClick(snappedPos, targetId || null);
      return;
    }

    // Empty area → deselect.
    const target = e.target;
    if (target === target.getStage() || target.name() === 'pitch-bg') {
      onSelect(null);
      return;
    }

    // Tap-on-shape fallback for iPad / Apple Pencil.
    //
    // Konva 9 fires `click` for mouse events and `tap` for touch events as
    // separate events. Shapes have `onClick={selectHandler}` only, so on
    // mouse the shape selects itself and stops the bubble via
    // `e.cancelBubble = true` — this branch never runs. On touch the `tap`
    // event bubbles up to the Stage (no shape-level onTap to cancel it), so
    // we resolve the tapped shape's id here and select it directly.
    //
    // Without this, after adding any element on iPad the user could not
    // re-select it once it had been deselected, because no code path called
    // `onSelect(id)` for a tapped object.
    const tappedId = target.id() || target.parent?.id();
    if (tappedId && drill.objects.some((o) => o.id === tappedId)) {
      // TouchEvent has shiftKey but pure touch never reports it true; this
      // mirrors the per-shape selectHandler so mouse and touch are aligned.
      if (e.evt.shiftKey && onMultiSelect) {
        onMultiSelect(tappedId);
      } else {
        onSelect(tappedId);
      }
    }
  };

  const handleMouseMove = (e: CanvasPointerEvent) => {
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return;

    // Update marquee end while dragging
    if (marqueeActiveRef.current && marqueeStart) {
      setMarqueeEnd(stageToPitchRaw(pos));
      return;
    }

    // ── Draw drag-flow: detect threshold crossing & live preview ───────────
    const dd = drawDragRef.current;
    if (dd && drawTool) {
      const sdx = pos.x - dd.startStagePos.x;
      const sdy = pos.y - dd.startStagePos.y;
      if (!dd.isDragging && Math.hypot(sdx, sdy) >= DRAW_DRAG_THRESHOLD_PX) {
        dd.isDragging = true;
        setActiveDragStart(dd.startPitchPos);
      }
    }

    // Determine the anchor for the preview line. During click-flow this is
    // `drawFirstPoint` from props; during drag-flow it's the press position
    // we've recorded locally.
    const anchor = drawFirstPoint ?? (dd?.isDragging ? dd.startPitchPos : null);
    if (!drawTool || !anchor) return;

    let pitchPos = stageToPitch(pos);
    if (e.evt.shiftKey && drawTool !== 'link') {
      pitchPos = constrainToStraight(anchor, pitchPos);
    }

    // Draw snap: snap endpoint to nearby existing arrow/line points
    const isDrawLineArrow = drawTool !== null && ['arrow', 'line', 'tac-run', 'tac-pass',
      'tac-dribble', 'tac-press', 'tac-support', 'tac-lane', 'tac-defline',
      'smart-pass', 'smart-dribble', 'smart-run'].includes(drawTool);
    if (isDrawLineArrow) {
      const snapPts = getDrawSnapPoints(drill.objects);
      let snapped = false;
      for (const pt of snapPts) {
        if (Math.hypot(pitchPos.x - pt.x, pitchPos.y - pt.y) < DRAW_SNAP_THRESHOLD) {
          pitchPos = { x: pt.x, y: pt.y };
          setDrawSnapTarget(pitchPos);
          drawSnapTargetRef.current = pitchPos;
          snapped = true;
          break;
        }
      }
      if (!snapped) { setDrawSnapTarget(null); drawSnapTargetRef.current = null; }
    } else {
      setDrawSnapTarget(null);
      drawSnapTargetRef.current = null;
    }

    setPreviewPos(pitchPos);
  };

  const handleWheelZoom = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!onZoomChange) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    onZoomChange(Math.max(0.25, Math.min(3, zoom + delta)));
  }, [zoom, onZoomChange]);

  // ─── Drag handlers ─────────────────────────────────────────────────────────

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>, obj: CanvasObject) => {
    if ('x' in obj) {
      dragStartRef.current = { x: (obj as PlayerObject).x, y: (obj as PlayerObject).y };
      // Alt+Drag: save original state to revert and create copy on drop
      if (e.evt.altKey && onAltDragCopy) {
        altDragRef.current = { obj, x: (obj as PlayerObject).x, y: (obj as PlayerObject).y };
      }
    }

    // Snapshot positions of all multi-selected objects (for group drag)
    if (selectedIds.length > 1 && selectedIds.includes(obj.id)) {
      const positions: Record<string, Record<string, number>> = {};
      for (const id of selectedIds) {
        const selObj = drill.objects.find((x) => x.id === id);
        if (!selObj) continue;
        if (selObj.type === 'curved') {
          // Curved lines have a third point (control) that must move with the
          // endpoints, otherwise the curvature drifts during group drag.
          const c = selObj as CurvedLineObject;
          positions[id] = { startX: c.startX, startY: c.startY, cpX: c.cpX, cpY: c.cpY, endX: c.endX, endY: c.endY };
        } else if ('startX' in selObj) {
          const a = selObj as ArrowObject;
          positions[id] = { startX: a.startX, startY: a.startY, endX: a.endX, endY: a.endY };
        } else if ('x' in selObj) {
          positions[id] = { x: (selObj as PlayerObject).x, y: (selObj as PlayerObject).y };
        }
      }
      multiDragStartRef.current = positions;
    } else {
      multiDragStartRef.current = {};
    }
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    const node = e.target;

    // Live shift-axis constraint
    if (e.evt.shiftKey && dragStartRef.current) {
      const dx = Math.abs(node.x() - dragStartRef.current.x);
      const dy = Math.abs(node.y() - dragStartRef.current.y);
      if (dx > dy) node.y(dragStartRef.current.y);
      else node.x(dragStartRef.current.x);
      updateSnapGuides({});
    } else if (snapToGrid) {
      // Alignment snap to object centers/edges — only when Snap is ON
      const { xs, ys } = getSnapTargets(drill.objects, id);
      const snapped = snapToTargets(node.x(), node.y(), xs, ys);
      node.x(snapped.x);
      node.y(snapped.y);
      updateSnapGuides({ x: snapped.guideX, y: snapped.guideY });
      // Grid snap when no alignment snap hit
      if (snapped.guideX === undefined) node.x(snap(node.x()));
      if (snapped.guideY === undefined) node.y(snap(node.y()));
    } else {
      // Snap is OFF — no snapping at all, clear guides
      updateSnapGuides({});
    }

    // Live visual group move (for position-based objects only)
    const startPos = multiDragStartRef.current[id];
    if (startPos && 'x' in startPos && selectedIds.length > 1 && stageRef.current) {
      const deltaX = node.x() - startPos.x;
      const deltaY = node.y() - startPos.y;
      for (const selId of selectedIds) {
        if (selId === id) continue;
        const sp = multiDragStartRef.current[selId];
        if (!sp || !('x' in sp)) continue; // skip arrows/lines for live move
        // Skip locked objects — they must stay in place
        const selObj = drill.objects.find((x) => x.id === selId);
        if (selObj && 'locked' in selObj && (selObj as { locked?: boolean }).locked) continue;
        const otherNode = stageRef.current.findOne('#' + selId);
        if (otherNode) {
          otherNode.x(sp.x + deltaX);
          otherNode.y(sp.y + deltaY);
        }
      }
      stageRef.current.batchDraw();
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    let x = snap(e.target.x());
    let y = snap(e.target.y());

    if (e.evt.shiftKey && dragStartRef.current) {
      const dx = Math.abs(x - dragStartRef.current.x);
      const dy = Math.abs(y - dragStartRef.current.y);
      if (dx > dy) y = dragStartRef.current.y;
      else x = dragStartRef.current.x;
    }

    // Alt+Drag copy: revert original to its start position, create copy at drop
    if (altDragRef.current && onAltDragCopy) {
      const orig = altDragRef.current;
      e.target.x(orig.x);
      e.target.y(orig.y);
      onAltDragCopy(orig.obj, { x, y });
      altDragRef.current = null;
      dragStartRef.current = null;
      updateSnapGuides({});
      return;
    }

    dragStartRef.current = null;
    altDragRef.current = null;
    e.target.x(x);
    e.target.y(y);
    updateSnapGuides({});

    // Group move: commit positions of all multi-selected objects
    const startPos = multiDragStartRef.current[id];
    if (startPos && selectedIds.length > 1) {
      // Compute delta from start of the dragged object
      const startX = 'x' in startPos ? startPos.x : startPos.startX;
      const startY = 'y' in startPos ? startPos.y : startPos.startY;
      const deltaX = x - startX;
      const deltaY = y - startY;

      for (const selId of selectedIds) {
        const sp = multiDragStartRef.current[selId];
        if (!sp) continue;
        if (selId === id) {
          // The dragged object itself is always unlocked (locked objects can't initiate drag)
          onUpdateObject(selId, { x, y } as Partial<CanvasObject>);
        } else {
          // Skip locked objects — reset their visual position if moved during drag
          const selObj = drill.objects.find((x) => x.id === selId);
          if (selObj && 'locked' in selObj && (selObj as { locked?: boolean }).locked) {
            const lockedNode = stageRef.current?.findOne('#' + selId);
            if (lockedNode && 'x' in sp) { lockedNode.x(sp.x); lockedNode.y(sp.y); }
            continue;
          }
          if ('x' in sp) {
            onUpdateObject(selId, { x: snap(sp.x + deltaX), y: snap(sp.y + deltaY) } as Partial<CanvasObject>);
          } else if ('startX' in sp) {
            // Arrow / Line / Curved — translate endpoints and (if present) control point by the same delta
            const update: Record<string, number> = {
              startX: snap(sp.startX + deltaX), startY: snap(sp.startY + deltaY),
              endX: snap(sp.endX + deltaX), endY: snap(sp.endY + deltaY),
            };
            if ('cpX' in sp) {
              update.cpX = snap(sp.cpX + deltaX);
              update.cpY = snap(sp.cpY + deltaY);
            }
            onUpdateObject(selId, update as Partial<CanvasObject>);
          }
        }
      }
      multiDragStartRef.current = {};
    } else {
      onUpdateObject(id, { x, y } as Partial<CanvasObject>);
    }
  };

  const handleArrowDragEnd = (e: Konva.KonvaEventObject<DragEvent>, obj: ArrowObject) => {
    const dx = e.target.x(); const dy = e.target.y();
    onUpdateObject(obj.id, {
      startX: snap(obj.startX + dx), startY: snap(obj.startY + dy),
      endX: snap(obj.endX + dx), endY: snap(obj.endY + dy),
    } as Partial<ArrowObject>);
    e.target.x(0); e.target.y(0);
    updateSnapGuides({});
  };

  const handleLineDragEnd = (e: Konva.KonvaEventObject<DragEvent>, obj: LineObject) => {
    const dx = e.target.x(); const dy = e.target.y();
    onUpdateObject(obj.id, {
      startX: snap(obj.startX + dx), startY: snap(obj.startY + dy),
      endX: snap(obj.endX + dx), endY: snap(obj.endY + dy),
    } as Partial<LineObject>);
    e.target.x(0); e.target.y(0);
    updateSnapGuides({});
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, obj: CanvasObject) => {
    const node = e.target;
    const sX = node.scaleX(); const sY = node.scaleY();
    node.scaleX(1); node.scaleY(1);
    const updates: Partial<CanvasObject> = { x: node.x(), y: node.y(), rotation: node.rotation() } as Partial<CanvasObject>;
    if (['zone', 'rectangle', 'focus-zone', 'smart-cone-area'].includes(obj.type)) {
      const sized = obj as { width: number; height: number };
      (updates as { width?: number; height?: number }).width = Math.max(10, sized.width * sX);
      (updates as { width?: number; height?: number }).height = Math.max(10, sized.height * sY);
    } else if (obj.type === 'text') {
      const textObj = obj as TextObject;
      (updates as { width?: number; fontSize?: number }).width = Math.max(20, (textObj.width ?? 120) * sX);
      (updates as { width?: number; fontSize?: number }).fontSize = Math.max(6, Math.round((textObj.fontSize ?? 16) * ((sX + sY) / 2)));
    } else if (obj.type === 'cone') {
      const sz = (obj as ConeObject).size ?? 28;
      (updates as Partial<ConeObject>).size = Math.max(10, sz * Math.max(sX, sY));
    } else if (obj.type === 'ball') {
      const sz = (obj as BallObject).size ?? 22;
      (updates as Partial<BallObject>).size = Math.max(8, sz * Math.max(sX, sY));
    } else if (obj.type === 'goal') {
      const isFullGoal = (obj as GoalObject).size === 'full';
      const gW = (obj as GoalObject).imgW ?? (isFullGoal ? 22 : 20);
      const gH = (obj as GoalObject).imgH ?? (isFullGoal ? 52 : 38);
      (updates as Partial<GoalObject>).imgW = Math.max(20, gW * sX);
      (updates as Partial<GoalObject>).imgH = Math.max(14, gH * sY);
    }
    if (obj.type === 'circle') {
      (updates as Partial<CircleShapeObject>).radius = Math.max(5, (obj as CircleShapeObject).radius * Math.max(sX, sY));
    }
    onUpdateObject(obj.id, updates);
  };

  // ─── Object rendering ───────────────────────────────────────────────────────

  const sel = (id: string) => id === selectedId;
  const multiSel = (id: string) => selectedIds.includes(id) && id !== selectedId;
  const selStroke = '#fbbf24';
  const multiStroke = '#60a5fa';
  const draggable = (obj: CanvasObject) => !('locked' in obj && obj.locked);

  const renderObject = (obj: CanvasObject) => {
    const s = sel(obj.id);
    const ms = multiSel(obj.id);
    const drag = draggable(obj);

    const selectHandler = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (drawTool) return;
      // Suppress selection while marquee is being dragged
      if (marqueeActiveRef.current) return;
      e.cancelBubble = true;
      if (e.evt.shiftKey && onMultiSelect) {
        onMultiSelect(obj.id);
      } else {
        onSelect(obj.id);
      }
    };

    switch (obj.type) {
      case 'player': {
        const o = obj as PlayerObject;
        const ps = playerScale;
        const r = 16 * ps;
        const isGK = o.isGoalkeeper || o.number === '1' || o.number === '12';
        const fillColor = isGK ? '#d97706' : o.color;
        const circleStroke = s ? selStroke : ms ? multiStroke : (o.strokeColor ?? 'white');
        const circleStrokeWidth = s ? 3 : ms ? 2.5 : 1.5;
        const showNum = o.showNumber !== false;
        const rx = positionOverrides[o.id]?.x ?? o.x;
        const ry = positionOverrides[o.id]?.y ?? o.y;
        return (
          <Group key={o.id} id={o.id} x={rx} y={ry} rotation={o.rotation ?? 0}
            draggable={drag && Object.keys(positionOverrides).length === 0} onClick={selectHandler}
            onDragStart={(e) => handleDragStart(e, o)}
            onDragMove={(e) => handleDragMove(e, o.id)}
            onDragEnd={(e) => handleDragEnd(e, o.id)}
            onTransformEnd={(e) => handleTransformEnd(e, o)}>
            <Circle radius={r} fill={fillColor} stroke={circleStroke} strokeWidth={circleStrokeWidth} />
            {showNum && o.number && (
              <Text text={o.number} fontSize={Math.round(11 * ps)} fontStyle="bold" fill={o.numberColor ?? 'white'}
                align="center" verticalAlign="middle" width={r * 2} height={r * 2} x={-r} y={-r} listening={false} />
            )}
            {isGK && (
              <Text text="GK" fontSize={Math.round(7 * ps)} fontStyle="bold" fill="rgba(255,255,255,0.9)"
                align="center" width={r * 2} x={-r} y={r * 0.5} listening={false} />
            )}
            {o.bib && (
              <Arc
                x={0} y={r * 0.08}
                innerRadius={r * 0.3}
                outerRadius={r}
                angle={190}
                rotation={-95}
                fill={o.bibColor ?? '#fbbf24'}
                opacity={0.62}
                listening={false}
              />
            )}
            {showNames && o.name && (
              <Text text={o.name} fontSize={Math.round(9 * ps)} fill="rgba(255,255,255,0.85)"
                align="center" width={r * 4} x={-r * 2} y={r + 4} listening={false} />
            )}
            {linkFromId === o.id && <Circle radius={r + 2} stroke="#fbbf24" strokeWidth={2} fill="transparent" listening={false} />}
          </Group>
        );
      }

      case 'cone': {
        const o = obj as ConeObject;
        const variant = o.imageVariant ?? 'cone';
        const sz = o.size ?? 16;
        const img = FIELD_IMGS[variant];
        return (
          <Group key={o.id} id={o.id} x={o.x} y={o.y} rotation={o.rotation ?? 0}
            draggable={drag} onClick={selectHandler}
            onDragStart={(e) => handleDragStart(e, o)}
            onDragMove={(e) => handleDragMove(e, o.id)}
            onDragEnd={(e) => handleDragEnd(e, o.id)}
            onTransformEnd={(e) => handleTransformEnd(e, o)}>
            {img
              ? <KonvaImage image={img} x={-sz / 2} y={-sz / 2} width={sz} height={sz} />
              : <RegularPolygon sides={3} radius={sz / 2} fill={o.color} />
            }
            {(s || ms) && (
              <Rect x={-sz / 2 - 2} y={-sz / 2 - 2} width={sz + 4} height={sz + 4}
                stroke={s ? selStroke : multiStroke} strokeWidth={s ? 2.5 : 1.5}
                fill="transparent" listening={false} cornerRadius={3} />
            )}
          </Group>
        );
      }

      case 'ball': {
        const o = obj as BallObject;
        const sz = o.size ?? 16;
        const img = FIELD_IMGS['ball'];
        return (
          <Group key={o.id} id={o.id} x={o.x} y={o.y} rotation={o.rotation ?? 0}
            draggable={drag} onClick={selectHandler}
            onDragStart={(e) => handleDragStart(e, o)}
            onDragMove={(e) => handleDragMove(e, o.id)}
            onDragEnd={(e) => handleDragEnd(e, o.id)}
            onTransformEnd={(e) => handleTransformEnd(e, o)}>
            {img
              ? <KonvaImage image={img} x={-sz / 2} y={-sz / 2} width={sz} height={sz} />
              : <Circle radius={sz / 2} fill="white" stroke="#1a1a2e" strokeWidth={1.5} />
            }
            {(s || ms) && (
              <Rect x={-sz / 2 - 2} y={-sz / 2 - 2} width={sz + 4} height={sz + 4}
                stroke={s ? selStroke : multiStroke} strokeWidth={s ? 2.5 : 1.5}
                fill="transparent" listening={false} cornerRadius={3} />
            )}
          </Group>
        );
      }

      case 'goal': {
        const o = obj as GoalObject;
        const isFullGoal = o.size === 'full';
        const gW = o.imgW ?? (isFullGoal ? 22 : 20);
        const gH = o.imgH ?? (isFullGoal ? 52 : 38);
        const assetKey = isFullGoal ? 'large-goal' : 'mini-goal';
        const img = FIELD_IMGS[assetKey];
        return (
          <Group key={o.id} id={o.id} x={o.x} y={o.y} rotation={o.rotation ?? 0}
            draggable={drag} onClick={selectHandler}
            onDragStart={(e) => handleDragStart(e, o)}
            onDragMove={(e) => handleDragMove(e, o.id)}
            onDragEnd={(e) => handleDragEnd(e, o.id)}
            onTransformEnd={(e) => handleTransformEnd(e, o)}>
            {img
              ? <KonvaImage image={img} x={-gW / 2} y={-gH / 2} width={gW} height={gH} />
              : <Rect x={-gW / 2} y={-gH / 2} width={gW} height={gH}
                  fill="rgba(255,255,255,0.12)" stroke="white" strokeWidth={2} />
            }
            {(s || ms) && (
              <Rect x={-gW / 2 - 2} y={-gH / 2 - 2} width={gW + 4} height={gH + 4}
                stroke={s ? selStroke : multiStroke} strokeWidth={s ? 2.5 : 1.5}
                fill="transparent" listening={false} cornerRadius={3} />
            )}
          </Group>
        );
      }

      case 'arrow': {
        const o = obj as ArrowObject;
        const baseW = o.strokeWidth ?? 2.5;
        // Arrows are independent drawing strokes — always use stored coordinates
        const aSx = o.startX;
        const aSy = o.startY;
        const aEx = o.endX;
        const aEy = o.endY;
        const arrowColor = s ? selStroke : ms ? multiStroke : o.color;
        const arrowW = s ? baseW + 1.5 : ms ? baseW + 0.5 : baseW;

        if (o.arrowShape === 'zigzag') {
          const zigPts = getZigzagPoints(aSx, aSy, aEx, aEy);
          const n = zigPts.length;
          // Second-to-last point for arrowhead direction
          const dirX = zigPts[n - 4];
          const dirY = zigPts[n - 3];
          return (
            <Group key={o.id} id={o.id} draggable={drag} onClick={selectHandler}
              onDragEnd={(e) => handleArrowDragEnd(e, o)}>
              <KonvaLine
                points={zigPts}
                stroke={arrowColor}
                strokeWidth={arrowW}
                lineJoin="round"
                lineCap="round"
                hitStrokeWidth={14}
              />
              <KonvaArrow
                points={[dirX, dirY, aEx, aEy]}
                stroke={arrowColor}
                fill={arrowColor}
                strokeWidth={arrowW}
                pointerLength={10}
                pointerWidth={8}
                listening={false}
              />
            </Group>
          );
        }

        return (
          <KonvaArrow key={o.id} id={o.id}
            points={[aSx, aSy, aEx, aEy]}
            stroke={arrowColor}
            fill={o.headStyle === 'filled' ? arrowColor : 'transparent'}
            strokeWidth={arrowW}
            pointerLength={10} pointerWidth={8}
            dash={o.style === 'dashed' ? [10, 5] : undefined}
            draggable={drag}
            onClick={selectHandler}
            onDragEnd={(e) => handleArrowDragEnd(e, o)}
          />
        );
      }

      case 'zone': {
        const o = obj as ZoneObject;
        const zStrokeColor = s ? selStroke : ms ? multiStroke : (o.strokeColor ?? 'rgba(255,255,255,0.35)');
        const zStrokeW = s ? Math.max(2, o.strokeWidth ?? 1) : ms ? Math.max(1.5, o.strokeWidth ?? 1) : (o.strokeWidth ?? 1);
        return (
          <Group key={o.id} id={o.id} x={o.x} y={o.y} rotation={o.rotation ?? 0}
            draggable={drag} onClick={selectHandler}
            onDragStart={(e) => handleDragStart(e, o)}
            onDragMove={(e) => handleDragMove(e, o.id)}
            onDragEnd={(e) => handleDragEnd(e, o.id)}
            onTransformEnd={(e) => handleTransformEnd(e, o)}>
            {/* Fill — non-listening so interior clicks/drags pass through to stage */}
            <Rect width={o.width} height={o.height} fill={o.fill} opacity={o.opacity} listening={false} />
            {/* Border — border-only hit via hitFunc; interior is fully pass-through */}
            <Rect width={o.width} height={o.height} fillEnabled={false}
              stroke={zStrokeColor} strokeWidth={zStrokeW}
              hitFunc={(ctx, shape) => {
                const w = o.width; const h = o.height; const t = 8;
                ctx.beginPath();
                ctx.rect(0, 0, w, t); ctx.rect(0, h - t, w, t);
                ctx.rect(0, t, t, h - 2 * t); ctx.rect(w - t, t, t, h - 2 * t);
                ctx.fillStrokeShape(shape);
              }} />
            {o.label && <Text text={o.label} fontSize={12} fill="rgba(255,255,255,0.9)" align="center" verticalAlign="middle" width={o.width} height={o.height} listening={false} />}
          </Group>
        );
      }

      case 'circle': {
        const o = obj as CircleShapeObject;
        return (
          <Group key={o.id} id={o.id} x={o.x} y={o.y} rotation={o.rotation ?? 0}
            opacity={o.opacity ?? 1}
            draggable={drag} onClick={selectHandler}
            onDragStart={(e) => handleDragStart(e, o)}
            onDragMove={(e) => handleDragMove(e, o.id)}
            onDragEnd={(e) => handleDragEnd(e, o.id)}
            onTransformEnd={(e) => handleTransformEnd(e, o)}>
            <Circle radius={o.radius} stroke={s ? selStroke : ms ? multiStroke : o.stroke}
              strokeWidth={s ? o.strokeWidth + 1 : ms ? o.strokeWidth + 0.5 : o.strokeWidth}
              fill={o.fill ?? 'transparent'} opacity={o.fillOpacity ?? 1}
              dash={o.dashed ? [8, 4] : undefined} />
          </Group>
        );
      }

      case 'rectangle': {
        const o = obj as RectangleObject;
        const rStrokeColor = s ? selStroke : ms ? multiStroke : o.stroke;
        const rStrokeW = s ? o.strokeWidth + 1 : ms ? o.strokeWidth + 0.5 : o.strokeWidth;
        return (
          <Group key={o.id} id={o.id} x={o.x} y={o.y} rotation={o.rotation ?? 0}
            opacity={o.opacity ?? 1}
            draggable={drag} onClick={selectHandler}
            onDragStart={(e) => handleDragStart(e, o)}
            onDragMove={(e) => handleDragMove(e, o.id)}
            onDragEnd={(e) => handleDragEnd(e, o.id)}
            onTransformEnd={(e) => handleTransformEnd(e, o)}>
            {/* Fill — non-listening */}
            <Rect width={o.width} height={o.height} fill={o.fill ?? 'transparent'} opacity={o.fillOpacity ?? 1}
              dash={o.dashed ? [8, 4] : undefined} listening={false} />
            {/* Border — border-only hit via hitFunc; interior is fully pass-through */}
            <Rect width={o.width} height={o.height} fillEnabled={false}
              stroke={rStrokeColor} strokeWidth={rStrokeW}
              dash={o.dashed ? [8, 4] : undefined}
              hitFunc={(ctx, shape) => {
                const w = o.width; const h = o.height; const t = 8;
                ctx.beginPath();
                ctx.rect(0, 0, w, t); ctx.rect(0, h - t, w, t);
                ctx.rect(0, t, t, h - 2 * t); ctx.rect(w - t, t, t, h - 2 * t);
                ctx.fillStrokeShape(shape);
              }} />
          </Group>
        );
      }

      case 'line': {
        const o = obj as LineObject;
        return (
          <KonvaLine key={o.id} id={o.id}
            points={[o.startX, o.startY, o.endX, o.endY]}
            stroke={s ? selStroke : ms ? multiStroke : o.color}
            strokeWidth={s ? o.strokeWidth + 1.5 : ms ? o.strokeWidth + 1 : o.strokeWidth}
            dash={o.dashed ? [8, 4] : undefined}
            draggable={drag}
            onClick={selectHandler}
            onDragEnd={(e) => handleLineDragEnd(e, o)}
            hitStrokeWidth={12}
          />
        );
      }

      case 'curved': {
        const o = obj as CurvedLineObject;
        const pathData = `M ${o.startX} ${o.startY} Q ${o.cpX} ${o.cpY} ${o.endX} ${o.endY}`;
        return (
          <KonvaPath key={o.id} id={o.id}
            data={pathData}
            stroke={s ? selStroke : ms ? multiStroke : o.color}
            strokeWidth={s ? o.strokeWidth + 1.5 : ms ? o.strokeWidth + 1 : o.strokeWidth}
            fill="transparent"
            dash={o.dashed ? [8, 4] : undefined}
            draggable={drag}
            onClick={selectHandler}
            onDragEnd={(e) => {
              const dx = e.target.x(); const dy = e.target.y();
              onUpdateObject(o.id, {
                startX: snap(o.startX + dx), startY: snap(o.startY + dy),
                cpX: snap(o.cpX + dx), cpY: snap(o.cpY + dy),
                endX: snap(o.endX + dx), endY: snap(o.endY + dy),
              } as Partial<CurvedLineObject>);
              e.target.x(0); e.target.y(0);
              updateSnapGuides({});
            }}
            hitStrokeWidth={12}
          />
        );
      }

      case 'link': {
        const o = obj as LinkObject;
        const from = drill.objects.find((x) => x.id === o.fromPlayerId) as PlayerObject | undefined;
        const to = drill.objects.find((x) => x.id === o.toPlayerId) as PlayerObject | undefined;
        if (!from || !to || from.type !== 'player' || to.type !== 'player') return null;
        return (
          <KonvaLine key={o.id} id={o.id}
            points={[from.x, from.y, to.x, to.y]}
            stroke={s ? selStroke : ms ? multiStroke : o.color}
            strokeWidth={s ? 3 : ms ? 2.5 : 2}
            dash={o.dashed ? [8, 4] : undefined}
            onClick={selectHandler}
            hitStrokeWidth={12}
            listening={true}
          />
        );
      }

      case 'focus-zone': {
        const o = obj as FocusZoneObject;
        return (
          <Group key={o.id} id={o.id} x={o.x} y={o.y}
            draggable={drag} onClick={selectHandler}
            onDragStart={(e) => handleDragStart(e, o)}
            onDragMove={(e) => handleDragMove(e, o.id)}
            onDragEnd={(e) => handleDragEnd(e, o.id)}
            onTransformEnd={(e) => handleTransformEnd(e, o)}>
            {/* Interior — non-listening so marquee drag works inside */}
            <Rect width={o.width} height={o.height} fill="transparent" listening={false} />
            {/* Border — border-only hit via hitFunc; interior is fully pass-through */}
            <Rect width={o.width} height={o.height} fillEnabled={false}
              stroke={s ? selStroke : ms ? multiStroke : 'rgba(255,255,255,0.28)'}
              strokeWidth={s ? 2 : ms ? 1.5 : 1}
              dash={[8, 4]}
              hitFunc={(ctx, shape) => {
                const w = o.width; const h = o.height; const t = 8;
                ctx.beginPath();
                ctx.rect(0, 0, w, t); ctx.rect(0, h - t, w, t);
                ctx.rect(0, t, t, h - 2 * t); ctx.rect(w - t, t, t, h - 2 * t);
                ctx.fillStrokeShape(shape);
              }} />
          </Group>
        );
      }

      case 'smart-cone-area': {
        const o = obj as SmartConeAreaObject;
        const conePts = getSmartConePositions(o.width, o.height, o.extraConesPerSide ?? 0);
        const coneCol = o.coneColor ?? '#f97316';
        const coneVariant = o.coneVariant ?? 'cone';
        const coneImg = FIELD_IMGS[coneVariant];
        const showBorder = o.showBorder !== false;
        const coneSize = 16;
        return (
          <Group key={o.id} id={o.id} x={o.x} y={o.y} rotation={o.rotation ?? 0}
            draggable={drag} onClick={selectHandler}
            onDragStart={(e) => handleDragStart(e, o)}
            onDragMove={(e) => handleDragMove(e, o.id)}
            onDragEnd={(e) => handleDragEnd(e, o.id)}
            onTransformEnd={(e) => handleTransformEnd(e, o)}>
            {/* Interior — non-listening so marquee works inside */}
            <Rect width={o.width} height={o.height} fill="transparent" listening={false} />
            {/* Border — border-only hit via hitFunc; interior is fully pass-through */}
            <Rect width={o.width} height={o.height} fillEnabled={false}
              stroke={s ? selStroke : ms ? multiStroke : (showBorder ? (o.borderColor ?? 'rgba(255,255,255,0.35)') : 'rgba(0,0,0,0)')}
              strokeWidth={s ? 2 : ms ? 1.5 : (showBorder ? 1 : 0.5)}
              dash={(!s && !ms && (o.borderDashed !== false) && showBorder) ? [8, 4] : undefined}
              hitFunc={(ctx, shape) => {
                const w = o.width; const h = o.height; const t = 8;
                ctx.beginPath();
                ctx.rect(0, 0, w, t); ctx.rect(0, h - t, w, t);
                ctx.rect(0, t, t, h - 2 * t); ctx.rect(w - t, t, t, h - 2 * t);
                ctx.fillStrokeShape(shape);
              }} />
            {/* Cones */}
            {conePts.map(({ cx, cy }, i) => (
              coneImg
                ? <KonvaImage key={i} image={coneImg} x={cx - coneSize / 2} y={cy - coneSize / 2}
                    width={coneSize} height={coneSize} listening={false} />
                : <RegularPolygon key={i} sides={3} radius={coneSize / 2} fill={coneCol}
                    x={cx} y={cy} listening={false} />
            ))}
          </Group>
        );
      }

      case 'text': {
        const o = obj as TextObject;
        const konvaFontStyle = [
          o.fontWeight === 'bold' ? 'bold' : '',
          o.fontStyle === 'italic' ? 'italic' : '',
        ].filter(Boolean).join(' ') || 'normal';
        const boxH = (o.fontSize ?? 16) * 1.4 + 8;
        return (
          <Group key={o.id} id={o.id} x={o.x} y={o.y} rotation={o.rotation ?? 0}
            draggable={drag} onClick={selectHandler}
            opacity={editingTextId === o.id ? 0.15 : 1}
            onDblClick={(e) => {
              if (!drag) return;
              e.cancelBubble = true;
              const group = e.target.findAncestor('Group') as Konva.Group | null ?? e.target as Konva.Node;
              const absPos = group.absolutePosition();
              const stageBox = stageRef.current?.container().getBoundingClientRect();
              if (!stageBox) return;
              const stgScale = stageRef.current!.scaleX();
              setEditingTextId(o.id);
              setEditingValue(o.text);
              setTextareaStyle({
                position: 'fixed',
                left: (stageBox.left + absPos.x) + 'px',
                top: (stageBox.top + absPos.y) + 'px',
                width: Math.max(80, (o.width ?? 120) * stgScale) + 'px',
                minHeight: '1.4em',
                fontSize: (o.fontSize ?? 16) * stgScale + 'px',
                fontFamily: o.fontFamily ?? 'sans-serif',
                fontWeight: o.fontWeight ?? 'normal',
                fontStyle: o.fontStyle === 'italic' ? 'italic' : 'normal',
                color: o.color ?? '#ffffff',
                background: 'rgba(0,0,0,0.88)',
                border: '2px solid #fbbf24',
                outline: 'none',
                resize: 'none',
                zIndex: 9999,
                padding: '3px 5px',
                lineHeight: '1.25',
                borderRadius: '3px',
                overflow: 'hidden',
              });
              setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.select(); }, 10);
            }}
            onDragStart={(e) => handleDragStart(e, o)}
            onDragMove={(e) => handleDragMove(e, o.id)}
            onDragEnd={(e) => handleDragEnd(e, o.id)}
            onTransformEnd={(e) => handleTransformEnd(e, o)}>
            <Rect width={o.width ?? 120} height={boxH} fill="transparent" />
            {o.showBox && !s && !ms && (
              <Rect width={o.width ?? 120} height={boxH} fill="transparent"
                stroke={o.boxBorderColor ?? 'rgba(255,255,255,0.5)'}
                strokeWidth={o.boxBorderWidth ?? 1.5}
              />
            )}
            {(s || ms) && (
              <Rect width={o.width ?? 120} height={boxH} fill="transparent"
                stroke={s ? selStroke : multiStroke} strokeWidth={s ? 2 : 1.5} dash={[5, 4]} />
            )}
            <Text
              text={o.text || '…'}
              fontSize={o.fontSize ?? 16}
              fontFamily={o.fontFamily ?? 'sans-serif'}
              fontStyle={konvaFontStyle}
              fill={o.color ?? '#ffffff'}
              width={o.width ?? 120}
              align={o.align ?? 'left'}
              wrap="word"
              listening={false}
            />
          </Group>
        );
      }

      case 'group': {
        const o = obj as GroupObject;
        const isLocked = !!o.locked;
        const drag = !isLocked && !drawTool;
        return (
          <Group key={o.id} id={o.id} x={o.x} y={o.y} rotation={o.rotation ?? 0}
            draggable={drag}
            onClick={selectHandler}
            onDragStart={(e) => handleDragStart(e, o)}
            onDragMove={(e) => handleDragMove(e, o.id)}
            onDragEnd={(e) => handleDragEnd(e, o.id)}
          >
            {/* Selection outline */}
            {(s || ms) && (() => {
              const xs = o.children.map((c) => 'x' in c ? (c as PlayerObject).x : ('startX' in c ? Math.min((c as ArrowObject).startX, (c as ArrowObject).endX) : 0));
              const ys = o.children.map((c) => 'y' in c ? (c as PlayerObject).y : ('startY' in c ? Math.min((c as ArrowObject).startY, (c as ArrowObject).endY) : 0));
              const xe = o.children.map((c) => 'x' in c ? (c as PlayerObject).x + 32 : ('endX' in c ? Math.max((c as ArrowObject).startX, (c as ArrowObject).endX) : 32));
              const ye = o.children.map((c) => 'y' in c ? (c as PlayerObject).y + 32 : ('endY' in c ? Math.max((c as ArrowObject).startY, (c as ArrowObject).endY) : 32));
              const bx = Math.min(...xs) - 8; const by = Math.min(...ys) - 8;
              const bw = Math.max(...xe) - Math.min(...xs) + 16; const bh = Math.max(...ye) - Math.min(...ys) + 16;
              return <Rect x={bx} y={by} width={bw} height={bh} stroke={s ? selStroke : multiStroke} strokeWidth={s ? 2 : 1.5} dash={[6, 4]} fill="transparent" listening={false} />;
            })()}
            {o.children.map((child) => {
              // Render child as a simplified visual (no interactivity)
              if ('x' in child && child.type === 'player') {
                const p = child as PlayerObject; const ps = playerScale; const r = 16 * ps;
                const isGKChild = p.isGoalkeeper || p.number === '1' || p.number === '12';
                return (
                  <Group key={child.id} x={p.x} y={p.y} listening={false}>
                    <Circle radius={r} fill={isGKChild ? '#d97706' : p.color} stroke={p.strokeColor ?? 'white'} strokeWidth={1.5} />
                    {p.showNumber !== false && p.number && (
                      <Text text={p.number} fontSize={Math.round(11 * ps)} fontStyle="bold" fill={p.numberColor ?? 'white'} align="center" verticalAlign="middle" width={r * 2} height={r * 2} x={-r} y={-r} listening={false} />
                    )}
                  </Group>
                );
              }
              if ('startX' in child) {
                const a = child as ArrowObject;
                return <KonvaArrow key={child.id} points={[a.startX, a.startY, a.endX, a.endY]} stroke={a.color} fill={a.color} strokeWidth={a.strokeWidth ?? 2} listening={false} />;
              }
              if ('x' in child && child.type === 'cone') {
                const c = child as ConeObject;
                return <RegularPolygon key={child.id} x={c.x} y={c.y} sides={3} radius={(c.size ?? 16) / 1.5} fill={c.color} listening={false} />;
              }
              return null;
            })}
          </Group>
        );
      }

      default: return null;
    }
  };

  // Effective first point: either the prop (click-flow) OR the local press point
  // recorded while a drag is in progress. Lets the same preview/dot rendering
  // serve both flows without duplicating any drawing code.
  const effectiveFirstPoint = drawFirstPoint ?? activeDragStart;

  const renderPreview = () => {
    if (!drawTool || !previewPos) return null;
    // Ghost cursor dot before first click
    if (!effectiveFirstPoint) {
      return (
        <Circle x={previewPos.x} y={previewPos.y} radius={6}
          fill="rgba(251,191,36,0.4)" stroke="rgba(251,191,36,0.9)" strokeWidth={1.5}
          dash={[3, 3]} listening={false} />
      );
    }
    const isArrowTool = ['arrow', 'tac-run', 'tac-pass', 'tac-dribble', 'tac-press', 'tac-support', 'smart-pass', 'smart-run'].includes(drawTool);
    const isLineTool = ['line', 'tac-lane', 'tac-defline'].includes(drawTool);
    if (isArrowTool || isLineTool) {
      return (
        <KonvaArrow
          points={[effectiveFirstPoint.x, effectiveFirstPoint.y, previewPos.x, previewPos.y]}
          stroke="rgba(251,191,36,0.7)" fill="rgba(251,191,36,0.7)"
          strokeWidth={2} pointerLength={8} pointerWidth={6}
          dash={[8, 4]} listening={false}
        />
      );
    }
    if (drawTool === 'smart-dribble') {
      const zigPts = getZigzagPoints(effectiveFirstPoint.x, effectiveFirstPoint.y, previewPos.x, previewPos.y);
      const n = zigPts.length;
      return (
        <>
          <KonvaLine points={zigPts} stroke="rgba(245,158,11,0.75)" strokeWidth={2}
            lineJoin="round" lineCap="round" dash={undefined} listening={false} />
          <KonvaArrow
            points={[zigPts[n - 4], zigPts[n - 3], previewPos.x, previewPos.y]}
            stroke="rgba(245,158,11,0.75)" fill="rgba(245,158,11,0.75)"
            strokeWidth={2} pointerLength={8} pointerWidth={6} listening={false}
          />
        </>
      );
    }
    if (drawTool === 'focus-zone') {
      const x = Math.min(effectiveFirstPoint.x, previewPos.x);
      const y = Math.min(effectiveFirstPoint.y, previewPos.y);
      const w = Math.abs(previewPos.x - effectiveFirstPoint.x);
      const h = Math.abs(previewPos.y - effectiveFirstPoint.y);
      return (
        <>
          {y > 0 && <Rect x={0} y={0} width={PITCH_W} height={y} fill="#000000" opacity={0.28} listening={false} />}
          {y + h < PITCH_H && <Rect x={0} y={y + h} width={PITCH_W} height={PITCH_H - (y + h)} fill="#000000" opacity={0.28} listening={false} />}
          {x > 0 && <Rect x={0} y={y} width={x} height={h} fill="#000000" opacity={0.28} listening={false} />}
          {x + w < PITCH_W && <Rect x={x + w} y={y} width={PITCH_W - (x + w)} height={h} fill="#000000" opacity={0.28} listening={false} />}
          <Rect x={x} y={y} width={w} height={h} stroke="rgba(255,255,255,0.75)" strokeWidth={1.5}
            fill="transparent" dash={[6, 4]} listening={false} />
        </>
      );
    }
    if (drawTool === 'curved') {
      // Phase 1: start set, no end yet — show straight preview line to potential end
      if (!drawSecondPoint) {
        return (
          <KonvaLine
            points={[effectiveFirstPoint.x, effectiveFirstPoint.y, previewPos.x, previewPos.y]}
            stroke="rgba(0,184,212,0.7)" strokeWidth={2} dash={[8, 4]} listening={false}
          />
        );
      }
      // Phase 2: end set (drawSecondPoint), cursor = control point — show live bezier preview
      const pathData = `M ${effectiveFirstPoint.x} ${effectiveFirstPoint.y} Q ${previewPos.x} ${previewPos.y} ${drawSecondPoint.x} ${drawSecondPoint.y}`;
      return (
        <>
          <KonvaPath data={pathData} stroke="rgba(0,184,212,0.7)" strokeWidth={2} fill="transparent" dash={[8, 4]} listening={false} />
          {/* Guide lines from endpoints to control point */}
          <KonvaLine
            points={[effectiveFirstPoint.x, effectiveFirstPoint.y, previewPos.x, previewPos.y, drawSecondPoint.x, drawSecondPoint.y]}
            stroke="rgba(0,184,212,0.3)" strokeWidth={1} dash={[4, 4]} listening={false}
          />
          {/* Control point handle at cursor */}
          <Circle x={previewPos.x} y={previewPos.y} radius={4} fill="rgba(0,184,212,0.8)" listening={false} />
        </>
      );
    }
    if (drawTool === 'rect' || drawTool === 'smart-cone-area') {
      const x = Math.min(effectiveFirstPoint.x, previewPos.x);
      const y = Math.min(effectiveFirstPoint.y, previewPos.y);
      const w = Math.abs(previewPos.x - effectiveFirstPoint.x);
      const h = Math.abs(previewPos.y - effectiveFirstPoint.y);
      if (drawTool === 'smart-cone-area') {
        const conePts = getSmartConePositions(w, h, 1);
        return (
          <>
            <Rect x={x} y={y} width={w} height={h} stroke="rgba(251,191,36,0.5)" strokeWidth={1.5} fill="transparent" dash={[6, 4]} listening={false} />
            {conePts.map(({ cx, cy }, i) => (
              <RegularPolygon key={i} sides={3} radius={10} fill="rgba(249,115,22,0.7)" x={x + cx} y={y + cy} listening={false} />
            ))}
          </>
        );
      }
      return <Rect x={x} y={y} width={w} height={h} stroke="rgba(251,191,36,0.7)" strokeWidth={2} fill="transparent" dash={[8, 4]} listening={false} />;
    }
    if (drawTool === 'circle') {
      const r = Math.hypot(previewPos.x - effectiveFirstPoint.x, previewPos.y - effectiveFirstPoint.y);
      return <Circle x={effectiveFirstPoint.x} y={effectiveFirstPoint.y} radius={r} stroke="rgba(251,191,36,0.7)" strokeWidth={2} fill="transparent" dash={[8, 4]} listening={false} />;
    }
    return null;
  };

  const renderFirstPoint = () => {
    if (!effectiveFirstPoint || !drawTool || drawTool === 'link') return null;
    const dotColor = drawTool === 'curved' ? '#00b8d4' : '#fbbf24';
    return (
      <>
        <Circle x={effectiveFirstPoint.x} y={effectiveFirstPoint.y} radius={5} fill={dotColor} listening={false} />
        {drawTool === 'curved' && drawSecondPoint && (
          <Circle x={drawSecondPoint.x} y={drawSecondPoint.y} radius={5} fill={dotColor} listening={false} />
        )}
      </>
    );
  };

  const selectedObj = drill.objects.find((o) => o.id === selectedId);
  const isLocked = selectedObj && 'locked' in selectedObj && selectedObj.locked;
  // Rectangles and zones: 8-handle resize. Circles: 4-corner resize only.
  const resizableAll = selectedObj && !isLocked && ['zone', 'rectangle', 'focus-zone', 'smart-cone-area', 'text', 'cone', 'ball', 'goal'].includes(selectedObj.type);
  const resizableCircle = selectedObj && !isLocked && selectedObj.type === 'circle';
  const resizable = resizableAll || resizableCircle;
  const rotatable = selectedObj && !isLocked && ['player', 'cone', 'goal', 'zone', 'rectangle', 'circle', 'ball'].includes(selectedObj.type);

  // ─── Layer ordering: shapes/zones below, lines/links middle, players/cones/balls/goals on top ──
  const focusZone = drill.objects.find((o) => o.type === 'focus-zone') as FocusZoneObject | undefined;
  const shapesLayer = drill.objects.filter((o) => ['zone', 'rectangle', 'circle', 'focus-zone', 'smart-cone-area'].includes(o.type));
  const linesLayer = drill.objects.filter((o) => ['arrow', 'line', 'curved', 'link'].includes(o.type));
  const topLayer = drill.objects.filter((o) => ['player', 'cone', 'ball', 'goal', 'text', 'group'].includes(o.type));

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-gray-950 relative"
      style={{
        cursor: drawTool ? 'crosshair' : 'default',
        // Touch / Apple Pencil: tell the browser we handle gestures ourselves
        // so iPad Safari doesn't intercept two-finger pan/pinch as a page-level
        // scroll-and-zoom. Without this, drawing with a finger or Pencil works,
        // but any two-finger move pans the whole page off-screen.
        touchAction: 'none',
        // Disable iOS's tap-to-highlight grey flash on Konva elements.
        WebkitTapHighlightColor: 'transparent',
        // Prevent text-selection while drawing (a long-press otherwise selects
        // surrounding UI on iPad).
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // iOS Safari sometimes shows a system context menu on long-press; opt out.
        WebkitTouchCallout: 'none',
      }}
      onWheel={onZoomChange ? handleWheelZoom : undefined}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (!onDropAtPoint) return;
        const raw = e.dataTransfer.getData('application/x-editor-tool');
        if (!raw) return;
        try {
          const data = JSON.parse(raw) as Record<string, unknown>;
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const rawX = (e.clientX - rect.left - offsetX) / scale;
          const rawY = (e.clientY - rect.top - offsetY) / scale;
          const fx = snap(Math.max(0, Math.min(PITCH_W, rawX)));
          const fy = snap(Math.max(0, Math.min(PITCH_H, rawY)));
          onDropAtPoint(data.type as string, data, { x: fx, y: fy });
        } catch { /* ignore */ }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Stage
        ref={stageRef}
        width={containerSize.w}
        height={containerSize.h}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseDown={handleStageMouseDown}
        onMouseUp={handleStageMouseUp}
        onMouseMove={handleMouseMove}
        // iPad / Apple Pencil — bind native touch events so press-drag-release
        // works smoothly even on Konva versions that don't fully synthesise
        // mousemove from touchmove on iOS Safari. The handlers are idempotent
        // so if Konva ALSO fires the mouse equivalents we don't double-act.
        onTouchStart={handleStageMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleStageMouseUp}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          if (drawTool) { onFinishDrawing(); return; }
          const target = e.target;
          if (!target || target === e.target.getStage() || target.name() === 'pitch-bg') return;
          const id = target.id() || target.parent?.id();
          if (id && onContextMenuObject) {
            onContextMenuObject(id, e.evt.clientX, e.evt.clientY);
          }
        }}
      >
        <Layer x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
          <PitchBackground pitch={drill.pitch} />

          {/* Focus zone spotlight — 4 dark overlay rects surrounding the focus area */}
          {focusZone && (() => {
            const fz = focusZone;
            const oa = fz.overlayOpacity ?? 0.3;
            return (
              <>
                {fz.y > 0 && <Rect x={0} y={0} width={PITCH_W} height={fz.y} fill="#000000" opacity={oa} listening={false} />}
                {fz.y + fz.height < PITCH_H && <Rect x={0} y={fz.y + fz.height} width={PITCH_W} height={PITCH_H - (fz.y + fz.height)} fill="#000000" opacity={oa} listening={false} />}
                {fz.x > 0 && <Rect x={0} y={fz.y} width={fz.x} height={fz.height} fill="#000000" opacity={oa} listening={false} />}
                {fz.x + fz.width < PITCH_W && <Rect x={fz.x + fz.width} y={fz.y} width={PITCH_W - (fz.x + fz.width)} height={fz.height} fill="#000000" opacity={oa} listening={false} />}
              </>
            );
          })()}

          {/* Alignment guide lines */}
          {snapGuides.x !== undefined && (
            <KonvaLine
              points={[snapGuides.x, 0, snapGuides.x, PITCH_H]}
              stroke="#fbbf24" strokeWidth={0.75} dash={[6, 4]} opacity={0.65} listening={false}
            />
          )}
          {snapGuides.y !== undefined && (
            <KonvaLine
              points={[0, snapGuides.y, PITCH_W, snapGuides.y]}
              stroke="#fbbf24" strokeWidth={0.75} dash={[6, 4]} opacity={0.65} listening={false}
            />
          )}

          {/* Layer 1: background shapes (zones, rectangles, circles) */}
          {shapesLayer.map(renderObject)}
          {/* Layer 2: connectors and tactical lines */}
          {linesLayer.map(renderObject)}
          {/* Layer 3: players, cones, balls, goals on top */}
          {topLayer.map(renderObject)}

          {renderFirstPoint()}
          {renderPreview()}
          {drawSnapTarget && (
            <Circle x={drawSnapTarget.x} y={drawSnapTarget.y} radius={7}
              stroke="#fbbf24" strokeWidth={2} fill="rgba(251,191,36,0.25)" listening={false} />
          )}

          {/* Marquee selection rectangle */}
          {marqueeStart && marqueeEnd && (
            <Rect
              x={Math.min(marqueeStart.x, marqueeEnd.x)}
              y={Math.min(marqueeStart.y, marqueeEnd.y)}
              width={Math.abs(marqueeEnd.x - marqueeStart.x)}
              height={Math.abs(marqueeEnd.y - marqueeStart.y)}
              stroke="rgba(251,191,36,0.85)"
              strokeWidth={1}
              fill="rgba(251,191,36,0.07)"
              dash={[6, 3]}
              listening={false}
            />
          )}

          {/* Arrow/Line endpoint handles — draggable circles when single arrow/line selected */}
          {selectedObj && (selectedObj.type === 'arrow' || selectedObj.type === 'line') && !isLocked && selectedIds.length <= 1 && !drawTool && (() => {
            const a = selectedObj as ArrowObject;
            const HANDLE_R = 7;
            return (
              <>
                <Circle key="ep-start" id="ep-start" x={a.startX} y={a.startY} radius={HANDLE_R}
                  fill="#fbbf24" stroke="#92400e" strokeWidth={1.5}
                  hitStrokeWidth={14}
                  draggable
                  onMouseDown={(e) => { e.cancelBubble = true; }}
                  onDragMove={(e) => {
                    const nx = snap(e.target.x()); const ny = snap(e.target.y());
                    e.target.x(nx); e.target.y(ny);
                  }}
                  onDragEnd={(e) => {
                    onUpdateObject(a.id, { startX: snap(e.target.x()), startY: snap(e.target.y()) } as Partial<CanvasObject>);
                    e.target.x(snap(e.target.x())); e.target.y(snap(e.target.y()));
                  }}
                />
                <Circle key="ep-end" id="ep-end" x={a.endX} y={a.endY} radius={HANDLE_R}
                  fill="#fbbf24" stroke="#92400e" strokeWidth={1.5}
                  hitStrokeWidth={14}
                  draggable
                  onMouseDown={(e) => { e.cancelBubble = true; }}
                  onDragMove={(e) => {
                    const nx = snap(e.target.x()); const ny = snap(e.target.y());
                    e.target.x(nx); e.target.y(ny);
                  }}
                  onDragEnd={(e) => {
                    onUpdateObject(a.id, { endX: snap(e.target.x()), endY: snap(e.target.y()) } as Partial<CanvasObject>);
                    e.target.x(snap(e.target.x())); e.target.y(snap(e.target.y()));
                  }}
                />
              </>
            );
          })()}

          {/* Curved endpoint handles — 3 draggable circles when curved line selected:
              start, end, and control point. Cyan color matches the curved-line brand colour. */}
          {selectedObj && selectedObj.type === 'curved' && !isLocked && selectedIds.length <= 1 && !drawTool && (() => {
            const c = selectedObj as CurvedLineObject;
            const HANDLE_R = 7;
            const CP_HANDLE_R = 6;
            return (
              <>
                {/* Tether lines from endpoints to control point — show the curve's geometry */}
                <KonvaLine
                  points={[c.startX, c.startY, c.cpX, c.cpY, c.endX, c.endY]}
                  stroke="rgba(0,184,212,0.3)" strokeWidth={1} dash={[4, 4]} listening={false}
                />
                {/* Start handle */}
                <Circle key="ep-curved-start" id="ep-curved-start" x={c.startX} y={c.startY} radius={HANDLE_R}
                  fill="#00b8d4" stroke="#0e7490" strokeWidth={1.5}
                  hitStrokeWidth={14}
                  draggable
                  onMouseDown={(e) => { e.cancelBubble = true; }}
                  onDragMove={(e) => {
                    const nx = snap(e.target.x()); const ny = snap(e.target.y());
                    e.target.x(nx); e.target.y(ny);
                  }}
                  onDragEnd={(e) => {
                    onUpdateObject(c.id, { startX: snap(e.target.x()), startY: snap(e.target.y()) } as Partial<CanvasObject>);
                    e.target.x(snap(e.target.x())); e.target.y(snap(e.target.y()));
                  }}
                />
                {/* End handle */}
                <Circle key="ep-curved-end" id="ep-curved-end" x={c.endX} y={c.endY} radius={HANDLE_R}
                  fill="#00b8d4" stroke="#0e7490" strokeWidth={1.5}
                  hitStrokeWidth={14}
                  draggable
                  onMouseDown={(e) => { e.cancelBubble = true; }}
                  onDragMove={(e) => {
                    const nx = snap(e.target.x()); const ny = snap(e.target.y());
                    e.target.x(nx); e.target.y(ny);
                  }}
                  onDragEnd={(e) => {
                    onUpdateObject(c.id, { endX: snap(e.target.x()), endY: snap(e.target.y()) } as Partial<CanvasObject>);
                    e.target.x(snap(e.target.x())); e.target.y(snap(e.target.y()));
                  }}
                />
                {/* Control point handle — slightly smaller and hollow so it reads as "different" */}
                <Circle key="ep-curved-cp" id="ep-curved-cp" x={c.cpX} y={c.cpY} radius={CP_HANDLE_R}
                  fill="white" stroke="#00b8d4" strokeWidth={2}
                  hitStrokeWidth={14}
                  draggable
                  onMouseDown={(e) => { e.cancelBubble = true; }}
                  onDragMove={(e) => {
                    const nx = snap(e.target.x()); const ny = snap(e.target.y());
                    e.target.x(nx); e.target.y(ny);
                  }}
                  onDragEnd={(e) => {
                    onUpdateObject(c.id, { cpX: snap(e.target.x()), cpY: snap(e.target.y()) } as Partial<CanvasObject>);
                    e.target.x(snap(e.target.x())); e.target.y(snap(e.target.y()));
                  }}
                />
              </>
            );
          })()}

          <Transformer
            ref={trRef}
            enabledAnchors={
              resizableAll
                ? ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']
                : resizableCircle
                ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                : []
            }
            rotateEnabled={!!rotatable}
            keepRatio={!!(selectedObj && ['cone', 'ball', 'circle'].includes(selectedObj.type))}
            rotationSnaps={shiftHeld ? Array.from({ length: 24 }, (_, i) => i * 15) : []}
            rotationSnapTolerance={shiftHeld ? 8 : 0}
            borderStroke="#fbbf24" borderStrokeWidth={2}
            anchorFill="#fbbf24" anchorStroke="#92400e" anchorSize={8}
          />
        </Layer>
      </Stage>
      {editingTextId && (
        <textarea
          ref={textareaRef}
          value={editingValue}
          rows={3}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={finishTextEdit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setEditingTextId(null); }
            else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finishTextEdit(); }
          }}
          style={textareaStyle}
        />
      )}
    </div>
  );
}
