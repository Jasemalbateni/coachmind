'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTeamsStore } from '@/store/teamsStore';
import { useDrillsStore } from '@/store/drillsStore';
import { useSessionsStore } from '@/store/sessionsStore';
import type { Team, TeamPlayer } from '@/types';

const POSITIONS = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST', 'CF'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function PlayerRow({ player, onUpdate, onDelete }: {
  player: TeamPlayer;
  onUpdate: (updates: Partial<TeamPlayer>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(player);

  const save = () => { setEditing(false); onUpdate(form); };

  if (!editing) {
    return (
      <div className="flex items-center gap-3 py-2 border-b border-gray-800 group">
        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: player.color ?? (player.teamSide === 'home' ? '#3b82f6' : '#ef4444') }}>
          {player.number ?? '–'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{player.name}</p>
          <p className="text-xs text-gray-500">{player.position ?? '–'} · {player.teamSide === 'home' ? 'Home' : 'Opponent'}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="px-2.5 py-1 bg-gray-800/60 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors" aria-label="Edit player">Edit</button>
          <button onClick={onDelete} className="px-2.5 py-1 bg-gray-800/60 hover:bg-red-900/50 text-gray-300 hover:text-red-400 rounded text-xs transition-colors" aria-label="Delete player">Del</button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 border-b border-gray-800">
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name"
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500" />
        <input value={form.number ?? ''} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="#"
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500" />
        <select value={form.position ?? ''} onChange={(e) => setForm({ ...form, position: e.target.value })}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500">
          <option value="">Position</option>
          {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={form.teamSide} onChange={(e) => setForm({ ...form, teamSide: e.target.value as 'home' | 'opponent' })}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500">
          <option value="home">Home</option>
          <option value="opponent">Opponent</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Color:</label>
        <input type="color" value={form.color ?? '#3b82f6'} onChange={(e) => setForm({ ...form, color: e.target.value })}
          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setEditing(false); setForm(player); }} className="px-2 py-1 text-xs text-gray-500 hover:text-white">Cancel</button>
          <button onClick={save} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs">Save</button>
        </div>
      </div>
    </div>
  );
}

function AddPlayerForm({ side, teamColor, onAdd }: { side: 'home' | 'opponent'; teamColor: string; onAdd: (p: Omit<TeamPlayer, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState('');
  const [color, setColor] = useState(teamColor);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), number: number.trim() || undefined, position: position || undefined, color, teamSide: side });
    setName(''); setNumber(''); setPosition('');
  };

  return (
    <form onSubmit={submit} className="flex gap-2 mt-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required
        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500" />
      <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="#" style={{ width: 48 }}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500" />
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
        className="w-9 h-9 rounded cursor-pointer border border-gray-700 bg-transparent p-0.5" />
      <button type="submit" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium">+</button>
    </form>
  );
}

