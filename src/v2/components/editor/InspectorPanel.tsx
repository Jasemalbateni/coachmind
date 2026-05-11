'use client';
import { useEditorStore } from '../../store/editorStore';
import { PlayerInspector } from '../inspector/PlayerInspector';
import { ArrowInspector } from '../inspector/ArrowInspector';
import { ShapeInspector } from '../inspector/ShapeInspector';
import type { PlayerObject, ArrowObject, ZoneObject, RectObject, CircleObject } from '../../types';

export function InspectorPanel() {
  const selectedIds = useEditorStore(s => s.selectedIds);
  const getObject = useEditorStore(s => s.getObject);
  const bringToFront = useEditorStore(s => s.bringToFront);
  const sendToBack = useEditorStore(s => s.sendToBack);
  const bringForward = useEditorStore(s => s.bringForward);
  const sendBackward = useEditorStore(s => s.sendBackward);
  const deleteSelected = useEditorStore(s => s.deleteSelected);
  const duplicateSelected = useEditorStore(s => s.duplicateSelected);

  if (selectedIds.length === 0) {
    return (
      <div className="w-56 bg-[#0F172A] border-l border-[#1e293b] flex flex-col">
        <div className="p-3 border-b border-[#1e293b]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Inspector</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-[#374151] text-center px-4">Select an object to edit its properties</p>
        </div>
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <div className="w-56 bg-[#0F172A] border-l border-[#1e293b] flex flex-col">
        <div className="p-3 border-b border-[#1e293b]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Inspector</h2>
        </div>
        <div className="p-3 flex flex-col gap-2">
          <p className="text-sm text-[#9CA3AF]">{selectedIds.length} objects selected</p>
          <button
            onClick={duplicateSelected}
            className="w-full py-1.5 rounded text-xs bg-[#1e293b] text-[#9CA3AF] hover:text-white hover:bg-[#2d3748] transition-colors"
          >
            Duplicate All
          </button>
          <button
            onClick={deleteSelected}
            className="w-full py-1.5 rounded text-xs bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/30 transition-colors"
          >
            Delete All
          </button>
        </div>
      </div>
    );
  }

  const obj = getObject(selectedIds[0]);
  if (!obj) return null;

  return (
    <div className="w-56 bg-[#0F172A] border-l border-[#1e293b] flex flex-col overflow-y-auto">
      <div className="p-3 border-b border-[#1e293b]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Inspector</h2>
      </div>

      {/* Type-specific inspector */}
      {obj.type === 'player' && <PlayerInspector object={obj as PlayerObject} />}
      {obj.type === 'arrow' && <ArrowInspector object={obj as ArrowObject} />}
      {(obj.type === 'zone' || obj.type === 'rect' || obj.type === 'circle') && (
        <ShapeInspector object={obj as ZoneObject | RectObject | CircleObject} />
      )}

      {/* Z-order controls */}
      <div className="p-3 border-t border-[#1e293b] mt-auto">
        <p className="text-xs text-[#6B7280] mb-2">Layer Order</p>
        <div className="grid grid-cols-2 gap-1">
          {[
            { label: 'Front', fn: () => bringToFront(obj.id) },
            { label: 'Back', fn: () => sendToBack(obj.id) },
            { label: 'Forward', fn: () => bringForward(obj.id) },
            { label: 'Backward', fn: () => sendBackward(obj.id) },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              className="py-1 rounded text-xs bg-[#1e293b] text-[#9CA3AF] hover:text-white hover:bg-[#2d3748] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={deleteSelected}
          className="w-full mt-2 py-1.5 rounded text-xs bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/30 transition-colors"
        >
          Delete
        </button>
        <button
          onClick={duplicateSelected}
          className="w-full mt-1 py-1.5 rounded text-xs bg-[#1e293b] text-[#9CA3AF] hover:text-white hover:bg-[#2d3748] transition-colors"
        >
          Duplicate
        </button>
      </div>
    </div>
  );
}
