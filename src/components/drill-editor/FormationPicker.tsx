'use client';

import { useState } from 'react';
import type { Team, TeamPlayer, PlayerObject } from '@/types';

/**
 * Formation positions as [lateral_pct, depth_pct] where:
 *   lateral_pct (0-100) → y axis (top to bottom on pitch)
 *   depth_pct   (0-100) → x axis (0 = attacking end, 100 = defending/GK end)
 *
 * This matches a LANDSCAPE pitch where teams attack left↔right.
 * Team A: GK on right (high depth%), attacks left (low depth%)
 * Team B: GK on left (low depth%), attacks right (high depth%) — flipped
 */
const FORMATIONS: Record<string, number[][]> = {
  '4-4-2': [
    [50, 88], // GK
    [15, 72], [37, 72], [63, 72], [85, 72], // DEF
    [15, 52], [37, 52], [63, 52], [85, 52], // MID
    [37, 25], [63, 25], // FWD
  ],
  '4-3-3': [
    [50, 88],
    [15, 72], [37, 72], [63, 72], [85, 72],
    [25, 52], [50, 50], [75, 52],
    [20, 22], [50, 18], [80, 22],
  ],
  '4-2-3-1': [
    [50, 88],
    [15, 72], [37, 72], [63, 72], [85, 72],
    [35, 60], [65, 60],
    [15, 42], [50, 40], [85, 42],
    [50, 20],
  ],
  '3-5-2': [
    [50, 88],
    [25, 74], [50, 74], [75, 74],
    [10, 56], [30, 52], [50, 54], [70, 52], [90, 56],
    [35, 24], [65, 24],
  ],
  '3-4-3': [
    [50, 88],
    [25, 74], [50, 74], [75, 74],
    [15, 54], [40, 52], [60, 52], [85, 54],
    [20, 22], [50, 18], [80, 22],
  ],
  '5-3-2': [
    [50, 88],
    [10, 72], [28, 70], [50, 70], [72, 70], [90, 72],
    [25, 52], [50, 50], [75, 52],
    [38, 24], [62, 24],
  ],
};

/**
 * Team segment templates — partial formations for quick sub-unit placement.
 * Same [lateral_pct, depth_pct] coordinate system as above.
 */
const SEGMENTS: Record<string, { label: string; positions: number[][] }> = {
  'back-4': {
    label: 'Back Four',
    positions: [
      [15, 72], [37, 72], [63, 72], [85, 72],
    ],
  },
  'back-3': {
    label: 'Back Three',
    positions: [
      [25, 74], [50, 74], [75, 74],
    ],
  },
  'mid-3': {
    label: 'Midfield Three',
    positions: [
      [25, 52], [50, 50], [75, 52],
    ],
  },
  'mid-4': {
    label: 'Midfield Four',
    positions: [
      [15, 52], [37, 52], [63, 52], [85, 52],
    ],
  },
  'front-3': {
    label: 'Front Three',
    positions: [
      [20, 22], [50, 18], [80, 22],
    ],
  },
  'front-2': {
    label: 'Front Two',
    positions: [
      [37, 25], [63, 25],
    ],
  },
  'high-press': {
    label: 'High Press Shape',
    positions: [
      [20, 22], [50, 18], [80, 22], // front 3
      [30, 38], [70, 38],           // press triggers
    ],
  },
};

/** Generate a default squad of 25 players (3 GK + 22 field) for use when no team is linked */
function generateDefaultSquad(teamSide: 'home' | 'opponent'): TeamPlayer[] {
  const squad: TeamPlayer[] = [];
  for (const num of ['1', '12', '13']) {
    squad.push({ id: `dflt-${teamSide}-${num}`, name: 'GK', number: num, position: 'GK', teamSide });
  }
  const fieldNums = [
    ...Array.from({ length: 10 }, (_, i) => String(i + 2)),
    ...Array.from({ length: 12 }, (_, i) => String(i + 14)),
  ];
  for (const num of fieldNums) {
    squad.push({ id: `dflt-${teamSide}-${num}`, name: `P${num}`, number: num, teamSide });
  }
  return squad;
}

