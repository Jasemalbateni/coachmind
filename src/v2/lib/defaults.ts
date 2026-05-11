import { TEAM_COLORS } from './tokens';
import type { TeamSide } from '../types';

const base = { zIndex: 0, locked: false, visible: true, opacity: 1, rotation: 0 };

export const makePlayerDefaults = (team: TeamSide = 'A') => ({
  ...base,
  type: 'player' as const,
  color: TEAM_COLORS[team].fill,
  strokeColor: TEAM_COLORS[team].stroke,
  numberColor: TEAM_COLORS[team].number,
  name: '',
  team,
  isGoalkeeper: false,
  bib: false,
  bibColor: '#FFC857',
  teamColorInherited: true,
  localScale: 1,
});

export const CONE_DEFAULTS = {
  ...base, type: 'cone' as const, size: 28, variant: 'cone' as const, color: '#FF6B35',
};
export const BALL_DEFAULTS = { ...base, type: 'ball' as const, size: 22 };
export const GOAL_DEFAULTS = { ...base, type: 'goal' as const, goalSize: 'full' as const, imgW: 80, imgH: 50, flipped: false };
export const ARROW_DEFAULTS = {
  ...base, type: 'arrow' as const, cpX: 0, cpY: 0, color: '#FFFFFF',
  strokeWidth: 2.5, lineStyle: 'solid' as const, headStyle: 'filled' as const,
  arrowShape: 'straight' as const, tacticType: null, startPlayerId: null, endPlayerId: null,
};
export const ZONE_DEFAULTS = {
  ...base, type: 'zone' as const, fill: '#63C0B0', fillOpacity: 0.25,
  stroke: '#63C0B0', strokeWidth: 2, strokeDashed: false, label: '',
};
export const RECT_DEFAULTS = {
  ...base, type: 'rect' as const, fill: '#63C0B0', fillOpacity: 0.2,
  stroke: '#63C0B0', strokeWidth: 2, strokeDashed: false, cornerRadius: 4,
};
export const CIRCLE_DEFAULTS = {
  ...base, type: 'circle' as const, fill: '#63C0B0', fillOpacity: 0.2,
  stroke: '#63C0B0', strokeWidth: 2, strokeDashed: false,
};
export const TEXT_DEFAULTS = {
  ...base, type: 'text' as const, width: 200, fontSize: 16,
  fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 'bold' as const,
  fontStyle: 'normal' as const, color: '#FFFFFF', align: 'left' as const,
  showBackground: true, backgroundColor: 'rgba(28,45,90,0.8)', backgroundPadding: 6,
};
export const SMART_CONE_AREA_DEFAULTS = {
  ...base, type: 'smart-cone-area' as const, coneVariant: 'cone' as const,
  extraConesPerSide: 0, showBorder: true, borderColor: 'rgba(255,255,255,0.3)', borderDashed: true,
};
