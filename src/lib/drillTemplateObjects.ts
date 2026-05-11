import type { CanvasObject } from '@/types';

// Helper to create typed objects with placeholder IDs (replaced at drill creation time)
const A = '#3b82f6'; // team A blue
const B = '#ef4444'; // team B red
const W = 'rgba(255,255,255,0.85)';

// ─── Rondo (half pitch: 840×420) ─────────────────────────────────────────────
// Hexagonal layout around center (420, 210), 6 possessors + 2 pressers
export const RONDO_OBJECTS: CanvasObject[] = [
  { id: 'r0', type: 'zone', x: 310, y: 100, width: 220, height: 220, fill: '#ffffff', opacity: 0.06, label: 'Playing Area' },
  { id: 'r1', type: 'player', x: 420, y: 120, color: A, team: 'A', number: '1' },
  { id: 'r2', type: 'player', x: 498, y: 165, color: A, team: 'A', number: '2' },
  { id: 'r3', type: 'player', x: 498, y: 255, color: A, team: 'A', number: '3' },
  { id: 'r4', type: 'player', x: 420, y: 300, color: A, team: 'A', number: '4' },
  { id: 'r5', type: 'player', x: 342, y: 255, color: A, team: 'A', number: '5' },
  { id: 'r6', type: 'player', x: 342, y: 165, color: A, team: 'A', number: '6' },
  { id: 'r7', type: 'player', x: 405, y: 200, color: B, team: 'B', number: '1' },
  { id: 'r8', type: 'player', x: 435, y: 220, color: B, team: 'B', number: '2' },
  { id: 'r9', type: 'ball', x: 420, y: 210 },
  { id: 'r10', type: 'cone', x: 310, y: 100, color: '#facc15' },
  { id: 'r11', type: 'cone', x: 530, y: 100, color: '#facc15' },
  { id: 'r12', type: 'cone', x: 310, y: 320, color: '#facc15' },
  { id: 'r13', type: 'cone', x: 530, y: 320, color: '#facc15' },
];

// ─── Possession (half pitch: 840×420) ────────────────────────────────────────
// 5 possessors vs 2 pressers in defined zone
export const POSSESSION_OBJECTS: CanvasObject[] = [
  { id: 'po0', type: 'zone', x: 180, y: 90, width: 480, height: 240, fill: '#3b82f6', opacity: 0.07, label: 'Possession Zone' },
  { id: 'po1', type: 'player', x: 260, y: 210, color: A, team: 'A', number: '6', name: 'Pivot' },
  { id: 'po2', type: 'player', x: 390, y: 130, color: A, team: 'A', number: '8', name: 'Box-to-box' },
  { id: 'po3', type: 'player', x: 390, y: 290, color: A, team: 'A', number: '10', name: 'Playmaker' },
  { id: 'po4', type: 'player', x: 520, y: 140, color: A, team: 'A', number: '11' },
  { id: 'po5', type: 'player', x: 520, y: 280, color: A, team: 'A', number: '7' },
  { id: 'po6', type: 'player', x: 390, y: 200, color: B, team: 'B', number: '4' },
  { id: 'po7', type: 'player', x: 430, y: 240, color: B, team: 'B', number: '5' },
  { id: 'po8', type: 'ball', x: 260, y: 210 },
  { id: 'po9', type: 'arrow', startX: 260, startY: 210, endX: 390, endY: 130, color: W, style: 'solid', headStyle: 'filled' },
  { id: 'po10', type: 'arrow', startX: 260, startY: 210, endX: 390, endY: 290, color: '#22c55e', style: 'dashed', headStyle: 'open' },
  { id: 'po11', type: 'cone', x: 180, y: 90, color: '#f97316' },
  { id: 'po12', type: 'cone', x: 660, y: 90, color: '#f97316' },
  { id: 'po13', type: 'cone', x: 180, y: 330, color: '#f97316' },
  { id: 'po14', type: 'cone', x: 660, y: 330, color: '#f97316' },
];

