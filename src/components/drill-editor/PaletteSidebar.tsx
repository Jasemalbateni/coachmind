'use client';

import { useState, useRef, useEffect } from 'react';
import type { DrawTool } from './PitchCanvas';
import { CONE_VARIANTS } from '@/lib/fieldAssets';

interface Props {
  drawTool: DrawTool;
  onAddCone: (variant?: string) => void;
  onAddBall: () => void;
  onAddGoal: (size: 'small' | 'full') => void;
  onAddZone: () => void;
  onSetDrawTool: (tool: DrawTool) => void;
  onDuplicate: () => void;
  canDuplicate: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 mt-3 first:mt-0">{children}</p>;
}

/** Equipment button with image thumbnail + drag support */
function ImgBtn({ src, label, sub, onClick, dragData }: {
  src: string; label: string; sub?: string; onClick: () => void; dragData?: string;
}) {
  return (
    <button
      onClick={onClick}
      draggable={!!dragData}
      onDragStart={dragData ? (e) => {
        e.dataTransfer.setData('application/x-editor-tool', dragData);
        e.dataTransfer.effectAllowed = 'copy';
      } : undefined}
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 border border-transparent text-gray-300 text-left w-full transition-colors"
    >
      <img src={src} className="w-5 h-5 object-contain shrink-0" alt="" />
      <span className="flex-1 leading-tight">
        {label}
        {sub && <span className="block text-xs text-gray-500 font-normal">{sub}</span>}
      </span>
    </button>
  );
}

/** Cone selector — main button + dropdown for variants */
function ConeSelector({ onAdd }: { onAdd: (variant: string) => void }) {
  const [selectedVariant, setSelectedVariant] = useState('cone');
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = CONE_VARIANTS.find(v => v.key === selectedVariant) ?? CONE_VARIANTS[0];

  return (
    <div className="relative" ref={dropRef}>
      <div className="flex gap-px">
        {/* Main add button */}
        <button
          onClick={() => onAdd(selectedVariant)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-editor-tool', JSON.stringify({
              type: 'cone', imageVariant: selectedVariant, color: '#f97316',
            }));
            e.dataTransfer.effectAllowed = 'copy';
          }}
          className="flex items-center gap-2 px-2.5 py-2 rounded-l-lg text-sm flex-1 bg-gray-800 hover:bg-gray-700 border border-transparent text-gray-300 text-left transition-colors"
        >
          <img src={`/field-assets/${selectedVariant}.png`} className="w-5 h-5 object-contain shrink-0" alt="" />
          <span className="flex-1 leading-tight">
            Cone
            <span className="block text-xs font-normal" style={{ color: selected.dotColor }}>{selected.label}</span>
          </span>
        </button>

        {/* Dropdown trigger */}
        <button
          onClick={() => setOpen(!open)}
          className="px-2 py-2 rounded-r-lg bg-gray-800 hover:bg-gray-700 border-l border-gray-700 text-gray-400 text-xs transition-colors"
          title="Choose cone variant"
        >
          ▾
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-0.5 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 w-full overflow-hidden">
          {CONE_VARIANTS.map(v => (
            <button
              key={v.key}
              onClick={() => { setSelectedVariant(v.key); setOpen(false); }}
              className={`flex items-center gap-2.5 px-2.5 py-2.5 w-full text-left text-sm hover:bg-gray-700 transition-colors ${
                selectedVariant === v.key ? 'bg-emerald-600/15 text-emerald-300' : 'text-gray-300'
              }`}
            >
              <img src={`/field-assets/${v.key}.png`} className="w-5 h-5 object-contain shrink-0" alt="" />
              <span className="flex-1">{v.label}</span>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.dotColor }} />
              {selectedVariant === v.key && <span className="text-xs text-emerald-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Btn({ onClick, active, dot, label, sub, dragData }: {
  onClick: () => void; active?: boolean; dot?: string; label: string; sub?: string; dragData?: string;
}) {
  return (
    <button onClick={onClick}
      draggable={!!dragData}
      onDragStart={dragData ? (e) => {
        e.dataTransfer.setData('application/x-editor-tool', dragData);
        e.dataTransfer.effectAllowed = 'copy';
      } : undefined}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors text-left w-full ${
        active
          ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-300'
          : 'bg-gray-800 hover:bg-gray-700 border border-transparent text-gray-300'
      }`}>
      {dot && <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${dot}`} />}
      <span className="flex-1 leading-tight">
        {label}
        {sub && <span className="block text-xs text-gray-500 font-normal">{sub}</span>}
      </span>
    </button>
  );
}

