'use client';
import { useEditorStore } from '../../store/editorStore';
import type { ToolId } from '../../types';

interface ToolButton {
  id: ToolId;
  label: string;
  icon: string;
  title: string;
}

const TOOL_GROUPS: Array<{ label: string; tools: ToolButton[] }> = [
  {
    label: 'General',
    tools: [
      { id: 'select', label: 'Select', icon: '↖', title: 'Select tool (V)' },
      { id: 'pan', label: 'Pan', icon: '✋', title: 'Pan tool (Space)' },
    ],
  },
  {
    label: 'Players',
    tools: [
      { id: 'place-player-a', label: 'Team A', icon: 'A', title: 'Place Team A player' },
      { id: 'place-player-b', label: 'Team B', icon: 'B', title: 'Place Team B player' },
    ],
  },
  {
    label: 'Equipment',
    tools: [
      { id: 'place-cone', label: 'Cone', icon: '▲', title: 'Place cone' },
      { id: 'place-ball', label: 'Ball', icon: '●', title: 'Place ball' },
      { id: 'place-goal', label: 'Goal', icon: '⊞', title: 'Place goal' },
    ],
  },
  {
    label: 'Arrows',
    tools: [
      { id: 'draw-pass', label: 'Pass', icon: '→', title: 'Draw pass arrow' },
      { id: 'draw-run', label: 'Run', icon: '⇢', title: 'Draw run arrow' },
      { id: 'draw-dribble', label: 'Dribble', icon: '⤳', title: 'Draw dribble' },
      { id: 'draw-press', label: 'Press', icon: '⇥', title: 'Draw press' },
      { id: 'draw-support', label: 'Support', icon: '↗', title: 'Draw support run' },
    ],
  },
  {
    label: 'Shapes',
    tools: [
      { id: 'draw-zone', label: 'Zone', icon: '▭', title: 'Draw zone' },
      { id: 'draw-rect', label: 'Rect', icon: '□', title: 'Draw rectangle' },
      { id: 'draw-circle', label: 'Circle', icon: '○', title: 'Draw circle' },
      { id: 'draw-text', label: 'Text', icon: 'T', title: 'Add text' },
      { id: 'draw-smart-cone-area', label: 'Cone Area', icon: '⊡', title: 'Smart cone area' },
    ],
  },
];

const TOOL_ACCENT: Partial<Record<ToolId, string>> = {
  'place-player-a': 'bg-[#E63946]/20 text-[#E63946]',
  'place-player-b': 'bg-[#2176AE]/20 text-[#2176AE]',
  'draw-pass': 'bg-white/10 text-white',
  'draw-run': 'bg-[#63C0B0]/20 text-[#63C0B0]',
  'draw-dribble': 'bg-[#FFC857]/20 text-[#FFC857]',
  'draw-press': 'bg-[#E63946]/20 text-[#E63946]',
  'draw-support': 'bg-[#8DD3C7]/20 text-[#8DD3C7]',
};

export function Toolbar() {
  const activeTool = useEditorStore(s => s.activeTool);
  const setActiveTool = useEditorStore(s => s.setActiveTool);

  return (
    <div className="w-14 bg-[#0F172A] border-r border-[#1e293b] flex flex-col items-center py-2 gap-1 overflow-y-auto flex-shrink-0">
      {TOOL_GROUPS.map((group, gi) => (
        <div key={group.label} className={`flex flex-col items-center gap-0.5 w-full px-1 ${gi > 0 ? 'mt-1 pt-1 border-t border-[#1e293b]' : ''}`}>
          <span className="text-[9px] text-[#374151] uppercase tracking-wide mb-0.5 hidden">
            {group.label}
          </span>
          {group.tools.map(tool => {
            const isActive = activeTool === tool.id;
            const accent = TOOL_ACCENT[tool.id];
            return (
              <button
                key={tool.id}
                title={tool.title}
                onClick={() => setActiveTool(tool.id)}
                className={`w-full flex flex-col items-center py-1.5 px-1 rounded transition-all text-center ${
                  isActive
                    ? (accent ?? 'bg-[#63C0B0]/20 text-[#63C0B0]') + ' ring-1 ring-[#63C0B0]/40'
                    : 'text-[#6B7280] hover:text-[#9CA3AF] hover:bg-[#1e293b]'
                }`}
              >
                <span className={`text-base leading-none font-medium ${isActive ? '' : ''}`}>{tool.icon}</span>
                <span className="text-[9px] leading-none mt-0.5 font-medium">{tool.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
