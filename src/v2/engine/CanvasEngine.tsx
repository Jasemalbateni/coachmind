'use client';
import { useRef, useState, useCallback } from 'react';
import { Stage } from 'react-konva';
import type Konva from 'konva';
import { useEditorStore } from '../store/editorStore';
import { PitchLayer } from './layers/PitchLayer';
import { ObjectLayer } from './layers/ObjectLayer';
import { SelectionLayer } from './layers/SelectionLayer';
import { GhostLayer } from './layers/GhostLayer';
import { useEditorKeyboard } from '../hooks/useEditorKeyboard';
import {
  createPlayer, createCone, createBall, createGoal,
  createArrow, createZone, createRect, createCircle,
  createText, createSmartConeArea,
} from '../lib/objectFactory';

interface Props {
  width: number;
  height: number;
}

interface ArrowStartState {
  x: number;
  y: number;
}

interface AreaStartState {
  x: number;
  y: number;
}

const ARROW_TOOLS = new Set(['draw-pass', 'draw-run', 'draw-dribble', 'draw-press', 'draw-support']);
const AREA_TOOLS = new Set(['draw-zone', 'draw-rect', 'draw-circle', 'draw-smart-cone-area']);
const PLACE_TOOLS = new Set(['place-player-a', 'place-player-b', 'place-cone', 'place-ball', 'place-goal', 'draw-text']);

const TOOL_TACTIC: Record<string, string> = {
  'draw-pass': 'pass',
  'draw-run': 'run',
  'draw-dribble': 'dribble',
  'draw-press': 'press',
  'draw-support': 'support',
};

