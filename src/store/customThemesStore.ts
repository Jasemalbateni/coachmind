'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DrawingTheme } from '@/lib/drawingThemes';

/**
 * User-defined drawing themes. Persisted to localStorage and merged with the
 * built-in DRAWING_THEMES list throughout the UI. Custom theme ids are
 * prefixed with `custom:` so they can never collide with built-in ones.
 */
interface CustomThemesState {
  themes: Record<string, DrawingTheme>;
  addTheme: (theme: DrawingTheme) => void;
  updateTheme: (id: string, updates: Partial<DrawingTheme>) => void;
  deleteTheme: (id: string) => void;
}

export const useCustomThemesStore = create<CustomThemesState>()(
  persist(
    (set) => ({
      themes: {},
      addTheme: (theme) => set((s) => ({ themes: { ...s.themes, [theme.id]: theme } })),
      updateTheme: (id, updates) => set((s) => {
        const existing = s.themes[id];
        if (!existing) return s;
        return { themes: { ...s.themes, [id]: { ...existing, ...updates, id } } };
      }),
      deleteTheme: (id) => set((s) => {
        const { [id]: _removed, ...rest } = s.themes;
        return { themes: rest };
      }),
    }),
    {
      name: 'coach-custom-themes-v1',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
        return localStorage;
      }),
    },
  ),
);

/** Generate a new custom-theme id (`custom:<uuid>`). */
export function newCustomThemeId(): string {
  return `custom:${crypto.randomUUID()}`;
}