function DrawBtn({ tool, current, label, sub, icon, onClick }: {
  tool: DrawTool; current: DrawTool; label: string; sub?: string; icon?: string; onClick: () => void;
}) {
  const active = current === tool;
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors text-left w-full border ${
        active ? 'bg-amber-600/20 border-amber-500 text-amber-300' : 'bg-gray-800 border-transparent hover:bg-gray-700 text-gray-300'
      }`}>
      <span className="w-3.5 h-3.5 shrink-0 text-center leading-none text-xs">
        {icon ?? (tool === 'arrow' ? '→' : tool === 'line' ? '—' : tool === 'rect' ? '□' : tool === 'circle' ? '○' : tool === 'link' ? '⬡' : '→')}
      </span>
      <span className="flex-1 leading-tight">
        {label}
        {sub && <span className="block text-xs text-gray-500 font-normal">{sub}</span>}
      </span>
      {active && <span className="text-xs text-amber-400">✓</span>}
    </button>
  );
}

/** Tactical tool button — distinct styling */
function TacticBtn({ tool, current, label, sub, color, onClick }: {
  tool: DrawTool; current: DrawTool; label: string; sub?: string; color: string; onClick: () => void;
}) {
  const active = current === tool;
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors text-left w-full border ${
        active ? `border-current bg-current/10 text-current` : 'bg-gray-800 border-transparent hover:bg-gray-700 text-gray-300'
      }`}
      style={active ? { borderColor: color, color, backgroundColor: `${color}18` } : {}}>
      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="flex-1 leading-tight">
        {label}
        {sub && <span className="block text-xs opacity-60">{sub}</span>}
      </span>
      {active && <span className="text-xs">✓</span>}
    </button>
  );
}

