'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Drill } from '@/types';

interface Props {
  drill: Drill;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  zoom: number;
  snapToGrid: boolean;
  showNames: boolean;
  undoCount: number;
  redoCount: number;
  playerScale: number;
  isPlaying: boolean;
  hasPlayTargets: boolean;
  focusActive: boolean;
  onTitleChange: (title: string) => void;
  onExportPNG: () => void;
  onExport4K: () => void;
  onZoomChange: (zoom: number) => void;
  onToggleSnap: () => void;
  onToggleNames: () => void;
  onToggleFocus: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPlayerScaleChange: (scale: number) => void;
  onDrillInfoOpen: () => void;
  onPlay: () => void;
  onStop: () => void;
}

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function DrillEditorTopBar({
  drill, saveStatus, zoom, snapToGrid, showNames, undoCount, redoCount, playerScale,
  isPlaying, hasPlayTargets, focusActive,
  onTitleChange, onExportPNG, onExport4K, onZoomChange, onToggleSnap, onToggleNames, onToggleFocus, onUndo, onRedo,
  onPlayerScaleChange, onDrillInfoOpen, onPlay, onStop,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(drill.title);

  useEffect(() => { setValue(drill.title); }, [drill.title]);

  const commit = () => {
    setEditing(false);
    if (value.trim() && value.trim() !== drill.title) onTitleChange(value.trim());
    else setValue(drill.title);
  };

  return (
    <div className="h-12 bg-brand-dark border-b border-white/10 flex items-center px-3 gap-2 shrink-0 overflow-x-auto">
      <Link href="/drills" className="text-white/50 hover:text-white/90 text-sm transition-colors shrink-0">&#8592; Drills</Link>
      <span className="text-white/20 shrink-0">/</span>

      {editing ? (
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)}
          onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(drill.title); setEditing(false); } }}
          className="bg-white/10 border border-brand-orange rounded px-2 py-0.5 text-sm text-white focus:outline-none w-48 shrink-0" />
      ) : (
        <button onClick={() => setEditing(true)} className="text-sm font-semibold text-white hover:text-brand-orange transition-colors truncate max-w-[200px] shrink-0">
          {drill.title}
        </button>
      )}

      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
        saveStatus === 'saved' ? 'bg-white/10 text-white/50' : 'bg-brand-orange/20 text-brand-orange'
      }`}>
        {saveStatus === 'saved' ? 'Saved' : 'Saving\u2026'}
      </span>

      <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

      {/* Undo/Redo */}
      <button onClick={onUndo} disabled={undoCount === 0} title={`Undo (${undoCount})`}
        className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/70 rounded disabled:opacity-30 disabled:cursor-not-allowed shrink-0 transition-colors">
        &#8633; {undoCount > 0 ? undoCount : ''}
      </button>
      <button onClick={onRedo} disabled={redoCount === 0} title={`Redo (${redoCount})`}
        className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/70 rounded disabled:opacity-30 disabled:cursor-not-allowed shrink-0 transition-colors">
        &#8635; {redoCount > 0 ? redoCount : ''}
      </button>

      <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

      {/* Zoom */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))} aria-label="Zoom out" className="min-w-[28px] px-2 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white/70 rounded transition-colors">&#8722;</button>
        <select value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))}
          className="bg-white/10 border border-white/10 rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-brand-orange w-16">
          {ZOOM_PRESETS.map((z) => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
        </select>
        <button onClick={() => onZoomChange(Math.min(2, zoom + 0.25))} aria-label="Zoom in" className="min-w-[28px] px-2 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white/70 rounded transition-colors">&#43;</button>
        <button onClick={() => onZoomChange(1)} aria-label="Reset zoom" className="px-2 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white/50 rounded transition-colors">fit</button>
      </div>

      <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

      {/* Toggles */}
      <button onClick={onToggleSnap} title="Snap to grid and alignment guides"
        className={`px-2 py-1 text-xs rounded shrink-0 transition-colors border ${
          snapToGrid ? 'border-brand-orange text-brand-orange bg-brand-orange/20' : 'border-white/10 text-white/40 hover:text-white/70'
        }`}>
        Snap
      </button>
      <button onClick={onToggleNames}
        className={`px-2 py-1 text-xs rounded shrink-0 transition-colors border ${
          showNames ? 'border-brand-orange text-brand-orange bg-brand-orange/20' : 'border-white/10 text-white/40 hover:text-white/70'
        }`}>
        Names
      </button>
      <button onClick={onDrillInfoOpen}
        className="px-2 py-1 text-xs rounded shrink-0 transition-colors border border-white/10 text-white/40 hover:text-white/70"
        title="Drill info &amp; metadata">
        Info
      </button>
      <button onClick={onToggleFocus} title="Focus Zone — spotlight an area of the pitch"
        className={`px-2 py-1 text-xs rounded shrink-0 transition-colors border ${
          focusActive ? 'border-brand-orange text-brand-orange bg-brand-orange/20' : 'border-white/10 text-white/40 hover:text-white/70'
        }`}>
        Focus
      </button>

      <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

      {/* Play simulation button */}
      {isPlaying ? (
        <button onClick={onStop}
          className="px-2 py-1 text-xs rounded shrink-0 transition-colors border border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20"
          title="Stop simulation">
          &#9632; Stop
        </button>
      ) : (
        <button onClick={onPlay} disabled={!hasPlayTargets}
          className="px-2 py-1 text-xs rounded shrink-0 transition-colors border border-white/10 text-white/40 hover:text-emerald-400 hover:border-emerald-500/50 disabled:opacity-30 disabled:cursor-not-allowed"
          title={hasPlayTargets ? 'Simulate player movement (connect arrows to players first)' : 'Draw arrows from players to simulate movement'}>
          &#9654; Play
        </button>
      )}

      <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

      {/* Player scale */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-white/40">Players</span>
        <input
          type="range" min={50} max={200} step={10}
          value={Math.round(playerScale * 100)}
          onChange={(e) => onPlayerScaleChange(Number(e.target.value) / 100)}
          className="w-20 accent-brand-orange"
          title={`Player size: ${Math.round(playerScale * 100)}%`}
        />
        <span className="text-xs text-white/40 w-7">{Math.round(playerScale * 100)}%</span>
      </div>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        <Link href={`/drills/${drill.id}/view`} className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white/70 rounded text-xs transition-colors">
          View
        </Link>
        <button onClick={onExportPNG} className="px-2.5 py-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded text-xs font-medium transition-colors">
          Export
        </button>
        <button onClick={onExport4K} title="Export at 4× resolution (4K) for presentations/print" className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors">
          4K
        </button>
      </div>
    </div>
  );
}
