'use client';
import { useEditorStore } from '../../store/editorStore';

export function TopBar() {
  const drillName = useEditorStore(s => s.drillName);
  const isDirty = useEditorStore(s => s.isDirty);
  const setDrillName = useEditorStore(s => s.setDrillName);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);
  const canUndo = useEditorStore(s => s.canUndo);
  const canRedo = useEditorStore(s => s.canRedo);
  const zoom = useEditorStore(s => s.zoom);
  const setZoom = useEditorStore(s => s.setZoom);
  const setPan = useEditorStore(s => s.setPan);
  const snapToGrid = useEditorStore(s => s.snapToGrid);
  const toggleSnap = useEditorStore(s => s.toggleSnap);
  const pitch = useEditorStore(s => s.pitch);

  const handleFit = () => {
    // Fit pitch to view — reset zoom and pan
    setZoom(1);
    setPan(0, 0);
  };

  return (
    <div className="h-12 bg-[#0a0f1c] border-b border-[#1e293b] flex items-center px-4 gap-4 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-6 h-6 rounded bg-[#63C0B0] flex items-center justify-center">
          <span className="text-[10px] font-black text-[#0a0f1c]">CM</span>
        </div>
        <span className="text-sm font-bold text-[#63C0B0] hidden sm:block">CoachMind</span>
        <span className="text-[#1e293b] text-sm hidden sm:block">/</span>
        <span className="text-xs text-[#6B7280] hidden sm:block">V2</span>
      </div>

      {/* Drill name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <input
          type="text"
          value={drillName}
          onChange={e => setDrillName(e.target.value)}
          className="bg-transparent border-b border-transparent hover:border-[#1e293b] focus:border-[#63C0B0] outline-none text-white text-sm font-medium min-w-0 w-48 transition-colors px-1"
        />
        <span
          title={isDirty ? 'Unsaved changes' : 'Saved'}
          className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${isDirty ? 'bg-[#FFC857]' : 'bg-[#63C0B0]'}`}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo()}
          title="Undo (Ctrl+Z)"
          className="w-8 h-8 flex items-center justify-center rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed text-[#9CA3AF] hover:text-white hover:bg-[#1e293b] transition-colors"
        >
          ↺
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          title="Redo (Ctrl+Y)"
          className="w-8 h-8 flex items-center justify-center rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed text-[#9CA3AF] hover:text-white hover:bg-[#1e293b] transition-colors"
        >
          ↻
        </button>
      </div>

      {/* Snap */}
      <button
        onClick={toggleSnap}
        title="Toggle grid snap"
        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
          snapToGrid ? 'bg-[#63C0B0]/20 text-[#63C0B0] ring-1 ring-[#63C0B0]/30' : 'bg-[#1e293b] text-[#6B7280] hover:text-white'
        }`}
      >
        Grid
      </button>

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setZoom(zoom / 1.2)}
          title="Zoom out"
          className="w-7 h-7 flex items-center justify-center rounded text-sm text-[#9CA3AF] hover:text-white hover:bg-[#1e293b] transition-colors"
        >
          −
        </button>
        <button
          onClick={() => setZoom(1)}
          title="Reset zoom"
          className="min-w-[52px] h-7 flex items-center justify-center rounded text-xs font-mono text-[#9CA3AF] hover:text-white hover:bg-[#1e293b] transition-colors"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom(zoom * 1.2)}
          title="Zoom in"
          className="w-7 h-7 flex items-center justify-center rounded text-sm text-[#9CA3AF] hover:text-white hover:bg-[#1e293b] transition-colors"
        >
          +
        </button>
        <button
          onClick={handleFit}
          title="Fit to screen"
          className="px-2 h-7 flex items-center justify-center rounded text-xs text-[#9CA3AF] hover:text-white hover:bg-[#1e293b] transition-colors"
        >
          Fit
        </button>
      </div>

      {/* Export */}
      <button
        title="Export (coming soon)"
        className="px-3 py-1.5 rounded text-xs font-medium bg-[#63C0B0]/20 text-[#63C0B0] hover:bg-[#63C0B0]/30 transition-colors"
      >
        Export
      </button>
    </div>
  );
}
