export type PitchType = 'full' | 'half' | 'third' | 'plain';

export interface PitchColors {
  grass: string;
  grassAlt: string | null;
  lines: string;
}

export interface PitchConfig {
  type: PitchType;
  width: number;
  height: number;
  colors: PitchColors;
}

export const PITCH_PRESETS: Record<PitchType, Omit<PitchConfig, 'colors'>> = {
  full:  { type: 'full',  width: 840, height: 540 },
  half:  { type: 'half',  width: 840, height: 420 },
  third: { type: 'third', width: 840, height: 300 },
  plain: { type: 'plain', width: 840, height: 540 },
};
