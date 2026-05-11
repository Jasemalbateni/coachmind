'use client';
import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { PlayerObject } from '../../types';

interface Props { object: PlayerObject; }

export function PlayerInspector({ object }: Props) {
  const updateObject = useEditorStore(s => s.updateObject);

  const update = (patch: Partial<PlayerObject>) => {
    updateObject(object.id, patch as Parameters<typeof updateObject>[1]);
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Player</h3>

      {/* Number & Name */}
      <div className="flex gap-2">
        <div className="flex flex-col gap-1 flex-shrink-0 w-14">
          <label className="text-xs text-[#6B7280]">#</label>
          <input
            type="text"
            value={object.number}
            onChange={e => update({ number: e.target.value })}
            maxLength={3}
            className="w-full bg-[#1e293b] border border-[#E2E8F0]/20 rounded px-2 py-1 text-white text-sm text-center"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-[#6B7280]">Name</label>
          <input
            type="text"
            value={object.name}
            onChange={e => update({ name: e.target.value })}
            placeholder="Player name"
            className="w-full bg-[#1e293b] border border-[#E2E8F0]/20 rounded px-2 py-1 text-white text-sm"
          />
        </div>
      </div>

      {/* Team */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6B7280]">Team</label>
        <div className="flex gap-1">
          {(['A', 'B'] as const).map(t => (
            <button
              key={t}
              onClick={() => update({ team: t })}
              className={`flex-1 py-1 rounded text-sm font-medium transition-colors ${
                object.team === t
                  ? t === 'A' ? 'bg-[#E63946] text-white' : 'bg-[#2176AE] text-white'
                  : 'bg-[#1e293b] text-[#6B7280] hover:text-white'
              }`}
            >
              Team {t}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-2">
        {[
          { label: 'Goalkeeper', key: 'isGoalkeeper' as const },
          { label: 'Bib', key: 'bib' as const },
          { label: 'Locked', key: 'locked' as const },
          { label: 'Visible', key: 'visible' as const },
        ].map(({ label, key }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-[#9CA3AF]">{label}</span>
            <div
              onClick={() => update({ [key]: !object[key] })}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                object[key] ? 'bg-[#63C0B0]' : 'bg-[#374151]'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                object[key] ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </div>
          </label>
        ))}
      </div>

      {/* Color */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6B7280]">Color</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={object.color}
            onChange={e => update({ color: e.target.value, teamColorInherited: false })}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
          />
          <span className="text-xs text-[#6B7280] font-mono">{object.color}</span>
        </div>
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
