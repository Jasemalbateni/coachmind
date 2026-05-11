'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSeasonPlansStore } from '@/store/seasonPlansStore';
import { useTeamsStore } from '@/store/teamsStore';
import { useSessionsStore } from '@/store/sessionsStore';
import { useDrillsStore } from '@/store/drillsStore';
import { useCalendarStore } from '@/store/calendarStore';
import type { SeasonPlanEntry, Session, Drill } from '@/types';

// ─── Weekly Intensity Chart ───────────────────────────────────────────────────

interface DayLoad { date: string; label: string; low: number; mid: number; high: number; }

function getISOWeek(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return mon.toISOString().slice(0, 10);
}

function IntensityChart({
  trainingDates,
  entryByDate,
  sessions,
  drills,
}: {
  trainingDates: Date[];
  entryByDate: Record<string, SeasonPlanEntry>;
  sessions: Record<string, Session>;
  drills: Record<string, Drill>;
}) {
  const [collapsed, setCollapsed] = useState(true);

  // Compute per-day load
  const dayLoads: DayLoad[] = trainingDates.map((d) => {
    const dateStr = d.toISOString().slice(0, 10);
    const entry = entryByDate[dateStr];
    const session = entry?.sessionId ? sessions[entry.sessionId] : null;
    let low = 0, mid = 0, high = 0;
    if (session) {
      for (const block of session.blocks) {
        if (block.intensity === 'low') low += block.durationMin;
        else if (block.intensity === 'mid') mid += block.durationMin;
        else high += block.durationMin;
      }
    }
    return { date: dateStr, label: d.getDate().toString(), low, mid, high };
  });

  // Group by week
  const weekGroups: Record<string, DayLoad[]> = {};
  trainingDates.forEach((d, i) => {
    const wk = getISOWeek(d);
    if (!weekGroups[wk]) weekGroups[wk] = [];
    weekGroups[wk].push(dayLoads[i]);
  });

  const maxTotal = Math.max(1, ...dayLoads.map((d) => d.low + d.mid + d.high));
  const weeks = Object.entries(weekGroups).slice(0, 16); // cap display

  if (trainingDates.length === 0) return null;

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2 shrink-0">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
      >
        <span>Weekly Load Chart</span>
        <span>{collapsed ? '▼ show' : '▲ hide'}</span>
      </button>

      {!collapsed && (
        <div className="mt-3 overflow-x-auto">
          <div className="flex gap-3 min-w-0 pb-1">
            {weeks.map(([weekStart, days]) => (
              <div key={weekStart} className="shrink-0">
                <div className="text-[10px] text-slate-400 mb-1 text-center">
                  w/{new Date(weekStart).getDate()}/{new Date(weekStart).getMonth() + 1}
                </div>
                <div className="flex gap-1 items-end h-16">
                  {days.map((d) => {
                    const total = d.low + d.mid + d.high;
                    const barH = Math.round((total / maxTotal) * 56);
                    const lowH = total > 0 ? Math.round((d.low / total) * barH) : 0;
                    const midH = total > 0 ? Math.round((d.mid / total) * barH) : 0;
                    const highH = barH - lowH - midH;
                    return (
                      <div key={d.date} className="flex flex-col items-center gap-0.5" title={`${d.date}: ${total}min (${d.low}L ${d.mid}M ${d.high}H)`}>
                        <div className="flex flex-col-reverse items-stretch w-5" style={{ height: 56 }}>
                          {total === 0 ? (
                            <div className="w-5 rounded-sm bg-slate-100" style={{ height: 4 }} />
                          ) : (
                            <>
                              {highH > 0 && <div className="w-5 bg-red-400 rounded-sm" style={{ height: highH }} />}
                              {midH > 0 && <div className="w-5 bg-amber-400" style={{ height: midH }} />}
                              {lowH > 0 && <div className="w-5 bg-sky-400 rounded-sm" style={{ height: lowH }} />}
                            </>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400">{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-3 h-3 rounded-sm bg-sky-400 inline-block" /> Low</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Mid</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> High</span>
          </div>
        </div>
      )}
    </div>
  );
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getTrainingDates(startDate: string, endDate: string, trainingDays: string[]): Date[] {
  const dates: Date[] = [];
  const end = new Date(endDate);
  const cur = new Date(startDate);
  while (cur <= end) {
    const dayName = DAY_NAMES[cur.getDay()];
    if (trainingDays.length === 0 || trainingDays.includes(dayName)) {
      dates.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function EntryRow({
  date,
  entry,
  sessions,
  teamId,
  onUpsert,
}: {
  date: Date;
  entry: SeasonPlanEntry | undefined;
  sessions: Record<string, Session>;
  teamId: string;
  onUpsert: (entry: SeasonPlanEntry) => void;
}) {
  const dateStr = date.toISOString().slice(0, 10);
  const dayName = DAY_NAMES[date.getDay()];
  const { syncSeasonPlanEntry, clearSeasonPlanEntry } = useCalendarStore();

  const [sessionId, setSessionId] = useState(entry?.sessionId ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');

  useEffect(() => {
    setSessionId(entry?.sessionId ?? '');
    setNotes(entry?.notes ?? '');
  }, [entry?.sessionId, entry?.notes]);

  const save = (sid: string, n: string) => {
    const entryId = entry?.id ?? crypto.randomUUID();
    onUpsert({
      id: entryId,
      date: dateStr,
      trainingDay: dayName,
      sessionId: sid || undefined,
      notes: n || undefined,
    });
    // Sync to calendar
    if (sid) {
      const session = sessions[sid];
      const title = session?.title ?? dateStr;
      syncSeasonPlanEntry(entryId, dateStr, title, teamId || undefined, sid);
    } else if (entry?.id) {
      clearSeasonPlanEntry(entry.id);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="w-32 shrink-0">
        <p className="text-xs font-semibold text-slate-700 tabular-nums">{dateStr}</p>
        <p className="text-xs text-slate-400">{dayName}</p>
      </div>
      <select
        value={sessionId}
        onChange={(e) => { setSessionId(e.target.value); save(e.target.value, notes); }}
        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange"
      >
        <option value="">— No session —</option>
        {Object.values(sessions).map((s) => (
          <option key={s.id} value={s.id}>{s.title}</option>
        ))}
      </select>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => save(sessionId, notes)}
        placeholder="Notes…"
        className="w-44 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange"
      />
    </div>
  );
}

export default function SeasonPlanEditor({ planId }: { planId: string }) {
  const router = useRouter();
  const { plans, updatePlan, upsertEntry, deletePlan } = useSeasonPlansStore();
  const { teams, seedIfEmpty: seedTeams } = useTeamsStore();
  const { sessions, seedIfEmpty: seedSessions } = useSessionsStore();
  const { drills, seedIfEmpty: seedDrills } = useDrillsStore();

  const [titleValue, setTitleValue] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => { seedTeams(); seedDrills(); }, [seedTeams, seedDrills]);
  useEffect(() => {
    const ids = Object.keys(drills);
    if (ids.length) seedSessions(ids);
  }, [drills, seedSessions]);

  const plan = plans[planId];

  useEffect(() => {
    const t = setTimeout(() => { if (!plans[planId]) router.push('/season-plans'); }, 1000);
    return () => clearTimeout(t);
  }, [planId, plans, router]);

  useEffect(() => {
    if (plan) setTitleValue(plan.title);
  }, [plan]);

  if (!plan) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading…</div>;

  const team = plan.teamId ? teams[plan.teamId] : null;
  const trainingDays = team?.trainingDays ?? [];
  const trainingDates = getTrainingDates(plan.startDate, plan.endDate, trainingDays);
  const entryByDate: Record<string, SeasonPlanEntry> = {};
  plan.entries.forEach((e) => { entryByDate[e.date] = e; });

  const assignedCount = plan.entries.filter((e) => e.sessionId).length;

  const commitTitle = () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue !== plan.title) updatePlan(planId, { title: titleValue.trim() });
    else setTitleValue(plan.title);
  };

  // Group dates by month for display
  const byMonth: Record<string, Date[]> = {};
  trainingDates.forEach((d) => {
    const key = d.toISOString().slice(0, 7);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(d);
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top bar */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0 shadow-sm">
        <Link href="/season-plans" className="text-slate-400 hover:text-slate-700 text-sm transition-colors">← Plans</Link>
        <span className="text-slate-300">/</span>
        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') { setTitleValue(plan.title); setEditingTitle(false); }
            }}
            className="bg-slate-50 border border-brand-orange rounded-lg px-2 py-0.5 text-sm focus:outline-none min-w-0 max-w-xs"
          />
        ) : (
          <button onClick={() => setEditingTitle(true)} className="text-sm font-semibold text-slate-800 hover:text-brand-orange transition-colors truncate max-w-xs">
            {plan.title}
          </button>
        )}
        {team && <span className="text-xs font-medium text-brand-orange">{team.name}</span>}
        <span className="text-xs text-slate-400 ml-auto">
          {assignedCount}/{trainingDates.length} sessions assigned
        </span>
        <Link
          href={`/season-plans/${planId}/view`}
          className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors font-medium"
        >
          Print View
        </Link>
        <button
          onClick={() => { if (window.confirm('Delete this plan?')) { deletePlan(planId); router.push('/season-plans'); } }}
          className="text-xs text-red-400 hover:text-red-600 px-2 py-1 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Meta row */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Start</label>
          <input
            type="date"
            value={plan.startDate}
            onChange={(e) => updatePlan(planId, { startDate: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">End</label>
          <input
            type="date"
            value={plan.endDate}
            onChange={(e) => updatePlan(planId, { endDate: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Team</label>
          <select
            value={plan.teamId}
            onChange={(e) => updatePlan(planId, { teamId: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-orange"
          >
            <option value="">No team</option>
            {Object.values(teams).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        {team && trainingDays.length > 0 ? (
          <span className="text-xs text-slate-500">Training: {trainingDays.join(', ')}</span>
        ) : (
          <span className="text-xs text-slate-400">No team — showing all days</span>
        )}
      </div>

      {/* Weekly intensity chart */}
      <IntensityChart
        trainingDates={trainingDates}
        entryByDate={entryByDate}
        sessions={sessions}
        drills={drills}
      />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 bg-brand-bg">
        {trainingDates.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p>No training dates in this range</p>
            <p className="text-sm mt-1">Check start/end dates and team training days</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {Object.entries(byMonth).map(([monthKey, dates]) => (
              <div key={monthKey}>
                <h2 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                  {new Date(monthKey + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="bg-white rounded-xl p-3 shadow-card border border-slate-100">
                  {dates.map((d) => (
                    <EntryRow
                      key={d.toISOString().slice(0, 10)}
                      date={d}
                      entry={entryByDate[d.toISOString().slice(0, 10)]}
                      sessions={sessions}
                      teamId={plan.teamId}
                      onUpsert={(entry) => upsertEntry(planId, entry)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
