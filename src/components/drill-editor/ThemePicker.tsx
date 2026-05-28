'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DRAWING_THEMES,
  DEFAULT_THEME_ID,
  getTheme,
  isCustomThemeId,
  type DrawingTheme,
  type ThemeColorRole,
} from '@/lib/drawingThemes';
import { useCustomThemesStore, newCustomThemeId } from '@/store/customThemesStore';

interface Props {
  /** Currently active theme id (the drill's theme). */
  value: string | undefined;
  onChange: (themeId: string) => void;
}

/**
 * Premium-styled drawing-theme picker. Replaces the native <select> with a
 * custom popover that lists built-in + custom themes (each with a color
 * swatch strip) and an "Add new theme" entry that opens the editor modal.
 */
export default function ThemePicker({ value, onChange }: Props) {
  const customThemes = useCustomThemesStore((s) => s.themes);
  const addTheme = useCustomThemesStore((s) => s.addTheme);
  const updateTheme = useCustomThemesStore((s) => s.updateTheme);
  const deleteTheme = useCustomThemesStore((s) => s.deleteTheme);

  const allThemes: DrawingTheme[] = [
    ...DRAWING_THEMES,
    ...Object.values(customThemes),
  ];

  const activeId = value ?? DEFAULT_THEME_ID;
  const active = getTheme(activeId, customThemes);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DrawingTheme | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        popoverRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onAddNew = () => {
    const draft: DrawingTheme = {
      ...active,
      id: newCustomThemeId(),
      name: 'Custom theme',
      description: undefined,
    };
    setEditing(draft);
    setOpen(false);
  };

  const onEditExisting = (theme: DrawingTheme) => {
    setEditing({ ...theme });
    setOpen(false);
  };

  const onSaveTheme = (theme: DrawingTheme) => {
    if (customThemes[theme.id]) {
      updateTheme(theme.id, theme);
    } else {
      addTheme(theme);
    }
    onChange(theme.id);
    setEditing(null);
  };

  const onDeleteTheme = (id: string) => {
    deleteTheme(id);
    if (activeId === id) onChange(DEFAULT_THEME_ID);
    setEditing(null);
  };

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-white/40">Theme</span>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded px-2 py-1 text-xs text-white transition-colors min-w-[150px] max-w-[200px]"
          title="Drawing theme — sets default colors for new objects"
        >
          <ThemeSwatchStrip theme={active} />
          <span className="truncate flex-1 text-left">{active.name}</span>
          <span className="text-white/40 text-[10px]">{open ? '▴' : '▾'}</span>
        </button>
      </div>

      {open && triggerRef.current && createPortal(
        <ThemeDropdown
          themes={allThemes}
          customThemes={customThemes}
          activeId={activeId}
          anchor={triggerRef.current.getBoundingClientRect()}
          popoverRef={popoverRef}
          onPick={(id) => { onChange(id); setOpen(false); }}
          onEdit={onEditExisting}
          onAddNew={onAddNew}
        />,
        document.body,
      )}

      {editing && (
        <ThemeEditorModal
          theme={editing}
          isCustom={isCustomThemeId(editing.id)}
          alreadySaved={!!customThemes[editing.id]}
          onSave={onSaveTheme}
          onDelete={() => onDeleteTheme(editing.id)}
          onCancel={() => setEditing(null)}
        />
      )}
    </>
  );
}

// ─── Swatch strip ─────────────────────────────────────────────────────────────

const SWATCH_ROLES: ThemeColorRole[] = [
  'fieldBackground',
  'zoneFill',
  'playerStroke',
  'arrowColor',
  'curvedColor',
  'coneColor',
];

function ThemeSwatchStrip({ theme }: { theme: DrawingTheme }) {
  return (
    <span className="flex shrink-0 rounded overflow-hidden border border-black/30" style={{ height: 14 }}>
      {SWATCH_ROLES.map((role) => (
        <span key={role} className="block" style={{ width: 8, height: 14, background: theme[role] as string }} />
      ))}
    </span>
  );
}

// ─── Dropdown popover ────────────────────────────────────────────────────────

