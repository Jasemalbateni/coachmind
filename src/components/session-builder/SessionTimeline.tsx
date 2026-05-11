'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDrillsStore } from '@/store/drillsStore';
import { useFoldersStore } from '@/store/foldersStore';
import MiniPitchPreview from '@/components/MiniPitchPreview';
import type { SessionBlock, Intensity, SessionSection } from '@/types';

const INTENSITY_STYLES: Record<Intensity, { label: string; badge: string; bar: string }> = {
  low:  { label: 'Low',  badge: 'text-sky-600 bg-sky-50 border-sky-200',    bar: 'bg-sky-400' },
  mid:  { label: 'Mid',  badge: 'text-amber-600 bg-amber-50 border-amber-200', bar: 'bg-amber-400' },
  high: { label: 'High', badge: 'text-red-600 bg-red-50 border-red-200',    bar: 'bg-red-400' },
};

const SECTION_META: Record<SessionSection, {
  label: string; color: string; textColor: string; border: string; bg: string;
  bar: string; barHex: string; icon: string; iconBg: string;
}> = {
  warmup:   { label: 'Warm-up',   color: 'text-sky-600',    textColor: 'text-sky-600',    border: 'border-sky-200',    bg: 'bg-sky-50',          bar: 'bg-sky-400',    barHex: '#38bdf8', icon: '🔥', iconBg: 'bg-sky-500' },
  main:     { label: 'Main',      color: 'text-brand-orange', textColor: 'text-brand-orange', border: 'border-brand-orange/30', bg: 'bg-brand-orange/5', bar: 'bg-brand-orange', barHex: '#FF6A00', icon: '⚽', iconBg: 'bg-brand-orange' },
  game:     { label: 'Game',      color: 'text-amber-600',  textColor: 'text-amber-600',  border: 'border-amber-200',  bg: 'bg-amber-50',        bar: 'bg-amber-400',  barHex: '#fbbf24', icon: '🎯', iconBg: 'bg-amber-500' },
  cooldown: { label: 'Cool-down', color: 'text-violet-600', textColor: 'text-violet-600', border: 'border-violet-200', bg: 'bg-violet-50',       bar: 'bg-violet-400', barHex: '#a78bfa', icon: '❄', iconBg: 'bg-violet-500' },
};

const SECTION_ORDER: SessionSection[] = ['warmup', 'main', 'game', 'cooldown'];

