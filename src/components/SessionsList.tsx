'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSessionsStore } from '@/store/sessionsStore';
import { useDrillsStore } from '@/store/drillsStore';
import { useTeamsStore } from '@/store/teamsStore';
import type { Session } from '@/types';

// ─── Session Templates ────────────────────────────────────────────────────────
interface SessionTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  objective: string;
  notes: string;
  ageGroup?: string;
}

const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    id: 'blank',
    label: 'Blank Session',
    description: 'Start from scratch. Add your own drills and structure.',
    icon: '📋',
    objective: '',
    notes: '',
  },
  {
    id: 'technical',
    label: 'Technical Session',
    description: 'Ball mastery, passing patterns, and combination play.',
    icon: '⚽',
    objective: 'Develop individual and unit technical skills through structured repetition',
    notes: 'Focus on quality of touch and execution over speed. Encourage players to challenge themselves technically.',
  },
  {
    id: 'possession',
    label: 'Possession Session',
    description: 'Positional play, keep-ball, and playing through pressure.',
    icon: '🔄',
    objective: 'Develop ball retention, positional awareness, and the ability to play under pressure',
    notes: 'Emphasise body shape, support positions, and decision-making speed. Reduce touches progressively.',
  },
  {
    id: 'finishing',
    label: 'Finishing Session',
    description: 'Final-third combinations, shooting, and clinical finishing.',
    icon: '🎯',
    objective: 'Improve composure, technique, and decision-making in front of goal',
    notes: 'High volume of touches in the box. Rotate players through so everyone gets shooting practice.',
  },
  {
    id: 'pressing',
    label: 'Pressing Session',
    description: 'Pressing triggers, cover shadows, and coordinated high press.',
    icon: '⚡',
    objective: 'Synchronise pressing actions across all units with clear trigger moments and compact shape',
    notes: 'Walk through trigger moments slowly first, then build to full speed. Reward good press triggers.',
  },
  {
    id: 'matchday1',
    label: 'Matchday -1',
    description: 'Light activation and set-piece review the day before a match.',
    icon: '🏟',
    objective: 'Pre-match preparation — activate the body, sharpen the mind, no physical load',
    notes: 'Keep all work short and sharp. End with a positive rondo. No high-intensity work — protect the legs.',
  },
  {
    id: 'recovery',
    label: 'Recovery Session',
    description: 'Low-intensity regeneration after a match or heavy training week.',
    icon: '🧘',
    objective: 'Active recovery and mental reset — restore energy and confidence after a match',
    notes: 'Relaxed, enjoyable session. Plenty of water breaks. Focus on positive moments from the recent match.',
  },
];

