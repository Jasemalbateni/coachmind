'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSeasonPlansStore } from '@/store/seasonPlansStore';
import { useTeamsStore } from '@/store/teamsStore';
import type { SeasonPlan } from '@/types';

function NewPlanModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, teamId: string, startDate: string, endDate: string) => void;
}) {
  const { teams, seedIfEmpty } = useTeamsStore();
  useEffect(() => { seedIfEmpty(); }, [seedIfEmpty]);

  const [title, setTitle] = useState('');
  const [teamId, setTeamId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const defaultEnd = new Date();
  defaultEnd.setMonth(defaultEnd.getMonth() + 5);
  const [endDate, setEndDate] = useState(defaultEnd.toISOString().slice(0, 10));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 mb-4">New Season Plan</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); if (title.trim()) onCreate(title.trim(), teamId, startDate, endDate); }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Plan Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2025/26 Season"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Team</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
            >
              <option value="">No team</option>
              {Object.values(teams).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-colors"
            >
              Create Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlanCard({ plan, teamName, onDelete }: { plan: SeasonPlan; teamName: string; onDelete: () => void }) {
  const assignedCount = plan.entries.filter((e) => e.sessionId).length;
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">{plan.title}</h3>
        {teamName && <span className="text-xs font-medium text-brand-orange shrink-0">{teamName}</span>}
      </div>
      <p className="text-xs text-slate-500 mb-1">{plan.startDate} → {plan.endDate}</p>
      <p className="text-xs text-slate-400 mb-4">{assignedCount} of {plan.entries.length} sessions assigned</p>
      <div className="flex gap-2">
        <Link
          href={`/season-plans/${plan.id}`}
          className="flex-1 text-center py-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          Open Plan
        </Link>
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

export default function SeasonPlansList() {
  const { plans, addPlan, deletePlan } = useSeasonPlansStore();
  const { teams, seedIfEmpty: seedTeams } = useTeamsStore();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { seedTeams(); }, [seedTeams]);

  const sorted = Object.values(plans).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleCreate = (title: string, teamId: string, startDate: string, endDate: string) => {
    const plan: SeasonPlan = {
      id: crypto.randomUUID(),
      title,
      teamId,
      startDate,
      endDate,
      entries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addPlan(plan);
    setShowModal(false);
    router.push(`/season-plans/${plan.id}`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shrink-0">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Season Plans</h1>
          <p className="text-slate-400 text-xs mt-0.5">{sorted.length} plan{sorted.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-brand-orange/20"
        >
          + New Plan
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-brand-bg p-6">
        {sorted.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-3">&#128197;</p>
            <p className="text-lg font-medium text-slate-600">No season plans yet</p>
            <p className="text-sm mt-1">Create a plan to map training sessions across your season</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sorted.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                teamName={teams[plan.teamId]?.name ?? ''}
                onDelete={() => deletePlan(plan.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && <NewPlanModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </div>
  );
}
