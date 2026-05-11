'use client';
import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { ArrowObject, TacticType, ArrowLineStyle, ArrowShape, ArrowHeadStyle } from '../../types';

interface Props { object: ArrowObject; }

const TACTIC_TYPES: Array<{ id: TacticType; label: string; color: string }> = [
  { id: 'pass', label: 'Pass', color: '#FFFFFF' },
  { id: 'run', label: 'Run', color: '#63C0B0' },
  { id: 'dribble', label: 'Dribble', color: '#FFC857' },
  { id: 'press', label: 'Press', color: '#E63946' },
  { id: 'support', label: 'Support', color: '#8DD3C7' },
  { id: 'lane', label: 'Lane', color: 'rgba(255,255,255,0.4)' },
  { id: 'defline', label: 'Def Line', color: '#E63946' },
];

export function ArrowInspector({ object }: Props) {
  const updateObject = useEditorStore(s => s.updateObject);

  const update = (patch: Partial<ArrowObject>) => {
    updateObject(object.id, patch as Parameters<typeof updateObject>[1]);
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Arrow</h3>

      {/* Tactic type */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6B7280]">Tactic Type</label>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => update({ tacticType: null })}
            className={`py-1 px-2 rounded text-xs font-medium transition-colors ${
              object.tacticType === null ? 'bg-[#63C0B0] text-white' : 'bg-[#1e293b] text-[#6B7280] hover:text-white'
            }`}
          >
            Custom
          </button>
          {TACTIC_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => update({ tacticType: t.id })}
              className={`py-1 px-2 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                object.tacticType === t.id ? 'ring-1 ring-[#63C0B0] bg-[#1e293b]' : 'bg-[#1e293b] text-[#6B7280] hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom color (only when no tactic) */}
      {object.tacticType === null && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#6B7280]">Color</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={object.color}
              onChange={e => update({ color: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            />
            <span className="text-xs text-[#6B7280] font-mono">{object.color}</span>
          </div>
        </div>
      )}

      {/* Line style */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6B7280]">Line Style</label>
        <div className="flex gap-1">
          {(['solid', 'dashed', 'dotted'] as ArrowLineStyle[]).map(s => (
            <button
              key={s}
              onClick={() => update({ lineStyle: s })}
              className={`flex-1 py-1 rounded text-xs capitalize transition-colors ${
                object.lineStyle === s ? 'bg-[#63C0B0] text-white' : 'bg-[#1e293b] text-[#6B7280] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Arrow shape */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6B7280]">Shape</label>
        <div className="flex gap-1">
          {(['straight', 'curved', 'zigzag'] as ArrowShape[]).map(s => (
            <button
              key={s}
              onClick={() => update({ arrowShape: s })}
              className={`flex-1 py-1 rounded text-xs capitalize transition-colors ${
                object.arrowShape === s ? 'bg-[#63C0B0] text-white' : 'bg-[#1e293b] text-[#6B7280] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Head style */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6B7280]">Arrowhead</label>
        <div className="flex gap-1">
          {(['filled', 'open', 'none'] as ArrowHeadStyle[]).map(s => (
            <button
              key={s}
              onClick={() => update({ headStyle: s })}
              className={`flex-1 py-1 rounded text-xs capitalize transition-colors ${
                object.headStyle === s ? 'bg-[#63C0B0] text-white' : 'bg-[#1e293b] text-[#6B7280] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stroke width */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6B7280]">Width: {object.strokeWidth.toFixed(1)}</label>
        <input
          type="range" min={1} max={8} step={0.5}
          value={object.strokeWidth}
          onChange={e => update({ strokeWidth: parseFloat(e.target.value) })}
          className="w-full accent-[#63C0B0]"
        />
      </div>

      {/* Opacity */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6B7280]">Opacity: {Math.round(object.opacity * 100)}%</label>
        <input
          type="range" min={0} max={1} step={0.05}
          value={object.opacity}
          onChange={e => update({ opacity: parseFloat(e.target.value) })}
          className="w-full accent-[#63C0B0]"
        />
      </div>
    </div>
  );
}
