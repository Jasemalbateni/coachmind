export type ToolId =
  | 'select' | 'pan'
  | 'place-player-a' | 'place-player-b'
  | 'place-cone' | 'place-ball' | 'place-goal'
  | 'draw-pass' | 'draw-run' | 'draw-dribble'
  | 'draw-press' | 'draw-support'
  | 'draw-zone' | 'draw-rect' | 'draw-circle'
  | 'draw-text' | 'draw-smart-cone-area' | 'link';

export type ToolPhase = 'idle' | 'first-point' | 'dragging' | 'cancelled';

export interface GhostPoint { kind: 'point'; x: number; y: number; objectType: string; }
export interface GhostLine { kind: 'line'; startX: number; startY: number; endX: number; endY: number; }
export interface GhostArea { kind: 'area'; x: number; y: number; width: number; height: number; }
export type GhostPreview = GhostPoint | GhostLine | GhostArea;

export interface ToolPointerEvent {
  canvasX: number; canvasY: number;
  clientX: number; clientY: number;
  button: 0 | 1 | 2;
  shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean;
  targetId: string | null;
}
