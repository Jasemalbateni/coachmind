'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type Konva from 'konva';
import { useDrillsStore } from '@/store/drillsStore';
import { useTeamsStore } from '@/store/teamsStore';
import type {
  CanvasObject, PlayerObject, ConeObject, BallObject, GoalObject, ZoneObject,
  ArrowObject, CircleShapeObject, RectangleObject, LineObject, CurvedLineObject, LinkObject, FocusZoneObject, SmartConeAreaObject, TextObject, Drill, TacticType, DrillStep, GroupObject,
} from '@/types';
import type { DrawTool } from './PitchCanvas';
import type { AlignType } from './InspectorPanel';
import DrillEditorTopBar from './DrillEditorTopBar';
import PaletteSidebar from './PaletteSidebar';
import InspectorPanel from './InspectorPanel';
import DrillMetaPanel from './DrillMetaPanel';
import PlayerDock from './PlayerDock';
import FormationPicker from './FormationPicker';

const PitchCanvas = dynamic(() => import('./PitchCanvas'), { ssr: false });

interface Props { drillId: string; }

type TacticConfig = {
  color: string;
  style: 'solid' | 'dashed';
  headStyle: 'filled' | 'open';
  tacticType: TacticType;
  isLine?: boolean;
  arrowShape?: 'zigzag';
};
const TACTIC_CONFIGS: Record<string, TacticConfig> = {
  'tac-run':      { color: '#fbbf24', style: 'solid',  headStyle: 'filled', tacticType: 'run' },
  'tac-pass':     { color: '#ffffff', style: 'dashed', headStyle: 'open',   tacticType: 'pass' },
  'tac-dribble':  { color: '#f97316', style: 'solid',  headStyle: 'filled', tacticType: 'dribble' },
  'tac-press':    { color: '#ef4444', style: 'dashed', headStyle: 'filled', tacticType: 'press' },
  'tac-support':  { color: '#22c55e', style: 'dashed', headStyle: 'open',   tacticType: 'support' },
  'tac-lane':     { color: '#3b82f6', style: 'dashed', headStyle: 'open',   tacticType: 'lane',    isLine: true },
  'tac-defline':  { color: '#8b5cf6', style: 'solid',  headStyle: 'open',   tacticType: 'defline', isLine: true },
  // Smart Arrows — visually distinct by color + line style/shape
  'smart-pass':    { color: '#3B82F6', style: 'solid',  headStyle: 'filled', tacticType: 'pass' },
  'smart-dribble': { color: '#F59E0B', style: 'solid',  headStyle: 'filled', tacticType: 'dribble', arrowShape: 'zigzag' },
  'smart-run':     { color: '#22C55E', style: 'dashed', headStyle: 'filled', tacticType: 'run' },
};

const SIM_DURATION = 1800; // ms

/** Maps a canvas object back to the tool-family key used when creating it */
function getObjectToolFamily(obj: CanvasObject): string | null {
  if (obj.type === 'arrow') {
    const a = obj as ArrowObject;
    const tt = a.tacticType;
    if (a.arrowShape === 'zigzag') return 'smart-dribble';
    if (tt === 'pass' && a.color === '#3B82F6') return 'smart-pass';
    if (tt === 'run' && a.color === '#22C55E') return 'smart-run';
    if (tt) {
      const entry = Object.entries(TACTIC_CONFIGS).find(([, v]) => v.tacticType === tt && !v.isLine);
      if (entry) return entry[0];
    }
    return 'arrow';
  }
  if (obj.type === 'line') {
    const l = obj as LineObject;
    if (l.tacticType) {
      const entry = Object.entries(TACTIC_CONFIGS).find(([, v]) => v.tacticType === l.tacticType && v.isLine);
      if (entry) return entry[0];
    }
    return 'line';
  }
  return null;
}