export default function PaletteSidebar({
  drawTool, onAddCone, onAddBall, onAddGoal, onAddZone,
  onSetDrawTool, onDuplicate, canDuplicate,
}: Props) {
  const toggle = (tool: DrawTool) => onSetDrawTool(drawTool === tool ? null : tool);

  return (
    <aside className="w-52 bg-gray-900 border-r border-gray-800 p-3 flex flex-col gap-0.5 overflow-y-auto shrink-0">
      <SectionLabel>Equipment</SectionLabel>

      {/* Cone — with variant dropdown */}
      <ConeSelector onAdd={onAddCone} />

      {/* Ball */}
      <ImgBtn
        src="/field-assets/ball.png"
        label="Ball"
        onClick={onAddBall}
        dragData={JSON.stringify({ type: 'ball' })}
      />

      <SectionLabel>Goals</SectionLabel>

      {/* Large Goal */}
      <ImgBtn
        src="/field-assets/large-goal.png"
        label="Large Goal"
        sub="Full-size"
        onClick={() => onAddGoal('full')}
        dragData={JSON.stringify({ type: 'goal', size: 'full' })}
      />

      {/* Mini Goal */}
      <ImgBtn
        src="/field-assets/mini-goal.png"
        label="Mini Goal"
        sub="Small-sided"
        onClick={() => onAddGoal('small')}
        dragData={JSON.stringify({ type: 'goal', size: 'small' })}
      />

      <SectionLabel>Smart Arrows</SectionLabel>
      <TacticBtn tool="smart-pass" current={drawTool} color="#3B82F6"
        label="Pass" sub="Solid blue arrow"
        onClick={() => toggle('smart-pass')} />
      <TacticBtn tool="smart-dribble" current={drawTool} color="#F59E0B"
        label="Dribble" sub="Zigzag orange arrow"
        onClick={() => toggle('smart-dribble')} />
      <TacticBtn tool="smart-run" current={drawTool} color="#22C55E"
        label="Run (Off-Ball)" sub="Dashed green arrow"
        onClick={() => toggle('smart-run')} />

      <SectionLabel>Draw</SectionLabel>
      <DrawBtn tool="text" current={drawTool} label="Text" sub="Click to place" icon="T" onClick={() => toggle('text')} />
      <DrawBtn tool="arrow" current={drawTool} label="Arrow" sub="2-click" onClick={() => toggle('arrow')} />
      <DrawBtn tool="line" current={drawTool} label="Straight Line" sub="2-click" onClick={() => toggle('line')} />
      <DrawBtn tool="curved" current={drawTool} label="Curved Line" sub="start · end · curve shape" icon="~" onClick={() => toggle('curved')} />
      <DrawBtn tool="link" current={drawTool} label="Link Players" sub="Click A → B" icon="⬡" onClick={() => toggle('link')} />

      <SectionLabel>Shapes</SectionLabel>
      <Btn onClick={onAddZone} dot="bg-violet-500" label="Zone" sub="Filled area" dragData={JSON.stringify({type:'zone'})} />
      <DrawBtn tool="circle" current={drawTool} label="Circle" sub="Center + edge" icon="○" onClick={() => toggle('circle')} />
      <DrawBtn tool="rect" current={drawTool} label="Rectangle" sub="2-click corners" icon="□" onClick={() => toggle('rect')} />
      <DrawBtn tool="smart-cone-area" current={drawTool} label="Cone Area" sub="Auto-place cones" icon="⬡" onClick={() => toggle('smart-cone-area')} />

      <SectionLabel>Actions</SectionLabel>
      <button onClick={onDuplicate} disabled={!canDuplicate}
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 border border-transparent text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed w-full text-left">
        <span className="w-3.5 text-center text-xs">⧉</span> Duplicate
      </button>

      {drawTool && (
        <div className="mt-2 p-2.5 bg-amber-900/20 border border-amber-800/50 rounded-lg">
          <p className="text-xs text-amber-400 font-medium mb-1">Drawing: {drawTool.replace('smart-', '').replace('tac-', '').replace('-', ' ')}</p>
          <p className="text-xs text-amber-600">
            {drawTool === 'link' ? 'Click player A, then player B'
              : drawTool === 'curved' ? 'Click start · end · curve point'
              : drawTool === 'smart-cone-area' ? 'Click corner, drag to opposite corner'
              : 'Click first point, then second'}
          </p>
          {drawTool !== 'focus-zone' && drawTool !== 'link' && (
            <p className="text-xs text-amber-700 mt-0.5">Hold Shift for straight lines</p>
          )}
          <button onClick={() => onSetDrawTool(null)} className="mt-2 px-2.5 py-1.5 text-xs text-amber-400 bg-amber-900/30 hover:bg-amber-900/60 hover:text-amber-300 rounded transition-colors">Cancel (Esc)</button>
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-gray-800">
        <p className="text-xs text-gray-700 leading-relaxed">
          <kbd className="bg-gray-800 px-1 rounded text-gray-500">Del</kbd> remove ·{' '}
          <kbd className="bg-gray-800 px-1 rounded text-gray-500">Ctrl+Z</kbd> undo ·{' '}
          <kbd className="bg-gray-800 px-1 rounded text-gray-500">Ctrl+D</kbd> dup ·{' '}
          <kbd className="bg-gray-800 px-1 rounded text-gray-500">Esc</kbd> cancel
        </p>
      </div>
    </aside>
  );
}
