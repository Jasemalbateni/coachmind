import type {
  Drill, Session, CanvasObject, Team, TeamPlayer,
} from '@/types';

function uuid() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }

// ─── Teams ────────────────────────────────────────────────────────────────────

export function buildSeedTeams(): Record<string, Team> {
  const id = uuid();
  const homePlayers: TeamPlayer[] = [
    { id: uuid(), name: 'Yusuf Hassan', number: '1', position: 'GK', teamSide: 'home' },
    { id: uuid(), name: 'Khalid Omar', number: '2', position: 'RB', teamSide: 'home' },
    { id: uuid(), name: 'Ahmed Nasser', number: '5', position: 'CB', teamSide: 'home' },
    { id: uuid(), name: 'Majid Ibrahim', number: '6', position: 'CB', teamSide: 'home' },
    { id: uuid(), name: 'Tariq Saleh', number: '3', position: 'LB', teamSide: 'home' },
    { id: uuid(), name: 'Omar Farouk', number: '4', position: 'CDM', teamSide: 'home' },
    { id: uuid(), name: 'Rami Haddad', number: '8', position: 'CM', teamSide: 'home' },
    { id: uuid(), name: 'Samir Kamal', number: '10', position: 'CAM', teamSide: 'home' },
    { id: uuid(), name: 'Hassan Alawi', number: '7', position: 'RW', teamSide: 'home' },
    { id: uuid(), name: 'Ziad Mustafa', number: '11', position: 'LW', teamSide: 'home' },
    { id: uuid(), name: 'Nabil Rafiq', number: '9', position: 'ST', teamSide: 'home' },
  ];
  const oppPlayers: TeamPlayer[] = [
    { id: uuid(), name: 'Opp GK', number: '1', position: 'GK', teamSide: 'opponent' },
    { id: uuid(), name: 'Opp RB', number: '2', position: 'RB', teamSide: 'opponent' },
    { id: uuid(), name: 'Opp CB', number: '5', position: 'CB', teamSide: 'opponent' },
    { id: uuid(), name: 'Opp CB', number: '6', position: 'CB', teamSide: 'opponent' },
    { id: uuid(), name: 'Opp LB', number: '3', position: 'LB', teamSide: 'opponent' },
    { id: uuid(), name: 'Opp CM', number: '4', position: 'CM', teamSide: 'opponent' },
    { id: uuid(), name: 'Opp CM', number: '8', position: 'CM', teamSide: 'opponent' },
    { id: uuid(), name: 'Opp ST', number: '9', position: 'ST', teamSide: 'opponent' },
  ];

  const team: Team = {
    id,
    name: 'FC Academy U16',
    ageGroup: 'U16',
    primaryColor: '#3b82f6',
    secondaryColor: '#1d4ed8',
    opponentPrimaryColor: '#ef4444',
    trainingDays: ['Sunday', 'Tuesday', 'Thursday'],
    players: [...homePlayers, ...oppPlayers],
    createdAt: now(),
    updatedAt: now(),
  };
  return { [id]: team };
}

// ─── Drills ───────────────────────────────────────────────────────────────────

