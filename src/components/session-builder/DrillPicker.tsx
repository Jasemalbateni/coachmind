'use client';

import { useState, useMemo } from 'react';
import { useDrillsStore } from '@/store/drillsStore';
import { useTeamsStore } from '@/store/teamsStore';
import { useFoldersStore } from '@/store/foldersStore';
import MiniPitchPreview from '@/components/MiniPitchPreview';
import type { Intensity, SessionBlock, SessionSection } from '@/types';

interface Props {
  onAdd: (block: Omit<SessionBlock, 'id'>) => void;
}

const INTENSITY_OPTS: { value: Intensity; label: string; active: string }[] = [
  { value: 'low',  label: 'Low',  active: 'border-sky-500 bg-sky-50 text-sky-600' },
  { value: 'mid',  label: 'Mid',  active: 'border-amber-500 bg-amber-50 text-amber-600' },
  { value: 'high', label: 'High', active: 'border-red-500 bg-red-50 text-red-600' },
];

const SECTION_OPTS: { value: SessionSection | ''; label: string }[] = [
  { value: '', label: '— None —' },
  { value: 'warmup', label: 'Warm-up' },
  { value: 'main', label: 'Main' },
  { value: 'game', label: 'Game' },
  { value: 'cooldown', label: 'Cool-down' },
];

const PITCH_LABEL: Record<string, string> = {
  full: 'Full', half: 'Half', third: '1/3', plain: 'Plain',
};