interface Props {
  team: Team | null;
  pitchWidth: number;
  pitchHeight: number;
  initialSide?: 'A' | 'B';
  /** Callback now receives side so parent can apply formation-reuse logic */
  onPlace: (players: Omit<PlayerObject, 'id'>[], side: 'A' | 'B') => void;
  onClose: () => void;
}

export default function FormationPicker({ team, pitchWidth, pitchHeight, initialSide, onPlace, onClose }: Props) {
  const [tab, setTab] = useState<'formation' | 'segment'>('formation');
  const [formation, setFormation] = useState('4-3-3');
  const [segment, setSegment] = useState('back-4');
  const [side, setSide] = useState<'A' | 'B'>(initialSide ?? 'A');

  const buildPlayers = (positions: number[][], startIndex = 0): Omit<PlayerObject, 'id'>[] => {
    const isOpp = side === 'B';
    const sideKey = isOpp ? 'opponent' : 'home';
    // Use team players if available, else fall back to generated default squad
    const teamPlayers: TeamPlayer[] = team
      ? (team.players.filter((p) => p.teamSide === sideKey))
      : generateDefaultSquad(sideKey);
    const color = isOpp ? (team?.opponentPrimaryColor ?? '#ef4444') : (team?.primaryColor ?? '#3b82f6');

    return positions.map((pos, i) => {
      const pct_lateral = pos[0] / 100;
      const pct_depth = isOpp ? (1 - pos[1] / 100) : pos[1] / 100;
      const tp = teamPlayers[startIndex + i];
      return {
        type: 'player' as const,
        x: pct_depth * pitchWidth,
        y: pct_lateral * pitchHeight,
        color: tp?.color ?? color,
        number: tp?.number ?? String(startIndex + i + 1),
        name: tp?.name,
        team: side,
        teamColorInherited: !tp?.color,
      };
    });
  };

  const handlePlace = () => {
    if (tab === 'formation') {
      const positions = FORMATIONS[formation];
      if (!positions) return;
      onPlace(buildPlayers(positions), side);
    } else {
      const seg = SEGMENTS[segment];
      if (!seg) return;
      onPlace(buildPlayers(seg.positions), side);
    }
    onClose();
  };

  const currentCount = tab === 'formation'
    ? (FORMATIONS[formation]?.length ?? 0)
    : (SEGMENTS[segment]?.positions.length ?? 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[420px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Formation &amp; Templates</h2>

        {/* Tab */}
        <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1">
          <button onClick={() => setTab('formation')}
            className={`flex-1 py-1.5 rounded text-sm transition-colors ${tab === 'formation' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            Full Formation
          </button>
          <button onClick={() => setTab('segment')}
            className={`flex-1 py-1.5 rounded text-sm transition-colors ${tab === 'segment' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            Team Segment
          </button>
        </div>

        {tab === 'formation' && (
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Formation</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(FORMATIONS).map((f) => (
                <button key={f} onClick={() => setFormation(f)}
                  className={`py-2 px-3 rounded-lg text-sm border transition-colors font-mono ${
                    formation === f ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'segment' && (
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Team Segment</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SEGMENTS).map(([key, seg]) => (
                <button key={key} onClick={() => setSegment(key)}
                  className={`py-2 px-3 rounded-lg text-sm border transition-colors ${
                    segment === key ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}>
                  {seg.label}
                  <span className="block text-xs text-gray-600">{seg.positions.length} players</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5">
          <label className="text-xs text-gray-400 mb-2 block">Team Side</label>
          <div className="flex gap-2">
            <button onClick={() => setSide('A')}
              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${side === 'A' ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
              Team A (Home)
            </button>
            <button onClick={() => setSide('B')}
              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${side === 'B' ? 'border-red-500 bg-red-500/20 text-red-300' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
              Team B (Opponent)
            </button>
          </div>
        </div>

        {!team && (
          <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded p-2 mb-4">
            No team linked — using default squad (25 players, 3 GK) for names/numbers.
          </p>
        )}

        <div className="text-xs text-gray-600 bg-gray-800 rounded p-2 mb-4">
          Pitch is horizontal. Team A attacks left, GK on right. Team B attacks right, GK on left.
          <br />
          <span className="text-emerald-700">Existing players on the same side will be repositioned rather than duplicated.</span>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button onClick={handlePlace} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium">
            Place {currentCount} Players
          </button>
        </div>
      </div>
    </div>
  );
}