export function buildSeedDrills(): Record<string, Drill> {
  const d1Id = uuid();
  const d1Objects: CanvasObject[] = [
    { id: uuid(), type: 'player', x: 200, y: 180, color: '#3b82f6', number: '7', name: 'Winger', team: 'A' },
    { id: uuid(), type: 'player', x: 280, y: 220, color: '#3b82f6', number: '9', name: 'Striker', team: 'A' },
    { id: uuid(), type: 'player', x: 420, y: 190, color: '#ef4444', number: '4', name: 'Defender', team: 'B' },
    { id: uuid(), type: 'ball', x: 240, y: 200 },
    { id: uuid(), type: 'cone', x: 350, y: 140, color: '#f97316' },
    { id: uuid(), type: 'cone', x: 390, y: 120, color: '#f97316' },
    { id: uuid(), type: 'cone', x: 430, y: 110, color: '#f97316' },
    { id: uuid(), type: 'arrow', startX: 200, startY: 180, endX: 350, endY: 140, color: '#3b82f6', style: 'solid', headStyle: 'filled' },
    { id: uuid(), type: 'arrow', startX: 240, startY: 200, endX: 280, endY: 220, color: '#22c55e', style: 'dashed', headStyle: 'filled' },
    { id: uuid(), type: 'zone', x: 300, y: 90, width: 180, height: 150, fill: '#8b5cf6', opacity: 0.18, label: 'Finishing Zone' },
    { id: uuid(), type: 'goal', x: 600, y: 180, size: 'full' },
  ];

  const d1: Drill = {
    id: d1Id,
    title: 'Wide Attack Combination',
    description: 'Winger to striker combination leading to a goal attempt.',
    objective: 'Develop winger-striker combination play in final third',
    ageGroup: 'U16',
    playerCount: '4–6',
    areaSize: '30×20m',
    durationMin: 15,
    equipment: ['Balls ×6', 'Cones ×6', 'Goal'],
    coachingPoints: [
      'Winger should make diagonal run behind defender',
      'Striker times run to receive on the move',
      'Weight and timing of pass is critical',
    ],
    progression: 'Add a second defender to create 2v2 scenario',
    regression: 'Start with a free pass before the combine',
    notes: 'Focus on quality of movement, not speed.',
    tags: ['combination', 'finishing', 'wide play'],
    pitch: { type: 'third', width: 840, height: 300 },
    objects: d1Objects,
    createdAt: now(),
    updatedAt: now(),
  };

  const d2Id = uuid();
  const d2Objects: CanvasObject[] = [
    { id: uuid(), type: 'player', x: 200, y: 260, color: '#3b82f6', number: '6', name: 'Pivot', team: 'A' },
    { id: uuid(), type: 'player', x: 300, y: 180, color: '#3b82f6', number: '8', name: 'Box-to-Box', team: 'A' },
    { id: uuid(), type: 'player', x: 300, y: 340, color: '#3b82f6', number: '10', name: 'Playmaker', team: 'A' },
    { id: uuid(), type: 'player', x: 420, y: 260, color: '#ef4444', number: '4', team: 'B' },
    { id: uuid(), type: 'player', x: 500, y: 200, color: '#ef4444', number: '5', team: 'B' },
    { id: uuid(), type: 'player', x: 500, y: 320, color: '#ef4444', number: '6', team: 'B' },
    { id: uuid(), type: 'ball', x: 200, y: 260 },
    { id: uuid(), type: 'cone', x: 350, y: 190, color: '#facc15' },
    { id: uuid(), type: 'cone', x: 350, y: 330, color: '#facc15' },
    { id: uuid(), type: 'arrow', startX: 200, startY: 260, endX: 300, endY: 180, color: '#3b82f6', style: 'solid', headStyle: 'filled' },
    { id: uuid(), type: 'arrow', startX: 200, startY: 260, endX: 300, endY: 340, color: '#22c55e', style: 'dashed', headStyle: 'filled' },
    { id: uuid(), type: 'zone', x: 370, y: 170, width: 100, height: 180, fill: '#ef4444', opacity: 0.14, label: 'Press Zone' },
    { id: uuid(), type: 'circle', x: 350, y: 260, radius: 50, stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1.5, fill: undefined },
  ];

  const d2: Drill = {
    id: d2Id,
    title: 'Positional Rondo 3v3',
    description: 'Keep possession in the central zone using numerical superiority.',
    objective: 'Improve positional awareness and ball retention under pressure',
    ageGroup: 'U14+',
    playerCount: '6',
    areaSize: '20×20m',
    durationMin: 20,
    equipment: ['Balls ×4', 'Cones ×4', 'Bibs ×3'],
    coachingPoints: [
      'Move ball quickly with 1-2 touch play',
      'Third player must always provide an out',
      'Body shape open to receive on the half turn',
    ],
    progression: 'Add a joker player who always supports possession team',
    regression: 'Reduce pressure, allow 3 touches',
    tags: ['rondo', 'possession', 'pressing'],
    pitch: { type: 'half', width: 840, height: 420 },
    objects: d2Objects,
    createdAt: now(),
    updatedAt: now(),
  };

  const d3Id = uuid();
  const d3: Drill = {
    id: d3Id,
    title: 'High Press Trigger',
    description: 'Coordinated press triggered from GK receiving the ball.',
    objective: 'Synchronise press trigger across the front three',
    ageGroup: 'U16+',
    playerCount: '8–10',
    durationMin: 15,
    equipment: ['Balls ×6', 'Cones ×4', 'Goal'],
    coachingPoints: [
      'Press triggered the moment GK receives',
      'Nearest player presses — others block passing lanes',
      'Force play wide then double up',
    ],
    progression: 'Full 11v11 shape, trigger from centre-backs too',
    tags: ['pressing', 'high press', 'defensive'],
    pitch: { type: 'half', width: 840, height: 420 },
    objects: [
      { id: uuid(), type: 'player', x: 180, y: 210, color: '#ef4444', number: '9', name: 'Press 1', team: 'B' },
      { id: uuid(), type: 'player', x: 270, y: 150, color: '#ef4444', number: '11', name: 'Press 2', team: 'B' },
      { id: uuid(), type: 'player', x: 270, y: 270, color: '#ef4444', number: '10', name: 'Press 3', team: 'B' },
      { id: uuid(), type: 'player', x: 400, y: 210, color: '#3b82f6', number: '4', team: 'A' },
      { id: uuid(), type: 'player', x: 490, y: 150, color: '#3b82f6', number: '5', team: 'A' },
      { id: uuid(), type: 'player', x: 490, y: 270, color: '#3b82f6', number: '6', team: 'A' },
      { id: uuid(), type: 'goal', x: 100, y: 210, size: 'full' },
      { id: uuid(), type: 'ball', x: 100, y: 210 },
      { id: uuid(), type: 'arrow', startX: 180, startY: 210, endX: 110, endY: 210, color: '#ef4444', style: 'solid', headStyle: 'filled' },
      { id: uuid(), type: 'arrow', startX: 270, startY: 150, endX: 180, endY: 185, color: '#ef4444', style: 'solid', headStyle: 'filled' },
      { id: uuid(), type: 'arrow', startX: 270, startY: 270, endX: 180, endY: 235, color: '#ef4444', style: 'solid', headStyle: 'filled' },
      { id: uuid(), type: 'zone', x: 60, y: 110, width: 200, height: 200, fill: '#ef4444', opacity: 0.13, label: 'Press Zone' },
    ],
    createdAt: now(),
    updatedAt: now(),
  };

  return { [d1Id]: d1, [d2Id]: d2, [d3Id]: d3 };
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function buildSeedSessions(drillIds: string[]): Record<string, Session> {
  const s1Id = uuid();
  const s1: Session = {
    id: s1Id,
    title: 'Tuesday Morning Training',
    date: new Date().toISOString().slice(0, 10),
    objective: 'Improve combination play and pressing shape',
    ageGroup: 'U16',
    playerCount: '16',
    notes: 'Focus on tempo and communication throughout.',
    trainingDay: 'Tuesday',
    blocks: [
      { id: uuid(), drillId: drillIds[0] ?? '', durationMin: 15, intensity: 'low', notes: 'Activation phase' },
      { id: uuid(), drillId: drillIds[1] ?? '', durationMin: 20, intensity: 'mid', notes: 'Main theme — positional play' },
      { id: uuid(), drillId: drillIds[2] ?? '', durationMin: 15, intensity: 'high', notes: 'Pressing sequences, high effort' },
    ],
    createdAt: now(),
    updatedAt: now(),
  };

  const s2Id = uuid();
  const s2: Session = {
    id: s2Id,
    title: 'Pre-Match Activation',
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    objective: 'Prepare team for match — light activation only',
    ageGroup: 'U16',
    blocks: [
      { id: uuid(), drillId: drillIds[0] ?? '', durationMin: 10, intensity: 'low', notes: 'Rondo to activate' },
    ],
    createdAt: now(),
    updatedAt: now(),
  };

  return { [s1Id]: s1, [s2Id]: s2 };
}
