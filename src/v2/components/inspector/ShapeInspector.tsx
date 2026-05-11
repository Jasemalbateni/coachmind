'use client';
import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { ZoneObject, RectObject, CircleObject } from '../../types';

type ShapeObj = ZoneObject | RectObject | CircleObject;

interface Props { object: ShapeObj; }

export function ShapeInspector({ object }: Props) {
  const updateObject = useEditorStore(s => s.updateObject);

  const update = (patch: Partial<ShapeObj>) => {
    updateObject(object.id, patch as Parameters<typeof updateObject>[1]);
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
        {object.type.charAt(0).toUpperCase() + object.type.slice(1)}
      </h3>

      {/* Fill color */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6B7280]">Fill Color</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={object.fill}
            onChange={e => update({ fill: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
          />
          <span className="text-xs text-[#6B7280] font-mono">{object.fill}</span>
        </div>
      </div>

      {/* Fill opacity */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6B7280]">Fill Opacity: {Math.round(object.fillOpacity * 100)}%</label>
        <input
          type="range" min={0} max={1} step={0.05}
          value={object.fillOpacity}
          onChange={e => update({ fillOpacity: parseFloat(e.target.value) })}
          className="w-full accent-[#63C0B0]"
        />
      </div>

      {/* Stroke color */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6B7280]">Stroke Color</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={object.stroke}
            onChange={e => update({ stroke: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
          />
          <span className="text-xs text-[#6B7280] font-mono">{object.stroke}</span>
        </div>
      </div>

      {/* Stroke width */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6B7280]">Stroke Width: {object.strokeWidth}</label>
        <input
          type="range" min={0} max={8} step={0.5}
          value={object.strokeWidth}
          onChange={e => update({ strokeWidth: parseFloat(e.target.value) })}
          className="w-full accent-[#63C0B0]"
        />
      </div>

      {/* Dashed */}
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm text-[#9CA3AF]">Dashed border</span>
        <div
          onClick={() => update({ strokeDashed: !object.strokeDashed })}
          className={`w-9 h-5 rounded-full transition-colors relative ${
            object.strokeDashed ? 'bg-[#63C0B0]' : 'bg-[#374151]'
          }`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            object.strokeDashed ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </div>
      </label>

      {/* Corner radius for rect */}
      {object.type === 'rect' && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#6B7280]">Corner Radius: {(object as RectObject).cornerRadius}</label>
          <input
            type="range" min={0} max={40} step={1}
            value={(object as RectObject).cornerRadius}
            onChange={e => update({ cornerRadius: parseInt(e.target.value) } as Partial<RectObject>)}
            className="w-full accent-[#63C0B0]"
          />
        </div>
      )}

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

      {/* Locked / Visible */}
      {[
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
  );
}
