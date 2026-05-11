'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSessionsStore } from '@/store/sessionsStore';
import { useDrillsStore } from '@/store/drillsStore';
import { useTeamsStore } from '@/store/teamsStore';
import type { SessionBlock, SessionSection } from '@/types';
import { analyzeSession } from '@/lib/sessionQuality';
import DrillPicker from './DrillPicker';
import SessionTimeline from './SessionTimeline';

const SECTION_LABELS: Record<SessionSection, string> = {
  warmup: 'Warm-up', main: 'Main', game: 'Game', cooldown: 'Cool-down',
};
const SECTION_COLORS: Record<SessionSection, string> = {
  warmup: 'text-sky-500', main: 'text-brand-orange', game: 'text-amber-500', cooldown: 'text-violet-500',
};

interface Props {
  sessionId: string;
}

const INTENSITY_COLORS = { low: 'bg-sky-400', mid: 'bg-amber-400', high: 'bg-red-400' };

export default function SessionBuilderPage({ sessionId }: Props) {
  const router = useRouter();
  const { sessions, seedIfEmpty, updateSession, addBlock, updateBlock, deleteBlock, reorderBlocks } = useSessionsStore();
  const { drills, seedIfEmpty: seedDrills } = useDrillsStore();
  const { teams, seedIfEmpty: seedTeams } = useTeamsStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [showMeta, setShowMeta] = useState(false);

  useEffect(() => { seedDrills(); seedTeams(); }, [seedDrills, seedTeams]);
  useEffect(() => {
    const drillIds = Object.keys(drills);
    if (drillIds.length > 0) seedIfEmpty(drillIds);
  }, [drills, seedIfEmpty]);

  const session = sessions[sessionId];

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!sessions[sessionId]) router.push('/sessions');
    }, 1000);
    return () => clearTimeout(timeout);
  }, [sessionId, sessions, router]);

  useEffect(() => {
    if (session) {
      setTitleValue(session.title);
      setSaveStatus('saving');
      const t = setTimeout(() => setSaveStatus('saved'), 600);
      return () => clearTimeout(t);
    }
  }, [session]);

  if (!session) {
    return <div className="flex-1 flex items-center justify-center text-slate-400">Loading session…</div>;
  }

  const totalMin = session.blocks.reduce((s, b) => s + b.durationMin, 0);
  const teamList = Object.values(teams);

  // Session summary data
  const sectionTotals = (['warmup', 'main', 'game', 'cooldown'] as SessionSection[]).map((s) => ({
    section: s,
    blocks: session.blocks.filter((b) => b.section === s),
    totalMin: session.blocks.filter((b) => b.section === s).reduce((acc, b) => acc + b.durationMin, 0),
  })).filter((s) => s.blocks.length > 0);

  const intensityCounts = { low: 0, mid: 0, high: 0 };
  session.blocks.forEach((b) => intensityCounts[b.intensity]++);

  const allEquipment = session.blocks
    .flatMap((b) => drills[b.drillId]?.equipment ?? [])
    .reduce((acc, eq) => { acc[eq] = (acc[eq] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  const commitTitle = () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue.trim() !== session.title) {
      updateSession(sessionId, { title: titleValue.trim() });
    } else {
      setTitleValue(session.title);
    }
  };

  const handleAddBlock = (blockData: Omit<SessionBlock, 'id'>) => {
    const block: SessionBlock = { id: crypto.randomUUID(), ...blockData };
    addBlock(sessionId, block);
  };

  const handleDuplicateBlock = (blockId: string) => {
    const block = session.blocks.find((b) => b.id === blockId);
    if (!block) return;
    addBlock(sessionId, { ...block, id: crypto.randomUUID() });
  };

  const intensityBar = session.blocks.map((b) => ({
    id: b.id,
    width: `${Math.round((b.durationMin / Math.max(totalMin, 1)) * 100)}%`,
    color: INTENSITY_COLORS[b.intensity],
    label: drills[b.drillId]?.title ?? '?',
    min: b.durationMin,
  }));

  const qualityIssues = analyzeSession(session, drills);

  const selectedTeam = session.teamId ? teams[session.teamId] : null;
  const trainingDays = selectedTeam?.trainingDays ?? [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top bar */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0 shadow-sm">
        <Link href="/sessions" className="text-slate-400 hover:text-slate-700 text-sm transition-colors">
          ← Sessions
        </Link>
        <span className="text-slate-300">/</span>

        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') { setTitleValue(session.title); setEditingTitle(false); }
            }}
            className="bg-slate-50 border border-brand-orange rounded-lg px-2 py-0.5 text-sm focus:outline-none min-w-0 flex-1 max-w-xs"
          />
        ) : (
          <button onClick={() => setEditingTitle(true)} className="text-sm font-semibold text-slate-800 hover:text-brand-orange transition-colors truncate max-w-xs">
            {session.title}
          </button>
        )}

        <span className={`text-xs px-2 py-0.5 rounded-full ${
          saveStatus === 'saved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
        }`}>
          {saveStatus === 'saved' ? 'Saved' : 'Saving…'}
        </span>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {session.date && (
            <input
              type="date"
              value={session.date}
              onChange={(e) => updateSession(sessionId, { date: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange"
            />
          )}
          <span className="text-slate-700 font-semibold">{totalMin} min</span>
          <span className="text-slate-400">{session.blocks.length} drill{session.blocks.length !== 1 ? 's' : ''}</span>
          <Link
            href={`/sessions/${sessionId}/view`}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-lg text-xs transition-colors"
          >
            View
          </Link>
          <button
            onClick={() => setShowMeta((v) => !v)}
            className={`px-2 py-1 border rounded-lg text-xs transition-colors ${
              showMeta ? 'bg-brand-orange/10 border-brand-orange text-brand-orange' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
            }`}
          >
            Info
          </button>
        </div>
      </div>

      {/* Intensity bar */}
      {session.blocks.length > 0 && (
        <div className="h-8 bg-white border-b border-slate-200 flex items-center px-4 gap-1">
          <span className="text-xs text-slate-400 mr-2 shrink-0">Load:</span>
          <div className="flex-1 flex h-3 rounded-full overflow-hidden gap-px">
            {intensityBar.map((seg) => (
              <div
                key={seg.id}
                className={`${seg.color} opacity-70`}
                style={{ width: seg.width, minWidth: 4 }}
                title={`${seg.label} · ${seg.min}m`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-400 ml-2">{totalMin}m total</span>
        </div>
      )}

      {/* Quality issues strip */}
      {qualityIssues.length > 0 && (
        <div className="bg-white border-b border-slate-200 px-4 py-1.5 flex items-center gap-3 flex-wrap">
          {qualityIssues.map((issue, i) => {
            const styles = issue.level === 'error'
              ? 'text-red-600 bg-red-50 border-red-200'
              : issue.level === 'warning'
              ? 'text-amber-600 bg-amber-50 border-amber-200'
              : 'text-sky-600 bg-sky-50 border-sky-200';
            const icon = issue.level === 'error' ? '✕' : issue.level === 'warning' ? '⚠' : 'ℹ';
            return (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-lg border ${styles}`}
                title={issue.detail}
              >
                <span>{icon}</span>
                {issue.title}
              </span>
            );
          })}
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex min-h-0 bg-brand-bg">
        <DrillPicker onAdd={handleAddBlock} />

        <div className="flex-1 overflow-y-auto">
          <SessionTimeline
            blocks={session.blocks}
            onReorder={(blocks) => reorderBlocks(sessionId, blocks)}
            onUpdate={(blockId, updates) => updateBlock(sessionId, blockId, updates)}
            onDelete={(blockId) => deleteBlock(sessionId, blockId)}
            onDuplicate={handleDuplicateBlock}
          />
        </div>

        {/* Metadata sidebar */}
        {showMeta && (
          <aside className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">
            <div className="p-3 border-b border-slate-200">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Session Info</p>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Date</label>
                <input
                  type="date"
                  value={session.date ?? ''}
                  onChange={(e) => updateSession(sessionId, { date: e.target.value || undefined })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Objective</label>
                <textarea
                  value={session.objective ?? ''}
                  onChange={(e) => updateSession(sessionId, { objective: e.target.value || undefined })}
                  rows={3}
                  placeholder="Session objective…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs resize-none focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Age Group</label>
                <input
                  value={session.ageGroup ?? ''}
                  onChange={(e) => updateSession(sessionId, { ageGroup: e.target.value || undefined })}
                  placeholder="e.g. U16"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Player Count</label>
                <input
                  value={session.playerCount ?? ''}
                  onChange={(e) => updateSession(sessionId, { playerCount: e.target.value || undefined })}
                  placeholder="e.g. 18"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Team</label>
                <select
                  value={session.teamId ?? ''}
                  onChange={(e) => updateSession(sessionId, { teamId: e.target.value || null })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange"
                >
                  <option value="">No team</option>
                  {teamList.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {trainingDays.length > 0 && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Training Day</label>
                  <select
                    value={session.trainingDay ?? ''}
                    onChange={(e) => updateSession(sessionId, { trainingDay: e.target.value || null })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange"
                  >
                    <option value="">—</option>
                    {trainingDays.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Notes</label>
                <textarea
                  value={session.notes ?? ''}
                  onChange={(e) => updateSession(sessionId, { notes: e.target.value || undefined })}
                  rows={3}
                  placeholder="Coach notes…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs resize-none focus:outline-none focus:border-brand-orange"
                />
              </div>

              {/* Session Summary */}
              {session.blocks.length > 0 && (
                <>
                  <div className="border-t border-slate-200 pt-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Session Summary</p>

                    {/* Section breakdown */}
                    {sectionTotals.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {sectionTotals.map(({ section, blocks, totalMin: sMin }) => (
                          <div key={section} className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${SECTION_COLORS[section]}`}>{SECTION_LABELS[section]}</span>
                            <span className="text-xs text-slate-400 ml-auto">{blocks.length} drill{blocks.length !== 1 ? 's' : ''} · {sMin}m</span>
                          </div>
                        ))}
                        {session.blocks.filter((b) => !b.section).length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Unassigned</span>
                            <span className="text-xs text-slate-400 ml-auto">{session.blocks.filter((b) => !b.section).length} drills</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Intensity distribution */}
                    <div className="mb-3">
                      <p className="text-xs text-slate-400 mb-1">Intensity</p>
                      <div className="flex h-2 rounded-full overflow-hidden gap-px">
                        {intensityCounts.low > 0 && (
                          <div className="bg-sky-400 opacity-80" style={{ flex: intensityCounts.low }} title={`Low: ${intensityCounts.low}`} />
                        )}
                        {intensityCounts.mid > 0 && (
                          <div className="bg-amber-400 opacity-80" style={{ flex: intensityCounts.mid }} title={`Mid: ${intensityCounts.mid}`} />
                        )}
                        {intensityCounts.high > 0 && (
                          <div className="bg-red-400 opacity-80" style={{ flex: intensityCounts.high }} title={`High: ${intensityCounts.high}`} />
                        )}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {intensityCounts.low > 0 && <span className="text-xs text-sky-500">{intensityCounts.low} low</span>}
                        {intensityCounts.mid > 0 && <span className="text-xs text-amber-500">{intensityCounts.mid} mid</span>}
                        {intensityCounts.high > 0 && <span className="text-xs text-red-500">{intensityCounts.high} high</span>}
                      </div>
                    </div>

                    {/* Equipment */}
                    {Object.keys(allEquipment).length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Equipment needed</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(allEquipment).map((eq) => (
                            <span key={eq} className="text-xs px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{eq}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
