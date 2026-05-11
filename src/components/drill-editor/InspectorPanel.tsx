'use client';

import type {
  CanvasObject, PlayerObject, ConeObject, BallObject, GoalObject,
  ArrowObject, ZoneObject, CircleShapeObject, RectangleObject, LineObject, CurvedLineObject, LinkObject,
  FocusZoneObject, SmartConeAreaObject, TextObject,
} from '@/types';
import { CONE_VARIANTS } from '@/lib/fieldAssets';

export type AlignType =
  | 'left' | 'center-x' | 'right'
  | 'top' | 'center-y' | 'bottom'
  | 'distribute-h' | 'distribute-v';

interface Props {
  selectedObject: CanvasObject | null;
  selectedIds?: string[];
  allObjects?: CanvasObject[];
  playerScale?: number;
  onUpdate: (updates: Partial<CanvasObject>) => void;
  /** Bulk update by id — used by the multi-select bulk-style editor so it can
   * apply the same color / stroke width to every selected line/arrow/curved. */
  onUpdateById?: (id: string, updates: Partial<CanvasObject>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDeleteSelected?: () => void;
  onAlignDistribute?: (type: AlignType) => void;
}

/** Object types that share the color + strokeWidth style surface. */
const LINE_TYPES = new Set<string>(['arrow', 'line', 'curved']);

function getObjectSize(obj: CanvasObject, playerScale = 1): { w: number; h: number } | null {
  switch (obj.type) {
    case 'cone': {
      const sz = Math.round((obj as ConeObject).size ?? 16);
      return { w: sz, h: sz };
    }
    case 'ball': {
      const sz = Math.round((obj as BallObject).size ?? 16);
      return { w: sz, h: sz };
    }
    case 'goal': {
      const g = obj as GoalObject;
      const full = g.size === 'full';
      return { w: Math.round(g.imgW ?? (full ? 22 : 20)), h: Math.round(g.imgH ?? (full ? 52 : 38)) };
    }
    case 'player': {
      const d = Math.round((16 * playerScale + 4) * 2);
      return { w: d, h: d };
    }
    case 'zone':
    case 'rectangle':
    case 'focus-zone':
    case 'smart-cone-area': {
      const o = obj as { width: number; height: number };
      return { w: Math.round(o.width), h: Math.round(o.height) };
    }
    case 'circle': {
      const d = Math.round((obj as CircleShapeObject).radius * 2);
      return { w: d, h: d };
    }
    case 'text': {
      const t = obj as TextObject;
      return { w: Math.round(t.width ?? 120), h: Math.round((t.fontSize ?? 16) * 1.4 + 8) };
    }
    default: return null;
  }
}

const Row = ({ children }: { children: React.ReactNode }) => <div className="mb-3">{children}</div>;
const Label = ({ children }: { children: React.ReactNode }) => <label className="text-xs text-gray-500 mb-1 block">{children}</label>;

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value.startsWith('#') ? value : '#ffffff'} onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-emerald-500" />
    </div>
  );
}