export default function DrillPicker({ onAdd }: Props) {
  const { drills } = useDrillsStore();
  const { teams } = useTeamsStore();
  const { folders } = useFoldersStore();
  const [search, setSearch] = useState('');
  const [filterAge, setFilterAge] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterFolder, setFilterFolder] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const [duration, setDuration] = useState(10);
  const [intensity, setIntensity] = useState<Intensity>('mid');
  const [section, setSection] = useState<SessionSection | ''>('');
  const [notes, setNotes] = useState('');

  const drillList = Object.values(drills);

  const allAgeGroups = useMemo(() => Array.from(new Set(drillList.map((d) => d.ageGroup).filter(Boolean))) as string[], [drillList]);
  const allTags = useMemo(() => Array.from(new Set(drillList.flatMap((d) => d.tags ?? []))).sort(), [drillList]);
  const teamList = Object.values(teams);
  const folderList = useMemo(() => Object.values(folders).sort((a, b) => a.name.localeCompare(b.name)), [folders]);

  const hasFilters = filterAge || filterTag || filterTeam || filterFolder;

  const filtered = drillList.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.title.toLowerCase().includes(q) || (d.tags ?? []).some((t) => t.toLowerCase().includes(q)) || (d.objective ?? '').toLowerCase().includes(q);
    const matchAge = !filterAge || d.ageGroup === filterAge;
    const matchTag = !filterTag || (d.tags ?? []).includes(filterTag);
    const matchTeam = !filterTeam || d.teamId === filterTeam;
    const matchFolder = !filterFolder
      ? true
      : filterFolder === '__unfiled__' ? !d.folderId : d.folderId === filterFolder;
    return matchSearch && matchAge && matchTag && matchTeam && matchFolder;
  });

  const handleAdd = (drillId = selectedDrillId) => {
    if (!drillId) return;
    onAdd({
      drillId,
      durationMin: duration,
      intensity,
      section: section || undefined,
      notes: notes.trim() || undefined,
    });
    setSelectedDrillId(null);
    setNotes('');
  };

  const handleDoubleClick = (drillId: string) => {
    onAdd({ drillId, durationMin: duration, intensity, section: section || undefined });
    setSelectedDrillId(null);
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* Search + Filters */}
      <div className="p-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Drills</p>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`text-xs px-1.5 py-0.5 rounded-lg border transition-colors ${
              hasFilters || showFilters
                ? 'border-brand-orange text-brand-orange bg-brand-orange/10'
                : 'border-slate-200 text-slate-400 hover:text-slate-600'
            }`}
          >
            Filters {hasFilters ? '●' : ''}
          </button>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search drills…"
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-orange"
        />
        {showFilters && (
          <div className="mt-2 space-y-1.5">
            {allAgeGroups.length > 0 && (
              <select value={filterAge} onChange={(e) => setFilterAge(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange">
                <option value="">All age groups</option>
                {allAgeGroups.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
              </select>
            )}
            {allTags.length > 0 && (
              <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange">
                <option value="">All tags</option>
                {allTags.map((tag) => <option key={tag} value={tag}>#{tag}</option>)}
              </select>
            )}
            {teamList.length > 0 && (
              <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange">
                <option value="">All teams</option>
                {teamList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            {folderList.length > 0 && (
              <select value={filterFolder} onChange={(e) => setFilterFolder(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange">
                <option value="">All folders</option>
                <option value="__unfiled__">Unfiled</option>
                {folderList.map((f) => <option key={f.id} value={f.id}>📁 {f.name}</option>)}
              </select>
            )}
            {hasFilters && (
              <button onClick={() => { setFilterAge(''); setFilterTag(''); setFilterTeam(''); setFilterFolder(''); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Clear filters</button>
            )}
          </div>
        )}
      </div>

      {/* Drill list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-slate-400">
              {search || hasFilters ? 'No drills match your search' : 'No drills yet — create one in the Drills section'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 px-1 mb-1.5">Click to configure · Double-click to add</p>
            {filtered.map((drill) => {
              const teamName = drill.teamId ? (teams[drill.teamId]?.name ?? '') : '';
              const folderName = drill.folderId ? (folders[drill.folderId]?.name) : undefined;
              return (
                <button
                  key={drill.id}
                  onClick={() => setSelectedDrillId(drill.id === selectedDrillId ? null : drill.id)}
                  onDoubleClick={() => handleDoubleClick(drill.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl mb-1.5 text-sm transition-all ${
                    selectedDrillId === drill.id
                      ? 'bg-brand-orange/10 border border-brand-orange shadow-sm'
                      : 'bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 hover:shadow-card'
                  }`}
                >
                  <div className="mb-1.5 -mx-1">
                    <MiniPitchPreview drill={drill} width={220} height={56} />
                  </div>
                  <p className={`font-semibold truncate text-xs mb-0.5 ${selectedDrillId === drill.id ? 'text-brand-orange' : 'text-slate-800'}`}>{drill.title}</p>
                  {drill.objective && (
                    <p className="text-xs text-slate-400 truncate mb-1">{drill.objective}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400">{PITCH_LABEL[drill.pitch.type] ?? drill.pitch.type}</span>
                    {drill.durationMin && <span className="text-xs text-slate-400">{drill.durationMin}m</span>}
                    {drill.ageGroup && <span className="text-xs text-slate-400">{drill.ageGroup}</span>}
                    {drill.playerCount && <span className="text-xs text-slate-400">{drill.playerCount}p</span>}
                    {teamName && <span className="text-xs text-brand-orange truncate font-medium">{teamName}</span>}
                    {folderName && <span className="text-xs text-slate-400 truncate">📁 {folderName}</span>}
                  </div>
                  {drill.tags && drill.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {drill.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs text-brand-orange/70">#{tag}</span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Configure & add panel */}
      {selectedDrillId && (
        <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50">
          <p className="text-xs text-slate-700 font-semibold truncate">
            {drills[selectedDrillId]?.title}
          </p>

          {/* Duration */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Duration</label>
            <div className="flex items-center gap-2">
              <input
                type="range" min={5} max={60} step={5} value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1 accent-brand-orange"
              />
              <span className="text-sm font-semibold text-slate-700 w-10 text-right">{duration}m</span>
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Intensity</label>
            <div className="flex gap-1">
              {INTENSITY_OPTS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setIntensity(opt.value)}
                  className={`flex-1 py-1 rounded-lg text-xs border font-medium transition-colors ${
                    intensity === opt.value ? opt.active : 'border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Phase */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Phase</label>
            <div className="flex gap-1 flex-wrap">
              {SECTION_OPTS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSection(opt.value)}
                  className={`px-2 py-0.5 rounded-lg text-xs border transition-colors ${
                    section === opt.value
                      ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                      : 'border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Coach notes…"
              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs resize-none focus:outline-none focus:border-brand-orange"
            />
          </div>

          <button
            onClick={() => handleAdd()}
            className="w-full py-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            + Add to Session
          </button>
        </div>
      )}
    </aside>
  );
}
