import { create } from 'zustand';
import type { CanvasObject, ToolId, GhostPreview, PitchConfig } from '../types';
import { PITCH_PRESETS } from '../types';
import { CommandHistory } from '../commands/CommandHistory';
import {
  AddObjectCommand,
  DeleteObjectsCommand,
  MoveObjectsCommand,
  UpdateObjectCommand,
  BatchCommand,
} from '../commands/ObjectCommands';
import { cloneObject } from '../lib/objectFactory';

interface MoveRecord {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface EditorState {
  objects: Record<string, CanvasObject>;
  objectOrder: string[];
  selectedIds: string[];
  hoveredId: string | null;
  activeTool: ToolId;
  ghostPreview: GhostPreview | null;
  _history: CommandHistory;
  zoom: number;
  panX: number;
  panY: number;
  snapToGrid: boolean;
  gridSize: number;
  showNames: boolean;
  showNumbers: boolean;
  playerScale: number;
  pitch: PitchConfig;
  clipboard: CanvasObject[];
  drillName: string;
  isDirty: boolean;

  // Internal raw ops (used by commands)
  _rawAdd(obj: CanvasObject): void;
  _rawRemove(id: string): void;
  _rawUpdate(id: string, patch: Partial<CanvasObject>): void;
  getObject(id: string): CanvasObject | undefined;
  getObjectsInOrder(): CanvasObject[];

  // High-level actions (go through CommandHistory)
  addObject(obj: CanvasObject): void;
  deleteSelected(): void;
  updateObject(id: string, patch: Partial<CanvasObject>, label?: string): void;
  duplicateSelected(): void;
  moveObjects(moves: MoveRecord[]): void;

  // Z-order
  bringToFront(id: string): void;
  sendToBack(id: string): void;
  bringForward(id: string): void;
  sendBackward(id: string): void;

  // Selection
  select(id: string): void;
  multiSelect(id: string): void;
  selectAll(): void;
  clearSelection(): void;
  setSelection(ids: string[]): void;
  setHovered(id: string | null): void;

  // Tool
  setActiveTool(id: ToolId): void;
  setGhostPreview(ghost: GhostPreview | null): void;

  // History
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;

  // View
  setZoom(zoom: number): void;
  setPan(x: number, y: number): void;
  toggleSnap(): void;

  // Clipboard
  copySelected(): void;
  paste(): void;

