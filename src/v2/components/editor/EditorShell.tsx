'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { TopBar } from './TopBar';
import { Toolbar } from './Toolbar';
import { InspectorPanel } from './InspectorPanel';
import { useEditorStore } from '../../store/editorStore';

const CanvasEngine = dynamic(
  () => import('../../engine/CanvasEngine').then(m => m.CanvasEngine),
  { ssr: false, loading: () => <div className="flex-1 bg-[#0F172A]" /> }
);

interface Props {
  drillId?: string;
}

export function EditorShell({ drillId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const loadDrill = useEditorStore(s => s.loadDrill);

  // Observe canvas container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width: Math.max(400, width), height: Math.max(300, height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load empty drill on mount (or load drill by id)
  useEffect(() => {
    if (!drillId || drillId === 'new') {
      loadDrill('new', 'Untitled Drill', []);
    }
    // Future: fetch drill by id and call loadDrill
  }, [drillId, loadDrill]);

  return (
    <div className="flex flex-col h-screen-dvh w-screen bg-[#0a0f1c] overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Toolbar />
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative bg-[#0F172A]"
        >
          <CanvasEngine width={canvasSize.width} height={canvasSize.height} />
        </div>
        <InspectorPanel />
      </div>
    </div>
  );
}
