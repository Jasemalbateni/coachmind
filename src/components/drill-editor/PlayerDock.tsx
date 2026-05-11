'use client';

import { useState } from 'react';
import type { Team, TeamPlayer, PlayerObject } from '@/types';

/** Generate a stable default squad of 25 players (3 GK + 22 field) */
function generateDefaultSquad(teamSide: 'home' | 'opponent'): TeamPlayer[] {
  const squad: TeamPlayer[] = [];
  for (const num of ['1', '12']) {
    squad.push({ id: `dflt-${teamSide}-${num}`, name: 'GK', number: num, position: 'GK', teamSide });
  }
  const fieldNums = [
    ...Array.from({ length: 10 }, (_, i) => String(i + 2)), // 2-11
    '13',
    ...Array.from({ length: 12 }, (_, i) => String(i + 14)), // 14-25
  ];
  for (const num of fieldNums) {
    squad.push({ id: `dflt-${teamSide}-${num}`, name: `P${num}`, number: num, teamSide });
  }
  return squad;
}

const DEFAULT_HOME_SQUAD = generateDefaultSquad('home');
const DEFAULT_OPP_SQUAD = generateDefaultSquad('opponent');

interface Props {
  teams: Record<string, Team>;
  drillTeamId?: string | null;
  onSelectTeam: (teamId: string | null) => void;
  onAddPlayer: (player: Omit<PlayerObject, 'id'>) => void;
  onShowFormation: (side: 'A' | 'B') => void;
  usedNumbers?: Set<string>;
  onRemovePlayer?: (key: string) => void;
}