export default function DrillEditorPage({ drillId }: Props) {
  const router = useRouter();
  const {
    drills, seedIfEmpty, updateDrill, addObject, updateObject, deleteObject, setObjects,
    addDrillStep, setStepObjects, removeDrillStep, updateDrillStepLabel,
  } = useDrillsStore();
  const { teams, seedIfEmpty: seedTeams, updateTeam } = useTeamsStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  const [drawTool, setDrawTool] = useState<DrawTool>(null);
  const [drawFirstPoint, setDrawFirstPoint] = useState<{ x: number; y: number } | null>(null);
  const [drawSecondPoint, setDrawSecondPoint] = useState<{ x: number; y: number } | null>(null);
  const [linkFromId, setLinkFromId] = useState<string | null>(null);
  // Per-tool style memory: maps tool-family key → last-used style properties
  const [toolDefaults, setToolDefaults] = useState<Record<string, Record<string, unknown>>>({});

  const [zoom, setZoom] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [playerDockOpen, setPlayerDockOpen] = useState(true);
  const [showFormation, setShowFormation] = useState(false);
  const [formationInitialSide, setFormationInitialSide] = useState<'A' | 'B'>('A');

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showDrillInfo, setShowDrillInfo] = useState(false);
  const [undoStack, setUndoStack] = useState<CanvasObject[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasObject[][]>([]);
  const [clipboardItems, setClipboardItems] = useState<CanvasObject[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; objectId: string } | null>(null);

  // ─── Step management ────────────────────────────────────────────────────────
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const stageRef = useRef<Konva.Stage>(null);
  // Tracks the last key + timestamp for double-key shortcuts (e.g. RR = Run)
  const lastKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });

  // ─── Play simulation ─────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [simPositions, setSimPositions] = useState<Record<string, { x: number; y: number }>>({});
  const simFrameRef = useRef<number | null>(null);
  const simStartRef = useRef<number>(0);

  useEffect(() => { seedIfEmpty(); seedTeams(); }, [seedIfEmpty, seedTeams]);

  const drill = drills[drillId];
  const linkedTeam = drill?.teamId ? (teams[drill.teamId] ?? null) : null;

  useEffect(() => {
    const t = setTimeout(() => { if (!drills[drillId]) router.push('/drills'); }, 1000);
    return () => clearTimeout(t);
  }, [drillId, drills, router]);

  useEffect(() => {
    if (!drill) return;
    setSaveStatus('saving');
    const t = setTimeout(() => setSaveStatus('saved'), 600);
    return () => clearTimeout(t);
  }, [drill]);

  // ─── Active step objects ──────────────────────────────────────────────────────
  const activeObjects = useMemo(() => {
    if (!drill) return [];
    if (!activeStepId) return drill.objects;
    return drill.steps?.find((s) => s.id === activeStepId)?.objects ?? drill.objects;
  }, [drill, activeStepId]);

  const usedNumbers = useMemo(() => {
    const s = new Set<string>();
    activeObjects.forEach((o) => {
      if (o.type === 'player') {
        const p = o as PlayerObject;
        if (p.number) s.add(`${p.team === 'A' ? 'A' : 'B'}-${p.number}`);
      }
    });
    return s;
  }, [activeObjects]);

  // Virtual drill for PitchCanvas (uses active step objects)
  const activeDrill = useMemo(() => {
    if (!drill || !activeStepId) return drill;
    return { ...drill, objects: activeObjects };
  }, [drill, activeStepId, activeObjects]);

  // Step-aware store wrappers
  const stepAddObject = useCallback((drId: string, obj: CanvasObject) => {
    if (activeStepId && drill) {
      const step = drill.steps?.find((s) => s.id === activeStepId);
      if (step) { setStepObjects(drId, activeStepId, [...step.objects, obj]); return; }
    }
    addObject(drId, obj);
  }, [activeStepId, drill, addObject, setStepObjects]);

  const stepUpdateObject = useCallback((drId: string, objId: string, updates: Partial<CanvasObject>) => {
    if (activeStepId && drill) {
      const step = drill.steps?.find((s) => s.id === activeStepId);
      if (step) {
        const newObjs = step.objects.map((o) => o.id === objId ? { ...o, ...updates } as CanvasObject : o);
        setStepObjects(drId, activeStepId, newObjs);
        return;
      }
    }
    updateObject(drId, objId, updates);
  }, [activeStepId, drill, updateObject, setStepObjects]);

  const stepDeleteObject = useCallback((drId: string, objId: string) => {
    if (activeStepId && drill) {
      const step = drill.steps?.find((s) => s.id === activeStepId);
      if (step) { setStepObjects(drId, activeStepId, step.objects.filter((o) => o.id !== objId)); return; }
    }
    deleteObject(drId, objId);
  }, [activeStepId, drill, deleteObject, setStepObjects]);

  const stepSetObjects = useCallback((drId: string, objects: CanvasObject[]) => {
    if (activeStepId) { setStepObjects(drId, activeStepId, objects); return; }
    setObjects(drId, objects);
  }, [activeStepId, setObjects, setStepObjects]);

  const switchStep = useCallback((stepId: string | null) => {
    setActiveStepId(stepId);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedId(null);
    setSelectedIds([]);
  }, []);

  const handleAddStep = useCallback(() => {
    if (!drill) return;
    const stepCount = (drill.steps?.length ?? 0) + 1;
    // Auto-clone base objects into the new step
    const clonedObjects = drill.objects.map((o) => ({ ...o, id: crypto.randomUUID() }));
    const step: DrillStep = {
      id: crypto.randomUUID(),
      label: stepCount === 1 ? 'Progression' : stepCount === 2 ? 'Regression' : `Step ${stepCount}`,
      objects: clonedObjects,
    };
    addDrillStep(drillId, step);
    switchStep(step.id);
  }, [drill, drillId, addDrillStep, switchStep]);

  const handleCloneFromBase = useCallback(() => {
    if (!drill || !activeStepId) return;
    const cloned = drill.objects.map((o) => ({ ...o, id: crypto.randomUUID() }));
    setStepObjects(drillId, activeStepId, cloned);
  }, [drill, drillId, activeStepId, setStepObjects]);

  const handleRemoveStep = useCallback((stepId: string) => {
    removeDrillStep(drillId, stepId);
    if (activeStepId === stepId) switchStep(null);
  }, [drillId, removeDrillStep, activeStepId, switchStep]);

  // ─── Team color inheritance sync ─────────────────────────────────────────────
  const teamColorKey = linkedTeam
    ? `${linkedTeam.primaryColor}|${linkedTeam.opponentPrimaryColor ?? ''}|${linkedTeam.primaryStrokeColor ?? ''}|${linkedTeam.opponentStrokeColor ?? ''}|${linkedTeam.primaryNumberColor ?? ''}|${linkedTeam.opponentNumberColor ?? ''}`
    : '';

  useEffect(() => {
    if (!drill || !linkedTeam || !teamColorKey) return;
    const toUpdate = (drill.objects as CanvasObject[]).filter(
      (o): o is PlayerObject => o.type === 'player' && (o as PlayerObject).teamColorInherited === true
    );
    for (const p of toUpdate) {
      const isA = p.team === 'A';
      const newColor = isA ? linkedTeam.primaryColor : (linkedTeam.opponentPrimaryColor ?? '#ef4444');
      const newStroke = isA ? linkedTeam.primaryStrokeColor : linkedTeam.opponentStrokeColor;
      const newNumberColor = isA ? linkedTeam.primaryNumberColor : linkedTeam.opponentNumberColor;
      const upd: Partial<PlayerObject> = {};
      if (p.color !== newColor) upd.color = newColor;
      if (newStroke !== undefined && p.strokeColor !== newStroke) upd.strokeColor = newStroke;
      if (newNumberColor !== undefined && p.numberColor !== newNumberColor) upd.numberColor = newNumberColor;
      if (Object.keys(upd).length > 0) updateObject(drillId, p.id, upd as Partial<CanvasObject>);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamColorKey, drillId]);

  // ─── Undo/Redo ────────────────────────────────────────────────────────────────

  const pushUndo = useCallback(() => {
    const current = [...activeObjects];
    setUndoStack((prev) => [...prev.slice(-30), current]);
    setRedoStack([]);
  }, [activeObjects]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const current = [...activeObjects];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, current]);
    stepSetObjects(drillId, prev);
    setSelectedId(null);
    setSelectedIds([]);
  }, [undoStack, activeObjects, drillId, stepSetObjects]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = [...activeObjects];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, current]);
    stepSetObjects(drillId, next);
    setSelectedId(null);
    setSelectedIds([]);
  }, [redoStack, activeObjects, drillId, stepSetObjects]);

  // ─── Object actions ───────────────────────────────────────────────────────────

  const withUndo = useCallback((action: () => void) => {
    pushUndo();
    action();
  }, [pushUndo]);

  const handleUpdateObject = useCallback((id: string, updates: Partial<CanvasObject>) => {
    stepUpdateObject(drillId, id, updates);

    if (!drill) return;
    const obj = activeObjects.find((o) => o.id === id);

    // Track style changes for tool-style persistence
    if (obj) {
      const family = getObjectToolFamily(obj);
      if (family) {
        const styleKeys = ['color', 'style', 'strokeWidth', 'headStyle', 'dashed', 'overlayOpacity',
                           'coneColor', 'extraConesPerSide', 'showBorder', 'borderColor', 'borderDashed'];
        const styleUpdates: Record<string, unknown> = {};
        for (const k of styleKeys) {
          if (k in updates) styleUpdates[k] = (updates as Record<string, unknown>)[k];
        }
        if (Object.keys(styleUpdates).length > 0) {
          setToolDefaults((prev) => ({ ...prev, [family]: { ...(prev[family] ?? {}), ...styleUpdates } }));
        }
      }
    }

    if (obj?.type !== 'player') return;

    const pUpdate = updates as Partial<PlayerObject>;
    if (pUpdate.teamColorInherited === true) return;

    // Team-wide showNumber sync
    if ('showNumber' in pUpdate) {
      const side = (obj as PlayerObject).team ?? 'A';
      activeObjects
        .filter((o): o is PlayerObject => o.type === 'player' && (o as PlayerObject).team === side && o.id !== id)
        .forEach((p) => stepUpdateObject(drillId, p.id, { showNumber: pUpdate.showNumber } as Partial<CanvasObject>));
      return;
    }

    const hasColor = 'color' in pUpdate;
    const hasStroke = 'strokeColor' in pUpdate;
    const hasNumberColor = 'numberColor' in pUpdate;
    if (!hasColor && !hasStroke && !hasNumberColor) return;

    const side = (obj as PlayerObject).team ?? 'A';
    const propagated: Partial<PlayerObject> = {};
    if (hasColor) { propagated.color = pUpdate.color; propagated.teamColorInherited = false; }
    if (hasStroke) { propagated.strokeColor = pUpdate.strokeColor; }
    if (hasNumberColor) { propagated.numberColor = pUpdate.numberColor; }

    // Apply color change to all same-team players in this step
    activeObjects
      .filter((o): o is PlayerObject => o.type === 'player' && (o as PlayerObject).team === side && o.id !== id)
      .forEach((p) => stepUpdateObject(drillId, p.id, propagated as Partial<CanvasObject>));

    // Persist to team store
    if (linkedTeam) {
      if (hasColor && pUpdate.color) {
        if (side === 'A') updateTeam(linkedTeam.id, { primaryColor: pUpdate.color });
        else updateTeam(linkedTeam.id, { opponentPrimaryColor: pUpdate.color });
      }
      if (hasStroke && pUpdate.strokeColor) {
        if (side === 'A') updateTeam(linkedTeam.id, { primaryStrokeColor: pUpdate.strokeColor });
        else updateTeam(linkedTeam.id, { opponentStrokeColor: pUpdate.strokeColor });
      }
      if (hasNumberColor && pUpdate.numberColor) {
        if (side === 'A') updateTeam(linkedTeam.id, { primaryNumberColor: pUpdate.numberColor });
        else updateTeam(linkedTeam.id, { opponentNumberColor: pUpdate.numberColor });
      }
    }
  }, [drillId, stepUpdateObject, drill, activeObjects, linkedTeam, updateTeam]);

  const handleAddObject = useCallback((obj: CanvasObject) => {
    withUndo(() => { stepAddObject(drillId, obj); });
    setSelectedId(obj.id);
    setSelectedIds([obj.id]);
  }, [drillId, stepAddObject, withUndo]);

  const handleDeleteObject = useCallback((id: string) => {
    withUndo(() => { stepDeleteObject(drillId, id); });
    setSelectedId(null);
    setSelectedIds([]);
  }, [drillId, stepDeleteObject, withUndo]);

  const handleDeleteSelected = useCallback(() => {
    const ids = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    if (ids.length === 0) return;
    withUndo(() => { ids.forEach((id) => stepDeleteObject(drillId, id)); });
    setSelectedId(null);
    setSelectedIds([]);
  }, [selectedId, selectedIds, drillId, stepDeleteObject, withUndo]);

  const handleDuplicate = useCallback(() => {
    if (!activeDrill) return;
    const ids = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    if (ids.length === 0) return;
    const newIds: string[] = [];
    withUndo(() => {
      for (const id of ids) {
        const obj = activeObjects.find((o) => o.id === id);
        if (!obj) continue;
        const newId = crypto.randomUUID();
        newIds.push(newId);
        const copy = { ...obj, id: newId } as CanvasObject;
        if ('x' in copy) { (copy as PlayerObject).x += 10; (copy as PlayerObject).y += 10; }
        if ('startX' in copy) {
          (copy as ArrowObject).startX += 10; (copy as ArrowObject).startY += 10;
          (copy as ArrowObject).endX += 10; (copy as ArrowObject).endY += 10;
          // Don't copy player connections — duplicate is a new independent arrow
          delete (copy as ArrowObject).startPlayerId;
          delete (copy as ArrowObject).endPlayerId;
        }
        stepAddObject(drillId, copy);
      }
    });
    setSelectedId(newIds[newIds.length - 1] ?? null);
    setSelectedIds(newIds);
  }, [selectedId, selectedIds, activeDrill, activeObjects, drillId, stepAddObject, withUndo]);

  // ─── Layer ordering ───────────────────────────────────────────────────────────
  const handleLayerReorder = useCallback((id: string, action: 'toFront' | 'toBack' | 'forward' | 'backward') => {
    const objs = [...activeObjects];
    const idx = objs.findIndex((o) => o.id === id);
    if (idx < 0) return;
    const [item] = objs.splice(idx, 1);
    if (action === 'toFront') objs.push(item);
    else if (action === 'toBack') objs.unshift(item);
    else if (action === 'forward') objs.splice(Math.min(idx + 1, objs.length), 0, item);
    else objs.splice(Math.max(idx - 1, 0), 0, item);
    withUndo(() => stepSetObjects(drillId, objs));
    setContextMenu(null);
  }, [activeObjects, drillId, stepSetObjects, withUndo]);

  // ─── Group / Ungroup ─────────────────────────────────────────────────────────
  const handleGroup = useCallback(() => {
    const ids = selectedIds.length > 1 ? selectedIds : [];
    if (ids.length < 2) return;
    const members = ids.map((id) => activeObjects.find((o) => o.id === id)).filter(Boolean) as CanvasObject[];
    if (members.length < 2) return;
    // Compute group origin as bounding box top-left of all members
    const xs = members.map((o) => ('x' in o ? (o as PlayerObject).x : ('startX' in o ? (o as ArrowObject).startX : 0)));
    const ys = members.map((o) => ('y' in o ? (o as PlayerObject).y : ('startY' in o ? (o as ArrowObject).startY : 0)));
    const gx = Math.min(...xs);
    const gy = Math.min(...ys);
    const children = members.map((o) => {
      if ('x' in o) return { ...o, x: (o as PlayerObject).x - gx, y: (o as PlayerObject).y - gy };
      if ('startX' in o) {
        const a = o as ArrowObject;
        return { ...a, startX: a.startX - gx, startY: a.startY - gy, endX: a.endX - gx, endY: a.endY - gy };
      }
      return o;
    }) as CanvasObject[];
    const group: GroupObject = { id: crypto.randomUUID(), type: 'group', x: gx, y: gy, children };
    withUndo(() => {
      const remaining = activeObjects.filter((o) => !ids.includes(o.id));
      stepSetObjects(drillId, [...remaining, group]);
    });
    setSelectedId(group.id);
    setSelectedIds([group.id]);
    setContextMenu(null);
  }, [selectedIds, activeObjects, drillId, stepSetObjects, withUndo]);

  const handleUngroup = useCallback((id?: string) => {
    const targetId = id ?? selectedId;
    if (!targetId) return;
    const group = activeObjects.find((o) => o.id === targetId) as GroupObject | undefined;
    if (!group || group.type !== 'group') return;
    const ungrouped = group.children.map((child) => {
      if ('x' in child) return { ...child, id: crypto.randomUUID(), x: (child as PlayerObject).x + group.x, y: (child as PlayerObject).y + group.y };
      if ('startX' in child) {
        const a = child as ArrowObject;
        return { ...a, id: crypto.randomUUID(), startX: a.startX + group.x, startY: a.startY + group.y, endX: a.endX + group.x, endY: a.endY + group.y };
      }
      return { ...child, id: crypto.randomUUID() };
    }) as CanvasObject[];
    withUndo(() => {
      const remaining = activeObjects.filter((o) => o.id !== targetId);
      stepSetObjects(drillId, [...remaining, ...ungrouped]);
    });
    const newIds = ungrouped.map((o) => o.id);
    setSelectedId(newIds[newIds.length - 1] ?? null);
    setSelectedIds(newIds);
    setContextMenu(null);
  }, [selectedId, activeObjects, drillId, stepSetObjects, withUndo]);

  // ─── Alt+Drag copy ────────────────────────────────────────────────────────────
  const handleAltDragCopy = useCallback((original: CanvasObject, newPos: { x?: number; y?: number; startX?: number; startY?: number; endX?: number; endY?: number }) => {
    const copy: CanvasObject = { ...original, id: crypto.randomUUID(), ...newPos } as CanvasObject;
    withUndo(() => { stepAddObject(drillId, copy); });
    setSelectedId(copy.id);
    setSelectedIds([copy.id]);
  }, [drillId, stepAddObject, withUndo]);

  const handleUpdateDrill = useCallback((updates: Partial<Drill>) => {
    updateDrill(drillId, updates);
  }, [drillId, updateDrill]);

  // ─── Selection ────────────────────────────────────────────────────────────────

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
    setSelectedIds(id ? [id] : []);
  }, []);

  const handleMultiSelect = useCallback((id: string) => {
    const current = selectedIdsRef.current;
    if (current.includes(id)) {
      const next = current.filter((x) => x !== id);
      setSelectedIds(next);
      setSelectedId(next[next.length - 1] ?? null);
    } else {
      const next = [...current, id];
      setSelectedIds(next);
      setSelectedId(id);
    }
  }, []);

  const handleMarqueeSelect = useCallback((ids: string[], additive: boolean) => {
    if (additive) {
      const merged = Array.from(new Set([...selectedIdsRef.current, ...ids]));
      setSelectedIds(merged);
      setSelectedId(merged[merged.length - 1] ?? null);
    } else {
      setSelectedIds(ids);
      setSelectedId(ids[ids.length - 1] ?? null);
    }
  }, []);

  // ─── Align / Distribute ───────────────────────────────────────────────────────

  const handleAlignDistribute = useCallback((type: AlignType) => {
    if (!activeDrill || selectedIds.length < 2) return;
    const posObjs = selectedIds
      .map((id) => activeObjects.find((o) => o.id === id))
      .filter((o): o is CanvasObject & { x: number; y: number } =>
        !!o && 'x' in o && !('locked' in o && (o as PlayerObject).locked)
      );
    if (posObjs.length < 2) return;

    const xs = posObjs.map((o) => o.x);
    const ys = posObjs.map((o) => o.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const avgX = xs.reduce((s, v) => s + v, 0) / xs.length;
    const avgY = ys.reduce((s, v) => s + v, 0) / ys.length;

    withUndo(() => {
      if (type === 'distribute-h' && posObjs.length >= 3) {
        const sorted = [...posObjs].sort((a, b) => a.x - b.x);
        const step = (maxX - minX) / (sorted.length - 1);
        sorted.forEach((o, i) => stepUpdateObject(drillId, o.id, { x: minX + i * step } as Partial<CanvasObject>));
        return;
      }
      if (type === 'distribute-v' && posObjs.length >= 3) {
        const sorted = [...posObjs].sort((a, b) => a.y - b.y);
        const step = (maxY - minY) / (sorted.length - 1);
        sorted.forEach((o, i) => stepUpdateObject(drillId, o.id, { y: minY + i * step } as Partial<CanvasObject>));
        return;
      }

      const newX = type === 'left' ? minX : type === 'center-x' ? avgX : type === 'right' ? maxX : null;
      const newY = type === 'top' ? minY : type === 'center-y' ? avgY : type === 'bottom' ? maxY : null;

      posObjs.forEach((o) => {
        const upd: Partial<CanvasObject> = {};
        if (newX !== null) (upd as Partial<PlayerObject>).x = newX;
        if (newY !== null) (upd as Partial<PlayerObject>).y = newY;
        stepUpdateObject(drillId, o.id, upd);
      });
    });
  }, [activeDrill, selectedIds, activeObjects, drillId, stepUpdateObject, withUndo]);

  // ─── Copy/Paste ───────────────────────────────────────────────────────────────

  const handleCopy = useCallback(() => {
    if (!activeDrill) return;
    const ids = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    const items = ids.map((id) => activeObjects.find((o) => o.id === id)).filter(Boolean) as CanvasObject[];
    if (items.length > 0) setClipboardItems(items);
  }, [selectedId, selectedIds, activeDrill, activeObjects]);

  const handlePaste = useCallback(() => {
    if (clipboardItems.length === 0) return;
    const newIds: string[] = [];
    withUndo(() => {
      for (const item of clipboardItems) {
        const newId = crypto.randomUUID();
        newIds.push(newId);
        const copy = { ...item, id: newId } as CanvasObject;
        if ('x' in copy) { (copy as PlayerObject).x += 30; (copy as PlayerObject).y += 30; }
        if ('startX' in copy) {
          (copy as ArrowObject).startX += 30; (copy as ArrowObject).startY += 30;
          (copy as ArrowObject).endX += 30; (copy as ArrowObject).endY += 30;
          delete (copy as ArrowObject).startPlayerId;
          delete (copy as ArrowObject).endPlayerId;
        }
        stepAddObject(drillId, copy);
      }
    });
    setSelectedId(newIds[newIds.length - 1] ?? null);
    setSelectedIds(newIds);
  }, [clipboardItems, drillId, stepAddObject, withUndo]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement as HTMLElement)?.tagName ?? '')) return;
      if (e.key === 'Escape') {
        setDrawTool(null); setDrawFirstPoint(null); setDrawSecondPoint(null); setLinkFromId(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); handleDuplicate(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); handleCopy(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); handlePaste(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!drawTool && (selectedId || selectedIds.length > 0)) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }

      // Tool shortcuts (no modifier key)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'a' || e.key === 'A') { e.preventDefault(); handleSetDrawTool('arrow'); }
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          const now = Date.now();
          const last = lastKeyRef.current;
          // RR (two R presses within 400ms) → Run (off-ball) tool
          if ((last.key === 'r' || last.key === 'R') && now - last.time < 400) {
            handleSetDrawTool('smart-run');
            lastKeyRef.current = { key: '', time: 0 };
          } else {
            handleSetDrawTool('rect');
            lastKeyRef.current = { key: e.key, time: now };
          }
        }
        if (e.key === 'l' || e.key === 'L') { e.preventDefault(); handleSetDrawTool('line'); }
        if (e.key === 'c' || e.key === 'C') { e.preventDefault(); handleSetDrawTool('circle'); }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); handleSetDrawTool('smart-pass'); }
        if (e.key === 'd' || e.key === 'D') { e.preventDefault(); handleSetDrawTool('smart-dribble'); }
        if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          if (drill) handleAddObject({ id: crypto.randomUUID(), type: 'ball', ...center() } as BallObject);
        }
        if (e.key === 'g') {
          e.preventDefault();
          if (drill) handleAddObject({ id: crypto.randomUUID(), type: 'goal', ...center(), size: 'small' } as GoalObject);
        }
        if (e.key === 'G') {
          e.preventDefault();
          if (drill) handleAddObject({ id: crypto.randomUUID(), type: 'goal', ...center(), size: 'full' } as GoalObject);
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedIds, undoStack, redoStack, clipboardItems, drawTool, drill, activeObjects]);

  // ─── Add helpers ──────────────────────────────────────────────────────────────

  const center = useCallback(() => {
    if (!drill) return { x: 420, y: 270 };
    const j = () => (Math.random() - 0.5) * 40;
    return { x: drill.pitch.width / 2 + j(), y: drill.pitch.height / 2 + j() };
  }, [drill]);

  const handleAddPlayerFromDock = useCallback((playerData: Omit<PlayerObject, 'id'>) => {
    handleAddObject({ id: crypto.randomUUID(), ...playerData } as PlayerObject);
  }, [handleAddObject]);

  const handleRemovePlayerByNumber = useCallback((key: string) => {
    const [team, number] = key.split('-');
    const found = activeObjects.find((o) => o.type === 'player' && (o as PlayerObject).team === team && (o as PlayerObject).number === number);
    if (found) handleDeleteObject(found.id);
  }, [activeObjects, handleDeleteObject]);

  // ─── Formation apply with reuse logic ────────────────────────────────────────

  const handlePlaceFormation = useCallback((players: Omit<PlayerObject, 'id'>[], side: 'A' | 'B') => {
    if (!activeDrill) return;
    const existing = activeObjects.filter(
      (o): o is PlayerObject => o.type === 'player' && (o as PlayerObject).team === side
    );
    withUndo(() => {
      players.forEach((p, i) => {
        if (i < existing.length) {
          stepUpdateObject(drillId, existing[i].id, { x: p.x, y: p.y });
        } else {
          stepAddObject(drillId, { ...p, id: crypto.randomUUID() } as PlayerObject);
        }
      });
    });
  }, [activeDrill, activeObjects, drillId, stepAddObject, stepUpdateObject, withUndo]);

  // ─── Canvas point click handler ───────────────────────────────────────────────

  /**
   * Commits a 2-point shape (arrow / line / rect / circle / focus-zone /
   * smart-cone-area / tactical arrow or line) with explicit start + end.
   * Returns true if a shape was actually added (false = rejected by the
   * tool's minimum-size check). Used by both the click-flow and drag-flow
   * commit handlers so neither path can swap start/end via stale state.
   */
  const commitTwoPointShape = useCallback((tool: DrawTool, start: { x: number; y: number }, end: { x: number; y: number }): boolean => {
    if (!tool) return false;
    const tacticCfg = TACTIC_CONFIGS[tool ?? ''];
    if (tacticCfg) {
      const defs = toolDefaults[tool!] ?? {};
      if (tacticCfg.isLine) {
        const obj: LineObject = {
          id: crypto.randomUUID(), type: 'line',
          startX: start.x, startY: start.y, endX: end.x, endY: end.y,
          color: (defs.color as string) ?? tacticCfg.color,
          strokeWidth: (defs.strokeWidth as number) ?? 2,
          dashed: tacticCfg.style === 'dashed',
          tacticType: tacticCfg.tacticType,
        };
        handleAddObject(obj);
      } else {
        const obj: ArrowObject = {
          id: crypto.randomUUID(), type: 'arrow',
          startX: start.x, startY: start.y, endX: end.x, endY: end.y,
          color: (defs.color as string) ?? tacticCfg.color,
          style: (defs.style as 'solid' | 'dashed') ?? tacticCfg.style,
          headStyle: (defs.headStyle as 'filled' | 'open') ?? tacticCfg.headStyle,
          strokeWidth: (defs.strokeWidth as number) ?? undefined,
          tacticType: tacticCfg.tacticType,
          arrowShape: tacticCfg.arrowShape,
        };
        handleAddObject(obj);
      }
      return true;
    }
    if (tool === 'arrow') {
      const defs = toolDefaults['arrow'] ?? {};
      handleAddObject({
        id: crypto.randomUUID(), type: 'arrow',
        startX: start.x, startY: start.y, endX: end.x, endY: end.y,
        color: (defs.color as string) ?? '#ef4444',
        style: (defs.style as 'solid' | 'dashed') ?? 'solid',
        headStyle: (defs.headStyle as 'filled' | 'open') ?? 'filled',
        strokeWidth: (defs.strokeWidth as number) ?? undefined,
      } as ArrowObject);
      return true;
    }
    if (tool === 'line') {
      const defs = toolDefaults['line'] ?? {};
      handleAddObject({ id: crypto.randomUUID(), type: 'line', startX: start.x, startY: start.y, endX: end.x, endY: end.y,
        color: (defs.color as string) ?? '#ffffff', strokeWidth: (defs.strokeWidth as number) ?? 2 } as LineObject);
      return true;
    }
    if (tool === 'rect') {
      const x = Math.min(start.x, end.x); const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x); const h = Math.abs(end.y - start.y);
      if (w < 5 || h < 5) return false;
      handleAddObject({ id: crypto.randomUUID(), type: 'rectangle', x, y, width: w, height: h, stroke: '#ffffff', strokeWidth: 2 } as RectangleObject);
      return true;
    }
    if (tool === 'circle') {
      const r = Math.hypot(end.x - start.x, end.y - start.y);
      if (r < 5) return false;
      handleAddObject({ id: crypto.randomUUID(), type: 'circle', x: start.x, y: start.y, radius: r, stroke: '#ffffff', strokeWidth: 2 } as CircleShapeObject);
      return true;
    }
    if (tool === 'focus-zone') {
      const x = Math.min(start.x, end.x); const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x); const h = Math.abs(end.y - start.y);
      if (w < 10 || h < 10) return false;
      const defs = toolDefaults['focus-zone'] ?? {};
      handleAddObject({ id: crypto.randomUUID(), type: 'focus-zone', x, y, width: w, height: h,
        overlayOpacity: (defs.overlayOpacity as number) ?? 0.3 } as FocusZoneObject);
      return true;
    }
    if (tool === 'smart-cone-area') {
      const x = Math.min(start.x, end.x); const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x); const h = Math.abs(end.y - start.y);
      if (w < 20 || h < 20) return false;
      const defs = toolDefaults['smart-cone-area'] ?? {};
      handleAddObject({
        id: crypto.randomUUID(), type: 'smart-cone-area', x, y, width: w, height: h,
        coneColor: (defs.coneColor as string) ?? '#f97316',
        extraConesPerSide: (defs.extraConesPerSide as number) ?? 1,
        showBorder: (defs.showBorder as boolean) ?? true,
        borderColor: (defs.borderColor as string) ?? 'rgba(255,255,255,0.35)',
        borderDashed: (defs.borderDashed as boolean) ?? true,
      } as SmartConeAreaObject);
      return true;
    }
    return false;
  }, [handleAddObject, toolDefaults]);

  const handleCanvasPointClick = useCallback((pos: { x: number; y: number }, targetId: string | null) => {
    if (!drawTool) return;

    if (drawTool === 'link') {
      if (!linkFromId) {
        const target = activeObjects.find((o) => o.id === targetId);
        if (target?.type === 'player') { setLinkFromId(targetId); }
        return;
      }
      const target = activeObjects.find((o) => o.id === targetId);
      if (target?.type === 'player' && targetId !== linkFromId) {
        const link: LinkObject = {
          id: crypto.randomUUID(), type: 'link',
          fromPlayerId: linkFromId, toPlayerId: targetId!,
          color: '#ffffff', dashed: false,
        };
        handleAddObject(link);
      }
      setLinkFromId(null);
      setDrawTool(null);
      return;
    }

    // Single-click tools (no drawFirstPoint needed)
    if (drawTool === 'text') {
      handleAddObject({
        id: crypto.randomUUID(), type: 'text',
        x: pos.x, y: pos.y,
        text: 'Text',
        fontSize: 18,
        fontFamily: 'sans-serif',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#ffffff',
        align: 'left',
        showBox: false,
        boxBorderColor: '#ffffff',
        boxBorderWidth: 1.5,
        width: 150,
      } as TextObject);
      setDrawTool(null);
      return;
    }

    if (!drawFirstPoint) {
      setDrawFirstPoint(pos);
      return;
    }

    // For curved line: 3 clicks — start, end, then cursor becomes control point
    if (drawTool === 'curved') {
      if (!drawSecondPoint) {
        // Click 2: set the END point
        setDrawSecondPoint(pos);
        return;
      }
      // Click 3: cursor position = control point, drawSecondPoint = end
      const obj: CurvedLineObject = {
        id: crypto.randomUUID(), type: 'curved',
        startX: drawFirstPoint.x, startY: drawFirstPoint.y,
        cpX: pos.x, cpY: pos.y,
        endX: drawSecondPoint.x, endY: drawSecondPoint.y,
        color: '#00b8d4', strokeWidth: 2.5,
      };
      handleAddObject(obj);
      setDrawFirstPoint(null);
      setDrawSecondPoint(null);
      setDrawTool(null);
      return;
    }

    const start = drawFirstPoint;
    setDrawFirstPoint(null);
    const committed = commitTwoPointShape(drawTool, start, pos);
    if (!committed) {
      // Rejected by minimum-size check — re-arm the first point so the user
      // can try again without losing their first click.
      setDrawFirstPoint(start);
      return;
    }
    setDrawTool(null);
  }, [drawTool, drawFirstPoint, drawSecondPoint, linkFromId, activeObjects, handleAddObject, commitTwoPointShape]);

  /**
   * Drag-flow commit. Always receives the press position as `start` and the
   * release position as `end`. Atomic — never goes through the click
   * state-machine, so there's no risk of start/end being swapped by stale
   * React state. For curved (3-point) it sets points 1+2 and leaves the
   * cursor to place the control point via a final click.
   */
  const handleCanvasDragCommit = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!drawTool) return;
    if (drawTool === 'curved') {
      setDrawFirstPoint(start);
      setDrawSecondPoint(end);
      return;
    }
    const committed = commitTwoPointShape(drawTool, start, end);
    if (!committed) {
      // Below minimum size — re-arm with the press position so the user can
      // continue via click instead of silently losing the gesture.
      setDrawFirstPoint(start);
      return;
    }
    setDrawTool(null);
    setDrawFirstPoint(null);
    setDrawSecondPoint(null);
  }, [drawTool, commitTwoPointShape]);

  const handleSetDrawTool = useCallback((tool: DrawTool) => {
    setDrawTool(tool);
    setDrawFirstPoint(null);
    setDrawSecondPoint(null);
    setLinkFromId(null);
    setSelectedId(null);
    setSelectedIds([]);
  }, []);

  const handleShowFormation = useCallback((side: 'A' | 'B') => {
    setFormationInitialSide(side);
    setShowFormation(true);
  }, []);

  const handleExportPNG = useCallback(() => {
    if (!stageRef.current || !drill) return;
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `${drill.title.replace(/\s+/g, '-')}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [drill]);

  const handleExport4K = useCallback(() => {
    if (!stageRef.current || !drill) return;
    const uri = stageRef.current.toDataURL({ pixelRatio: 4 });
    const link = document.createElement('a');
    link.download = `${drill.title.replace(/\s+/g, '-')}-4k.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [drill]);

  const handleDropAtPoint = useCallback((type: string, data: Record<string, unknown>, pos: { x: number; y: number }) => {
    if (type === 'cone') {
      handleAddObject({ id: crypto.randomUUID(), type: 'cone', ...pos, color: (data.color as string) ?? '#f97316', imageVariant: (data.imageVariant as string) ?? 'cone', size: 16 } as ConeObject);
    } else if (type === 'ball') {
      handleAddObject({ id: crypto.randomUUID(), type: 'ball', ...pos, size: 16 } as BallObject);
    } else if (type === 'goal') {
      const gs = (data.size as 'full' | 'small') ?? 'small';
      handleAddObject({ id: crypto.randomUUID(), type: 'goal', ...pos, size: gs, imgW: gs === 'full' ? 22 : 20, imgH: gs === 'full' ? 52 : 38 } as GoalObject);
    } else if (type === 'zone') {
      handleAddObject({ id: crypto.randomUUID(), type: 'zone', x: pos.x - 80, y: pos.y - 60, width: 160, height: 120, fill: '#8b5cf6', opacity: 0.25, label: 'Zone' } as ZoneObject);
    } else if (type === 'player') {
      const { id: _id, ...rest } = data as Record<string, unknown>;
      void _id;
      handleAddObject({ id: crypto.randomUUID(), ...(rest as Omit<PlayerObject, 'id'>), ...pos } as PlayerObject);
    }
  }, [handleAddObject]);

  // ─── Play simulation ──────────────────────────────────────────────────────────

  const handlePlay = useCallback(() => {
    if (!activeDrill || isPlaying) return;

    // Find player→arrow movement targets
    const targets: { id: string; sx: number; sy: number; ex: number; ey: number }[] = [];
    for (const obj of activeObjects) {
      if (obj.type !== 'arrow') continue;
      const arrow = obj as ArrowObject;
      if (!arrow.startPlayerId) continue;
      const player = activeObjects.find((o) => o.id === arrow.startPlayerId) as PlayerObject | undefined;
      if (!player) continue;
      targets.push({ id: player.id, sx: player.x, sy: player.y, ex: arrow.endX, ey: arrow.endY });
    }
    if (targets.length === 0) return;

    setIsPlaying(true);
    simStartRef.current = performance.now();

    const animate = (time: number) => {
      const elapsed = time - simStartRef.current;
      const t = Math.min(1, elapsed / SIM_DURATION);
      // ease-in-out
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      const newPos: Record<string, { x: number; y: number }> = {};
      for (const tgt of targets) {
        newPos[tgt.id] = {
          x: tgt.sx + (tgt.ex - tgt.sx) * eased,
          y: tgt.sy + (tgt.ey - tgt.sy) * eased,
        };
      }
      setSimPositions(newPos);

      if (t < 1) {
        simFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        setSimPositions({});
      }
    };

    simFrameRef.current = requestAnimationFrame(animate);
  }, [activeDrill, activeObjects, isPlaying]);

  const handleStop = useCallback(() => {
    if (simFrameRef.current !== null) cancelAnimationFrame(simFrameRef.current);
    setIsPlaying(false);
    setSimPositions({});
  }, []);

  useEffect(() => () => { if (simFrameRef.current !== null) cancelAnimationFrame(simFrameRef.current); }, []);

  if (!drill || !activeDrill) {
    return <div className="flex-1 flex items-center justify-center text-gray-600">Loading drill…</div>;
  }

  const selectedObject = activeObjects.find((o) => o.id === selectedId) ?? null;
  const canDuplicate = selectedId !== null || selectedIds.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <DrillEditorTopBar
        drill={drill}
        saveStatus={saveStatus}
        zoom={zoom}
        snapToGrid={snapToGrid}
        showNames={showNames}
        undoCount={undoStack.length}
        redoCount={redoStack.length}
        playerScale={drill.playerScale ?? 1}
        isPlaying={isPlaying}
        hasPlayTargets={activeObjects.some((o) => o.type === 'arrow' && !!(o as ArrowObject).startPlayerId)}
        focusActive={drawTool === 'focus-zone'}
        onTitleChange={(t) => updateDrill(drillId, { title: t })}
        onExportPNG={handleExportPNG}
        onExport4K={handleExport4K}
        onZoomChange={setZoom}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
        onToggleNames={() => setShowNames(!showNames)}
        onToggleFocus={() => handleSetDrawTool(drawTool === 'focus-zone' ? null : 'focus-zone')}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPlayerScaleChange={(s) => handleUpdateDrill({ playerScale: s })}
        onDrillInfoOpen={() => setShowDrillInfo(true)}
        onPlay={handlePlay}
        onStop={handleStop}
      />

      <div className="flex-1 flex min-h-0">
        <PaletteSidebar
          drawTool={drawTool}
          onAddCone={(variant) => handleAddObject({ id: crypto.randomUUID(), type: 'cone', ...center(), color: '#f97316', imageVariant: variant ?? 'cone', size: 16 } as ConeObject)}
          onAddBall={() => handleAddObject({ id: crypto.randomUUID(), type: 'ball', ...center(), size: 16 } as BallObject)}
          onAddGoal={(size) => handleAddObject({ id: crypto.randomUUID(), type: 'goal', ...center(), size, imgW: size === 'full' ? 22 : 20, imgH: size === 'full' ? 52 : 38 } as GoalObject)}
          onAddZone={() => handleAddObject({ id: crypto.randomUUID(), type: 'zone', x: drill.pitch.width / 2 - 80, y: drill.pitch.height / 2 - 60, width: 160, height: 120, fill: '#8b5cf6', opacity: 0.25, label: 'Zone' } as ZoneObject)}
          onSetDrawTool={handleSetDrawTool}
          onDuplicate={handleDuplicate}
          canDuplicate={canDuplicate}
        />

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Step tabs bar */}
          <div className="bg-gray-900 border-b border-gray-800 flex items-center gap-1 px-3 py-1.5 shrink-0 overflow-x-auto">
            <button
              onClick={() => switchStep(null)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors shrink-0 ${!activeStepId ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}
            >
              Base
            </button>
            {drill.steps?.map((step) => (
              <div key={step.id} className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => switchStep(step.id)}
                  className={`px-3 py-1 rounded-l text-xs font-medium transition-colors ${activeStepId === step.id ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}
                >
                  {step.label}
                </button>
                <button
                  onClick={() => handleRemoveStep(step.id)}
                  className="px-1 py-1 rounded-r text-xs text-gray-700 hover:text-red-500 border border-transparent transition-colors"
                  title="Remove step"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={handleAddStep}
              className="px-2 py-1 rounded text-xs text-gray-600 hover:text-gray-400 border border-dashed border-gray-700 hover:border-gray-500 transition-colors ml-1 shrink-0"
            >
              + Step
            </button>
            {activeStepId && (
              <button
                onClick={handleCloneFromBase}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:text-emerald-400 border border-gray-700 hover:border-emerald-500/50 transition-colors ml-auto shrink-0"
                title="Copy base drill objects into this step"
              >
                Clone base
              </button>
            )}
          </div>

          <PitchCanvas
            drill={activeDrill}
            selectedId={selectedId}
            selectedIds={selectedIds}
            drawTool={drawTool}
            drawFirstPoint={drawFirstPoint}
            drawSecondPoint={drawSecondPoint}
            linkFromId={linkFromId}
            snapToGrid={snapToGrid}
            zoom={zoom}
            showNames={showNames}
            playerScale={drill.playerScale ?? 1}
            positionOverrides={simPositions}
            onSelect={handleSelect}
            onMultiSelect={handleMultiSelect}
            onMarqueeSelect={handleMarqueeSelect}
            onUpdateObject={handleUpdateObject}
            onAddObject={handleAddObject}
            onDeleteObject={handleDeleteObject}
            onCanvasPointClick={handleCanvasPointClick}
            onCanvasDragCommit={handleCanvasDragCommit}
            onFinishDrawing={() => { setDrawTool(null); setDrawFirstPoint(null); setDrawSecondPoint(null); setLinkFromId(null); }}
            onZoomChange={setZoom}
            onDropAtPoint={handleDropAtPoint}
            onContextMenuObject={(id, x, y) => { setContextMenu({ x, y, objectId: id }); setSelectedId(id); setSelectedIds([id]); }}
            onAltDragCopy={handleAltDragCopy}
            stageRef={stageRef}
          />

          {/* Player dock */}
          <div className="border-t border-gray-800 bg-gray-900 shrink-0">
            <button
              onClick={() => setPlayerDockOpen(!playerDockOpen)}
              className="w-full flex items-center justify-between px-4 py-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              <span>Player Dock {linkedTeam ? `— ${linkedTeam.name}` : '— Default Squad'}</span>
              <span>{playerDockOpen ? '▼' : '▲'}</span>
            </button>
            {playerDockOpen && (
              <PlayerDock
                teams={teams}
                drillTeamId={drill.teamId}
                onSelectTeam={(teamId) => updateDrill(drillId, { teamId })}
                onAddPlayer={handleAddPlayerFromDock}
                onShowFormation={handleShowFormation}
                usedNumbers={usedNumbers}
                onRemovePlayer={handleRemovePlayerByNumber}
              />
            )}
          </div>
        </div>

        {/* Right panel — Inspector only */}
        <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col shrink-0 overflow-y-auto">
          <InspectorPanel
            selectedObject={selectedObject}
            selectedIds={selectedIds}
            allObjects={activeObjects}
            playerScale={drill.playerScale ?? 1}
            onUpdate={(updates) => selectedId && handleUpdateObject(selectedId, updates)}
            onUpdateById={(id, updates) => handleUpdateObject(id, updates)}
            onDelete={() => selectedId && handleDeleteObject(selectedId)}
            onDuplicate={handleDuplicate}
            onDeleteSelected={handleDeleteSelected}
            onAlignDistribute={handleAlignDistribute}
          />
        </div>
      </div>

      {/* Drill Info — centered modal */}
      {showDrillInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDrillInfo(false)} />
          <div className="relative w-full max-w-5xl max-h-[92vh] bg-gray-900 border border-gray-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
              <h2 className="text-base font-semibold text-gray-200">Drill Info</h2>
              <button onClick={() => setShowDrillInfo(false)}
                className="text-gray-500 hover:text-white text-xl leading-none px-1 transition-colors">×</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DrillMetaPanel drill={drill} teams={teams} onUpdate={handleUpdateDrill} alwaysOpen modal />
            </div>
          </div>
        </div>
      )}

      {showFormation && (
        <FormationPicker
          team={linkedTeam}
          pitchWidth={drill.pitch.width}
          pitchHeight={drill.pitch.height}
          initialSide={formationInitialSide}
          onPlace={handlePlaceFormation}
          onClose={() => setShowFormation(false)}
        />
      )}

      {/* Context menu for layer ordering / group */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px] text-xs"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            {(() => {
              const obj = activeObjects.find((o) => o.id === contextMenu.objectId);
              const isGroup = obj?.type === 'group';
              const canGroup = selectedIds.length > 1;
              return (
                <>
                  <div className="px-3 py-1 text-gray-600 text-[10px] uppercase tracking-wide">Layer Order</div>
                  <button onClick={() => handleLayerReorder(contextMenu.objectId, 'toFront')} className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-gray-700 transition-colors">Bring to Front</button>
                  <button onClick={() => handleLayerReorder(contextMenu.objectId, 'forward')} className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-gray-700 transition-colors">Bring Forward</button>
                  <button onClick={() => handleLayerReorder(contextMenu.objectId, 'backward')} className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-gray-700 transition-colors">Send Backward</button>
                  <button onClick={() => handleLayerReorder(contextMenu.objectId, 'toBack')} className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-gray-700 transition-colors">Send to Back</button>
                  {(canGroup || isGroup) && <div className="border-t border-gray-700 my-1" />}
                  {canGroup && !isGroup && (
                    <button onClick={handleGroup} className="w-full text-left px-3 py-1.5 text-emerald-400 hover:bg-gray-700 transition-colors">Group Selection</button>
                  )}
                  {isGroup && (
                    <button onClick={() => handleUngroup(contextMenu.objectId)} className="w-full text-left px-3 py-1.5 text-amber-400 hover:bg-gray-700 transition-colors">Ungroup</button>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