// ─── Build-up (full pitch: 840×540) ──────────────────────────────────────────
// GK + 4-3-3 shape, opponent front 3 pressing
export const BUILDUP_OBJECTS: CanvasObject[] = [
  { id: 'bu0', type: 'goal', x: 420, y: 510, size: 'full' },
  { id: 'bu1', type: 'goal', x: 420, y: 30, size: 'full' },
  { id: 'bu2', type: 'player', x: 420, y: 480, color: A, team: 'A', number: '1', name: 'GK' },
  { id: 'bu3', type: 'player', x: 310, y: 420, color: A, team: 'A', number: '5', name: 'CB' },
  { id: 'bu4', type: 'player', x: 530, y: 420, color: A, team: 'A', number: '6', name: 'CB' },
  { id: 'bu5', type: 'player', x: 175, y: 390, color: A, team: 'A', number: '3', name: 'LB' },
  { id: 'bu6', type: 'player', x: 665, y: 390, color: A, team: 'A', number: '2', name: 'RB' },
  { id: 'bu7', type: 'player', x: 420, y: 340, color: A, team: 'A', number: '4', name: 'CDM' },
  { id: 'bu8', type: 'player', x: 300, y: 270, color: A, team: 'A', number: '8', name: 'CM' },
  { id: 'bu9', type: 'player', x: 540, y: 270, color: A, team: 'A', number: '10', name: 'CM' },
  { id: 'bu10', type: 'player', x: 420, y: 160, color: A, team: 'A', number: '9', name: 'ST' },
  { id: 'bu11', type: 'player', x: 200, y: 200, color: A, team: 'A', number: '11', name: 'LW' },
  { id: 'bu12', type: 'player', x: 640, y: 200, color: A, team: 'A', number: '7', name: 'RW' },
  { id: 'bu13', type: 'player', x: 420, y: 260, color: B, team: 'B', number: '9', name: 'Press CF' },
  { id: 'bu14', type: 'player', x: 310, y: 250, color: B, team: 'B', number: '10', name: 'Press L' },
  { id: 'bu15', type: 'player', x: 530, y: 250, color: B, team: 'B', number: '7', name: 'Press R' },
  { id: 'bu16', type: 'ball', x: 420, y: 480 },
  { id: 'bu17', type: 'arrow', startX: 420, startY: 470, endX: 310, endY: 415, color: W, style: 'solid', headStyle: 'filled' },
  { id: 'bu18', type: 'arrow', startX: 420, startY: 470, endX: 530, endY: 415, color: '#22c55e', style: 'dashed', headStyle: 'open' },
  { id: 'bu19', type: 'zone', x: 150, y: 360, width: 540, height: 100, fill: '#22c55e', opacity: 0.07, label: 'Build-up Zone' },
];

// ─── Finishing (third pitch: 840×300) ────────────────────────────────────────
// Server + 2 attackers + defender + goal + scoring zone
export const FINISHING_OBJECTS: CanvasObject[] = [
  { id: 'fi0', type: 'goal', x: 780, y: 150, size: 'full' },
  { id: 'fi1', type: 'zone', x: 560, y: 60, width: 220, height: 180, fill: '#22c55e', opacity: 0.12, label: 'Scoring Zone' },
  { id: 'fi2', type: 'player', x: 100, y: 150, color: A, team: 'A', number: '8', name: 'Server' },
  { id: 'fi3', type: 'player', x: 500, y: 95, color: A, team: 'A', number: '9', name: 'Run 1' },
  { id: 'fi4', type: 'player', x: 500, y: 210, color: A, team: 'A', number: '10', name: 'Run 2' },
  { id: 'fi5', type: 'player', x: 650, y: 150, color: B, team: 'B', number: '4', name: 'Defender' },
  { id: 'fi6', type: 'ball', x: 100, y: 150 },
  { id: 'fi7', type: 'arrow', startX: 100, startY: 150, endX: 500, endY: 95, color: W, style: 'dashed', headStyle: 'filled' },
  { id: 'fi8', type: 'arrow', startX: 500, startY: 95, endX: 730, endY: 130, color: '#fbbf24', style: 'solid', headStyle: 'filled' },
  { id: 'fi9', type: 'arrow', startX: 500, startY: 210, endX: 730, endY: 170, color: '#fbbf24', style: 'solid', headStyle: 'filled' },
  { id: 'fi10', type: 'cone', x: 300, y: 70, color: '#f97316' },
  { id: 'fi11', type: 'cone', x: 300, y: 230, color: '#f97316' },
  { id: 'fi12', type: 'cone', x: 450, y: 70, color: '#facc15' },
  { id: 'fi13', type: 'cone', x: 450, y: 230, color: '#facc15' },
];

// ─── Pressing (half pitch: 840×420) ──────────────────────────────────────────
// Back 4 + GK being pressed by a front 3
export const PRESSING_OBJECTS: CanvasObject[] = [
  { id: 'pr0', type: 'zone', x: 220, y: 185, width: 400, height: 170, fill: '#ef4444', opacity: 0.09, label: 'Press Zone' },
  { id: 'pr1', type: 'player', x: 420, y: 400, color: A, team: 'A', number: '1', name: 'GK' },
  { id: 'pr2', type: 'player', x: 230, y: 320, color: A, team: 'A', number: '3', name: 'LB' },
  { id: 'pr3', type: 'player', x: 360, y: 330, color: A, team: 'A', number: '5', name: 'CB' },
  { id: 'pr4', type: 'player', x: 480, y: 330, color: A, team: 'A', number: '6', name: 'CB' },
  { id: 'pr5', type: 'player', x: 610, y: 320, color: A, team: 'A', number: '2', name: 'RB' },
  { id: 'pr6', type: 'player', x: 420, y: 210, color: B, team: 'B', number: '9', name: 'CF' },
  { id: 'pr7', type: 'player', x: 275, y: 230, color: B, team: 'B', number: '10', name: 'LF' },
  { id: 'pr8', type: 'player', x: 565, y: 230, color: B, team: 'B', number: '7', name: 'RF' },
  { id: 'pr9', type: 'ball', x: 360, y: 330 },
  { id: 'pr10', type: 'arrow', startX: 420, startY: 215, endX: 365, endY: 320, color: B, style: 'solid', headStyle: 'filled' },
  { id: 'pr11', type: 'arrow', startX: 275, startY: 235, endX: 235, endY: 312, color: B, style: 'solid', headStyle: 'filled' },
  { id: 'pr12', type: 'arrow', startX: 565, startY: 235, endX: 605, endY: 312, color: B, style: 'solid', headStyle: 'filled' },
];