interface BlockCardProps {
  block: SessionBlock;
  index: number;
  onUpdate: (updates: Partial<SessionBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  sectionBarHex?: string;
}

function BlockCard({ block, index, onUpdate, onDelete, onDuplicate, sectionBarHex }: BlockCardProps) {
  const { drills } = useDrillsStore();
  const { folders } = useFoldersStore();
  const drill = drills[block.drillId];
  const folderName = drill?.folderId ? (folders[drill.folderId]?.name) : undefined;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const int = INTENSITY_STYLES[block.intensity];

  return (
    <div ref={setNodeRef} style={style} className="relative flex items-start gap-2">
      {/* Timeline connector */}
      {sectionBarHex && (
        <>
          {/* Horizontal line from spine to card */}
          <div className="absolute left-[-20px] top-5 h-px w-5" style={{ backgroundColor: sectionBarHex, opacity: 0.4 }} />
          {/* Dot on spine */}
          <div className="absolute left-[-25px] top-4 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10"
            style={{ backgroundColor: sectionBarHex }} />
        </>
      )}

      <div className="flex-1 group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow">
        <div className="flex items-stretch">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="flex items-center justify-center w-7 bg-slate-50 hover:bg-slate-100 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors shrink-0"
            aria-label="Drag to reorder"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="3" width="4" height="4" rx="1" />
              <rect x="9" y="3" width="4" height="4" rx="1" />
              <rect x="3" y="9" width="4" height="4" rx="1" />
              <rect x="9" y="9" width="4" height="4" rx="1" />
            </svg>
          </button>

          {/* Index */}
          <div className="flex items-center justify-center w-6 text-xs font-bold text-slate-300 shrink-0">
            {index + 1}
          </div>

          {/* Intensity bar */}
          <div className={`w-1 ${int.bar} opacity-60 shrink-0`} />

          {/* Content */}
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">
                  {drill?.title ?? <span className="text-slate-400 italic">Drill not found</span>}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {drill?.pitch.type === 'full' ? 'Full Pitch' : drill?.pitch.type === 'half' ? 'Half Pitch' : drill?.pitch.type === 'third' ? 'Final Third' : drill?.pitch.type === 'plain' ? 'Plain' : '—'}
                  {drill && ` · ${drill.objects.length} objects`}
                  {folderName && <span className="text-slate-300"> · 📁 {folderName}</span>}
                </p>
                {drill && (
                  <Link href={`/drills/${block.drillId}`} className="text-xs text-brand-orange hover:text-brand-orange/70 transition-colors" target="_blank">
                    Open drill ↗
                  </Link>
                )}
              </div>
              <div className="flex items-start gap-1 shrink-0">
                {drill && (
                  <MiniPitchPreview drill={drill} width={68} height={44} className="rounded" />
                )}
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${int.badge}`}>
                    {int.label}
                  </span>
                  <span className="text-sm font-bold text-slate-600">{block.durationMin}m</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Duration */}
              <div className="flex items-center gap-1">
                <label className="text-xs text-slate-400">Min:</label>
                <select
                  value={block.durationMin}
                  onChange={(e) => onUpdate({ durationMin: Number(e.target.value) })}
                  className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-brand-orange"
                >
                  {[5, 10, 15, 20, 25, 30, 45, 60].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Intensity */}
              <div className="flex items-center gap-1">
                <label className="text-xs text-slate-400">Load:</label>
                <select
                  value={block.intensity}
                  onChange={(e) => onUpdate({ intensity: e.target.value as Intensity })}
                  className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-brand-orange"
                >
                  <option value="low">Low</option>
                  <option value="mid">Mid</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Section */}
              <div className="flex items-center gap-1">
                <label className="text-xs text-slate-400">Phase:</label>
                <select
                  value={block.section ?? ''}
                  onChange={(e) => onUpdate({ section: (e.target.value as SessionSection) || undefined })}
                  className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-brand-orange"
                >
                  <option value="">—</option>
                  {SECTION_ORDER.map((s) => (
                    <option key={s} value={s}>{SECTION_META[s].label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            {block.notes !== undefined ? (
              <input
                value={block.notes ?? ''}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                placeholder="Coach note…"
                className="mt-2 w-full bg-slate-50 border border-transparent hover:border-slate-200 focus:border-brand-orange rounded px-2 py-1 text-xs focus:outline-none transition-colors"
              />
            ) : (
              <button
                onClick={() => onUpdate({ notes: '' })}
                className="mt-1.5 text-xs text-slate-300 hover:text-slate-500 transition-colors"
              >
                + note
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col shrink-0 border-l border-slate-100">
            <button
              onClick={onDuplicate}
              title="Duplicate block"
              className="flex-1 flex items-center justify-center w-8 text-slate-300 hover:text-brand-orange hover:bg-brand-orange/10 transition-colors text-sm"
            >
              ⧉
            </button>
            <button
              onClick={onDelete}
              title="Remove block"
              className="flex-1 flex items-center justify-center w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  blocks: SessionBlock[];
  onReorder: (blocks: SessionBlock[]) => void;
  onUpdate: (blockId: string, updates: Partial<SessionBlock>) => void;
  onDelete: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
}

// ─── Section node (timeline phase milestone) ────────────────────────────────

function SectionNode({ section, count, totalMin, collapsed, onToggle }: {
  section: SessionSection;
  count: number;
  totalMin: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const meta = SECTION_META[section];
  return (
    <button
      onClick={onToggle}
      className="relative z-10 w-full flex items-center gap-3 px-3 py-2.5 hover:opacity-90 transition-opacity"
    >
      {/* Icon circle (sits on top of spine) */}
      <div className={`w-10 h-10 rounded-full ${meta.iconBg} text-white flex items-center justify-center text-lg shadow-sm shrink-0 z-10`}>
        {meta.icon}
      </div>
      <div className="flex-1 text-left">
        <div className={`text-sm font-bold uppercase tracking-wider ${meta.textColor}`}>{meta.label}</div>
        <div className="text-xs text-slate-400">{count} drill{count !== 1 ? 's' : ''} · {totalMin}m</div>
      </div>
      <div className={`text-slate-300 text-xs font-medium px-2 py-1 rounded-lg border transition-all ${meta.border} ${meta.bg}`}>
        {collapsed ? 'expand ▶' : 'collapse ▼'}
      </div>
    </button>
  );
}

export default function SessionTimeline({ blocks, onReorder, onUpdate, onDelete, onDuplicate }: Props) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(blocks, oldIndex, newIndex));
  };

  if (blocks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 p-8 min-h-[300px]">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-3xl">⚽</div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-500">Session is empty</p>
          <p className="text-xs text-slate-400 mt-1">Pick a drill from the left panel to build your session</p>
          <p className="text-xs text-slate-400 mt-0.5">Click to configure · Double-click to add instantly</p>
        </div>
      </div>
    );
  }

  const hasSections = blocks.some((b) => b.section);

  const renderBlocks = () => {
    if (!hasSections) {
      // Flat list — no timeline decoration
      return (
        <div className="flex flex-col gap-2 p-4">
          {blocks.map((block, i) => (
            <BlockCard
              key={block.id}
              block={block}
              index={i}
              onUpdate={(updates) => onUpdate(block.id, updates)}
              onDelete={() => onDelete(block.id)}
              onDuplicate={() => onDuplicate(block.id)}
            />
          ))}
        </div>
      );
    }

    // Timeline layout
    const result: React.ReactNode[] = [];

    SECTION_ORDER.forEach((section) => {
      const sectionBlocks = blocks.filter((b) => b.section === section);
      if (sectionBlocks.length === 0) return;
      const sectionMin = sectionBlocks.reduce((s, b) => s + b.durationMin, 0);
      const collapsed = collapsedSections.has(section);
      const meta = SECTION_META[section];

      result.push(
        <div key={`section-${section}`} className="relative">
          {/* Vertical spine running through section */}
          <div
            className="absolute left-8 top-0 bottom-0 w-0.5 rounded-full"
            style={{ backgroundColor: meta.barHex, opacity: 0.3 }}
          />
          <SectionNode
            section={section}
            count={sectionBlocks.length}
            totalMin={sectionMin}
            collapsed={collapsed}
            onToggle={() => toggleSection(section)}
          />
          {!collapsed && (
            <div className="pl-16 pr-4 pb-4 space-y-2">
              {sectionBlocks.map((block) => {
                const blockIdx = blocks.indexOf(block);
                return (
                  <BlockCard
                    key={block.id}
                    block={block}
                    index={blockIdx}
                    onUpdate={(updates) => onUpdate(block.id, updates)}
                    onDelete={() => onDelete(block.id)}
                    onDuplicate={() => onDuplicate(block.id)}
                    sectionBarHex={meta.barHex}
                  />
                );
              })}
            </div>
          )}
        </div>
      );
    });

    const unsectioned = blocks.filter((b) => !b.section);
    if (unsectioned.length > 0) {
      result.push(
        <div key="unsectioned" className="px-4 pb-4">
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl border border-slate-200 bg-slate-50">
            <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-xs text-white">?</div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Unassigned</span>
            <span className="text-xs text-slate-400 ml-auto">{unsectioned.length} drill{unsectioned.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {unsectioned.map((block) => {
              const blockIdx = blocks.indexOf(block);
              return (
                <BlockCard
                  key={block.id}
                  block={block}
                  index={blockIdx}
                  onUpdate={(updates) => onUpdate(block.id, updates)}
                  onDelete={() => onDelete(block.id)}
                  onDuplicate={() => onDuplicate(block.id)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    return result;
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="py-2">
          {renderBlocks()}
        </div>
      </SortableContext>
    </DndContext>
  );
}