function TogglePair({ options, value, onChange }: { options: { v: string; l: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button key={opt.v} onClick={() => onChange(opt.v)}
          className={`flex-1 py-1 rounded text-xs border transition-colors ${value === opt.v ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}>
          {opt.l}
        </button>
      ))}
    </div>
  );
}

function LockRow({ locked, onUpdate }: { locked?: boolean; onUpdate: (u: Partial<CanvasObject>) => void }) {
  return (
    <Row>
      <Label>Locked</Label>
      <TogglePair
        options={[{ v: 'false', l: 'Unlocked' }, { v: 'true', l: 'Locked' }]}
        value={String(locked ?? false)}
        onChange={(v) => onUpdate({ locked: v === 'true' } as Partial<CanvasObject>)}
      />
    </Row>
  );
}

function PlayerInspector({ obj, onUpdate }: { obj: PlayerObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  const isGK = obj.isGoalkeeper || obj.number === '1' || obj.number === '12';
  const showNumber = obj.showNumber !== false;

  return (
    <>
      <Row>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate({ isGoalkeeper: !obj.isGoalkeeper } as Partial<PlayerObject>)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
              isGK ? 'bg-amber-900/40 border-amber-600 text-amber-400' : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isGK ? 'bg-amber-400' : 'bg-gray-600'}`} />
            Goalkeeper
          </button>
          {isGK && <span className="text-xs text-amber-500/70">gold fill applied</span>}
        </div>
      </Row>
      <Row>
        <Label>Fill Color</Label>
        <ColorInput
          value={obj.color}
          onChange={(v) => onUpdate({ color: v, teamColorInherited: false } as Partial<PlayerObject>)}
        />
        {obj.teamColorInherited ? (
          <p className="text-xs text-emerald-700 mt-1">&#8635; Synced with team color</p>
        ) : (
          <button
            className="text-xs text-gray-700 hover:text-gray-500 mt-1 transition-colors"
            onClick={() => onUpdate({ teamColorInherited: true } as Partial<PlayerObject>)}
          >
            &#8634; Reset to team color
          </button>
        )}
      </Row>
      <Row>
        <Label>Stroke Color</Label>
        <ColorInput value={obj.strokeColor ?? '#ffffff'} onChange={(v) => onUpdate({ strokeColor: v } as Partial<PlayerObject>)} />
      </Row>
      <Row>
        <Label>Number Color</Label>
        <ColorInput value={obj.numberColor ?? '#ffffff'} onChange={(v) => onUpdate({ numberColor: v } as Partial<PlayerObject>)} />
      </Row>
      <Row>
        <Label>Team</Label>
        <TogglePair options={[{ v: 'A', l: 'Team A' }, { v: 'B', l: 'Team B' }]} value={obj.team ?? 'A'}
          onChange={(v) => onUpdate({ team: v as 'A' | 'B' } as Partial<PlayerObject>)} />
      </Row>
      <Row>
        <Label>Show Number</Label>
        <TogglePair
          options={[{ v: 'true', l: 'Show' }, { v: 'false', l: 'Hide' }]}
          value={String(showNumber)}
          onChange={(v) => onUpdate({ showNumber: v === 'true' } as Partial<PlayerObject>)}
        />
      </Row>
      {showNumber && (
        <Row>
          <Label>Number</Label>
          <input type="text" value={obj.number ?? ''} onChange={(e) => onUpdate({ number: e.target.value } as Partial<PlayerObject>)}
            maxLength={3} placeholder="–" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500" />
        </Row>
      )}
      <Row>
        <Label>Name</Label>
        <input type="text" value={obj.name ?? ''} onChange={(e) => onUpdate({ name: e.target.value } as Partial<PlayerObject>)}
          placeholder="Player name" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500" />
      </Row>
      <Row>
        <Label>Rotation</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={-180} max={180} value={obj.rotation ?? 0}
            onChange={(e) => onUpdate({ rotation: Number(e.target.value) } as Partial<PlayerObject>)} className="flex-1 accent-emerald-500" />
          <span className="text-xs text-gray-500 w-10 text-right">{Math.round(obj.rotation ?? 0)}°</span>
        </div>
      </Row>
      <Row>
        <Label>Training Bib</Label>
        <TogglePair
          options={[{ v: 'false', l: 'No Bib' }, { v: 'true', l: 'Bib On' }]}
          value={String(obj.bib ?? false)}
          onChange={(v) => onUpdate({ bib: v === 'true' } as Partial<PlayerObject>)}
        />
      </Row>
      {obj.bib && (
        <Row>
          <Label>Bib Color</Label>
          <ColorInput value={obj.bibColor ?? '#fbbf24'} onChange={(v) => onUpdate({ bibColor: v } as Partial<PlayerObject>)} />
        </Row>
      )}
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

function ConeInspector({ obj, onUpdate }: { obj: ConeObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  const currentVariant = obj.imageVariant ?? 'cone';
  return (
    <>
      <Row>
        <Label>Cone Variant</Label>
        <div className="grid grid-cols-5 gap-1">
          {CONE_VARIANTS.map(v => (
            <button key={v.key} onClick={() => onUpdate({ imageVariant: v.key } as Partial<ConeObject>)}
              title={v.label}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-colors ${
                currentVariant === v.key
                  ? 'border-emerald-500 bg-emerald-600/15'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}>
              <img src={`/field-assets/${v.key}.png`} className="w-6 h-6 object-contain" alt={v.label} />
              <span className="text-[9px] text-gray-500 leading-none">{v.label}</span>
            </button>
          ))}
        </div>
      </Row>
      <Row>
        <Label>Rotation</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={-180} max={180} value={obj.rotation ?? 0}
            onChange={(e) => onUpdate({ rotation: Number(e.target.value) } as Partial<ConeObject>)} className="flex-1 accent-emerald-500" />
          <span className="text-xs text-gray-500 w-10 text-right">{Math.round(obj.rotation ?? 0)}°</span>
        </div>
      </Row>
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

function BallInspector({ obj, onUpdate }: { obj: BallObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  return (
    <>
      <Row>
        <Label>Rotation</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={-180} max={180} value={obj.rotation ?? 0}
            onChange={(e) => onUpdate({ rotation: Number(e.target.value) } as Partial<BallObject>)} className="flex-1 accent-emerald-500" />
          <span className="text-xs text-gray-500 w-10 text-right">{Math.round(obj.rotation ?? 0)}°</span>
        </div>
      </Row>
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

function GoalInspector({ obj, onUpdate }: { obj: GoalObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  return (
    <>
      <Row>
        <Label>Size</Label>
        <TogglePair options={[{ v: 'full', l: 'Full' }, { v: 'small', l: 'Small' }]} value={obj.size}
          onChange={(v) => onUpdate({ size: v as 'full' | 'small' } as Partial<GoalObject>)} />
      </Row>
      <Row>
        <Label>Rotation</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={-180} max={180} value={obj.rotation ?? 0}
            onChange={(e) => onUpdate({ rotation: Number(e.target.value) } as Partial<GoalObject>)} className="flex-1 accent-emerald-500" />
          <span className="text-xs text-gray-500 w-10 text-right">{Math.round(obj.rotation ?? 0)}°</span>
        </div>
      </Row>
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

function ArrowInspector({ obj, onUpdate }: { obj: ArrowObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  return (
    <>
      {obj.arrowShape === 'zigzag' && (
        <div className="mb-3 px-2 py-1.5 bg-amber-900/20 border border-amber-700/40 rounded text-xs text-amber-400 flex items-center gap-1.5">
          <span>~</span> <span>Zigzag / Dribble arrow</span>
          <button className="ml-auto text-amber-700 hover:text-amber-500 transition-colors"
            onClick={() => onUpdate({ arrowShape: undefined } as Partial<ArrowObject>)}
            title="Convert to straight arrow">
            → straight
          </button>
        </div>
      )}
      {obj.tacticType && (
        <div className="mb-3 px-2 py-1.5 bg-emerald-900/20 border border-emerald-800/40 rounded text-xs text-emerald-400 uppercase tracking-wider">
          Tactic: {obj.tacticType}
        </div>
      )}
      <Row><Label>Color</Label><ColorInput value={obj.color} onChange={(v) => onUpdate({ color: v } as Partial<ArrowObject>)} /></Row>
      <Row>
        <Label>Style</Label>
        <TogglePair options={[{ v: 'solid', l: 'Solid' }, { v: 'dashed', l: 'Dashed' }]} value={obj.style}
          onChange={(v) => onUpdate({ style: v as 'solid' | 'dashed' } as Partial<ArrowObject>)} />
      </Row>
      <Row>
        <Label>Head</Label>
        <TogglePair options={[{ v: 'filled', l: 'Filled' }, { v: 'open', l: 'Open' }]} value={obj.headStyle}
          onChange={(v) => onUpdate({ headStyle: v as 'filled' | 'open' } as Partial<ArrowObject>)} />
      </Row>
      <Row>
        <Label>Thickness</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={1} max={8} step={0.5} value={obj.strokeWidth ?? 2.5}
            onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) } as Partial<ArrowObject>)} className="flex-1 accent-emerald-500" />
          <span className="text-xs text-gray-500 w-6 text-right">{obj.strokeWidth ?? 2.5}</span>
        </div>
      </Row>
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

function ZoneInspector({ obj, onUpdate }: { obj: ZoneObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  return (
    <>
      <Row><Label>Fill Color</Label><ColorInput value={obj.fill} onChange={(v) => onUpdate({ fill: v } as Partial<ZoneObject>)} /></Row>
      <Row>
        <Label>Opacity — {Math.round(obj.opacity * 100)}%</Label>
        <input type="range" min={0} max={1} step={0.05} value={obj.opacity}
          onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) } as Partial<ZoneObject>)} className="w-full accent-emerald-500" />
      </Row>
      <Row><Label>Stroke Color</Label><ColorInput value={obj.strokeColor ?? 'rgba(255,255,255,0.35)'} onChange={(v) => onUpdate({ strokeColor: v } as Partial<ZoneObject>)} /></Row>
      <Row>
        <Label>Stroke Width</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={6} step={0.5} value={obj.strokeWidth ?? 1}
            onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) } as Partial<ZoneObject>)} className="flex-1 accent-emerald-500" />
          <span className="text-xs text-gray-500 w-6 text-right">{obj.strokeWidth ?? 1}</span>
        </div>
      </Row>
      <Row>
        <Label>Label</Label>
        <input type="text" value={obj.label ?? ''} onChange={(e) => onUpdate({ label: e.target.value } as Partial<ZoneObject>)}
          placeholder="Zone label…" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500" />
      </Row>
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

function CircleInspector({ obj, onUpdate }: { obj: CircleShapeObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  return (
    <>
      <Row><Label>Stroke Color</Label><ColorInput value={obj.stroke} onChange={(v) => onUpdate({ stroke: v } as Partial<CircleShapeObject>)} /></Row>
      <Row>
        <Label>Stroke Width</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={1} max={8} value={obj.strokeWidth}
            onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) } as Partial<CircleShapeObject>)} className="flex-1 accent-emerald-500" />
          <span className="text-xs text-gray-500 w-6 text-right">{obj.strokeWidth}</span>
        </div>
      </Row>
      <Row>
        <Label>Fill</Label>
        <TogglePair
          options={[{ v: 'off', l: 'None' }, { v: 'on', l: 'Color' }]}
          value={obj.fill ? 'on' : 'off'}
          onChange={(v) => onUpdate({ fill: v === 'on' ? '#ffffff' : undefined } as Partial<CircleShapeObject>)}
        />
      </Row>
      {obj.fill && (
        <Row><Label>Fill Color</Label><ColorInput value={obj.fill} onChange={(v) => onUpdate({ fill: v } as Partial<CircleShapeObject>)} /></Row>
      )}
      {obj.fill && (
        <Row>
          <Label>Fill Opacity — {Math.round((obj.fillOpacity ?? 1) * 100)}%</Label>
          <input type="range" min={0} max={1} step={0.05} value={obj.fillOpacity ?? 1}
            onChange={(e) => onUpdate({ fillOpacity: parseFloat(e.target.value) } as Partial<CircleShapeObject>)} className="w-full accent-emerald-500" />
        </Row>
      )}
      <Row>
        <Label>Overall Opacity — {Math.round((obj.opacity ?? 1) * 100)}%</Label>
        <input type="range" min={0} max={1} step={0.05} value={obj.opacity ?? 1}
          onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) } as Partial<CircleShapeObject>)} className="w-full accent-emerald-500" />
      </Row>
      <Row>
        <Label>Outline Style</Label>
        <TogglePair options={[{ v: 'false', l: 'Solid' }, { v: 'true', l: 'Dashed' }]}
          value={String(obj.dashed ?? false)} onChange={(v) => onUpdate({ dashed: v === 'true' } as Partial<CircleShapeObject>)} />
      </Row>
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

function RectInspector({ obj, onUpdate }: { obj: RectangleObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  return (
    <>
      <Row><Label>Stroke Color</Label><ColorInput value={obj.stroke} onChange={(v) => onUpdate({ stroke: v } as Partial<RectangleObject>)} /></Row>
      <Row>
        <Label>Stroke Width</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={1} max={8} value={obj.strokeWidth}
            onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) } as Partial<RectangleObject>)} className="flex-1 accent-emerald-500" />
          <span className="text-xs text-gray-500 w-6 text-right">{obj.strokeWidth}</span>
        </div>
      </Row>
      <Row>
        <Label>Fill</Label>
        <TogglePair
          options={[{ v: 'off', l: 'None' }, { v: 'on', l: 'Color' }]}
          value={obj.fill ? 'on' : 'off'}
          onChange={(v) => onUpdate({ fill: v === 'on' ? '#ffffff' : undefined } as Partial<RectangleObject>)}
        />
      </Row>
      {obj.fill && (
        <Row><Label>Fill Color</Label><ColorInput value={obj.fill} onChange={(v) => onUpdate({ fill: v } as Partial<RectangleObject>)} /></Row>
      )}
      {obj.fill && (
        <Row>
          <Label>Fill Opacity — {Math.round((obj.fillOpacity ?? 1) * 100)}%</Label>
          <input type="range" min={0} max={1} step={0.05} value={obj.fillOpacity ?? 1}
            onChange={(e) => onUpdate({ fillOpacity: parseFloat(e.target.value) } as Partial<RectangleObject>)} className="w-full accent-emerald-500" />
        </Row>
      )}
      <Row>
        <Label>Overall Opacity — {Math.round((obj.opacity ?? 1) * 100)}%</Label>
        <input type="range" min={0} max={1} step={0.05} value={obj.opacity ?? 1}
          onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) } as Partial<RectangleObject>)} className="w-full accent-emerald-500" />
      </Row>
      <Row>
        <Label>Outline Style</Label>
        <TogglePair options={[{ v: 'false', l: 'Solid' }, { v: 'true', l: 'Dashed' }]}
          value={String(obj.dashed ?? false)} onChange={(v) => onUpdate({ dashed: v === 'true' } as Partial<RectangleObject>)} />
      </Row>
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

