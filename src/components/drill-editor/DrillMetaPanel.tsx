'use client';

import { useState } from 'react';
import type { Drill, PitchType } from '@/types';
import type { Team } from '@/types';


const PITCH_LABELS: Record<PitchType, string> = {
  full: 'Full Pitch',
  half: 'Half Pitch',
  third: 'Final Third',
  plain: 'Plain Area',
};

const PITCH_DIMS: Record<PitchType, { width: number; height: number }> = {
  full: { width: 840, height: 540 },
  half: { width: 840, height: 540 },
  third: { width: 840, height: 540 },
  plain: { width: 840, height: 540 },
};

interface Props {
  drill: Drill;
  teams: Record<string, Team>;
  onUpdate: (updates: Partial<Drill>) => void;
  alwaysOpen?: boolean;
  /** Render in wide 2-column modal layout (no max-height scroll) */
  modal?: boolean;
}

function FieldInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="mb-2.5">
      <label className="text-xs text-gray-500 mb-0.5 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div className="mb-2.5">
      <label className="text-xs text-gray-500 mb-0.5 block">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-emerald-500" />
    </div>
  );
}

/**
 * Textarea for editing a string[] stored as "one item per line".
 * Uses local raw-string state so pressing Enter inserts a real newline
 * instead of being swallowed by filter(Boolean) on every keystroke.
 * Pass `key={drill.id + '-fieldname'}` at call sites to reset when drill changes.
 */
