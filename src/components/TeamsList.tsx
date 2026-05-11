'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTeamsStore } from '@/store/teamsStore';
import type { Team } from '@/types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function NewTeamModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: Omit<Team, 'id' | 'players' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState('U16');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#1d4ed8');
  const [opponentPrimaryColor, setOpponentPrimaryColor] = useState('#ef4444');
  const [trainingDays, setTrainingDays] = useState<string[]>(['Tuesday', 'Thursday']);

  const toggleDay = (day: string) =>
    setTrainingDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 mb-4">New Team</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) onCreate({ name: name.trim(), ageGroup, primaryColor, secondaryColor, opponentPrimaryColor, trainingDays }); }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Team Name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FC Academy U16"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Age Group</label>
            <input value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} placeholder="U16"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Team Color</label>
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full h-9 rounded cursor-pointer border-0 bg-transparent" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Secondary</label>
              <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-full h-9 rounded cursor-pointer border-0 bg-transparent" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Opponent</label>
              <input type="color" value={opponentPrimaryColor} onChange={(e) => setOpponentPrimaryColor(e.target.value)} className="w-full h-9 rounded cursor-pointer border-0 bg-transparent" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-2 block">Training Days</label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs border font-medium transition-colors ${
                    trainingDays.includes(d)
                      ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                      : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}>
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button type="submit" disabled={!name.trim()}
              className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-40 rounded-xl text-white text-sm font-semibold transition-colors">
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeamCard({ team, onDelete }: { team: Team; onDelete: () => void }) {
  const homeCount = team.players.filter((p) => p.teamSide === 'home').length;
  const oppCount = team.players.filter((p) => p.teamSide === 'opponent').length;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full shrink-0 border-2 border-white shadow-sm" style={{ background: `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor})` }} />
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 truncate">{team.name}</p>
          <p className="text-xs text-slate-500">{team.ageGroup}</p>
        </div>
        <div className="ml-auto w-4 h-4 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: team.opponentPrimaryColor }} title="Opponent color" />
      </div>
      <div className="text-xs text-slate-500 mb-3 space-y-1">
        <p>{homeCount} home · {oppCount} opponent players</p>
        <p>{team.trainingDays.length > 0 ? team.trainingDays.join(', ') : 'No training days set'}</p>
      </div>
      <div className="flex gap-2">
        <Link href={`/teams/${team.id}`}
          className="flex-1 text-center py-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-lg text-xs font-semibold transition-colors">
          Manage Team
        </Link>
        <button onClick={onDelete}
          className="px-2 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-lg text-xs transition-colors">
          Del
        </button>
      </div>
    </div>
  );
}

export default function TeamsList() {
  const { teams, seedIfEmpty, deleteTeam, addTeam } = useTeamsStore();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { seedIfEmpty(); }, [seedIfEmpty]);

  const handleCreate = (data: Omit<Team, 'id' | 'players' | 'createdAt' | 'updatedAt'>) => {
    const team: Team = { id: crypto.randomUUID(), ...data, players: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    addTeam(team);
    setShowModal(false);
    router.push(`/teams/${team.id}`);
  };

  const list = Object.values(teams).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shrink-0">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Teams</h1>
          <p className="text-slate-400 text-xs mt-0.5">{list.length} team{list.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-brand-orange/20">
          + New Team
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-brand-bg p-6">
        {list.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-3">&#128101;</p>
            <p className="text-lg font-medium text-slate-600">No teams yet</p>
            <p className="text-sm mt-1">Create a team to start planning with player management</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {list.map((team) => (
              <TeamCard key={team.id} team={team} onDelete={() => deleteTeam(team.id)} />
            ))}
          </div>
        )}
      </div>
      {showModal && <NewTeamModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </div>
  );
}
