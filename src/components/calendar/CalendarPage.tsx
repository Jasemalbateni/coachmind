'use client';

import { useEffect, useState } from 'react';
import { useCalendarStore } from '@/store/calendarStore';
import { useTeamsStore } from '@/store/teamsStore';
import { useSessionsStore } from '@/store/sessionsStore';
import { useDrillsStore } from '@/store/drillsStore';
import type { CalendarEvent, CalendarEventType, CalendarEventStatus } from '@/types';

const TYPE_CONFIG: Record<CalendarEventType, { label: string; dot: string }> = {
  training: { label: 'Training', dot: 'bg-brand-orange' },
  match:    { label: 'Match',    dot: 'bg-red-500' },
  rest:     { label: 'Rest',     dot: 'bg-sky-500' },
  other:    { label: 'Other',    dot: 'bg-slate-400' },
};

const STATUS_STYLES: Record<CalendarEventStatus, string> = {
  planned:   'bg-brand-orange hover:bg-brand-orange/90 text-white',
  completed: 'bg-brand-orange/70 hover:bg-brand-orange/60 text-white',
  cancelled: 'bg-slate-200 text-slate-400 line-through opacity-60',
};

const MATCH_STATUS_STYLES: Record<CalendarEventStatus, string> = {
  planned:   'bg-red-500 hover:bg-red-400 text-white',
  completed: 'bg-red-400 hover:bg-red-300 text-white',
  cancelled: 'bg-slate-200 text-slate-400 line-through opacity-60',
};

const OTHER_STATUS_STYLES: Record<CalendarEventType, Record<CalendarEventStatus, string>> = {
  training: STATUS_STYLES,
  match:    MATCH_STATUS_STYLES,
  rest:     { planned: 'bg-sky-500 hover:bg-sky-400 text-white', completed: 'bg-sky-400 text-white', cancelled: 'bg-slate-200 text-slate-400 line-through opacity-60' },
  other:    { planned: 'bg-slate-400 hover:bg-slate-300 text-white', completed: 'bg-slate-300 text-slate-700', cancelled: 'bg-slate-200 text-slate-400 line-through opacity-60' },
};