function MultilineArrayInput({ label, value, onChange, placeholder, rows = 3 }: {
  label: string;
  value: string[];
  onChange: (lines: string[]) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [raw, setRaw] = useState(() => value.join('\n'));
  return (
    <div className="mb-2.5">
      <label className="text-xs text-gray-500 mb-0.5 block">{label}</label>
      <textarea
        value={raw}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          setRaw(v);
          onChange(v.split('\n').filter(Boolean));
        }}
        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-emerald-500"
      />
    </div>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const commit = (raw: string) => {
    const t = raw.trim().replace(/,$/, '').trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setDraft('');
  };
  return (
    <div className="mb-2.5">
      <label className="text-xs text-gray-500 mb-0.5 block">Tags</label>
      <input
        type="text" value={draft}
        placeholder="Add tag… (comma to confirm)"
        onChange={(e) => { const v = e.target.value; if (v.endsWith(',')) { commit(v); } else setDraft(v); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(draft); } }}
        onBlur={() => { if (draft.trim()) commit(draft); }}
        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500 mb-1.5"
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <button key={t} onClick={() => onChange(tags.filter((x) => x !== t))}
              className="flex items-center gap-1 px-2 py-0.5 bg-emerald-900/40 border border-emerald-700/50 rounded-full text-xs text-emerald-300 hover:bg-red-900/40 hover:border-red-700/50 hover:text-red-300 transition-colors">
              {t} <span className="opacity-60">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DrillMetaPanel({ drill, teams, onUpdate, alwaysOpen, modal }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const isOpen = alwaysOpen ? true : !collapsed;

  const grassColor = drill.pitch.colors?.grass ?? '#2d6a4f';
  const grassSecondary = drill.pitch.colors?.grassSecondary ?? '';
  const lineColor = drill.pitch.colors?.lines ?? 'rgba(255,255,255,0.75)';

  const updatePitchType = (type: PitchType) => {
    onUpdate({ pitch: { ...PITCH_DIMS[type], type, colors: drill.pitch.colors } });
  };

  const updatePitchColor = (key: 'grass' | 'grassSecondary' | 'lines', value: string) => {
    onUpdate({ pitch: { ...drill.pitch, colors: { grass: grassColor, grassSecondary: grassSecondary || undefined, lines: lineColor, [key]: value } } });
  };

  const equipment = drill.equipment ?? [];
  const coachingPoints = drill.coachingPoints ?? [];

  // ─── Pitch setup block (shared between layouts) ────────────────────────────
  const pitchBlock = (
    <>
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1 block">Pitch Type</label>
        <div className="grid grid-cols-2 gap-1">
          {(['full', 'half', 'third', 'plain'] as PitchType[]).map((t) => (
            <button key={t} onClick={() => updatePitchType(t)}
              className={`py-1 rounded text-xs border transition-colors ${drill.pitch.type === t ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}>
              {PITCH_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1 block">Pitch Colors</label>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <input type="color" value={grassColor} onChange={(e) => updatePitchColor('grass', e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
            <span className="text-xs text-gray-600">Grass</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input type="color" value={grassSecondary || grassColor}
              onChange={(e) => updatePitchColor('grassSecondary', e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
            <span className="text-xs text-gray-600">Stripes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input type="color" value={lineColor.startsWith('rgba') ? '#ffffff' : lineColor}
              onChange={(e) => updatePitchColor('lines', e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
            <span className="text-xs text-gray-600">Lines</span>
          </div>
        </div>
      </div>
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1 block">Player Size — {Math.round((drill.playerScale ?? 1) * 100)}%</label>
        <input type="range" min={50} max={200} step={10}
          value={Math.round((drill.playerScale ?? 1) * 100)}
          onChange={(e) => onUpdate({ playerScale: Number(e.target.value) / 100 })}
          className="w-full accent-emerald-500" />
      </div>
    </>
  );

  // ─── Modal layout — 2-column wide grid ─────────────────────────────────────
  if (modal) {
    const teamObj = drill.teamId ? teams[drill.teamId] : null;
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-0">
          {/* ── Left column ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Setup</p>
            {pitchBlock}
            <FieldInput label="Objective" value={drill.objective ?? ''} onChange={(v) => onUpdate({ objective: v })} placeholder="What players will achieve…" />
            <div className="grid grid-cols-2 gap-2">
              <FieldInput label="Age Group" value={drill.ageGroup ?? ''} onChange={(v) => onUpdate({ ageGroup: v })} placeholder="U16" />
              <FieldInput label="Players" value={drill.playerCount ?? ''} onChange={(v) => onUpdate({ playerCount: v })} placeholder="8–10" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FieldInput label="Area Size" value={drill.areaSize ?? ''} onChange={(v) => onUpdate({ areaSize: v })} placeholder="30×20m" />
              <FieldInput label="Duration (min)" value={String(drill.durationMin ?? '')} onChange={(v) => onUpdate({ durationMin: v ? parseInt(v) : undefined })} type="number" />
            </div>
            <MultilineArrayInput label="Equipment (one per line)"
              value={equipment} onChange={(lines) => onUpdate({ equipment: lines })}
              placeholder={'Balls ×6\nCones ×4'} rows={3} />
            <TextareaField label="Progression" value={drill.progression ?? ''} onChange={(v) => onUpdate({ progression: v })} placeholder="Make it harder…" rows={2} />
            <TextareaField label="Regression" value={drill.regression ?? ''} onChange={(v) => onUpdate({ regression: v })} placeholder="Make it easier…" rows={2} />
            <div className="mb-2.5">
              <label className="text-xs text-gray-500 mb-0.5 block">Linked Team</label>
              <select value={drill.teamId ?? ''} onChange={(e) => onUpdate({ teamId: e.target.value || null })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500">
                <option value="">— No team —</option>
                {Object.values(teams).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {teamObj && (
              <div className="mb-2.5">
                <label className="text-xs text-gray-500 mb-0.5 block">Training Day</label>
                <select value={drill.trainingDay ?? ''} onChange={(e) => onUpdate({ trainingDay: e.target.value || null })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500">
                  <option value="">— Any day —</option>
                  {teamObj.trainingDays.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Coaching</p>
            <MultilineArrayInput label="Coaching Points (one per line)"
              value={coachingPoints} onChange={(lines) => onUpdate({ coachingPoints: lines })}
              placeholder={'Body shape open…\nWeight of pass…'} rows={4} />
            <MultilineArrayInput label="Coaching Cues (one per line)"
              value={drill.coachingCues ?? []} onChange={(lines) => onUpdate({ coachingCues: lines })}
              placeholder={"'Check your shoulder'\n'Make the run early'"} rows={3} />
            <MultilineArrayInput label="Common Mistakes (one per line)"
              value={drill.commonMistakes ?? []} onChange={(lines) => onUpdate({ commonMistakes: lines })}
              placeholder={'Square pass under pressure\nBall-watching'} rows={3} />
            <MultilineArrayInput label="Corrections (one per line)"
              value={drill.corrections ?? []} onChange={(lines) => onUpdate({ corrections: lines })}
              placeholder={'Pause and walk through the action\nReduce pressure temporarily'} rows={3} />
            <MultilineArrayInput label="Key Constraints (one per line)"
              value={drill.keyConstraints ?? []} onChange={(lines) => onUpdate({ keyConstraints: lines })}
              placeholder={'2-touch maximum\nMust play forward before recycling'} rows={3} />
            <TextareaField label="Notes" value={drill.notes ?? ''} onChange={(v) => onUpdate({ notes: v })} rows={3} />
            <TagInput tags={drill.tags ?? []} onChange={(tags) => onUpdate({ tags })} />
          </div>
        </div>
      </div>
    );
  }

  // ─── Sidebar / collapsed layout (original) ─────────────────────────────────
  return (
    <div className={alwaysOpen ? '' : 'border-t border-gray-800'}>
      {!alwaysOpen && (
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors">
          Drill Info
          <span className="text-gray-700">{collapsed ? '▲' : '▼'}</span>
        </button>
      )}

      {isOpen && (
        <div className="px-4 pb-4 overflow-y-auto space-y-0">
          {pitchBlock}
          <FieldInput label="Objective" value={drill.objective ?? ''} onChange={(v) => onUpdate({ objective: v })} placeholder="What players will achieve…" />
          <div className="grid grid-cols-2 gap-2">
            <FieldInput label="Age Group" value={drill.ageGroup ?? ''} onChange={(v) => onUpdate({ ageGroup: v })} placeholder="U16" />
            <FieldInput label="Players" value={drill.playerCount ?? ''} onChange={(v) => onUpdate({ playerCount: v })} placeholder="8–10" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FieldInput label="Area Size" value={drill.areaSize ?? ''} onChange={(v) => onUpdate({ areaSize: v })} placeholder="30×20m" />
            <FieldInput label="Duration (min)" value={String(drill.durationMin ?? '')} onChange={(v) => onUpdate({ durationMin: v ? parseInt(v) : undefined })} type="number" />
          </div>
          <MultilineArrayInput key={drill.id + '-eq'} label="Equipment (one per line)"
            value={equipment} onChange={(lines) => onUpdate({ equipment: lines })}
            placeholder={'Balls ×6\nCones ×4'} rows={2} />
          <MultilineArrayInput key={drill.id + '-cp'} label="Coaching Points (one per line)"
            value={coachingPoints} onChange={(lines) => onUpdate({ coachingPoints: lines })}
            placeholder={'Body shape open…\nWeight of pass…'} rows={3} />
          <MultilineArrayInput key={drill.id + '-cc'} label="Coaching Cues (one per line)"
            value={drill.coachingCues ?? []} onChange={(lines) => onUpdate({ coachingCues: lines })}
            placeholder={"'Check your shoulder'\n'Make the run early'"} rows={2} />
          <MultilineArrayInput key={drill.id + '-cm'} label="Common Mistakes (one per line)"
            value={drill.commonMistakes ?? []} onChange={(lines) => onUpdate({ commonMistakes: lines })}
            placeholder={'Square pass under pressure\nBall-watching'} rows={2} />
          <MultilineArrayInput key={drill.id + '-cr'} label="Corrections (one per line)"
            value={drill.corrections ?? []} onChange={(lines) => onUpdate({ corrections: lines })}
            placeholder={'Pause and walk through the action\nReduce pressure temporarily'} rows={2} />
          <MultilineArrayInput key={drill.id + '-kc'} label="Key Constraints (one per line)"
            value={drill.keyConstraints ?? []} onChange={(lines) => onUpdate({ keyConstraints: lines })}
            placeholder={'2-touch maximum\nMust play forward before recycling'} rows={2} />
          <TextareaField label="Progression" value={drill.progression ?? ''} onChange={(v) => onUpdate({ progression: v })} placeholder="Make it harder…" />
          <TextareaField label="Regression" value={drill.regression ?? ''} onChange={(v) => onUpdate({ regression: v })} placeholder="Make it easier…" />
          <TextareaField label="Notes" value={drill.notes ?? ''} onChange={(v) => onUpdate({ notes: v })} />
          <TagInput tags={drill.tags ?? []} onChange={(tags) => onUpdate({ tags })} />
          <div className="mb-2.5">
            <label className="text-xs text-gray-500 mb-0.5 block">Linked Team</label>
            <select value={drill.teamId ?? ''} onChange={(e) => onUpdate({ teamId: e.target.value || null })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500">
              <option value="">— No team —</option>
              {Object.values(teams).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {drill.teamId && (() => {
            const team = teams[drill.teamId!];
            if (!team) return null;
            return (
              <div className="mb-2.5">
                <label className="text-xs text-gray-500 mb-0.5 block">Training Day</label>
                <select value={drill.trainingDay ?? ''} onChange={(e) => onUpdate({ trainingDay: e.target.value || null })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500">
                  <option value="">— Any day —</option>
                  {team.trainingDays.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
