import type {
  PlayerObject, ConeObject, BallObject, GoalObject,
  ArrowObject, ZoneObject, CircleObject, RectObject,
  TextObject, SmartConeAreaObject, CanvasObject, TeamSide
} from '../types';
import {
  makePlayerDefaults, CONE_DEFAULTS, BALL_DEFAULTS, GOAL_DEFAULTS,
  ARROW_DEFAULTS, ZONE_DEFAULTS, RECT_DEFAULTS, CIRCLE_DEFAULTS,
  TEXT_DEFAULTS, SMART_CONE_AREA_DEFAULTS,
} from './defaults';

let _zCounter = 100;
const nextZ = () => ++_zCounter;
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const createPlayer = (x: number, y: number, number: string, team: TeamSide = 'A'): PlayerObject => ({
  ...makePlayerDefaults(team), id: newId(), x, y, number, zIndex: nextZ(),
});

export const createGoalkeeper = (x: number, y: number, team: TeamSide = 'A'): PlayerObject => ({
  ...createPlayer(x, y, team === 'A' ? '1' : '12', team), isGoalkeeper: true,
});

export const createCone = (x: number, y: number, overrides?: Partial<ConeObject>): ConeObject => ({
  ...CONE_DEFAULTS, id: newId(), x, y, zIndex: nextZ(), ...overrides,
});

export const createBall = (x: number, y: number): BallObject => ({
  ...BALL_DEFAULTS, id: newId(), x, y, zIndex: nextZ(),
});

export const createGoal = (x: number, y: number, overrides?: Partial<GoalObject>): GoalObject => ({
  ...GOAL_DEFAULTS, id: newId(), x, y, zIndex: nextZ(), ...overrides,
});

export const createArrow = (
  startX: number, startY: number, endX: number, endY: number,
  overrides?: Partial<ArrowObject>
): ArrowObject => ({
  ...ARROW_DEFAULTS, id: newId(), startX, startY, endX, endY,
  cpX: (startX + endX) / 2, cpY: (startY + endY) / 2, zIndex: nextZ(), ...overrides,
});

export const createZone = (x: number, y: number, width: number, height: number): ZoneObject => ({
  ...ZONE_DEFAULTS, id: newId(), x, y, width, height, zIndex: nextZ(),
});

export const createRect = (x: number, y: number, width: number, height: number): RectObject => ({
  ...RECT_DEFAULTS, id: newId(), x, y, width, height, zIndex: nextZ(),
});

export const createCircle = (x: number, y: number, radius: number): CircleObject => ({
  ...CIRCLE_DEFAULTS, id: newId(), x, y, radius, zIndex: nextZ(),
});

export const createText = (x: number, y: number, text = 'Text'): TextObject => ({
  ...TEXT_DEFAULTS, id: newId(), x, y, text, zIndex: nextZ(),
});

export const createSmartConeArea = (x: number, y: number, width: number, height: number): SmartConeAreaObject => ({
  ...SMART_CONE_AREA_DEFAULTS, id: newId(), x, y, width, height, zIndex: nextZ(),
});

export const cloneObject = <T extends CanvasObject>(obj: T): T => ({
  ...JSON.parse(JSON.stringify(obj)),
  id: newId(),
  zIndex: nextZ(),
});
