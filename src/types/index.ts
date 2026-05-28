// ─── Pitch ────────────────────────────────────────────────────────────────────
export type PitchType = 'full' | 'half' | 'third' | 'plain';

export interface PitchColors {
  grass: string;
  /** Alternate stripe color — if unset, a subtle dark overlay is used */
  grassSecondary?: string;
  lines: string;
}

export interface Pitch {
  type: PitchType;
  /** Logical canvas width in px */
  width: number;
  /** Logical canvas height in px */
  height: number;
  colors?: PitchColors;
}

// ─── Canvas Objects ───────────────────────────────────────────────────────────

export interface PlayerObject {
  id: string;
  type: 'player';
  x: number;
  y: number;
  rotation?: number;
  color: string;
  number?: string;
  name?: string;
  team?: 'A' | 'B';
  locked?: boolean;
  /** If false, hide the jersey number (circle only mode) */
  showNumber?: boolean;
  /** Custom stroke color for the player circle. Default: white */
  strokeColor?: string;
  /** Whether the outline ring is drawn. Default: true. Set false to render a fill-only circle. */
  strokeEnabled?: boolean;
  /** Outline ring width in logical px. Default: 1.5. */
  strokeWidth?: number;
  /** Custom number text color. Default: white */
  numberColor?: string;
  /** True when color was inherited from team settings (allows auto-sync) */
  teamColorInherited?: boolean;
  bib?: boolean;
  bibColor?: string;
  /** When true, player renders as goalkeeper (gold fill) regardless of number */
  isGoalkeeper?: boolean;
}

export interface ConeObject {
  id: string;
  type: 'cone';
  x: number;
  y: number;
  color: string;
  rotation?: number;
  locked?: boolean;
  /** Which cone image variant to use (key into FIELD_ASSET_PATHS). Default: 'cone'. */
  imageVariant?: string;
  /** Display size in logical px. Default: 28. */
  size?: number;
}

export interface BallObject {
  id: string;
  type: 'ball';
  x: number;
  y: number;
  locked?: boolean;
  rotation?: number;
  /** Display size in logical px. Default: 22. */
  size?: number;
}

export interface GoalObject {
  id: string;
  type: 'goal';
  x: number;
  y: number;
  size: 'small' | 'full';
  rotation?: number;
  locked?: boolean;
  /** Override rendered image width (logical px). Defaults: full=80, small=44. */
  imgW?: number;
  /** Override rendered image height (logical px). Defaults: full=44, small=28. */
  imgH?: number;
}

/** Tactical arrow sub-type for football-specific tools */
export type TacticType = 'run' | 'pass' | 'dribble' | 'press' | 'lane' | 'defline' | 'support';

/** 2-point tactical arrow (replaces old multi-point design) */
export interface ArrowObject {
  id: string;
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  style: 'solid' | 'dashed';
  headStyle: 'filled' | 'open';
  strokeWidth?: number;
  locked?: boolean;
  /** Football-specific tactic type */
  tacticType?: TacticType;
  /** If set, arrow start position follows this player */
  startPlayerId?: string;
  /** If set, arrow end position follows this player */
  endPlayerId?: string;
  /** Zigzag rendering for dribble arrows */
  arrowShape?: 'zigzag';
}

export interface ZoneObject {
  id: string;
  type: 'zone';
  x: number;
  y: number;
  width: number;
  height: number;
  /** Hex color */
  fill: string;
  /** 0‑1 */
  opacity: number;
  label?: string;
  strokeColor?: string;
  strokeWidth?: number;
  rotation?: number;
  locked?: boolean;
}

export interface CircleShapeObject {
  id: string;
  type: 'circle';
  x: number;
  y: number;
  radius: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  fillOpacity?: number;
  /** Overall shape opacity 0-1 */
  opacity?: number;
  dashed?: boolean;
  rotation?: number;
  locked?: boolean;
}

export interface RectangleObject {
  id: string;
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  fillOpacity?: number;
  /** Overall shape opacity 0-1 */
  opacity?: number;
  dashed?: boolean;
  rotation?: number;
  locked?: boolean;
}

export interface LineObject {
  id: string;
  type: 'line';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
  dashed?: boolean;
  locked?: boolean;
  /** Football-specific tactic type */
  tacticType?: TacticType;
}

/** Quadratic bezier curve with 3 control points */
export interface CurvedLineObject {
  id: string;
  type: 'curved';
  startX: number;
  startY: number;
  /** Quadratic bezier control point */
  cpX: number;
  cpY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
  dashed?: boolean;
  locked?: boolean;
}

export interface LinkObject {
  id: string;
  type: 'link';
  fromPlayerId: string;
  toPlayerId: string;
  color: string;
  dashed?: boolean;
  label?: string;
  locked?: boolean;
}

/**
 * Focus Zone / Spotlight — dims everything outside the defined rectangle.
 * Rendered as 4 dark overlay rects surrounding the focus area.
 */
export interface FocusZoneObject {
  id: string;
  type: 'focus-zone';
  x: number;
  y: number;
  width: number;
  height: number;
  /** Overlay darkness, 0–1 (default 0.3) */
  overlayOpacity: number;
  locked?: boolean;
}

/**
 * Smart Cone Area — rectangular region with automatically placed cones at corners
 * and optionally evenly distributed between them.
 */
export interface SmartConeAreaObject {
  id: string;
  type: 'smart-cone-area';
  x: number;
  y: number;
  width: number;
  height: number;
  coneColor: string;
  /** Which cone image variant to use for all cones in this area. Default: 'cone'. */
  coneVariant?: string;
  /** How many extra cones to place BETWEEN the corner cones on each side. 0 = corners only. */
  extraConesPerSide: number;
  showBorder: boolean;
  borderColor: string;
  borderDashed: boolean;
  rotation?: number;
  locked?: boolean;
}

