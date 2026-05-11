# Coach Drill Designer

A football coaching tool for designing drills and building training sessions — fully local, no backend required.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/drills` and seeds sample data on first load.

---

## Routes

| Route | Description |
|---|---|
| `/` | Redirects to `/drills` |
| `/drills` | Grid of all drills — create, duplicate, delete, open editor |
| `/drills/[id]` | Drill editor — canvas, palette, inspector |
| `/sessions` | Grid of all sessions — create, delete, open builder |
| `/sessions/[id]` | Session builder — timeline of drill blocks, drag to reorder |

---

## How localStorage Persistence Works

Two Zustand stores use the `persist` middleware with a custom SSR-safe storage adapter:

```
coach-drills-v1    → Record<string, Drill>
coach-sessions-v1  → Record<string, Session>
```

All writes go through the store actions (e.g. `updateDrill`, `addObject`). The `persist` middleware serialises the whole store to JSON and writes to `localStorage` after every state change — debounced by Zustand internally.

On first load (`seedIfEmpty`), three sample drills and two sessions are created so the app isn't empty.

To clear all data: `localStorage.clear()` in the browser console, then reload.

---

## Drill Editor

| Panel | Purpose |
|---|---|
| Left Sidebar | Palette — add players (Team A/B), cones, balls, goals, zones, draw arrows |
| Center Canvas | react-konva canvas with a scaled football pitch |
| Right Inspector | Edit properties of the selected object (color, number, size, label, etc.) |

**Interactions:**
- Click an object → select it (shows yellow highlight + transformer)
- Drag to reposition
- `Delete` / `Backspace` key → remove selected object
- Draw Arrow → click waypoints on the canvas, double-click to finish
- Zone: when selected, drag corner anchors to resize
- Export PNG → downloads a 2× resolution PNG of the current canvas

---

## Session Builder

- Left panel: search drills, pick duration, intensity, notes → click "Add to Session"
- Center: draggable timeline — grab the grid handle to reorder blocks
- Top bar: editable title, date picker, total duration
- Intensity bar: colour-coded load visualisation across the session

---

## Adding New Object Types

1. **Add the type interface** to `src/types/index.ts` and include it in the `CanvasObject` union.
2. **Render it** — add a `case` in `renderObject()` inside `src/components/drill-editor/PitchCanvas.tsx`.
3. **Expose it in the palette** — add a button in `PaletteSidebar.tsx` and a handler in `DrillEditorPage.tsx`.
4. **Inspect it** — add an inspector sub-component in `InspectorPanel.tsx`.

No schema migrations needed — old localStorage data loads fine because Zustand's persist uses `JSON.parse`.

---

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** — dark theme UI
- **react-konva** + **konva** — canvas rendering (loaded client-side only via `dynamic()`)
- **Zustand** + `persist` middleware — state management & localStorage sync
- **@dnd-kit** — drag-to-reorder in session timeline