// ─── New Session Modal ────────────────────────────────────────────────────────
function NewSessionModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (title: string, date: string, template: SessionTemplate) => void;
}) {
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<SessionTemplate>(SESSION_TEMPLATES[0]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {step === 'template' ? (
          <>
            <h2 className="text-lg font-bold text-slate-900 mb-1">New Session</h2>
            <p className="text-xs text-slate-500 mb-4">Choose a starting template</p>
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto mb-4">
              {SESSION_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selectedTemplate.id === tmpl.id
                      ? 'border-brand-orange bg-brand-orange/5 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{tmpl.icon}</span>
                    <p className={`font-semibold text-sm ${selectedTemplate.id === tmpl.id ? 'text-brand-orange' : 'text-slate-800'}`}>{tmpl.label}</p>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{tmpl.description}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              <button
                onClick={() => setStep('details')}
                className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setStep('template')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back</button>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{selectedTemplate.icon}</span>
              <h2 className="text-lg font-bold text-slate-900">{selectedTemplate.label}</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">{selectedTemplate.description}</p>
            <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) onCreate(title.trim(), date, selectedTemplate); }} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Session Title</label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`e.g. ${selectedTemplate.label} — ${new Date().toLocaleDateString()}`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
                />
              </div>
              {selectedTemplate.objective && (
                <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-3">
                  <p className="text-xs text-brand-orange font-medium mb-0.5">Template objective</p>
                  <p className="text-xs text-slate-600">{selectedTemplate.objective}</p>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-colors"
                >
                  Create Session
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ session, teamName, onDelete, onDuplicate }: { session: Session; teamName: string; onDelete: () => void; onDuplicate: () => void }) {
  const { drills } = useDrillsStore();
  const totalMin = session.blocks.reduce((s, b) => s + b.durationMin, 0);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">{session.title}</h3>
        {session.date && <span className="text-xs text-slate-400 shrink-0">{session.date}</span>}
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {teamName && <span className="text-xs font-medium text-brand-orange">{teamName}</span>}
        {session.ageGroup && <span className="text-xs text-slate-400">{session.ageGroup}</span>}
        {session.playerCount && <span className="text-xs text-slate-400">{session.playerCount} players</span>}
      </div>
      <div className="flex gap-3 text-xs text-slate-400 mb-3">
        <span>{session.blocks.length} block{session.blocks.length !== 1 ? 's' : ''}</span>
        <span>{totalMin} min total</span>
      </div>
      <div className="space-y-1 mb-4">
        {session.blocks.slice(0, 3).map((block) => {
          const drill = drills[block.drillId];
          return (
            <div key={block.id} className="flex items-center gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                block.intensity === 'low' ? 'bg-sky-400' : block.intensity === 'mid' ? 'bg-amber-400' : 'bg-red-400'
              }`} />
              <span className="text-slate-500 truncate">{drill?.title ?? 'Unknown drill'}</span>
              <span className="text-slate-300 ml-auto shrink-0">{block.durationMin}m</span>
            </div>
          );
        })}
        {session.blocks.length > 3 && (
          <p className="text-xs text-slate-400">+{session.blocks.length - 3} more</p>
        )}
      </div>
      <div className="flex gap-2">
        <Link
          href={`/sessions/${session.id}`}
          className="flex-1 text-center py-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          Open Builder
        </Link>
        <Link
          href={`/sessions/${session.id}/view`}
          className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition-colors"
        >
          View
        </Link>
        <button
          onClick={onDuplicate}
          title="Duplicate session"
          className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition-colors"
        >
          ⧉
        </button>
        <button
          onClick={onDelete}
          className="px-2 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-lg text-xs transition-colors"
        >
          Del
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SessionsList() {
  const { sessions, seedIfEmpty, deleteSession, addSession, duplicateSession } = useSessionsStore();
  const { drills, seedIfEmpty: seedDrills } = useDrillsStore();
  const { teams, seedIfEmpty: seedTeams } = useTeamsStore();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { seedDrills(); seedTeams(); }, [seedDrills, seedTeams]);
  useEffect(() => {
    const drillIds = Object.keys(drills);
    if (drillIds.length > 0) seedIfEmpty(drillIds);
  }, [drills, seedIfEmpty]);

  const filtered = Object.values(sessions)
    .filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleCreate = (title: string, date: string, template: SessionTemplate) => {
    const session: Session = {
      id: crypto.randomUUID(),
      title,
      date,
      blocks: [],
      objective: template.objective || undefined,
      notes: template.notes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addSession(session);
    setShowModal(false);
    router.push(`/sessions/${session.id}`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shrink-0">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Sessions</h1>
          <p className="text-slate-400 text-xs mt-0.5">{filtered.length} session{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-brand-orange/20"
        >
          + New Session
        </button>
      </div>

      {/* Search bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sessions..."
          className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-brand-bg p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-3">&#128203;</p>
            <p className="text-lg font-medium text-slate-600">{search ? 'No sessions match your search' : 'No sessions yet'}</p>
            <p className="text-sm mt-1">{search ? 'Try a different search term' : 'Create your first session to get started'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                teamName={session.teamId ? (teams[session.teamId]?.name ?? '') : ''}
                onDelete={() => deleteSession(session.id)}
                onDuplicate={() => duplicateSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && <NewSessionModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </div>
  );
}