export function CanvasEngine({ width, height }: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const arrowStart = useRef<ArrowStartState | null>(null);
  const areaStart = useRef<AreaStartState | null>(null);
  const isAreaDragging = useRef(false);

  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);

  useEditorKeyboard();

  const activeTool = useEditorStore(s => s.activeTool);
  const pitch = useEditorStore(s => s.pitch);
  const zoom = useEditorStore(s => s.zoom);
  const panX = useEditorStore(s => s.panX);
  const panY = useEditorStore(s => s.panY);
  const setZoom = useEditorStore(s => s.setZoom);
  const setPan = useEditorStore(s => s.setPan);
  const clearSelection = useEditorStore(s => s.clearSelection);
  const addObject = useEditorStore(s => s.addObject);
  const setActiveTool = useEditorStore(s => s.setActiveTool);
  const setGhostPreview = useEditorStore(s => s.setGhostPreview);
  const getObjectsInOrder = useEditorStore(s => s.getObjectsInOrder);
  const setSelection = useEditorStore(s => s.setSelection);
  const snapToGrid = useEditorStore(s => s.snapToGrid);
  const gridSize = useEditorStore(s => s.gridSize);

  const snapCoord = useCallback((val: number) => {
    if (!snapToGrid) return val;
    return Math.round(val / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.container().getBoundingClientRect();
    const x = (clientX - rect.left - panX) / zoom;
    const y = (clientY - rect.top - panY) / zoom;
    return { x: snapCoord(x), y: snapCoord(y) };
  }, [zoom, panX, panY, snapCoord]);

  const getStagePos = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.container().getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.08;
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - panX) / oldScale,
      y: (pointer.y - panY) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.min(4, Math.max(0.25, newScale));

    const newPanX = pointer.x - mousePointTo.x * clampedScale;
    const newPanY = pointer.y - mousePointTo.y * clampedScale;

    setZoom(clampedScale);
    setPan(newPanX, newPanY);
  }, [zoom, panX, panY, setZoom, setPan]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnStage = e.target === e.target.getStage();
    if (!clickedOnStage) return;

    const pos = getCanvasPos(e.evt.clientX, e.evt.clientY);

    if (activeTool === 'select') {
      clearSelection();
      return;
    }

    if (PLACE_TOOLS.has(activeTool)) {
      let obj;
      if (activeTool === 'place-player-a') {
        obj = createPlayer(pos.x, pos.y, '', 'A');
      } else if (activeTool === 'place-player-b') {
        obj = createPlayer(pos.x, pos.y, '', 'B');
      } else if (activeTool === 'place-cone') {
        obj = createCone(pos.x, pos.y);
      } else if (activeTool === 'place-ball') {
        obj = createBall(pos.x, pos.y);
      } else if (activeTool === 'place-goal') {
        obj = createGoal(pos.x, pos.y);
      } else if (activeTool === 'draw-text') {
        obj = createText(pos.x, pos.y);
      }
      if (obj) {
        addObject(obj);
      }
      return;
    }

    if (ARROW_TOOLS.has(activeTool)) {
      if (!arrowStart.current) {
        arrowStart.current = { x: pos.x, y: pos.y };
        setGhostPreview({ kind: 'line', startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
      } else {
        const start = arrowStart.current;
        arrowStart.current = null;
        setGhostPreview(null);
        const tacticType = TOOL_TACTIC[activeTool] as 'pass' | 'run' | 'dribble' | 'press' | 'support';
        const arrow = createArrow(start.x, start.y, pos.x, pos.y, { tacticType });
        addObject(arrow);
        setActiveTool('select');
      }
    }
  }, [activeTool, getCanvasPos, clearSelection, addObject, setActiveTool, setGhostPreview]);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnStage = e.target === e.target.getStage();
    if (!clickedOnStage) return;

    const pos = getCanvasPos(e.evt.clientX, e.evt.clientY);
    const stagePos = getStagePos(e.evt.clientX, e.evt.clientY);

    if (AREA_TOOLS.has(activeTool)) {
      areaStart.current = { x: pos.x, y: pos.y };
      isAreaDragging.current = true;
      setGhostPreview({ kind: 'area', x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }

    if (activeTool === 'select') {
      marqueeStart.current = stagePos;
    }
  }, [activeTool, getCanvasPos, getStagePos, setGhostPreview]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getCanvasPos(e.evt.clientX, e.evt.clientY);
    const stagePos = getStagePos(e.evt.clientX, e.evt.clientY);

    // Update ghost for arrows
    if (ARROW_TOOLS.has(activeTool) && arrowStart.current) {
      setGhostPreview({
        kind: 'line',
        startX: arrowStart.current.x,
        startY: arrowStart.current.y,
        endX: pos.x,
        endY: pos.y,
      });
      return;
    }

    // Update ghost for place tools
    if (PLACE_TOOLS.has(activeTool)) {
      setGhostPreview({ kind: 'point', x: pos.x, y: pos.y, objectType: activeTool });
      return;
    }

    // Update ghost area
    if (AREA_TOOLS.has(activeTool) && isAreaDragging.current && areaStart.current) {
      const x = Math.min(areaStart.current.x, pos.x);
      const y = Math.min(areaStart.current.y, pos.y);
      const w = Math.abs(pos.x - areaStart.current.x);
      const h = Math.abs(pos.y - areaStart.current.y);
      setGhostPreview({ kind: 'area', x, y, width: w, height: h });
      return;
    }

    // Marquee selection
    if (activeTool === 'select' && marqueeStart.current) {
      const mx = Math.min(marqueeStart.current.x, stagePos.x);
      const my = Math.min(marqueeStart.current.y, stagePos.y);
      const mw = Math.abs(stagePos.x - marqueeStart.current.x);
      const mh = Math.abs(stagePos.y - marqueeStart.current.y);
      if (mw > 5 || mh > 5) {
        setMarquee({ x: mx, y: my, width: mw, height: mh });
      }
    }
  }, [activeTool, getCanvasPos, getStagePos, setGhostPreview]);

  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getCanvasPos(e.evt.clientX, e.evt.clientY);

    if (AREA_TOOLS.has(activeTool) && isAreaDragging.current && areaStart.current) {
      isAreaDragging.current = false;
      const start = areaStart.current;
      areaStart.current = null;
      setGhostPreview(null);

      const x = Math.min(start.x, pos.x);
      const y = Math.min(start.y, pos.y);
      const w = Math.abs(pos.x - start.x);
      const h = Math.abs(pos.y - start.y);

      if (w < 10 || h < 10) return;

      let obj;
      if (activeTool === 'draw-zone') obj = createZone(x, y, w, h);
      else if (activeTool === 'draw-rect') obj = createRect(x, y, w, h);
      else if (activeTool === 'draw-circle') obj = createCircle(x + w/2, y + h/2, Math.min(w, h) / 2);
      else if (activeTool === 'draw-smart-cone-area') obj = createSmartConeArea(x, y, w, h);

      if (obj) {
        addObject(obj);
        setActiveTool('select');
      }
      return;
    }

    // Marquee selection finalise
    if (activeTool === 'select' && marquee) {
      const stagePos = getStagePos(e.evt.clientX, e.evt.clientY);
      // Convert marquee back to canvas coords
      const mx1 = (marquee.x - panX) / zoom;
      const my1 = (marquee.y - panY) / zoom;
      const mx2 = mx1 + marquee.width / zoom;
      const my2 = my1 + marquee.height / zoom;

      const inMarquee = getObjectsInOrder().filter(obj => {
        if (!('x' in obj)) return false;
        const o = obj as { x: number; y: number };
        return o.x >= mx1 && o.x <= mx2 && o.y >= my1 && o.y <= my2;
      });

      if (inMarquee.length > 0) {
        setSelection(inMarquee.map(o => o.id));
      }
      setMarquee(null);
      marqueeStart.current = null;
    }
  }, [activeTool, getCanvasPos, getStagePos, setGhostPreview, addObject, setActiveTool, marquee, getObjectsInOrder, setSelection, panX, panY, zoom]);

  const cursor = (() => {
    if (activeTool === 'pan') return 'grab';
    if (activeTool === 'select') return 'default';
    if (PLACE_TOOLS.has(activeTool)) return 'crosshair';
    if (ARROW_TOOLS.has(activeTool)) return 'crosshair';
    if (AREA_TOOLS.has(activeTool)) return 'crosshair';
    return 'default';
  })();

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={zoom}
      scaleY={zoom}
      x={panX}
      y={panY}
      style={{ cursor, display: 'block' }}
      onClick={handleStageClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      <PitchLayer pitch={pitch} />
      <ObjectLayer />
      <GhostLayer />
      <SelectionLayer stageRef={stageRef} marquee={marquee} />
    </Stage>
  );
}
