'use client';
import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

export function useEditorKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const s = useEditorStore.getState();

      if ((e.ctrlKey||e.metaKey) && e.key==='z' && !e.shiftKey) { e.preventDefault(); s.undo(); }
      else if ((e.ctrlKey||e.metaKey) && (e.key==='y' || (e.shiftKey&&e.key==='z'))) { e.preventDefault(); s.redo(); }
      else if ((e.ctrlKey||e.metaKey) && e.key==='d') { e.preventDefault(); s.duplicateSelected(); }
      else if ((e.ctrlKey||e.metaKey) && e.key==='c') { s.copySelected(); }
      else if ((e.ctrlKey||e.metaKey) && e.key==='v') { s.paste(); }
      else if ((e.ctrlKey||e.metaKey) && e.key==='a') { e.preventDefault(); s.selectAll(); }
      else if (e.key==='Delete'||e.key==='Backspace') { s.deleteSelected(); }
      else if (e.key==='Escape') { s.clearSelection(); s.setActiveTool('select'); s.setGhostPreview(null); }
      else if (e.key.startsWith('Arrow')) {
        const dx = e.key==='ArrowLeft' ? -1 : e.key==='ArrowRight' ? 1 : 0;
        const dy = e.key==='ArrowUp' ? -1 : e.key==='ArrowDown' ? 1 : 0;
        const amt = e.shiftKey ? 10 : 2;
        const moves = s.selectedIds
          .map(id => {
            const obj = s.getObject(id);
            if (!obj || !('x' in obj)) return null;
            const o = obj as { x: number; y: number };
            return { id, fromX: o.x, fromY: o.y, toX: o.x+dx*amt, toY: o.y+dy*amt };
          })
          .filter(Boolean) as Array<{id:string;fromX:number;fromY:number;toX:number;toY:number}>;
        if (moves.length) s.moveObjects(moves);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