function PlayerChip({ player, teamColor, isUsed, onClick }: {
  player: TeamPlayer; teamColor: string; isUsed?: boolean; onClick: () => void
}) {
  const isGK = player.position === 'GK' || player.number === '1' || player.number === '12';
  const bgColor = isGK ? '#d97706' : (player.color ?? teamColor);
  return (
    <button
      onClick={onClick}
      draggable={!isUsed}
      onDragStart={!isUsed ? (e) => {
        const dragData = JSON.stringify({
          type: 'player',
          color: bgColor,
          number: player.number,
          name: player.name,
          team: player.teamSide === 'home' ? 'A' : 'B',
          teamColorInherited: !player.color,
        });
        e.dataTransfer.setData('application/x-editor-tool', dragData);
        e.dataTransfer.effectAllowed = 'copy';
      } : undefined}
      title={isUsed ? `#${player.number} on canvas — click to remove` : `Add ${player.name}${player.position ? ` · ${player.position}` : ''}`}
      className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors group shrink-0 ${
        isUsed
          ? 'hover:bg-red-900/30 ring-1 ring-red-500/50'
          : 'hover:bg-gray-700'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border relative ${
          isUsed ? 'opacity-60 border-red-400/50' : 'text-white border-white/20'
        }`}
        style={{ backgroundColor: isUsed ? '#6b7280' : bgColor }}
      >
        {player.number ?? '?'}
        {isUsed && (
          <span className="absolute inset-0 flex items-center justify-center text-red-400 text-lg font-bold">×</span>
        )}
        {!isUsed && isGK && (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-bold rounded px-0.5 leading-tight">GK</span>
        )}
      </div>
      <span className={`text-[10px] max-w-[48px] truncate leading-tight ${isUsed ? 'text-red-400/70' : 'text-gray-500 group-hover:text-gray-300'}`}>
        {player.name.split(' ')[0]}
      </span>
    </button>
  );
}

export default function PlayerDock({ teams, drillTeamId, onSelectTeam, onAddPlayer, onShowFormation, usedNumbers, onRemovePlayer }: Props) {
  const [tab, setTab] = useState<'home' | 'opponent'>('home');
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [extraHome, setExtraHome] = useState<TeamPlayer[]>([]);
  const [extraOpp, setExtraOpp] = useState<TeamPlayer[]>([]);

  const team = drillTeamId ? (teams[drillTeamId] ?? null) : null;
  const teamList = Object.values(teams);

  const homeColor = team?.primaryColor ?? '#3b82f6';
  const oppColor = team?.opponentPrimaryColor ?? '#ef4444';
  const color = tab === 'home' ? homeColor : oppColor;

  // Players: use team roster or fall back to default squad
  const baseHome: TeamPlayer[] = team ? team.players.filter((p) => p.teamSide === 'home') : DEFAULT_HOME_SQUAD;
  const baseOpp: TeamPlayer[] = team ? team.players.filter((p) => p.teamSide === 'opponent') : DEFAULT_OPP_SQUAD;
  const homePlayers = [...baseHome, ...extraHome];
  const oppPlayers = [...baseOpp, ...extraOpp];
  const players = tab === 'home' ? homePlayers : oppPlayers;

  const handleAddExtraPlayer = () => {
    const teamSide = tab === 'home' ? 'home' : 'opponent';
    const all = tab === 'home' ? homePlayers : oppPlayers;
    const maxNum = all.reduce((m, p) => Math.max(m, Number(p.number) || 0), 0);
    const nextNum = String(maxNum + 1);
    const newPlayer: TeamPlayer = { id: `extra-${teamSide}-${nextNum}`, name: `P${nextNum}`, number: nextNum, teamSide };
    if (tab === 'home') setExtraHome((prev) => [...prev, newPlayer]);
    else setExtraOpp((prev) => [...prev, newPlayer]);
  };

  const handleAddPlayer = (p: TeamPlayer) => {
    const side = tab === 'home' ? 'A' : 'B';
    const key = `${side}-${p.number}`;
    if (usedNumbers?.has(key) && onRemovePlayer) {
      onRemovePlayer(key);
      return;
    }
    onAddPlayer({
      type: 'player',
      x: 420, y: 270,
      color: p.color ?? color,
      number: p.number,
      name: p.name,
      team: tab === 'home' ? 'A' : 'B',
      teamColorInherited: !p.color,
    });
  };

  return (
    <div className="bg-gray-900 border-t border-gray-800 flex flex-col shrink-0" style={{ minHeight: 112 }}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 pt-1.5 pb-1 shrink-0 flex-wrap">
        {/* Team selector */}
        <div className="relative">
          <button
            onClick={() => setShowTeamPicker(!showTeamPicker)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-700 text-xs hover:border-gray-500 transition-colors"
            style={{ borderColor: team ? homeColor + '80' : undefined }}
          >
            {team ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: homeColor }} />
                <span className="text-gray-200 font-medium max-w-[100px] truncate">{team.name}</span>
              </>
            ) : (
              <span className="text-gray-500">Default Squad</span>
            )}
            <span className="text-gray-600 ml-0.5">▾</span>
          </button>

          {showTeamPicker && (
            <div className="absolute bottom-full left-0 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[180px] py-1">
              <button
                onClick={() => { onSelectTeam(null); setShowTeamPicker(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 transition-colors ${!drillTeamId ? 'text-emerald-400' : 'text-gray-400'}`}
              >
                Default Squad (25 players)
              </button>
              {teamList.length > 0 && <div className="border-t border-gray-700 my-1" />}
              {teamList.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { onSelectTeam(t.id); setShowTeamPicker(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 transition-colors flex items-center gap-2 ${drillTeamId === t.id ? 'text-emerald-400' : 'text-gray-300'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.primaryColor }} />
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
              {teamList.length === 0 && (
                <p className="px-3 py-1.5 text-xs text-gray-600">No saved teams yet</p>
              )}
            </div>
          )}
        </div>

        {/* Home tab */}
        <button
          onClick={() => setTab('home')}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs border transition-colors ${
            tab === 'home' ? 'border-current text-current bg-current/10' : 'border-gray-700 text-gray-500 hover:text-gray-300'
          }`}
          style={tab === 'home' ? { borderColor: homeColor, color: homeColor, backgroundColor: `${homeColor}18` } : {}}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: homeColor }} />
          Team A
          <span className="text-gray-600">({homePlayers.length})</span>
        </button>

        {/* Opponent tab */}
        <button
          onClick={() => setTab('opponent')}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs border transition-colors ${
            tab === 'opponent' ? 'border-current text-current bg-current/10' : 'border-gray-700 text-gray-500 hover:text-gray-300'
          }`}
          style={tab === 'opponent' ? { borderColor: oppColor, color: oppColor, backgroundColor: `${oppColor}18` } : {}}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: oppColor }} />
          Team B
          <span className="text-gray-600">({oppPlayers.length})</span>
        </button>

        {/* Formation button for active side */}
        <button
          onClick={() => onShowFormation(tab === 'home' ? 'A' : 'B')}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded text-xs border border-emerald-700 text-emerald-400 hover:bg-emerald-700/20 transition-colors ml-1"
        >
          ⊞ Formation
        </button>

        <button
          onClick={handleAddExtraPlayer}
          title="Add next sequential player number"
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors ml-1"
        >
          + Player
        </button>
        <span className="text-xs text-gray-700 ml-auto hidden sm:block">click to place at center</span>
      </div>

      {/* Players row */}
      <div className="flex-1 overflow-x-auto flex items-center gap-0.5 px-3 pb-1.5 min-h-[64px]">
        {players.map((p) => (
          <PlayerChip key={p.id} player={p} teamColor={color}
            isUsed={usedNumbers?.has(`${tab === 'home' ? 'A' : 'B'}-${p.number}`) ?? false}
            onClick={() => handleAddPlayer(p)} />
        ))}
      </div>

      {!team && (
        <div className="px-3 pb-1.5">
          <p className="text-xs text-gray-700">
            Using default squad · select a saved team above to use real player names
          </p>
        </div>
      )}
    </div>
  );
}