// ─── Transition (full pitch: 840×540) ────────────────────────────────────────
// Two teams in transition moment — ball turned over
export const TRANSITION_OBJECTS: CanvasObject[] = [
  { id: 'tr0', type: 'goal', x: 420, y: 30, size: 'full' },
  { id: 'tr1', type: 'goal', x: 420, y: 510, size: 'full' },
  { id: 'tr2', type: 'zone', x: 330, y: 255, width: 180, height: 120, fill: '#fbbf24', opacity: 0.12, label: 'Transition Zone' },
  { id: 'tr3', type: 'player', x: 420, y: 200, color: A, team: 'A', number: '9', name: 'ST' },
  { id: 'tr4', type: 'player', x: 340, y: 295, color: A, team: 'A', number: '8', name: 'CM' },
  { id: 'tr5', type: 'player', x: 500, y: 295, color: A, team: 'A', number: '10', name: 'AM' },
  { id: 'tr6', type: 'player', x: 300, y: 400, color: A, team: 'A', number: '5', name: 'CB' },
  { id: 'tr7', type: 'player', x: 540, y: 400, color: A, team: 'A', number: '6', name: 'CB' },
  { id: 'tr8', type: 'player', x: 420, y: 340, color: B, team: 'B', number: '4', name: 'Ball lost' },
  { id: 'tr9', type: 'player', x: 380, y: 275, color: B, team: 'B', number: '8' },
  { id: 'tr10', type: 'player', x: 460, y: 275, color: B, team: 'B', number: '10' },
  { id: 'tr11', type: 'player', x: 310, y: 170, color: B, team: 'B', number: '5', name: 'CB' },
  { id: 'tr12', type: 'player', x: 530, y: 170, color: B, team: 'B', number: '6', name: 'CB' },
  { id: 'tr13', type: 'ball', x: 420, y: 330 },
  { id: 'tr14', type: 'arrow', startX: 420, startY: 328, endX: 420, endY: 215, color: '#fbbf24', style: 'solid', headStyle: 'filled' },
  { id: 'tr15', type: 'arrow', startX: 420, startY: 328, endX: 345, endY: 290, color: A, style: 'dashed', headStyle: 'filled' },
];

// ─── Small-sided Game (plain pitch: 840×540) ──────────────────────────────────
// 5v5 + goalkeepers on a plain pitch
export const SSG_OBJECTS: CanvasObject[] = [
  { id: 'sg0', type: 'goal', x: 50, y: 270, size: 'small' },
  { id: 'sg1', type: 'goal', x: 790, y: 270, size: 'small' },
  { id: 'sg2', type: 'player', x: 90, y: 270, color: A, team: 'A', number: '1', name: 'GK' },
  { id: 'sg3', type: 'player', x: 230, y: 175, color: A, team: 'A', number: '2' },
  { id: 'sg4', type: 'player', x: 230, y: 270, color: A, team: 'A', number: '6' },
  { id: 'sg5', type: 'player', x: 230, y: 365, color: A, team: 'A', number: '3' },
  { id: 'sg6', type: 'player', x: 360, y: 215, color: A, team: 'A', number: '8' },
  { id: 'sg7', type: 'player', x: 360, y: 325, color: A, team: 'A', number: '10' },
  { id: 'sg8', type: 'player', x: 750, y: 270, color: B, team: 'B', number: '1', name: 'GK' },
  { id: 'sg9', type: 'player', x: 610, y: 175, color: B, team: 'B', number: '2' },
  { id: 'sg10', type: 'player', x: 610, y: 270, color: B, team: 'B', number: '5' },
  { id: 'sg11', type: 'player', x: 610, y: 365, color: B, team: 'B', number: '3' },
  { id: 'sg12', type: 'player', x: 480, y: 215, color: B, team: 'B', number: '8' },
  { id: 'sg13', type: 'player', x: 480, y: 325, color: B, team: 'B', number: '10' },
  { id: 'sg14', type: 'ball', x: 420, y: 270 },
  { id: 'sg15', type: 'zone', x: 150, y: 140, width: 540, height: 260, fill: '#22c55e', opacity: 0.05, label: 'Playing Area' },
];
