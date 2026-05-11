/** Paths to /public/field-assets images. */
export const FIELD_ASSET_PATHS: Record<string, string> = {
  'cone':         '/field-assets/cone.png',
  'blue-cone':    '/field-assets/blue-cone.png',
  'red-cone':     '/field-assets/red-cone.png',
  'green-cone':   '/field-assets/green-cone.png',
  'yellow-cone':  '/field-assets/yellow-cone.png',
  'ball':         '/field-assets/ball.png',
  'large-goal':   '/field-assets/large-goal.png',
  'mini-goal':    '/field-assets/mini-goal.png',
};

export const CONE_VARIANTS: { key: string; label: string; dotColor: string }[] = [
  { key: 'cone',         label: 'Orange',  dotColor: '#f97316' },
  { key: 'blue-cone',    label: 'Blue',    dotColor: '#3b82f6' },
  { key: 'red-cone',     label: 'Red',     dotColor: '#ef4444' },
  { key: 'green-cone',   label: 'Green',   dotColor: '#22c55e' },
  { key: 'yellow-cone',  label: 'Yellow',  dotColor: '#eab308' },
];
