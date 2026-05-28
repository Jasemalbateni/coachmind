/**
 * Drawing Themes — reusable presets of visual colors for the drill canvas.
 *
 * Each theme is a coordinated palette: when a drill has a theme assigned,
 * newly-created objects pick their color from the matching role token (e.g.
 * a new zone uses `zoneFill` + `zoneStroke`; a new arrow uses `arrowColor`).
 * Existing objects are never auto-mutated — the user opts in per-property
 * via the "Use theme color" affordance in the inspector.
 *
 * Adding a new theme: append an entry to DRAWING_THEMES below. The id must
 * be unique and stable (it's persisted on the drill).
 */
export interface DrawingTheme {
  id: string;
  name: string;
  /** One-line description shown in the picker. */
  description?: string;
  /** Grass / canvas background. */
  fieldBackground: string;
  /** Optional alternate stripe color for the grass. */
  fieldBackgroundSecondary?: string;
  /** Pitch line color (center circle, penalty box, etc.). */
  fieldLines: string;
  /** Default fill color for new zones. */
  zoneFill: string;
  /** Default stroke color for new zones. */
  zoneStroke: string;
  /** Default stroke color for new player circles. */
  playerStroke: string;
  /** Default number text color. */
  playerNumberColor: string;
  /** Default color for new tactical/freehand arrows. */
  arrowColor: string;
  /** Default color for new straight lines. */
  lineColor: string;
  /** Default color for new curved lines. */
  curvedColor: string;
  /** Default fill color for new cones (when image not loaded). */
  coneColor: string;
  /** Default text/label color. */
  labelColor: string;
  /** Default stroke color for new circles/rectangles. */
  shapeStroke: string;
}

export const DRAWING_THEMES: DrawingTheme[] = [
  {
    id: 'classic',
    name: 'Classic Pitch',
    description: 'Bright grass with sharp white markings.',
    fieldBackground: '#2d6a4f',
    fieldLines: 'rgba(255,255,255,0.75)',
    zoneFill: '#8b5cf6',
    zoneStroke: 'rgba(255,255,255,0.45)',
    playerStroke: '#ffffff',
    playerNumberColor: '#ffffff',
    arrowColor: '#fbbf24',
    lineColor: '#ffffff',
    curvedColor: '#00b8d4',
    coneColor: '#f97316',
    labelColor: '#ffffff',
    shapeStroke: '#ffffff',
  },
  {
    id: 'tactical-dark',
    name: 'Tactical Dark',
    description: 'High-contrast dark board for chalk-talk diagrams.',
    fieldBackground: '#0f172a',
    fieldBackgroundSecondary: '#1e293b',
    fieldLines: 'rgba(226,232,240,0.55)',
    zoneFill: '#38bdf8',
    zoneStroke: 'rgba(56,189,248,0.6)',
    playerStroke: '#e2e8f0',
    playerNumberColor: '#0f172a',
    arrowColor: '#facc15',
    lineColor: '#e2e8f0',
    curvedColor: '#22d3ee',
    coneColor: '#fb923c',
    labelColor: '#e2e8f0',
    shapeStroke: '#94a3b8',
  },
  {
    id: 'whiteboard',
    name: 'Whiteboard',
    description: 'Light board with bold ink-style strokes.',
    fieldBackground: '#f8fafc',
    fieldBackgroundSecondary: '#e2e8f0',
    fieldLines: 'rgba(15,23,42,0.55)',
    zoneFill: '#6366f1',
    zoneStroke: 'rgba(15,23,42,0.55)',
    playerStroke: '#0f172a',
    playerNumberColor: '#0f172a',
    arrowColor: '#dc2626',
    lineColor: '#0f172a',
    curvedColor: '#2563eb',
    coneColor: '#ea580c',
    labelColor: '#0f172a',
    shapeStroke: '#0f172a',
  },
  {
    id: 'sunset',
    name: 'Sunset Turf',
    description: 'Warm-toned turf with amber accents.',
    fieldBackground: '#1f3a2e',
    fieldBackgroundSecondary: '#2c4e3f',
    fieldLines: 'rgba(254,243,199,0.7)',
    zoneFill: '#f59e0b',
    zoneStroke: 'rgba(254,243,199,0.55)',
    playerStroke: '#fef3c7',
    playerNumberColor: '#1c1917',
    arrowColor: '#f97316',
    lineColor: '#fef3c7',
    curvedColor: '#fb7185',
    coneColor: '#fbbf24',
    labelColor: '#fef3c7',
    shapeStroke: '#fef3c7',
  },
];

export const DEFAULT_THEME_ID = 'classic';

/**
 * Resolves a theme id to a DrawingTheme. Custom themes (stored in the
 * customThemesStore and passed in here) take precedence over the built-in
 * list with the same id — though by convention custom theme ids are namespaced
 * with `custom:` so collisions don't happen.
 */
export function getTheme(themeId?: string | null, customThemes?: Record<string, DrawingTheme>): DrawingTheme {
  if (!themeId) return DRAWING_THEMES[0];
  if (customThemes && customThemes[themeId]) return customThemes[themeId];
  return DRAWING_THEMES.find((t) => t.id === themeId) ?? DRAWING_THEMES[0];
}

/** True when the id refers to a user-defined custom theme. */
export function isCustomThemeId(id: string): boolean {
  return id.startsWith('custom:');
}

/** Role keys exposed to the inspector "use theme color" affordance. */
export type ThemeColorRole =
  | 'fieldBackground'
  | 'fieldLines'
  | 'zoneFill'
  | 'zoneStroke'
  | 'playerStroke'
  | 'playerNumberColor'
  | 'arrowColor'
  | 'lineColor'
  | 'curvedColor'
  | 'coneColor'
  | 'labelColor'
  | 'shapeStroke';