export default function TeamPage({ teamId }: { teamId: string }) {
  const router = useRouter();
  const { teams, seedIfEmpty, updateTeam, deleteTeam, addPlayer, updatePlayer, deletePlayer } = useTeamsStore();
  const { drills, seedIfEmpty: seedDrills } = useDrillsStore();
  const { sessions, seedIfEmpty: seedSessions } = useSessionsStore();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');

  useEffect(() => { seedIfEmpty(); seedDrills(); }, [seedIfEmpty, seedDrills]);
  useEffect(() => { const ids = Object.keys(drills); if (ids.length) seedSessions(ids); }, [drills, seedSessions]);

  const team = teams[teamId];

  useEffect(() => {
    const t = setTimeout(() => { if (!teams[teamId]) router.push('/teams'); }, 1000);
    return () => clearTimeout(t);
  }, [teamId, teams, router]);

  if (!team) return <div className="flex-1 flex items-center justify-center text-gray-600">Loading…</div>;

  const homePlayers = team.players.filter((p) => p.teamSide === 'home');
  const oppPlayers = team.players.filter((p) => p.teamSide === 'opponent');
  const teamDrills = Object.values(drills).filter((d) => d.teamId === teamId);
  const teamSessions = Object.values(sessions).filter((s) => s.teamId === teamId);

  const startEdit = (field: string, value: string) => { setEditingField(field); setFieldValue(value); };
  const commitEdit = (field: keyof Team) => {
    setEditingField(null);
    updateTeam(teamId, { [field]: fieldValue } as Partial<Team>);
  };

  const toggleDay = (day: string) => {
    const days = team.trainingDays.includes(day)
      ? team.trainingDays.filter((d) => d !== day)
      : [...team.trainingDays, day];
    updateTeam(teamId, { trainingDays: days });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/teams" className="text-gray-500 hover:text-gray-300 text-sm">← Teams</Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-xl font-bold">{team.name}</h1>
          <button onClick={() => { if (confirm('Delete this team?')) { deleteTeam(teamId); router.push('/teams'); } }}
            className="ml-auto px-3 py-1.5 bg-gray-800 hover:bg-red-900/50 hover:text-red-400 rounded text-sm border border-gray-700">
            Delete Team
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Settings */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="font-semibold text-sm mb-3 text-gray-400 uppercase tracking-wider">Team Settings</h2>
              {/* Name */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1 block">Name</label>
                {editingField === 'name'
                  ? <input autoFocus value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} onBlur={() => commitEdit('name')} onKeyDown={(e) => e.key === 'Enter' && commitEdit('name')} className="w-full bg-gray-800 border border-emerald-500 rounded px-2 py-1 text-sm focus:outline-none" />
                  : <p className="text-sm cursor-pointer hover:text-emerald-300" onClick={() => startEdit('name', team.name)}>{team.name}</p>
                }
              </div>
              {/* Age group */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1 block">Age Group</label>
                {editingField === 'ageGroup'
                  ? <input autoFocus value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} onBlur={() => commitEdit('ageGroup')} onKeyDown={(e) => e.key === 'Enter' && commitEdit('ageGroup')} className="w-full bg-gray-800 border border-emerald-500 rounded px-2 py-1 text-sm focus:outline-none" />
                  : <p className="text-sm cursor-pointer hover:text-emerald-300" onClick={() => startEdit('ageGroup', team.ageGroup)}>{team.ageGroup}</p>
                }
              </div>
              {/* Badge color (used in season plans / calendar) */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1 block">Badge Colors</label>
                <div className="flex gap-3 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <input type="color" value={team.primaryColor} onChange={(e) => updateTeam(teamId, { primaryColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                    <span className="text-xs text-gray-600">Main</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <input type="color" value={team.secondaryColor} onChange={(e) => updateTeam(teamId, { secondaryColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                    <span className="text-xs text-gray-600">Alt</span>
                  </div>
                </div>
              </div>

              {/* Home player style */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1 block">Home Player Style</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col items-center gap-0.5">
                    <input type="color" value={team.primaryColor} onChange={(e) => updateTeam(teamId, { primaryColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
                    <span className="text-[9px] text-gray-600">Fill</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <input type="color" value={team.primaryStrokeColor ?? '#ffffff'} onChange={(e) => updateTeam(teamId, { primaryStrokeColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
                    <span className="text-[9px] text-gray-600">Stroke</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <input type="color" value={team.primaryNumberColor ?? '#ffffff'} onChange={(e) => updateTeam(teamId, { primaryNumberColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
                    <span className="text-[9px] text-gray-600">Number</span>
                  </div>
                  <svg width="34" height="34" viewBox="-17 -17 34 34" className="ml-auto shrink-0">
                    <circle cx="0" cy="0" r="13" fill={team.primaryColor} stroke={team.primaryStrokeColor ?? '#ffffff'} strokeWidth="1.5" />
                    <text x="0" y="4" textAnchor="middle" fill={team.primaryNumberColor ?? '#ffffff'} fontSize="9" fontWeight="bold">7</text>
                  </svg>
                </div>
              </div>

              {/* Opponent player style */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1 block">Opponent Player Style</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col items-center gap-0.5">
                    <input type="color" value={team.opponentPrimaryColor} onChange={(e) => updateTeam(teamId, { opponentPrimaryColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
                    <span className="text-[9px] text-gray-600">Fill</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <input type="color" value={team.opponentStrokeColor ?? '#ffffff'} onChange={(e) => updateTeam(teamId, { opponentStrokeColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
                    <span className="text-[9px] text-gray-600">Stroke</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <input type="color" value={team.opponentNumberColor ?? '#ffffff'} onChange={(e) => updateTeam(teamId, { opponentNumberColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
                    <span className="text-[9px] text-gray-600">Number</span>
                  </div>
                  <svg width="34" height="34" viewBox="-17 -17 34 34" className="ml-auto shrink-0">
                    <circle cx="0" cy="0" r="13" fill={team.opponentPrimaryColor} stroke={team.opponentStrokeColor ?? '#ffffff'} strokeWidth="1.5" />
                    <text x="0" y="4" textAnchor="middle" fill={team.opponentNumberColor ?? '#ffffff'} fontSize="9" fontWeight="bold">9</text>
                  </svg>
                </div>
              </div>
              {/* Training days */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Training Days</label>
                <div className="flex flex-wrap gap-1">
                  {DAYS.map((d) => (
                    <button key={d} onClick={() => toggleDay(d)}
                      className={`px-2 py-0.5 rounded text-xs border transition-colors ${team.trainingDays.includes(d) ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-gray-700 text-gray-600 hover:text-gray-400'}`}>
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm space-y-2">
              <h2 className="font-semibold text-sm mb-1 text-gray-400 uppercase tracking-wider">Stats</h2>
              <p className="text-gray-400">{team.players.length} players total</p>
              <p className="text-gray-400">{teamDrills.length} linked drills</p>
              <p className="text-gray-400">{teamSessions.length} linked sessions</p>
            </div>
          </div>

          {/* Players */}
          <div className="lg:col-span-2 space-y-4">
            {/* Home players */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.primaryColor }} />
                <h2 className="font-semibold text-sm">Home Players ({homePlayers.length})</h2>
              </div>
              {homePlayers.length === 0 && <p className="text-xs text-gray-600 mb-2">No players added yet</p>}
              {homePlayers.map((p) => (
                <PlayerRow key={p.id} player={p}
                  onUpdate={(u) => updatePlayer(teamId, p.id, u)}
                  onDelete={() => deletePlayer(teamId, p.id)}
                />
              ))}
              <AddPlayerForm side="home" teamColor={team.primaryColor}
                onAdd={(data) => addPlayer(teamId, { id: crypto.randomUUID(), ...data })} />
            </div>

            {/* Opponent players */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.opponentPrimaryColor }} />
                <h2 className="font-semibold text-sm">Opponent Players ({oppPlayers.length})</h2>
              </div>
              {oppPlayers.length === 0 && <p className="text-xs text-gray-600 mb-2">No opponent players added yet</p>}
              {oppPlayers.map((p) => (
                <PlayerRow key={p.id} player={p}
                  onUpdate={(u) => updatePlayer(teamId, p.id, u)}
                  onDelete={() => deletePlayer(teamId, p.id)}
                />
              ))}
              <AddPlayerForm side="opponent" teamColor={team.opponentPrimaryColor}
                onAdd={(data) => addPlayer(teamId, { id: crypto.randomUUID(), ...data })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