function LineInspector({ obj, onUpdate }: { obj: LineObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  return (
    <>
      {obj.tacticType && (
        <div className="mb-3 px-2 py-1.5 bg-emerald-900/20 border border-emerald-800/40 rounded text-xs text-emerald-400 uppercase tracking-wider">
          Tactic: {obj.tacticType}
        </div>
      )}
      <Row><Label>Color</Label><ColorInput value={obj.color} onChange={(v) => onUpdate({ color: v } as Partial<LineObject>)} /></Row>
      <Row>
        <Label>Width</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={1} max={8} value={obj.strokeWidth}
            onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) } as Partial<LineObject>)} className="flex-1 accent-emerald-500" />
          <span className="text-xs text-gray-500 w-6 text-right">{obj.strokeWidth}</span>
        </div>
      </Row>
      <Row>
        <Label>Style</Label>
        <TogglePair options={[{ v: 'false', l: 'Solid' }, { v: 'true', l: 'Dashed' }]}
          value={String(obj.dashed ?? false)} onChange={(v) => onUpdate({ dashed: v === 'true' } as Partial<LineObject>)} />
      </Row>
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

function CurvedInspector({ obj, onUpdate }: { obj: CurvedLineObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  return (
    <>
      <div className="mb-3 px-2 py-1.5 bg-cyan-900/20 border border-cyan-800/40 rounded text-xs text-cyan-400 leading-relaxed">
        Drag the 3 cyan handles on the field to reshape the curve.
      </div>
      <Row><Label>Color</Label><ColorInput value={obj.color} onChange={(v) => onUpdate({ color: v } as Partial<CurvedLineObject>)} /></Row>
      <Row>
        <Label>Width</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={1} max={8} step={0.5} value={obj.strokeWidth}
            onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) } as Partial<CurvedLineObject>)} className="flex-1 accent-emerald-500" />
          <span className="text-xs text-gray-500 w-8 text-right">{obj.strokeWidth}</span>
        </div>
      </Row>
      <Row>
        <Label>Style</Label>
        <TogglePair options={[{ v: 'false', l: 'Solid' }, { v: 'true', l: 'Dashed' }]}
          value={String(obj.dashed ?? false)} onChange={(v) => onUpdate({ dashed: v === 'true' } as Partial<CurvedLineObject>)} />
      </Row>
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