function getEventStyle(ev: CalendarEvent) {
  const status: CalendarEventStatus = ev.status ?? 'planned';
  return OTHER_STATUS_STYLES[ev.type][status];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── KPI Strip ────────────────────────────────────────────────────────────────
function MonthKPIs({ events, year, month }: { events: CalendarEvent[]; year: number; month: number }) {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const thisMonth = events.filter((e) => e.date.startsWith(monthStr) && e.type === 'training');

  const planned   = thisMonth.filter((e) => !e.status || e.status === 'planned').length;
  const completed = thisMonth.filter((e) => e.status === 'completed').length;
  const cancelled = thisMonth.filter((e) => e.status === 'cancelled').length;
  const total = thisMonth.length;

  if (total === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 text-xs">
      <span className="text-slate-500 font-medium">{MONTHS[month]} KPIs:</span>
      <span className="flex items-center gap-1 text-slate-500">
        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
        {total} training{total !== 1 ? 's' : ''}
      </span>
      {planned > 0 && (
        <span className="flex items-center gap-1 text-brand-orange">
          <span className="w-2 h-2 rounded-full bg-brand-orange inline-block" />
          {planned} planned
        </span>
      )}
      {completed > 0 && (
        <span className="flex items-center gap-1 text-emerald-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          {completed} completed
        </span>
      )}
      {cancelled > 0 && (
        <span className="flex items-center gap-1 text-red-500">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          {cancelled} cancelled
        </span>
      )}
    </div>
  );
}

// ─── Event Modal ──────────────────────────────────────────────────────────────
function EventModal({
  event,
  date,
  teams,
  sessions,
  onSave,
  onDelete,
  onClose,
}: {
  event: CalendarEvent | null;
  date: string;
  teams: Record<string, import('@/types').Team>;
  sessions: Record<string, import('@/types').Session>;
  onSave: (event: CalendarEvent) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [type, setType] = useState<CalendarEventType>(event?.type ?? 'training');
  const [status, setStatus] = useState<CalendarEventStatus>(event?.status ?? 'planned');
  const [teamId, setTeamId] = useState(event?.teamId ?? '');
  const [sessionId, setSessionId] = useState(event?.sessionId ?? '');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [eventDate, setEventDate] = useState(event?.date ?? date);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      id: event?.id ?? crypto.randomUUID(),
      title: title.trim(),
      date: eventDate,
      type,
      status,
      teamId: teamId || undefined,
      sessionId: sessionId || undefined,
      notes: notes.trim() || undefined,
      seasonPlanEntryId: event?.seasonPlanEntryId,
    });
  };

  const handleCancel = () => {
    if (!event) return;
    onSave({ ...event, status: 'cancelled' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 mb-4">{event ? 'Edit Event' : 'New Event'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CalendarEventType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-brand-orange"
              >
                {(Object.keys(TYPE_CONFIG) as CalendarEventType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Status</label>
            <div className="flex gap-1">
              {(['planned', 'completed', 'cancelled'] as CalendarEventStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-1 rounded-lg text-xs border font-medium transition-colors capitalize ${
                    status === s
                      ? s === 'planned' ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                        : s === 'completed' ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                        : 'border-red-300 bg-red-50 text-red-500'
                      : 'border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Team</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-brand-orange"
            >
              <option value="">No team</option>
              {Object.values(teams).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {type === 'training' && (
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Linked Session</label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-brand-orange"
              >
                <option value="">No session</option>
                {Object.values(sessions).map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes…"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-sm resize-none focus:outline-none focus:border-brand-orange"
            />
          </div>
          <div className="flex gap-2 justify-between pt-2">
            <div className="flex gap-2">
              {event && event.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-2 text-sm text-amber-600 hover:text-amber-700 border border-amber-200 rounded-xl bg-amber-50"
                >
                  Cancel Session
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3 py-2 text-sm text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Close</button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-40 rounded-xl text-white text-sm font-semibold transition-colors"
              >
                {event ? 'Save' : 'Add Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { events, addEvent, updateEvent, deleteEvent } = useCalendarStore();
  const { teams, seedIfEmpty: seedTeams } = useTeamsStore();
  const { sessions, seedIfEmpty: seedSessions } = useSessionsStore();
  const { drills, seedIfEmpty: seedDrills } = useDrillsStore();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { seedTeams(); seedDrills(); }, [seedTeams, seedDrills]);
  useEffect(() => {
    const ids = Object.keys(drills);
    if (ids.length) seedSessions(ids);
  }, [drills, seedSessions]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const eventsByDate: Record<string, CalendarEvent[]> = {};
  Object.values(events).forEach((ev) => {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  });

  const openNewEvent = (dateStr: string) => {
    setModalDate(dateStr);
    setEditingEvent(null);
    setShowModal(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setModalDate(ev.date);
    setShowModal(true);
  };

  const handleSave = (ev: CalendarEvent) => {
    if (editingEvent) updateEvent(ev.id, ev);
    else addEvent(ev);
    setShowModal(false);
  };

  const handleDelete = () => {
    if (editingEvent) deleteEvent(editingEvent.id);
    setShowModal(false);
  };

  const todayStr = today.toISOString().slice(0, 10);
  const allEventsList = Object.values(events);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-brand-bg">
      {/* Header */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Calendar</h1>
        <div className="flex items-center gap-2 ml-4">
          <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">‹</button>
          <span className="text-sm font-semibold text-slate-800 w-36 text-center">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">›</button>
        </div>
        <button
          onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
          className="ml-2 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 font-medium transition-colors"
        >
          Today
        </button>
        {/* Legend */}
        <div className="ml-auto flex items-center gap-3">
          {(Object.entries(TYPE_CONFIG) as [CalendarEventType, typeof TYPE_CONFIG[CalendarEventType]][]).map(([type, cfg]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-slate-500">{cfg.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-400">Cancelled</span>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <MonthKPIs events={allEventsList} year={year} month={month} />

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto p-4">
        <div>
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-xs text-slate-400 py-1 font-semibold">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
            {Array.from({ length: totalCells }, (_, i) => {
              const dayNum = i - firstDay + 1;
              const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
              const dateStr = isCurrentMonth
                ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                : null;
              const isToday = dateStr === todayStr;
              const dayEvents = dateStr ? (eventsByDate[dateStr] ?? []) : [];

              return (
                <div
                  key={i}
                  className={`min-h-20 p-1.5 bg-white ${isCurrentMonth ? 'cursor-pointer hover:bg-slate-50' : 'opacity-30 bg-slate-50'}`}
                  onClick={() => { if (dateStr) openNewEvent(dateStr); }}
                >
                  <div className={`text-xs w-6 h-6 flex items-center justify-center rounded-full mb-1 font-medium ${
                    isToday ? 'bg-brand-orange text-white font-bold' : 'text-slate-500'
                  }`}>
                    {isCurrentMonth ? dayNum : ''}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate ${getEventStyle(ev)}`}
                        title={`${ev.title}${ev.status && ev.status !== 'planned' ? ` [${ev.status}]` : ''}`}
                      >
                        {ev.status === 'completed' && '✓ '}
                        {ev.status === 'cancelled' && '✕ '}
                        {ev.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-xs text-slate-400 pl-1">+{dayEvents.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showModal && (
        <EventModal
          event={editingEvent}
          date={modalDate ?? todayStr}
          teams={teams}
          sessions={sessions}
          onSave={handleSave}
          onDelete={editingEvent ? handleDelete : undefined}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
