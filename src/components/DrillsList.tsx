'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DndContext, useDraggable, useDroppable, DragOverlay,
  type DragEndEvent, PointerSensor, useSensor, useSensors,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDrillsStore } from '@/store/drillsStore';
import { useTeamsStore } from '@/store/teamsStore';
import { useFoldersStore } from '@/store/foldersStore';
import { useDrillTemplatesStore } from '@/store/drillTemplatesStore';
import { useSessionsStore } from '@/store/sessionsStore';
import MiniPitchPreview from './MiniPitchPreview';
import type { Drill, DrillFolder, FolderSubcategory, DrillRelationType, PitchType } from '@/types';

const PITCH_LABELS: Record<PitchType, string> = { full: 'Full', half: 'Half', third: 'Third', plain: 'Plain' };
const PITCH_COLORS: Record<PitchType, string> = { full: 'text-emerald-600', half: 'text-sky-600', third: 'text-violet-600', plain: 'text-slate-500' };
const PITCH_DIMS: Record<PitchType, { width: number; height: number }> = {
  full: { width: 840, height: 540 }, half: { width: 840, height: 420 },
  third: { width: 840, height: 300 }, plain: { width: 840, height: 540 },
};

const RELATION_BADGE: Record<DrillRelationType, { label: string; color: string }> = {
  base:        { label: 'Base',        color: 'text-slate-600 bg-slate-100 border-slate-300' },
  variation:   { label: 'Variation',   color: 'text-blue-700 bg-blue-50 border-blue-200' },
  progression: { label: 'Progression', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  regression:  { label: 'Regression',  color: 'text-amber-700 bg-amber-50 border-amber-200' },
};

// ─── Drill Templates ──────────────────────────────────────────────────────────
// ─── Delete Confirmation ──────────────────────────────────────────────────────
function ConfirmDeleteModal({ drillTitle, usedInSessions, onConfirm, onCancel }: {
  drillTitle: string; usedInSessions: number; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-red-600 text-lg">✕</span>
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-2">Delete Drill?</h2>
        <p className="text-sm text-slate-600 mb-2">
          <span className="font-semibold">"{drillTitle}"</span> will be permanently removed.
        </p>
        {usedInSessions > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            Used in {usedInSessions} session block{usedInSessions !== 1 ? 's' : ''}. Those blocks will reference a missing drill.
          </p>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Drill Card ────────────────────────────────────────────────────────────────
function DrillCard({ drill, teamName, parentTitle, folders, subcategories, onDelete, onDuplicate, onMoveToFolder, onMoveToSubcategory, onVariation, onProgression, onRegression, onSaveAsTemplate, onToggleFavorite }: {
  drill: Drill; teamName: string; parentTitle?: string; folders: DrillFolder[];
  subcategories: FolderSubcategory[];
  onDelete: () => void; onDuplicate: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onMoveToSubcategory: (subcategoryId: string | null) => void;
  onVariation: () => void; onProgression: () => void; onRegression: () => void;
  onSaveAsTemplate: () => void; onToggleFavorite: () => void;
}) {
  const {
    attributes, listeners, setNodeRef: setDragRef, transform, isDragging,
  } = useDraggable({ id: drill.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: drill.id });
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };
  const currentFolder = folders.find((f) => f.id === drill.folderId);
  const currentSub = subcategories.find((s) => s.id === drill.subcategoryId);
  const relationMeta = drill.relationType ? RELATION_BADGE[drill.relationType] : null;
  const folderSubs = drill.folderId ? subcategories.filter((s) => s.folderId === drill.folderId) : [];

  useEffect(() => {
    if (!showMore) return;
    const handler = (e: MouseEvent) => { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMore]);

  const setRef = useCallback((node: HTMLDivElement | null) => { setDragRef(node); setDropRef(node); }, [setDragRef, setDropRef]);

  return (
    <div ref={setRef} style={style}
      className={`group bg-white rounded-2xl overflow-hidden transition-all duration-200 ${isDragging ? 'shadow-2xl ring-2 ring-brand-orange' : isOver ? 'ring-2 ring-sky-400 shadow-card' : 'shadow-card hover:shadow-card-hover border border-slate-100'}`}>

      {/* Preview */}
      <div className="relative overflow-hidden">
        <MiniPitchPreview drill={drill} width={288} height={130} className="w-full" />
        <span className={`absolute top-2.5 right-2.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm ${PITCH_COLORS[drill.pitch.type]}`}>
          {PITCH_LABELS[drill.pitch.type]}
        </span>
        {/* Favorite star */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
          className={`absolute top-2.5 left-2.5 w-7 h-7 flex items-center justify-center rounded-full transition-all ${drill.isFavorite ? 'bg-yellow-400/90 text-yellow-900' : 'bg-black/30 text-white/50 hover:text-yellow-300'}`}
          title={drill.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label="Toggle favorite"
        >
          {drill.isFavorite ? '\u2605' : '\u2606'}
        </button>
        {drill.durationMin && (
          <span className="absolute bottom-2.5 right-2.5 text-xs text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">{drill.durationMin}m</span>
        )}
        {relationMeta && (
          <span className={`absolute bottom-2.5 left-2.5 text-xs px-2 py-0.5 rounded-full border font-medium ${relationMeta.color}`}>
            {relationMeta.label}
          </span>
        )}
        {/* Drag handle */}
        <button {...attributes} {...listeners}
          className="absolute bottom-1 right-1/2 translate-x-1/2 px-3 py-0.5 text-white/60 hover:text-white cursor-grab active:cursor-grabbing bg-black/30 rounded-full"
          aria-label="Drag to reorder or move to folder">
          <svg width="18" height="6" viewBox="0 0 18 6" fill="currentColor">
            <circle cx="3" cy="1.5" r="1.5"/><circle cx="9" cy="1.5" r="1.5"/><circle cx="15" cy="1.5" r="1.5"/>
            <circle cx="3" cy="4.5" r="1.5"/><circle cx="9" cy="4.5" r="1.5"/><circle cx="15" cy="4.5" r="1.5"/>
          </svg>
        </button>
      </div>

      <div className="p-3.5">
        <h3 className="font-bold text-sm text-slate-900 mb-0.5 line-clamp-1 group-hover:text-brand-orange transition-colors">{drill.title}</h3>
        {parentTitle && <p className="text-xs text-slate-400 mb-0.5">Based on: {parentTitle}</p>}
        {drill.objective && <p className="text-xs text-slate-500 line-clamp-1 mb-2">{drill.objective}</p>}

        <div className="flex flex-wrap gap-1 mb-2">
          {teamName && <span className="text-xs font-medium text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">{teamName}</span>}
          {drill.ageGroup && <span className="text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">{drill.ageGroup}</span>}
          {drill.playerCount && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{drill.playerCount}p</span>}
          {currentFolder && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">&#128193; {currentFolder.name}</span>}
          {currentSub && <span className="text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">&#8627; {currentSub.name}</span>}
          {(drill.steps?.length ?? 0) > 0 && <span className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{drill.steps!.length} step{drill.steps!.length !== 1 ? 's' : ''}</span>}
        </div>

        {drill.tags && drill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {drill.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        {folders.length > 0 && (
          <select value={drill.folderId ?? ''} onChange={(e) => { onMoveToFolder(e.target.value || null); onMoveToSubcategory(null); }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs mb-1.5 focus:outline-none focus:border-brand-orange text-slate-600">
            <option value="">No folder</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}

        {folderSubs.length > 0 && (
          <select value={drill.subcategoryId ?? ''} onChange={(e) => onMoveToSubcategory(e.target.value || null)}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs mb-2.5 focus:outline-none focus:border-sky-500 text-slate-600">
            <option value="">No sub-category</option>
            {folderSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {folderSubs.length === 0 && folders.length > 0 && <div className="mb-1" />}

        <div className="flex gap-1.5 mb-1.5">
          <Link href={`/drills/${drill.id}`} className="flex-1 text-center py-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-lg text-xs font-semibold transition-colors">
            Edit
          </Link>
          <Link href={`/drills/${drill.id}/view`} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-slate-600 transition-colors">
            View
          </Link>
          <button onClick={onDuplicate} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-slate-600 transition-colors">Copy</button>
          <button onClick={onDelete} className="px-2.5 py-1.5 bg-slate-100 hover:bg-red-100 hover:text-red-600 rounded-lg text-xs text-slate-500 transition-colors">Del</button>
        </div>

        <div ref={moreRef} className="relative">
          <button onClick={() => setShowMore(!showMore)}
            className={`w-full py-1 rounded-lg text-xs border transition-colors ${showMore ? 'border-brand-orange/40 text-brand-orange bg-brand-orange/5' : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'}`}>
            Smart Reuse ▾
          </button>
          {showMore && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl z-10">
              {[
                { label: '~ Variation', desc: 'same drill, different constraints', color: 'text-blue-600', action: onVariation },
                { label: '↑ Progression', desc: 'harder version', color: 'text-emerald-600', action: onProgression },
                { label: '↓ Regression', desc: 'simpler version', color: 'text-amber-600', action: onRegression },
                { label: '★ Save as Template', desc: 'reuse in new drills', color: 'text-violet-600', action: onSaveAsTemplate },
              ].map((item, i) => (
                <button key={i} onClick={() => { item.action(); setShowMore(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                  <span className={`font-semibold ${item.color}`}>{item.label}</span>
                  <span className="text-slate-400 ml-1">— {item.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subcategory Item ─────────────────────────────────────────────────────────
function SubcategoryItem({ sub, isSelected, drillCount, onSelect, onRename, onDelete }: {
  sub: FolderSubcategory; isSelected: boolean; drillCount: number;
  onSelect: () => void; onRename: (name: string) => void; onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `sub:${sub.id}` });
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(sub.name);

  const commitRename = () => {
    setEditing(false);
    if (nameValue.trim() && nameValue.trim() !== sub.name) onRename(nameValue.trim());
    else setNameValue(sub.name);
  };

  return (
    <div ref={setNodeRef}
      className={`group flex items-center gap-2 pl-7 pr-2 py-1.5 rounded-lg cursor-pointer transition-all ${
        isOver ? 'bg-sky-500/30 ring-1 ring-sky-400' : isSelected ? 'bg-sky-500/20 text-sky-300' : 'text-white/50 hover:bg-white/5 hover:text-white/70'
      }`}
      onClick={() => { if (!editing) onSelect(); }}
    >
      <span className="text-xs shrink-0 opacity-60">↳</span>
      {editing ? (
        <input autoFocus value={nameValue} onChange={(e) => setNameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setNameValue(sub.name); setEditing(false); } }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-white/20 rounded px-1 py-0.5 text-xs focus:outline-none text-white" />
      ) : (
        <span className="flex-1 text-xs truncate">{sub.name}</span>
      )}
      <span className="text-xs text-white/30 shrink-0">{drillCount}</span>
      {!editing && (
        <div className="flex gap-0.5 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="px-1.5 py-1 -my-1 hover:text-white text-xs text-white/30 hover:bg-white/5 rounded" aria-label="Rename sub-category">✏</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="px-1.5 py-1 -my-1 hover:text-red-400 text-xs text-white/30 hover:bg-white/5 rounded" aria-label="Delete sub-category">×</button>
        </div>
      )}
    </div>
  );
}

// ─── Folder Item ──────────────────────────────────────────────────────────────
function FolderItem({ folder, isSelected, drillCount, subcategories, allDrills, selectedSubcategoryId, onSelect, onRename, onDelete, onAddSubcategory, onSelectSubcategory, onRenameSubcategory, onDeleteSubcategory }: {
  folder: DrillFolder; isSelected: boolean; drillCount: number;
  subcategories: FolderSubcategory[]; allDrills: Drill[];
  selectedSubcategoryId: string | null;
  onSelect: () => void; onRename: (name: string) => void; onDelete: () => void;
  onAddSubcategory: () => void;
  onSelectSubcategory: (id: string) => void;
  onRenameSubcategory: (id: string, name: string) => void;
  onDeleteSubcategory: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: folder.id });
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(folder.name);
  const [expanded, setExpanded] = useState(false);

  // Auto-expand when this folder is selected or a sub is selected
  useEffect(() => {
    if (isSelected || (selectedSubcategoryId && subcategories.some((s) => s.id === selectedSubcategoryId))) {
      setExpanded(true);
    }
  }, [isSelected, selectedSubcategoryId, subcategories]);

  const commitRename = () => {
    setEditing(false);
    if (nameValue.trim() && nameValue.trim() !== folder.name) onRename(nameValue.trim());
    else setNameValue(folder.name);
  };

  return (
    <div>
      <div ref={setNodeRef}
        className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${
          isOver ? 'bg-brand-orange/30 ring-1 ring-brand-orange' : isSelected ? 'bg-brand-orange/20 text-brand-orange' : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
        onClick={() => { if (!editing) { onSelect(); setExpanded(!expanded || !isSelected); } }}
      >
        <span className="text-sm shrink-0">
          {subcategories.length > 0 ? (expanded ? '📂' : '📁') : '📁'}
        </span>
        {editing ? (
          <input autoFocus value={nameValue} onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setNameValue(folder.name); setEditing(false); } }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white/20 rounded px-1.5 py-0.5 text-xs focus:outline-none text-white" />
        ) : (
          <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
        )}
        <span className="text-xs text-white/40 shrink-0">{drillCount}</span>
        {!editing && (
          <div className="flex gap-0.5 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onAddSubcategory(); setExpanded(true); }} className="px-1.5 py-1 -my-1 hover:text-sky-400 text-xs text-white/40 hover:bg-white/5 rounded" title="Add sub-category" aria-label="Add sub-category">+</button>
            <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="px-1.5 py-1 -my-1 hover:text-white text-xs text-white/40 hover:bg-white/5 rounded" aria-label="Rename folder">✏</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="px-1.5 py-1 -my-1 hover:text-red-400 text-xs text-white/40 hover:bg-white/5 rounded" aria-label="Delete folder">×</button>
          </div>
        )}
      </div>

      {/* Sub-categories */}
      {expanded && subcategories.length > 0 && (
        <div className="mt-0.5 space-y-0.5 ml-1">
          {subcategories.map((sub) => (
            <SubcategoryItem key={sub.id} sub={sub}
              isSelected={selectedSubcategoryId === sub.id}
              drillCount={allDrills.filter((d) => d.subcategoryId === sub.id).length}
              onSelect={() => onSelectSubcategory(sub.id)}
              onRename={(name) => onRenameSubcategory(sub.id, name)}
              onDelete={() => onDeleteSubcategory(sub.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DrillsList() {
  const { drills, seedIfEmpty, deleteDrill, duplicateDrill, addDrill, updateDrill, toggleFavorite } = useDrillsStore();
  const { sessions } = useSessionsStore();
  const { teams, seedIfEmpty: seedTeams } = useTeamsStore();
  const { folders, addFolder, updateFolder, deleteFolder, subcategories, addSubcategory, updateSubcategory, deleteSubcategory } = useFoldersStore();
  const { addTemplate } = useDrillTemplatesStore();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filterAge, setFilterAge] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all' | 'unfiled' | 'favorites'>('all');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [activeDrillId, setActiveDrillId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => { seedIfEmpty(); seedTeams(); }, [seedIfEmpty, seedTeams]);

  const allDrills = Object.values(drills).sort((a, b) => {
    // Sort by sortOrder if set, then by updatedAt desc
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) return a.sortOrder - b.sortOrder;
    if (a.sortOrder !== undefined) return -1;
    if (b.sortOrder !== undefined) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  const folderList = Object.values(folders).sort((a, b) => a.name.localeCompare(b.name));
  const teamList = Object.values(teams);
  const allAgeGroups = Array.from(new Set(allDrills.map((d) => d.ageGroup).filter(Boolean))) as string[];
  const allTags = Array.from(new Set(allDrills.flatMap((d) => d.tags ?? []))).sort();

  const filtered = allDrills.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.title.toLowerCase().includes(q) || (d.tags ?? []).some((t) => t.toLowerCase().includes(q)) || (d.ageGroup ?? '').toLowerCase().includes(q) || (d.objective ?? '').toLowerCase().includes(q);
    const matchAge = !filterAge || d.ageGroup === filterAge;
    const matchTag = !filterTag || (d.tags ?? []).includes(filterTag);
    const matchTeam = !filterTeam || d.teamId === filterTeam;
    let matchFolder: boolean;
    if (selectedSubcategoryId) {
      matchFolder = d.subcategoryId === selectedSubcategoryId;
    } else if (selectedFolderId === 'all') {
      matchFolder = true;
    } else if (selectedFolderId === 'unfiled') {
      matchFolder = !d.folderId;
    } else if (selectedFolderId === 'favorites') {
      matchFolder = !!d.isFavorite;
    } else {
      matchFolder = d.folderId === selectedFolderId;
    }
    return matchSearch && matchAge && matchTag && matchTeam && matchFolder;
  });

  const getSessionUsageCount = (drillId: string) => Object.values(sessions).flatMap((s) => s.blocks).filter((b) => b.drillId === drillId).length;

  const handleNewDrill = () => {
    const now = new Date().toISOString();
    const drill: Drill = {
      id: crypto.randomUUID(),
      title: 'Untitled',
      pitch: { type: 'full', ...PITCH_DIMS['full'] },
      objects: [],
      tags: [],
      folderId: typeof selectedFolderId === 'string' && selectedFolderId !== 'all' && selectedFolderId !== 'unfiled' && selectedFolderId !== 'favorites' ? selectedFolderId : undefined,
      subcategoryId: selectedSubcategoryId ?? undefined,
      createdAt: now, updatedAt: now,
    };
    addDrill(drill);
    router.push(`/drills/${drill.id}`);
  };

  const createReuse = (drillId: string, suffix: string, relationType: DrillRelationType, extra: Partial<Drill> = {}) => {
    const original = drills[drillId];
    if (!original) return;
    const now = new Date().toISOString();
    const copy: Drill = { ...original, ...extra, id: crypto.randomUUID(), title: `${original.title} (${suffix})`, objects: original.objects.map((o) => ({ ...o, id: crypto.randomUUID() })), parentDrillId: original.id, relationType, createdAt: now, updatedAt: now };
    addDrill(copy); router.push(`/drills/${copy.id}`);
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    addFolder({ id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setNewFolderName(''); setShowNewFolder(false);
  };

  const handleDeleteFolder = (folderId: string) => {
    Object.values(drills).forEach((d) => {
      if (d.folderId === folderId) updateDrill(d.id, { folderId: null, subcategoryId: null });
    });
    deleteFolder(folderId);
    if (selectedFolderId === folderId) setSelectedFolderId('all');
    setSelectedSubcategoryId(null);
  };

  const handleAddSubcategory = (folderId: string) => {
    const name = `Sub-category ${Object.values(subcategories).filter((s) => s.folderId === folderId).length + 1}`;
    addSubcategory({ id: crypto.randomUUID(), folderId, name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  };

  const handleDeleteSubcategory = (subId: string) => {
    // Unassign drills from this subcategory (keep them in parent folder)
    Object.values(drills).forEach((d) => {
      if (d.subcategoryId === subId) updateDrill(d.id, { subcategoryId: null });
    });
    deleteSubcategory(subId);
    if (selectedSubcategoryId === subId) setSelectedSubcategoryId(null);
  };

  const handleSelectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedSubcategoryId(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrillId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrillId(null);
    if (!over) return;

    const overId = String(over.id);
    const activeId = String(active.id);

    // Drop onto a sub-category
    if (overId.startsWith('sub:')) {
      const subId = overId.slice(4);
      const sub = subcategories[subId];
      if (sub) {
        updateDrill(activeId, { folderId: sub.folderId, subcategoryId: subId });
      }
      return;
    }

    // Drop onto a folder
    if (folders[overId]) {
      updateDrill(activeId, { folderId: overId, subcategoryId: null });
      return;
    }

    // Drop onto another drill → reorder
    if (drills[overId] && activeId !== overId) {
      const oldIndex = filtered.findIndex((d) => d.id === activeId);
      const newIndex = filtered.findIndex((d) => d.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(filtered, oldIndex, newIndex);
      // Assign sortOrder values
      reordered.forEach((d, i) => {
        if (d.sortOrder !== i) updateDrill(d.id, { sortOrder: i } as Partial<Drill>);
      });
    }
  };

  const activeDrill = activeDrillId ? drills[activeDrillId] : null;
  const confirmDrill = confirmDeleteId ? drills[confirmDeleteId] : null;
  const allSubcategories = Object.values(subcategories);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Folder Sidebar — dark to match NavBar */}
        <aside className="w-60 bg-brand-dark text-white flex flex-col shrink-0 overflow-y-auto dark-scroll">
          <div className="px-4 pt-5 pb-3 border-b border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Folders</p>
          </div>
          <div className="flex-1 px-3 py-3 space-y-0.5">
            <button onClick={() => { setSelectedFolderId('all'); setSelectedSubcategoryId(null); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${selectedFolderId === 'all' && !selectedSubcategoryId ? 'bg-brand-orange/20 text-brand-orange font-semibold' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
              <span className="text-base">🗂</span>
              <span className="flex-1 text-left font-medium">All Drills</span>
              <span className="text-xs text-white/30">{allDrills.length}</span>
            </button>
            <button onClick={() => { setSelectedFolderId('unfiled'); setSelectedSubcategoryId(null); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${selectedFolderId === 'unfiled' && !selectedSubcategoryId ? 'bg-brand-orange/20 text-brand-orange font-semibold' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
              <span className="text-base">&#128196;</span>
              <span className="flex-1 text-left font-medium">Unfiled</span>
              <span className="text-xs text-white/30">{allDrills.filter((d) => !d.folderId).length}</span>
            </button>
            <button onClick={() => { setSelectedFolderId('favorites'); setSelectedSubcategoryId(null); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${selectedFolderId === 'favorites' && !selectedSubcategoryId ? 'bg-yellow-500/20 text-yellow-400 font-semibold' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
              <span className="text-base">&#9733;</span>
              <span className="flex-1 text-left font-medium">Favorites</span>
              <span className="text-xs text-white/30">{allDrills.filter((d) => d.isFavorite).length}</span>
            </button>

            {folderList.length > 0 && <div className="border-t border-white/10 my-2" />}
            {folderList.map((folder) => (
              <FolderItem key={folder.id} folder={folder}
                isSelected={selectedFolderId === folder.id}
                drillCount={allDrills.filter((d) => d.folderId === folder.id).length}
                subcategories={allSubcategories.filter((s) => s.folderId === folder.id).sort((a, b) => a.name.localeCompare(b.name))}
                allDrills={allDrills}
                selectedSubcategoryId={selectedSubcategoryId}
                onSelect={() => handleSelectFolder(folder.id)}
                onRename={(name) => updateFolder(folder.id, name)}
                onDelete={() => handleDeleteFolder(folder.id)}
                onAddSubcategory={() => handleAddSubcategory(folder.id)}
                onSelectSubcategory={(id) => { setSelectedFolderId(folder.id); setSelectedSubcategoryId(id); }}
                onRenameSubcategory={(id, name) => updateSubcategory(id, name)}
                onDeleteSubcategory={handleDeleteSubcategory}
              />
            ))}
          </div>

          <div className="px-3 pb-4 border-t border-white/10 pt-3">
            {showNewFolder ? (
              <form onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }} className="flex gap-1">
                <input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  onBlur={() => { if (!newFolderName.trim()) setShowNewFolder(false); }}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); } }}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-brand-orange" />
                <button type="submit" className="px-2 py-1 bg-brand-orange hover:bg-brand-orange/90 rounded-lg text-xs text-white">+</button>
              </form>
            ) : (
              <button onClick={() => setShowNewFolder(true)} className="w-full text-left px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
                + New Folder
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-brand-bg">
          {/* Page header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">Drills</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                {filtered.length}
                {selectedSubcategoryId
                  ? ` in ${allSubcategories.find((s) => s.id === selectedSubcategoryId)?.name ?? 'sub-category'}`
                  : selectedFolderId === 'favorites' ? ' favorite'
                  : ` of ${allDrills.length}`
                } drill{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={handleNewDrill}
              className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-sm font-semibold shadow-sm shadow-brand-orange/20 transition-colors">
              + New Drill
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white border-b border-slate-100 px-6 py-3 flex flex-wrap gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drills, objectives, tags…"
              className="flex-1 min-w-48 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange" />
            {allAgeGroups.length > 0 && (
              <select value={filterAge} onChange={(e) => setFilterAge(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange text-slate-600">
                <option value="">All ages</option>
                {allAgeGroups.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
              </select>
            )}
            {allTags.length > 0 && (
              <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange text-slate-600">
                <option value="">All tags</option>
                {allTags.map((tag) => <option key={tag} value={tag}>#{tag}</option>)}
              </select>
            )}
            {teamList.length > 0 && (
              <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange text-slate-600">
                <option value="">All teams</option>
                {teamList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            {(search || filterAge || filterTag || filterTeam) && (
              <button onClick={() => { setSearch(''); setFilterAge(''); setFilterTag(''); setFilterTeam(''); }}
                className="px-3 py-2 text-sm text-slate-400 hover:text-slate-700 transition-colors">Clear</button>
            )}
          </div>

          {/* Grid */}
          <div className="p-6">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <p className="text-5xl mb-4">&#9917;</p>
                <p className="text-lg font-semibold text-slate-600">{search || filterAge || filterTag || filterTeam ? 'No drills match your filters' : 'No drills yet'}</p>
                <p className="text-sm mt-1">{search || filterAge || filterTag || filterTeam ? 'Try adjusting your search' : 'Create your first drill to get started'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map((drill) => (
                  <DrillCard key={drill.id} drill={drill}
                    teamName={drill.teamId ? (teams[drill.teamId]?.name ?? '') : ''}
                    parentTitle={drill.parentDrillId ? (drills[drill.parentDrillId]?.title) : undefined}
                    folders={folderList}
                    subcategories={allSubcategories}
                    onDelete={() => setConfirmDeleteId(drill.id)}
                    onDuplicate={() => duplicateDrill(drill.id)}
                    onMoveToFolder={(folderId) => updateDrill(drill.id, { folderId, subcategoryId: null })}
                    onMoveToSubcategory={(subcategoryId) => updateDrill(drill.id, { subcategoryId })}
                    onVariation={() => createReuse(drill.id, 'Variation', 'variation')}
                    onProgression={() => createReuse(drill.id, 'Progression', 'progression')}
                    onRegression={() => createReuse(drill.id, 'Regression', 'regression')}
                    onSaveAsTemplate={() => addTemplate(drill)}
                    onToggleFavorite={() => toggleFavorite(drill.id)}
                  />
                ))}
                {selectedFolderId !== 'favorites' && (
                  <button onClick={handleNewDrill}
                    className="min-h-[200px] rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-orange hover:text-brand-orange text-slate-300 flex flex-col items-center justify-center gap-2 transition-all group">
                    <span className="text-3xl group-hover:scale-110 transition-transform">+</span>
                    <span className="text-sm font-medium">New Drill</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDrill && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-52 opacity-95 ring-2 ring-brand-orange">
            <MiniPitchPreview drill={activeDrill} width={208} height={70} className="w-full" />
            <div className="px-3 py-2">
              <p className="font-bold text-sm text-slate-900 truncate">{activeDrill.title}</p>
              <p className="text-xs text-slate-400">Drop to folder or reorder</p>
            </div>
          </div>
        )}
      </DragOverlay>

      {confirmDeleteId && confirmDrill && (
        <ConfirmDeleteModal
          drillTitle={confirmDrill.title}
          usedInSessions={getSessionUsageCount(confirmDeleteId)}
          onConfirm={() => { deleteDrill(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </DndContext>
  );
}