function LinkInspector({ obj, onUpdate }: { obj: LinkObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  return (
    <>
      <Row><Label>Color</Label><ColorInput value={obj.color} onChange={(v) => onUpdate({ color: v } as Partial<LinkObject>)} /></Row>
      <Row>
        <Label>Style</Label>
        <TogglePair options={[{ v: 'false', l: 'Solid' }, { v: 'true', l: 'Dashed' }]}
          value={String(obj.dashed ?? false)} onChange={(v) => onUpdate({ dashed: v === 'true' } as Partial<LinkObject>)} />
      </Row>
      <Row>
        <Label>Label</Label>
        <input type="text" value={obj.label ?? ''} onChange={(e) => onUpdate({ label: e.target.value } as Partial<LinkObject>)}
          placeholder="Optional label" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500" />
      </Row>
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

// ─── Multi-select alignment toolbar ──────────────────────────────────────────

function AlignBtn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title}
      className="flex-1 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded transition-colors text-gray-400 hover:text-gray-200">
      {label}
    </button>
  );
}

function MultiSelectPanel({
  selectedIds,
  objects,
  onAlignDistribute,
  onDuplicate,
  onDeleteSelected,
  onUpdateById,
}: {
  selectedIds: string[];
  objects: CanvasObject[];
  onAlignDistribute: (type: AlignType) => void;
  onDuplicate: () => void;
  onDeleteSelected: () => void;
  onUpdateById?: (id: string, updates: Partial<CanvasObject>) => void;
}) {
  const count = selectedIds.length;
  const selectedObjs = selectedIds
    .map((id) => objects.find((x) => x.id === id))
    .filter((o): o is CanvasObject => !!o);

  const posCount = selectedObjs.filter((o) => 'x' in o).length;
  // All selected items belong to the line/arrow/curved family → show shared style controls
  const allLineLike = selectedObjs.length > 0 && selectedObjs.every((o) => LINE_TYPES.has(o.type));

  // Pick representative starting values from the first line-like object so the
  // controls have a sensible initial display.
  const firstLine = allLineLike
    ? (selectedObjs.find((o) => LINE_TYPES.has(o.type)) as ArrowObject | LineObject | CurvedLineObject | undefined)
    : undefined;

  const bulkSet = (updates: Partial<CanvasObject>) => {
    if (!onUpdateById) return;
    for (const o of selectedObjs) {
      if ('locked' in o && o.locked) continue;
      onUpdateById(o.id, updates);
    }
  };

  return (
    <div className="p-2.5 xl:p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400">{count} objects selected</span>
        <span className="text-xs text-gray-600 hidden xl:inline">{posCount} positional</span>
      </div>

      {/* Shared style controls — only when every selected object is a line-type
          (arrow / line / curved). Apply the same color and stroke width to all. */}
      {allLineLike && firstLine && onUpdateById && (
        <div className="mb-4 pb-4 border-b border-gray-800">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-1.5">Shared style</p>
          <Row>
            <Label>Color (applies to all)</Label>
            <ColorInput value={firstLine.color} onChange={(v) => bulkSet({ color: v } as Partial<CanvasObject>)} />
          </Row>
          <Row>
            <Label>Width (applies to all) — {firstLine.strokeWidth ?? 2}</Label>
            <div className="flex items-center gap-2">
              <input type="range" min={1} max={8} step={0.5} value={firstLine.strokeWidth ?? 2}
                onChange={(e) => bulkSet({ strokeWidth: Number(e.target.value) } as Partial<CanvasObject>)}
                className="flex-1 accent-emerald-500" />
              <span className="text-xs text-gray-500 w-8 text-right">{firstLine.strokeWidth ?? 2}</span>
            </div>
          </Row>
          <Row>
            <Label>Style</Label>
            <TogglePair
              options={[{ v: 'false', l: 'Solid' }, { v: 'true', l: 'Dashed' }]}
              value={String((firstLine as { dashed?: boolean }).dashed ?? false)}
              onChange={(v) => bulkSet({ dashed: v === 'true' } as Partial<CanvasObject>)}
            />
          </Row>
        </div>
      )}

      {posCount >= 2 && (
        <>
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-1.5">Align</p>
          <div className="flex gap-1 mb-1">
            <AlignBtn label="&#9095;&#8592;" title="Align Left" onClick={() => onAlignDistribute('left')} />
            <AlignBtn label="&#9095;&#9095;" title="Center Horizontally" onClick={() => onAlignDistribute('center-x')} />
            <AlignBtn label="&#8594;&#9095;" title="Align Right" onClick={() => onAlignDistribute('right')} />
          </div>
          <div className="flex gap-1 mb-3">
            <AlignBtn label="&#9014;&#8593;" title="Align Top" onClick={() => onAlignDistribute('top')} />
            <AlignBtn label="&#9014;&#9014;" title="Center Vertically" onClick={() => onAlignDistribute('center-y')} />
            <AlignBtn label="&#8595;&#9014;" title="Align Bottom" onClick={() => onAlignDistribute('bottom')} />
          </div>

          {posCount >= 3 && (
            <>
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-1.5">Distribute</p>
              <div className="flex gap-1 mb-3">
                <AlignBtn label="Horizontal" title="Distribute Horizontally" onClick={() => onAlignDistribute('distribute-h')} />
                <AlignBtn label="Vertical" title="Distribute Vertically" onClick={() => onAlignDistribute('distribute-v')} />
              </div>
            </>
          )}
        </>
      )}

      <div className="flex gap-2 mt-2">
        <button onClick={onDuplicate}
          className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-medium transition-colors text-gray-300">
          Duplicate All
        </button>
        <button onClick={onDeleteSelected}
          className="flex-1 py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 rounded-lg text-xs font-medium transition-colors">
          Delete All
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function FocusZoneInspector({ obj, onUpdate }: { obj: FocusZoneObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  return (
    <>
      <div className="mb-3 px-2 py-2 bg-blue-900/20 border border-blue-800/40 rounded text-xs text-blue-400 leading-relaxed">
        Spotlight — dims the area outside this zone. Drag corners to resize.
      </div>
      <Row>
        <Label>Overlay Darkness — {Math.round((obj.overlayOpacity ?? 0.3) * 100)}%</Label>
        <input type="range" min={0.05} max={0.85} step={0.05} value={obj.overlayOpacity ?? 0.3}
          onChange={(e) => onUpdate({ overlayOpacity: parseFloat(e.target.value) } as Partial<FocusZoneObject>)}
          className="w-full accent-emerald-500" />
      </Row>
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

function SmartConeAreaInspector({ obj, onUpdate }: { obj: SmartConeAreaObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  return (
    <>
      <div className="mb-3 px-2 py-2 bg-orange-900/20 border border-orange-800/40 rounded text-xs text-orange-400 leading-relaxed">
        Smart Cone Area — cones auto-placed at corners + extras along each side. Drag corners to resize.
      </div>
      <Row>
        <Label>Cone Type</Label>
        <div className="grid grid-cols-5 gap-1">
          {CONE_VARIANTS.map(v => (
            <button key={v.key} onClick={() => onUpdate({ coneVariant: v.key } as Partial<SmartConeAreaObject>)}
              title={v.label}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-colors ${
                (obj.coneVariant ?? 'cone') === v.key
                  ? 'border-emerald-500 bg-emerald-600/15'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}>
              <img src={`/field-assets/${v.key}.png`} className="w-6 h-6 object-contain" alt={v.label} />
              <span className="text-[9px] text-gray-500 leading-none">{v.label}</span>
            </button>
          ))}
        </div>
      </Row>
      <Row>
        <Label>Cone Color (fallback)</Label>
        <ColorInput value={obj.coneColor ?? '#f97316'} onChange={(v) => onUpdate({ coneColor: v } as Partial<SmartConeAreaObject>)} />
      </Row>
      <Row>
        <Label>Extra Cones per Side — {obj.extraConesPerSide ?? 1}</Label>
        <div className="flex gap-1 flex-wrap">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button key={n} onClick={() => onUpdate({ extraConesPerSide: n } as Partial<SmartConeAreaObject>)}
              className={`w-8 py-1 rounded text-xs border transition-colors ${
                (obj.extraConesPerSide ?? 1) === n
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}>
              {n}
            </button>
          ))}
        </div>
      </Row>
      <Row>
        <Label>Border</Label>
        <TogglePair
          options={[{ v: 'true', l: 'Show' }, { v: 'false', l: 'Hide' }]}
          value={String(obj.showBorder !== false)}
          onChange={(v) => onUpdate({ showBorder: v === 'true' } as Partial<SmartConeAreaObject>)}
        />
      </Row>
      {obj.showBorder !== false && (
        <>
          <Row><Label>Border Color</Label>
            <ColorInput value={obj.borderColor ?? 'rgba(255,255,255,0.35)'} onChange={(v) => onUpdate({ borderColor: v } as Partial<SmartConeAreaObject>)} />
          </Row>
          <Row>
            <Label>Border Style</Label>
            <TogglePair options={[{ v: 'false', l: 'Solid' }, { v: 'true', l: 'Dashed' }]}
              value={String(obj.borderDashed !== false)}
              onChange={(v) => onUpdate({ borderDashed: v === 'true' } as Partial<SmartConeAreaObject>)} />
          </Row>
        </>
      )}
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

function TextInspector({ obj, onUpdate }: { obj: TextObject; onUpdate: (u: Partial<CanvasObject>) => void }) {
  const FONTS = ['sans-serif', 'serif', 'monospace', 'Arial', 'Georgia', 'Verdana', 'Impact'];
  return (
    <>
      <Row>
        <Label>Text</Label>
        <textarea
          value={obj.text}
          onChange={(e) => onUpdate({ text: e.target.value } as Partial<TextObject>)}
          rows={3}
          placeholder="Enter text…"
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 resize-none focus:outline-none focus:border-emerald-500"
        />
      </Row>
      <Row><Label>Color</Label><ColorInput value={obj.color ?? '#ffffff'} onChange={(v) => onUpdate({ color: v } as Partial<TextObject>)} /></Row>
      <Row>
        <Label>Font Size — {obj.fontSize}px</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={8} max={72} value={obj.fontSize}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) } as Partial<TextObject>)} className="flex-1 accent-emerald-500" />
          <span className="text-xs text-gray-500 w-8 text-right">{obj.fontSize}</span>
        </div>
      </Row>
      <Row>
        <Label>Font Family</Label>
        <select value={obj.fontFamily ?? 'sans-serif'}
          onChange={(e) => onUpdate({ fontFamily: e.target.value } as Partial<TextObject>)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500">
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Row>
      <Row>
        <Label>Weight</Label>
        <TogglePair options={[{ v: 'normal', l: 'Normal' }, { v: 'bold', l: 'Bold' }]}
          value={obj.fontWeight ?? 'normal'}
          onChange={(v) => onUpdate({ fontWeight: v as 'normal' | 'bold' } as Partial<TextObject>)} />
      </Row>
      <Row>
        <Label>Style</Label>
        <TogglePair options={[{ v: 'normal', l: 'Normal' }, { v: 'italic', l: 'Italic' }]}
          value={obj.fontStyle ?? 'normal'}
          onChange={(v) => onUpdate({ fontStyle: v as 'normal' | 'italic' } as Partial<TextObject>)} />
      </Row>
      <Row>
        <Label>Alignment</Label>
        <TogglePair options={[{ v: 'left', l: 'Left' }, { v: 'center', l: 'Center' }, { v: 'right', l: 'Right' }]}
          value={obj.align ?? 'left'}
          onChange={(v) => onUpdate({ align: v as 'left' | 'center' | 'right' } as Partial<TextObject>)} />
      </Row>
      <Row>
        <Label>Text Box Border</Label>
        <TogglePair options={[{ v: 'false', l: 'None' }, { v: 'true', l: 'Show' }]}
          value={String(obj.showBox ?? false)}
          onChange={(v) => onUpdate({ showBox: v === 'true' } as Partial<TextObject>)} />
      </Row>
      {obj.showBox && (
        <>
          <Row><Label>Border Color</Label><ColorInput value={obj.boxBorderColor ?? '#ffffff'} onChange={(v) => onUpdate({ boxBorderColor: v } as Partial<TextObject>)} /></Row>
          <Row>
            <Label>Border Width</Label>
            <div className="flex items-center gap-2">
              <input type="range" min={1} max={6} step={0.5} value={obj.boxBorderWidth ?? 1.5}
                onChange={(e) => onUpdate({ boxBorderWidth: Number(e.target.value) } as Partial<TextObject>)} className="flex-1 accent-emerald-500" />
              <span className="text-xs text-gray-500 w-6 text-right">{obj.boxBorderWidth ?? 1.5}</span>
            </div>
          </Row>
        </>
      )}
      <LockRow locked={obj.locked} onUpdate={onUpdate} />
    </>
  );
}

const TYPE_LABELS: Record<string, string> = {
  player: 'Player', cone: 'Cone', ball: 'Ball', goal: 'Goal',
  arrow: 'Arrow', zone: 'Zone', circle: 'Circle', rectangle: 'Rectangle',
  line: 'Line', curved: 'Curved Line', link: 'Player Link', 'focus-zone': 'Focus Zone',
  'smart-cone-area': 'Smart Cone Area', text: 'Text',
};

export default function InspectorPanel({
  selectedObject, selectedIds = [], allObjects = [], playerScale = 1,
  onUpdate, onUpdateById, onDelete, onDuplicate, onDeleteSelected, onAlignDistribute,
}: Props) {
  // Multi-select panel takes priority when 2+ items are selected
  const isMulti = selectedIds.length >= 2;

  // iPad/tablet (< xl): tighter padding so a narrow 224-px panel stays
  // breathable. Desktop (≥ xl): full padding for the wider 288-px panel.
  if (isMulti && onAlignDistribute && onDeleteSelected) {
    return (
      <div className="flex flex-col shrink-0">
        <div className="flex items-center justify-between px-2.5 xl:px-4 pt-3 xl:pt-4 pb-2 shrink-0 border-b border-gray-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Multi-select</p>
        </div>
        <MultiSelectPanel
          selectedIds={selectedIds}
          objects={allObjects}
          onAlignDistribute={onAlignDistribute}
          onDuplicate={onDuplicate}
          onDeleteSelected={onDeleteSelected}
          onUpdateById={onUpdateById}
        />
      </div>
    );
  }

  if (!selectedObject) {
    return (
      <div className="flex flex-col shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 p-3 xl:p-4">Inspector</p>
        <div className="flex items-center justify-center p-3 xl:p-4 min-h-[120px]">
          <p className="text-xs text-gray-700 text-center leading-relaxed">
            Click an object to edit<br />
            <span className="text-gray-800">Shift+click or drag to multi-select</span>
          </p>
        </div>
      </div>
    );
  }

  const isLocked = 'locked' in selectedObject && selectedObject.locked;
  const objSize = getObjectSize(selectedObject, playerScale);

  return (
    <div className="flex flex-col shrink-0">
      <div className="flex items-center justify-between px-2.5 xl:px-4 pt-3 xl:pt-4 pb-2 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 truncate">
          {TYPE_LABELS[selectedObject.type] ?? selectedObject.type}
          {isLocked && <span className="ml-2 text-amber-500 font-normal">[locked]</span>}
        </p>
        <span className="text-xs bg-gray-800 text-gray-600 px-2 py-0.5 rounded shrink-0 hidden xl:inline">{selectedObject.type}</span>
      </div>

      {objSize && (
        <div className="mx-2.5 xl:mx-4 mb-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800/60 rounded-lg border border-gray-700/50">
          <span className="text-xs text-gray-500 shrink-0">W</span>
          <span className="text-xs font-mono text-gray-300">{objSize.w}</span>
          <span className="text-xs text-gray-700 mx-0.5">×</span>
          <span className="text-xs text-gray-500 shrink-0">H</span>
          <span className="text-xs font-mono text-gray-300">{objSize.h}</span>
          <span className="text-xs text-gray-600 ml-0.5">px</span>
        </div>
      )}

      <div className="px-2.5 xl:px-4 overflow-y-auto">
        {selectedObject.type === 'player' && <PlayerInspector obj={selectedObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'cone' && <ConeInspector obj={selectedObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'ball' && <BallInspector obj={selectedObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'goal' && <GoalInspector obj={selectedObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'arrow' && <ArrowInspector obj={selectedObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'zone' && <ZoneInspector obj={selectedObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'circle' && <CircleInspector obj={selectedObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'rectangle' && <RectInspector obj={selectedObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'line' && <LineInspector obj={selectedObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'curved' && <CurvedInspector obj={selectedObject as CurvedLineObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'link' && <LinkInspector obj={selectedObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'focus-zone' && <FocusZoneInspector obj={selectedObject as FocusZoneObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'smart-cone-area' && <SmartConeAreaInspector obj={selectedObject as SmartConeAreaObject} onUpdate={onUpdate} />}
        {selectedObject.type === 'text' && <TextInspector obj={selectedObject as TextObject} onUpdate={onUpdate} />}
      </div>

      <div className="px-2.5 xl:px-4 pb-3 xl:pb-4 pt-2 border-t border-gray-800 flex gap-2 shrink-0">
        <button onClick={onDuplicate}
          className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-medium transition-colors">
          Duplicate
        </button>
        <button onClick={onDelete}
          className="flex-1 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 rounded-lg text-xs font-medium transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}