export interface TextObject {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  align: 'left' | 'center' | 'right';
  showBox: boolean;
  boxBorderColor: string;
  boxBorderWidth: number;
  width: number;
  rotation?: number;
  locked?: boolean;
}

/** A named group of canvas objects that move/rotate together */
export interface GroupObject {
  id: string;
  type: 'group';
  x: number;
  y: number;
  rotation?: number;
  locked?: boolean;
  children: CanvasObject[];
}

export type CanvasObject =
  | PlayerObject
  | ConeObject
  | BallObject
  | GoalObject
  | ArrowObject
  | ZoneObject
  | CircleShapeObject
  | RectangleObject
  | LineObject
  | CurvedLineObject
  | LinkObject
  | FocusZoneObject
  | SmartConeAreaObject
  | TextObject
  | GroupObject;

// ─── Drill Step ───────────────────────────────────────────────────────────────
/** An internal step (progression/regression) stored within the same drill */
export interface DrillStep {
  id: string;
  label: string;
  objects: CanvasObject[];
}

// ─── Drill ────────────────────────────────────────────────────────────────────
export type DrillRelationType = 'base' | 'variation' | 'progression' | 'regression';

export interface Drill {
  id: string;
  title: string;
  description?: string;
  pitch: Pitch;
  objects: CanvasObject[];
  // Extended metadata
  objective?: string;
  ageGroup?: string;
  playerCount?: string;
  areaSize?: string;
  durationMin?: number;
  equipment?: string[];
  coachingPoints?: string[];
  coachingCues?: string[];
  commonMistakes?: string[];
  corrections?: string[];
  keyConstraints?: string[];
  progression?: string;
  regression?: string;
  notes?: string;
  teamId?: string | null;
  trainingDay?: string | null;
  tags?: string[];
  folderId?: string | null;
  /** Sub-category within a folder */
  subcategoryId?: string | null;
  /** Manual sort order for drag-to-reorder (higher = later in list) */
  sortOrder?: number;
  /** Global player marker scale (0.5–2.0, default 1). Applied to all players on the canvas. */
  playerScale?: number;
  /**
   * Drawing theme id (see `src/lib/drawingThemes.ts`). When set, new objects
   * pick their default colors from this theme. Existing objects are not
   * auto-mutated. Undefined → default theme is used implicitly.
   */
  theme?: string;
  // Drill relationships
  parentDrillId?: string | null;
  relationType?: DrillRelationType | null;
  /** Starred/favorited by the coach */
  isFavorite?: boolean;
  /** Internal steps (progressions/regressions within the same drill) */
  steps?: DrillStep[];
  createdAt: string;
  updatedAt: string;
}

// ─── Drill Folder ─────────────────────────────────────────────────────────────
export interface DrillFolder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FolderSubcategory {
  id: string;
  folderId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Session ──────────────────────────────────────────────────────────────────
export type Intensity = 'low' | 'mid' | 'high';
export type SessionSection = 'warmup' | 'main' | 'game' | 'cooldown';

export interface SessionBlock {
  id: string;
  drillId: string;
  durationMin: number;
  intensity: Intensity;
  notes?: string;
  /** Which session phase this block belongs to */
  section?: SessionSection;
}

export interface Session {
  id: string;
  title: string;
  date?: string;
  blocks: SessionBlock[];
  // Extended metadata
  objective?: string;
  ageGroup?: string;
  playerCount?: string;
  notes?: string;
  teamId?: string | null;
  trainingDay?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Team ─────────────────────────────────────────────────────────────────────
export interface TeamPlayer {
  id: string;
  name: string;
  number?: string;
  position?: string;
  color?: string;
  teamSide: 'home' | 'opponent';
}

export interface Team {
  id: string;
  name: string;
  ageGroup: string;
  primaryColor: string;
  secondaryColor: string;
  opponentPrimaryColor: string;
  opponentSecondaryColor?: string;
  /** Stroke ring color for home players */
  primaryStrokeColor?: string;
  /** Stroke ring color for opponent players */
  opponentStrokeColor?: string;
  /** Jersey number text color for home players */
  primaryNumberColor?: string;
  /** Jersey number text color for opponent players */
  opponentNumberColor?: string;
  /** e.g. ["Sunday","Tuesday","Thursday"] */
  trainingDays: string[];
  players: TeamPlayer[];
  createdAt: string;
  updatedAt: string;
}

// ─── Season Plan ──────────────────────────────────────────────────────────────
export interface SeasonPlanEntry {
  id: string;
  date: string;
  trainingDay?: string;
  sessionId?: string;
  notes?: string;
}

export interface SeasonPlan {
  id: string;
  title: string;
  teamId: string;
  startDate: string;
  endDate: string;
  entries: SeasonPlanEntry[];
  createdAt: string;
  updatedAt: string;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
export type CalendarEventType = 'training' | 'match' | 'rest' | 'other';
export type CalendarEventStatus = 'planned' | 'completed' | 'cancelled';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: CalendarEventType;
  teamId?: string;
  sessionId?: string;
  notes?: string;
  status?: CalendarEventStatus;
  /** Links this event to a SeasonPlanEntry so updates stay in sync */
  seasonPlanEntryId?: string;
  /**
   * ISO timestamp of the last mutation. Optional on the type because
   * pre-cloud events may have been persisted without it, but every cloud
   * write / mutation through calendarStore sets it. Used by cloud sync
   * for last-write-wins reconciliation on hydrate.
   */
  updatedAt?: string;
  /** ISO timestamp of creation. Populated by the DB on the first upsert. */
  createdAt?: string;
}