  // Persistence
  loadDrill(drillId: string, name: string, objects: CanvasObject[]): void;
  setDrillName(name: string): void;
  markClean(): void;
}

const defaultPitch: PitchConfig = {
  ...PITCH_PRESETS.full,
  colors: { grass: '#2E7D32', grassAlt: '#276829', lines: '#FFFFFF' },
};

export const useEditorStore = create<EditorState>((set, get) => ({
  objects: {},
  objectOrder: [],
  selectedIds: [],
  hoveredId: null,
  activeTool: 'select',
  ghostPreview: null,
  _history: new CommandHistory(),
  zoom: 1,
  panX: 0,
  panY: 0,
  snapToGrid: false,
  gridSize: 20,
  showNames: false,
  showNumbers: true,
  playerScale: 1,
  pitch: defaultPitch,
  clipboard: [],
  drillName: 'Untitled Drill',
  isDirty: false,

  _rawAdd(obj: CanvasObject) {
    set(s => ({
      objects: { ...s.objects, [obj.id]: obj },
      objectOrder: [...s.objectOrder, obj.id],
      isDirty: true,
    }));
  },

  _rawRemove(id: string) {
    set(s => {
      const { [id]: _removed, ...rest } = s.objects;
      return {
        objects: rest,
        objectOrder: s.objectOrder.filter(oid => oid !== id),
        selectedIds: s.selectedIds.filter(sid => sid !== id),
        isDirty: true,
      };
    });
  },

  _rawUpdate(id: string, patch: Partial<CanvasObject>) {
    set(s => {
      const existing = s.objects[id];
      if (!existing) return {};
      return {
        objects: { ...s.objects, [id]: { ...existing, ...patch } as CanvasObject },
        isDirty: true,
      };
    });
  },

  getObject(id: string) {
    return get().objects[id];
  },

  getObjectsInOrder() {
    const { objects, objectOrder } = get();
    return objectOrder.map(id => objects[id]).filter(Boolean) as CanvasObject[];
  },

  addObject(obj: CanvasObject) {
    const store = get();
    const cmd = new AddObjectCommand(
      {
        _rawAdd: (o) => get()._rawAdd(o),
        _rawRemove: (id) => get()._rawRemove(id),
        _rawUpdate: (id, patch) => get()._rawUpdate(id, patch),
        getObject: (id) => get().getObject(id),
      },
      obj
    );
    store._history.execute(cmd);
    set({ selectedIds: [obj.id] });
  },

  deleteSelected() {
    const { selectedIds, objects, _history } = get();
    if (selectedIds.length === 0) return;
    const toDelete = selectedIds.map(id => objects[id]).filter(Boolean) as CanvasObject[];
    if (toDelete.length === 0) return;
    const storeRef = {
      _rawAdd: (o: CanvasObject) => get()._rawAdd(o),
      _rawRemove: (id: string) => get()._rawRemove(id),
      _rawUpdate: (id: string, patch: Partial<CanvasObject>) => get()._rawUpdate(id, patch),
      getObject: (id: string) => get().getObject(id),
    };
    const cmd = new DeleteObjectsCommand(storeRef, toDelete);
    _history.execute(cmd);
    set({ selectedIds: [] });
  },

  updateObject(id: string, patch: Partial<CanvasObject>, label = 'Update') {
    const { objects, _history } = get();
    const existing = objects[id];
    if (!existing) return;
    const before: Partial<CanvasObject> = {};
    const existingAny = existing as unknown as Record<string, unknown>;
    (Object.keys(patch) as string[]).forEach(key => {
      (before as unknown as Record<string, unknown>)[key] = existingAny[key];
    });
    const storeRef = {
      _rawAdd: (o: CanvasObject) => get()._rawAdd(o),
      _rawRemove: (oid: string) => get()._rawRemove(oid),
      _rawUpdate: (oid: string, p: Partial<CanvasObject>) => get()._rawUpdate(oid, p),
      getObject: (oid: string) => get().getObject(oid),
    };
    const cmd = new UpdateObjectCommand(storeRef, id, patch, before, label);
    _history.execute(cmd);
  },

  duplicateSelected() {
    const { selectedIds, objects, _history } = get();
    if (selectedIds.length === 0) return;
    const storeRef = {
      _rawAdd: (o: CanvasObject) => get()._rawAdd(o),
      _rawRemove: (id: string) => get()._rawRemove(id),
      _rawUpdate: (id: string, patch: Partial<CanvasObject>) => get()._rawUpdate(id, patch),
      getObject: (id: string) => get().getObject(id),
    };
    const clones: CanvasObject[] = [];
    const cmds = selectedIds
      .map(id => objects[id])
      .filter(Boolean)
      .map(obj => {
        const clone = cloneObject(obj as CanvasObject);
        if ('x' in clone) (clone as { x: number }).x += 30;
        if ('y' in clone) (clone as { y: number }).y += 30;
        clones.push(clone);
        return new AddObjectCommand(storeRef, clone);
      });
    if (cmds.length === 0) return;
    const batch = new BatchCommand('Duplicate', cmds);
    _history.execute(batch);
    set({ selectedIds: clones.map(c => c.id) });
  },

  moveObjects(moves: MoveRecord[]) {
    const { _history } = get();
    const storeRef = {
      _rawAdd: (o: CanvasObject) => get()._rawAdd(o),
      _rawRemove: (id: string) => get()._rawRemove(id),
      _rawUpdate: (id: string, patch: Partial<CanvasObject>) => get()._rawUpdate(id, patch),
      getObject: (id: string) => get().getObject(id),
    };
    const cmd = new MoveObjectsCommand(storeRef, moves);
    _history.execute(cmd);
  },

  bringToFront(id: string) {
    set(s => {
      const order = s.objectOrder.filter(oid => oid !== id);
      return { objectOrder: [...order, id], isDirty: true };
    });
  },

  sendToBack(id: string) {
    set(s => {
      const order = s.objectOrder.filter(oid => oid !== id);
      return { objectOrder: [id, ...order], isDirty: true };
    });
  },

  bringForward(id: string) {
    set(s => {
      const order = [...s.objectOrder];
      const idx = order.indexOf(id);
      if (idx < order.length - 1) {
        [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
      }
      return { objectOrder: order, isDirty: true };
    });
  },

  sendBackward(id: string) {
    set(s => {
      const order = [...s.objectOrder];
      const idx = order.indexOf(id);
      if (idx > 0) {
        [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
      }
      return { objectOrder: order, isDirty: true };
    });
  },

  select(id: string) {
    set({ selectedIds: [id] });
  },

  multiSelect(id: string) {
    set(s => {
      const already = s.selectedIds.includes(id);
      return {
        selectedIds: already
          ? s.selectedIds.filter(sid => sid !== id)
          : [...s.selectedIds, id],
      };
    });
  },

  selectAll() {
    set(s => ({ selectedIds: [...s.objectOrder] }));
  },

  clearSelection() {
    set({ selectedIds: [] });
  },

  setSelection(ids: string[]) {
    set({ selectedIds: ids });
  },

  setHovered(id: string | null) {
    set({ hoveredId: id });
  },

  setActiveTool(id: ToolId) {
    set({ activeTool: id, selectedIds: [], ghostPreview: null });
  },

  setGhostPreview(ghost: GhostPreview | null) {
    set({ ghostPreview: ghost });
  },

  undo() {
    get()._history.undo();
    set({ isDirty: true });
  },

  redo() {
    get()._history.redo();
    set({ isDirty: true });
  },

  canUndo() { return get()._history.canUndo(); },
  canRedo() { return get()._history.canRedo(); },

  setZoom(zoom: number) {
    set({ zoom: Math.min(4, Math.max(0.25, zoom)) });
  },

  setPan(x: number, y: number) {
    set({ panX: x, panY: y });
  },

  toggleSnap() {
    set(s => ({ snapToGrid: !s.snapToGrid }));
  },

  copySelected() {
    const { selectedIds, objects } = get();
    const copied = selectedIds.map(id => objects[id]).filter(Boolean) as CanvasObject[];
    set({ clipboard: copied });
  },

  paste() {
    const { clipboard, _history } = get();
    if (clipboard.length === 0) return;
    const storeRef = {
      _rawAdd: (o: CanvasObject) => get()._rawAdd(o),
      _rawRemove: (id: string) => get()._rawRemove(id),
      _rawUpdate: (id: string, patch: Partial<CanvasObject>) => get()._rawUpdate(id, patch),
      getObject: (id: string) => get().getObject(id),
    };
    const clones: CanvasObject[] = [];
    const cmds = clipboard.map(obj => {
      const clone = cloneObject(obj);
      if ('x' in clone) (clone as { x: number }).x += 30;
      if ('y' in clone) (clone as { y: number }).y += 30;
      clones.push(clone);
      return new AddObjectCommand(storeRef, clone);
    });
    const batch = new BatchCommand('Paste', cmds);
    _history.execute(batch);
    set({ selectedIds: clones.map(c => c.id) });
  },

  loadDrill(_drillId: string, name: string, objects: CanvasObject[]) {
    const objMap: Record<string, CanvasObject> = {};
    const order: string[] = [];
    objects.forEach(o => {
      objMap[o.id] = o;
      order.push(o.id);
    });
    get()._history.clear();
    set({
      objects: objMap,
      objectOrder: order,
      selectedIds: [],
      drillName: name,
      isDirty: false,
    });
  },

  setDrillName(name: string) {
    set({ drillName: name, isDirty: true });
  },

  markClean() {
    set({ isDirty: false });
  },
}));