function ThemeDropdown({
  themes,
  customThemes,
  activeId,
  anchor,
  popoverRef,
  onPick,
  onEdit,
  onAddNew,
}: {
  themes: DrawingTheme[];
  customThemes: Record<string, DrawingTheme>;
  activeId: string;
  anchor: DOMRect;
  popoverRef: React.RefObject<HTMLDivElement>;
  onPick: (id: string) => void;
  onEdit: (theme: DrawingTheme) => void;
  onAddNew: () => void;
}) {
  const top = anchor.bottom + 6;
  const left = anchor.left;
  return (
    <div
      ref={popoverRef}
      className="fixed z-[100] w-72 bg-[#0f1722] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
      style={{ top, left }}
      role="listbox"
    >
      <div className="max-h-[360px] overflow-y-auto py-1.5">
        {themes.map((theme) => {
          const isActive = theme.id === activeId;
          const isCustom = !!customThemes[theme.id];
          return (
            <div
              key={theme.id}
              className={`group flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                isActive ? 'bg-brand-orange/15' : 'hover:bg-white/5'
              }`}
              onClick={() => onPick(theme.id)}
            >
              <ThemeSwatchStrip theme={theme} />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${isActive ? 'text-brand-orange' : 'text-white/90'}`}>
                  {theme.name}
                </div>
                {theme.description && (
                  <div className="text-[10px] text-white/40 truncate">{theme.description}</div>
                )}
              </div>
              {isCustom && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(theme); }}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-white/50 hover:text-white px-1.5 py-0.5 rounded border border-white/10 hover:border-white/30 transition-all"
                  title="Edit this theme"
                >
                  Edit
                </button>
              )}
              {isActive && <span className="text-brand-orange text-xs">✓</span>}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onAddNew}
        className="w-full px-3 py-2.5 border-t border-white/10 bg-white/5 hover:bg-brand-orange/15 text-xs font-medium text-white/80 hover:text-brand-orange transition-colors flex items-center gap-2"
      >
        <span className="w-4 h-4 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center text-sm leading-none">+</span>
        Add new theme
      </button>
    </div>
  );
}

// ─── Theme editor modal ──────────────────────────────────────────────────────

const COLOR_FIELDS: { key: ThemeColorRole; label: string; group: 'Field' | 'Shapes' | 'Lines' | 'Players' | 'Misc' }[] = [
  { key: 'fieldBackground', label: 'Field background', group: 'Field' },
  { key: 'fieldLines', label: 'Field lines', group: 'Field' },
  { key: 'zoneFill', label: 'Zone fill', group: 'Shapes' },
  { key: 'zoneStroke', label: 'Zone stroke', group: 'Shapes' },
  { key: 'shapeStroke', label: 'Shape stroke', group: 'Shapes' },
  { key: 'arrowColor', label: 'Arrow color', group: 'Lines' },
  { key: 'lineColor', label: 'Line color', group: 'Lines' },
  { key: 'curvedColor', label: 'Curved line color', group: 'Lines' },
  { key: 'playerStroke', label: 'Player stroke', group: 'Players' },
  { key: 'playerNumberColor', label: 'Player number', group: 'Players' },
  { key: 'coneColor', label: 'Cone color', group: 'Misc' },
  { key: 'labelColor', label: 'Label / text color', group: 'Misc' },
];

function ThemeEditorModal({
  theme,
  isCustom,
  alreadySaved,
  onSave,
  onDelete,
  onCancel,
}: {
  theme: DrawingTheme;
  isCustom: boolean;
  alreadySaved: boolean;
  onSave: (theme: DrawingTheme) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<DrawingTheme>(theme);

  const set = <K extends keyof DrawingTheme>(k: K, v: DrawingTheme[K]) => setDraft((d) => ({ ...d, [k]: v }));

  // Built-in themes cannot be saved over; if the user opened the editor on a
  // built-in theme they're effectively cloning it into a new custom theme.
  const willCreateNew = !alreadySaved && !isCustom;
  const effectiveDraft: DrawingTheme = willCreateNew
    ? { ...draft, id: draft.id.startsWith('custom:') ? draft.id : newCustomThemeId() }
    : draft;

  const grouped = COLOR_FIELDS.reduce<Record<string, typeof COLOR_FIELDS>>((acc, f) => {
    (acc[f.group] = acc[f.group] ?? []).push(f);
    return acc;
  }, {});

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0f1722] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">{willCreateNew ? 'New Theme' : isCustom ? 'Edit Theme' : 'Customize Built-in'}</h2>
            <p className="text-[11px] text-white/40 mt-0.5">
              Set the default colors for new drawn objects under this theme.
            </p>
          </div>
          <button onClick={onCancel} className="text-white/40 hover:text-white text-2xl leading-none px-2">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Name + preview */}
          <div className="flex items-center gap-3 mb-5">
            <input
              type="text"
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Theme name"
              className="flex-1 bg-white/5 border border-white/10 focus:border-brand-orange rounded px-3 py-2 text-sm text-white focus:outline-none"
            />
            <div className="shrink-0 px-3 py-2 rounded-lg border border-white/10 bg-white/5">
              <ThemeSwatchStrip theme={draft} />
            </div>
          </div>

          {Object.entries(grouped).map(([group, fields]) => (
            <div key={group} className="mb-5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{group}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                {fields.map((f) => (
                  <label key={f.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded border border-white/5 hover:border-white/15 bg-white/[0.02] transition-colors">
                    <input
                      type="color"
                      value={asHex(draft[f.key] as string)}
                      onChange={(e) => set(f.key, e.target.value as DrawingTheme[typeof f.key])}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/80 truncate">{f.label}</div>
                      <input
                        type="text"
                        value={(draft[f.key] as string) ?? ''}
                        onChange={(e) => set(f.key, e.target.value as DrawingTheme[typeof f.key])}
                        className="w-full bg-transparent text-[10px] font-mono text-white/40 focus:text-white/80 focus:outline-none"
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-white/10 shrink-0">
          {isCustom && alreadySaved ? (
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-xs rounded bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 transition-colors"
            >
              Delete theme
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onSave(effectiveDraft)}
              disabled={!draft.name.trim()}
              className="px-4 py-1.5 text-xs rounded bg-brand-orange hover:bg-brand-orange/90 text-white font-medium disabled:opacity-40 transition-colors"
            >
              {willCreateNew ? 'Create theme' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Color inputs need a `#rrggbb` value. Theme tokens can be hex or rgba(); we
 * fall back to a neutral grey when an rgba() value is shown in the color
 * input so the swatch picker still renders sensibly. The free-text field
 * beside it keeps the original rgba() value editable as a string.
 */
function asHex(v: string): string {
  if (typeof v !== 'string') return '#ffffff';
  if (v.startsWith('#') && (v.length === 7 || v.length === 4)) return v;
  // rgba() / hsl() values: approximate to mid-grey so the color picker has
  // something to show. The user can still edit the underlying string.
  return '#888888';
}
