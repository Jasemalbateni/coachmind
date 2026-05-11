export type TeamSide = 'A' | 'B';
export type ConeVariant = 'cone' | 'blue-cone' | 'red-cone' | 'green-cone' | 'yellow-cone';
export type GoalSize = 'full' | 'small';
export type TacticType = 'pass' | 'run' | 'dribble' | 'press' | 'support' | 'lane' | 'defline';
export type ArrowHeadStyle = 'filled' | 'open' | 'none';
export type ArrowLineStyle = 'solid' | 'dashed' | 'dotted';
export type ArrowShape = 'straight' | 'zigzag' | 'curved';
export type FontWeight = 'normal' | 'bold';
export type FontStyle = 'normal' | 'italic';
export type TextAlign = 'left' | 'center' | 'right';

export interface CanvasObjectBase {
  id: string;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  opacity: number;
  rotation: number;
}

export interface PlayerObject extends CanvasObjectBase {
  type: 'player';
  x: number; y: number;
  color: string;
  strokeColor: string;
  numberColor: string;
  number: string;
  name: string;
  team: TeamSide;
  isGoalkeeper: boolean;
  bib: boolean;
  bibColor: string;
  teamColorInherited: boolean;
  localScale: number;
}

export interface ConeObject extends CanvasObjectBase {
  type: 'cone';
  x: number; y: number;
  size: number;
  variant: ConeVariant;
  color: string;
}

export interface BallObject extends CanvasObjectBase {
  type: 'ball';
  x: number; y: number;
  size: number;
}

export interface GoalObject extends CanvasObjectBase {
  type: 'goal';
  x: number; y: number;
  goalSize: GoalSize;
  imgW: number;
  imgH: number;
  flipped: boolean;
}

export interface ArrowObject extends CanvasObjectBase {
  type: 'arrow';
  startX: number; startY: number;
  endX: number; endY: number;
  cpX: number; cpY: number;
  color: string;
  strokeWidth: number;
  lineStyle: ArrowLineStyle;
  headStyle: ArrowHeadStyle;
  arrowShape: ArrowShape;
  tacticType: TacticType | null;
  startPlayerId: string | null;
  endPlayerId: string | null;
}

export interface ZoneObject extends CanvasObjectBase {
  type: 'zone';
  x: number; y: number;
  width: number; height: number;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  strokeDashed: boolean;
  label: string;
}

export interface CircleObject extends CanvasObjectBase {
  type: 'circle';
  x: number; y: number;
  radius: number;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  strokeDashed: boolean;
}

export interface RectObject extends CanvasObjectBase {
  type: 'rect';
  x: number; y: number;
  width: number; height: number;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  strokeDashed: boolean;
  cornerRadius: number;
}

export interface TextObject extends CanvasObjectBase {
  type: 'text';
  x: number; y: number;
  width: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: FontWeight;
  fontStyle: FontStyle;
  color: string;
  align: TextAlign;
  showBackground: boolean;
  backgroundColor: string;
  backgroundPadding: number;
}

export interface SmartConeAreaObject extends CanvasObjectBase {
  type: 'smart-cone-area';
  x: number; y: number;
  width: number; height: number;
  coneVariant: ConeVariant;
  extraConesPerSide: number;
  showBorder: boolean;
  borderColor: string;
  borderDashed: boolean;
}

export type CanvasObject =
  | PlayerObject | ConeObject | BallObject | GoalObject
  | ArrowObject | ZoneObject | CircleObject | RectObject
  | TextObject | SmartConeAreaObject;

export type CanvasObjectType = CanvasObject['type'];

export const isPositioned = (o: CanvasObject): o is Extract<CanvasObject, { x: number; y: number }> => 'x' in o;
export const isArrow = (o: CanvasObject): o is ArrowObject => o.type === 'arrow';
