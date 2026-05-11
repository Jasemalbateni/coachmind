'use client';
import { useEditorStore } from '../../store/editorStore';

export function useSnap() {
  const snapToGrid = useEditorStore(s => s.snapToGrid);
  const gridSize = useEditorStore(s => s.gridSize);
  return (x: number, y: number) => {
    if (!snapToGrid) return { x, y };
    return { x: Math.round(x/gridSize)*gridSize, y: Math.round(y/gridSize)*gridSize };
  };
}
